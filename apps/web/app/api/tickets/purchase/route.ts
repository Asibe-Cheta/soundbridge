import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      ticketId,
      quantity = 1,
      buyerName,
      buyerEmail,
      buyerPhone,
    } = body;

    // Validate required fields
    if (!ticketId || !buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId, buyerName, buyerEmail' },
        { status: 400 }
      );
    }

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('event_tickets')
      .select(`
        *,
        event:events(
          id,
          title,
          event_date,
          creator_id,
          creator:profiles!events_creator_id_fkey(
            id,
            stripe_account_id,
            display_name,
            email
          )
        )
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check availability
    const { data: availabilityCheck } = await supabase
      .rpc('check_ticket_availability', {
        p_ticket_id: ticketId,
        p_quantity: quantity
      });

    if (!availabilityCheck) {
      return NextResponse.json(
        { error: 'Tickets not available' },
        { status: 400 }
      );
    }

    // Get user's subscription tier for fee calculation
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const userTier = subscription?.tier || 'free';

    // Calculate fees based on tier
    const PLATFORM_FEE_PERCENT = userTier === 'free' ? 5.0 :
                                 userTier === 'pro' ? 3.5 : 2.5;
    const FIXED_FEE = userTier === 'free' ? 1.00 :
                      userTier === 'pro' ? 0.75 : 0.50;

    const ticketPrice = parseFloat(ticket.price_gbp || '0');
    const totalAmount = ticketPrice * quantity;
    const platformFee = (totalAmount * PLATFORM_FEE_PERCENT / 100) + FIXED_FEE;
    const promoterRevenue = totalAmount - platformFee;

    // Verify promoter has Stripe Connect
    const promoterStripeAccount = ticket.event?.creator?.stripe_account_id;
    
    if (!promoterStripeAccount) {
      return NextResponse.json(
        { error: 'Event promoter has not set up payment account' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Generate unique ticket codes
    const ticketCodes: string[] = [];
    for (let i = 0; i < quantity; i++) {
      const { data: code } = await supabase.rpc('generate_ticket_code');
      if (code) ticketCodes.push(code);
    }

    // Create Payment Intent with Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to pence
      currency: 'gbp',
      application_fee_amount: Math.round(platformFee * 100),
      transfer_data: {
        destination: promoterStripeAccount,
      },
      metadata: {
        event_id: ticket.event?.id,
        event_title: ticket.event?.title,
        ticket_id: ticketId,
        ticket_type: ticket.ticket_type,
        quantity: quantity.toString(),
        promoter_id: ticket.event?.creator_id,
        buyer_id: user.id,
        buyer_email: buyerEmail,
        user_tier: userTier,
        ticket_codes: ticketCodes.join(','),
      },
      description: `${quantity}x ${ticket.ticket_name} for ${ticket.event?.title}`,
      receipt_email: buyerEmail,
    });

    // Create pending ticket purchase records
    const purchaseRecords = ticketCodes.map((code, index) => ({
      user_id: user.id,
      event_id: ticket.event?.id,
      ticket_id: ticketId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_paid: ticketPrice,
      currency: 'GBP',
      platform_fee: platformFee / quantity, // Split fee across tickets
      promoter_revenue: promoterRevenue / quantity,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone || null,
      ticket_code: code,
      quantity: 1,
      status: 'pending',
      payment_status: 'pending',
      metadata: {
        user_tier: userTier,
        purchase_index: index + 1,
        total_quantity: quantity,
      }
    }));

    const { data: purchases, error: purchaseError } = await supabase
      .from('ticket_purchases')
      .insert(purchaseRecords)
      .select();

    if (purchaseError) {
      console.error('Error creating purchase records:', purchaseError);
      // Cancel the payment intent if we can't create records
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return NextResponse.json(
        { error: 'Failed to create purchase records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      platformFee: platformFee,
      promoterRevenue: promoterRevenue,
      ticketCodes: ticketCodes,
      purchases: purchases,
    });

  } catch (error) {
    console.error('Ticket purchase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get user's ticket purchases
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    let query = supabase
      .from('ticket_purchases')
      .select(`
        *,
        event:events(
          id,
          title,
          event_date,
          location,
          image_url
        ),
        ticket:event_tickets(
          id,
          ticket_name,
          ticket_type
        )
      `)
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data: purchases, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      purchases: purchases || []
    });

  } catch (error) {
    console.error('Get purchases error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

