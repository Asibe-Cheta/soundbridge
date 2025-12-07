import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe } from '@/src/lib/stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/events/create-ticket-payment-intent
 * Create a Stripe Payment Intent for event ticket purchase with 5% platform fee
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { eventId, quantity = 1, currency } = body;

    // Validate required fields
    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required field: eventId' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch event details first to get prices
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_date,
        creator_id,
        price_gbp,
        price_ngn,
        max_attendees,
        current_attendees,
        country
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Determine currency based on event's country or user preference
    // If currency provided in request, use that; otherwise, use event's primary currency
    let validCurrency: string;
    if (currency) {
      validCurrency = currency.toUpperCase();
      if (!['GBP', 'NGN'].includes(validCurrency)) {
        return NextResponse.json(
          { error: 'Invalid currency. Must be GBP or NGN' },
          { status: 400, headers: corsHeaders }
        );
      }
    } else {
      // Default to GBP if event has GBP price, otherwise NGN
      validCurrency = event.price_gbp && event.price_gbp > 0 ? 'GBP' : 'NGN';
    }

    // Get price from event database based on currency
    const ticketPrice = validCurrency === 'GBP'
      ? (event.price_gbp || 0)
      : (event.price_ngn || 0);

    if (ticketPrice <= 0) {
      return NextResponse.json(
        { error: `Event does not have a valid price for ${validCurrency}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify event has tickets available (if max_attendees is set)
    if (event.max_attendees && event.current_attendees >= event.max_attendees) {
      return NextResponse.json(
        { error: 'Event is sold out' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if event has capacity for requested quantity
    if (event.max_attendees && (event.current_attendees + quantity) > event.max_attendees) {
      return NextResponse.json(
        { error: `Only ${event.max_attendees - event.current_attendees} tickets remaining` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get event organizer's Stripe Connect account from creator_bank_accounts table
    const { data: bankAccount, error: bankAccountError } = await supabase
      .from('creator_bank_accounts')
      .select('stripe_account_id, is_verified')
      .eq('user_id', event.creator_id)
      .single();

    // Alternative: Check if stripe_account_id exists in profiles table (fallback)
    let stripeAccountId = bankAccount?.stripe_account_id;
    if (!stripeAccountId) {
      const { data: organizerProfile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', event.creator_id)
        .single();
      stripeAccountId = organizerProfile?.stripe_account_id;
    }

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Event organizer has not set up payment account. Please contact event organizer.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify Stripe account is verified (if bank account record exists)
    if (bankAccount && !bankAccount.is_verified) {
      return NextResponse.json(
        { error: 'Event organizer payment account is not verified. Please contact event organizer.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Stripe
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Calculate total amount and fees
    // Amount stored in smallest currency unit (pence for GBP, kobo for NGN)
    // Both GBP and NGN use 100 as multiplier (1 GBP = 100 pence, 1 NGN = 100 kobo)
    const amountPerTicket = Math.round(ticketPrice * 100);
    const totalAmount = amountPerTicket * quantity;
    
    // Platform fee: 5% of total amount
    const platformFeeAmount = Math.round(totalAmount * 0.05);
    
    // Organizer receives: 95% of total amount
    const organizerAmount = totalAmount - platformFeeAmount;

    // Create Stripe Payment Intent with application fee and transfer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: validCurrency.toLowerCase(),
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        eventId: eventId,
        userId: user.id,
        quantity: quantity.toString(),
        platformFeePercentage: '5',
        ticketPrice: ticketPrice.toString(),
        currency: validCurrency,
      },
      description: `${quantity}x ticket(s) for ${event.title}`,
      receipt_email: user.email || undefined,
    });

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        currency: validCurrency.toLowerCase(),
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error creating ticket payment intent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
        details: error.message 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
