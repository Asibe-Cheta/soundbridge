import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bundleId, buyerName, buyerEmail, buyerPhone } = body;

    if (!bundleId || !buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get bundle details
    const { data: bundle, error: bundleError } = await supabase
      .from('event_bundles')
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
            display_name
          )
        ),
        ticket:event_tickets(
          id,
          ticket_name,
          ticket_type
        )
      `)
      .eq('id', bundleId)
      .eq('is_active', true)
      .single();

    if (bundleError || !bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      );
    }

    // Check availability
    if (bundle.quantity_available !== null && bundle.quantity_sold >= bundle.quantity_available) {
      return NextResponse.json(
        { error: 'Bundle no longer available' },
        { status: 400 }
      );
    }

    // Check sales window
    const now = new Date();
    if (bundle.available_from && new Date(bundle.available_from) > now) {
      return NextResponse.json(
        { error: 'Bundle not yet available' },
        { status: 400 }
      );
    }

    if (bundle.available_until && new Date(bundle.available_until) < now) {
      return NextResponse.json(
        { error: 'Bundle no longer available' },
        { status: 400 }
      );
    }

    // Get user tier for fee calculation
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const userTier = subscription?.tier || 'free';

    // Calculate fees
    const PLATFORM_FEE_PERCENT = userTier === 'free' ? 5.0 :
                                 userTier === 'pro' ? 3.5 : 2.5;
    
    const bundlePrice = parseFloat(bundle.bundle_price || '0');
    const platformFee = bundlePrice * (PLATFORM_FEE_PERCENT / 100);
    const promoterRevenue = bundlePrice - platformFee;

    // Verify promoter has Stripe Connect
    const promoterStripeAccount = bundle.event?.creator?.stripe_account_id;
    
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

    // Generate ticket code
    const { data: ticketCode } = await supabase.rpc('generate_ticket_code');

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(bundlePrice * 100),
      currency: 'gbp',
      application_fee_amount: Math.round(platformFee * 100),
      transfer_data: {
        destination: promoterStripeAccount,
      },
      metadata: {
        bundle_id: bundleId,
        event_id: bundle.event?.id,
        event_title: bundle.event?.title,
        ticket_id: bundle.ticket_id,
        promoter_id: bundle.event?.creator_id,
        buyer_id: user.id,
        buyer_email: buyerEmail,
        user_tier: userTier,
        is_bundle: 'true',
        bundled_tracks: JSON.stringify(bundle.bundled_track_ids || []),
      },
      description: `${bundle.bundle_name} for ${bundle.event?.title}`,
      receipt_email: buyerEmail,
    });

    // Create bundle purchase record
    const { data: bundlePurchase, error: bundlePurchaseError } = await supabase
      .from('bundle_purchases')
      .insert({
        bundle_id: bundleId,
        user_id: user.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_paid: bundlePrice,
        platform_fee: platformFee,
        status: 'pending',
      })
      .select()
      .single();

    if (bundlePurchaseError) {
      console.error('Error creating bundle purchase:', bundlePurchaseError);
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return NextResponse.json(
        { error: 'Failed to create bundle purchase' },
        { status: 500 }
      );
    }

    // Create ticket purchase record (part of bundle)
    const { data: ticketPurchase, error: ticketError } = await supabase
      .from('ticket_purchases')
      .insert({
        user_id: user.id,
        event_id: bundle.event?.id,
        ticket_id: bundle.ticket_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_paid: bundlePrice,
        currency: 'GBP',
        platform_fee: platformFee,
        promoter_revenue: promoterRevenue,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone || null,
        ticket_code: ticketCode,
        quantity: 1,
        status: 'pending',
        payment_status: 'pending',
        bundle_purchase_id: bundlePurchase.id,
        metadata: {
          is_bundle: true,
          bundle_name: bundle.bundle_name,
          bundled_tracks: bundle.bundled_track_ids,
          discount_percent: bundle.discount_percent,
        }
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket purchase:', ticketError);
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return NextResponse.json(
        { error: 'Failed to create ticket purchase' },
        { status: 500 }
      );
    }

    // Grant access to bundled tracks
    if (bundle.bundled_track_ids && bundle.bundled_track_ids.length > 0) {
      const trackAccess = bundle.bundled_track_ids.map((trackId: string) => ({
        user_id: user.id,
        track_id: trackId,
        access_granted_at: new Date().toISOString(),
        access_reason: 'bundle_purchase',
        bundle_purchase_id: bundlePurchase.id,
      }));

      await supabase
        .from('user_track_access')
        .insert(trackAccess);
    }

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      bundlePurchase: bundlePurchase,
      ticketPurchase: ticketPurchase,
      bundledTracks: bundle.bundled_track_ids || [],
      savings: parseFloat(bundle.individual_price) - bundlePrice,
      discountPercent: bundle.discount_percent,
    });

  } catch (error) {
    console.error('Bundle purchase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new bundle (for event creators)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      eventId,
      ticketId,
      bundleName,
      description,
      bundledTrackIds = [],
      individualPrice,
      bundlePrice,
      quantityAvailable,
      availableFrom,
      availableUntil,
    } = body;

    // Verify user owns the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('creator_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event || event.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Create bundle
    const { data: bundle, error } = await supabase
      .from('event_bundles')
      .insert({
        event_id: eventId,
        ticket_id: ticketId,
        bundle_name: bundleName,
        description: description,
        bundled_track_ids: bundledTrackIds,
        bundled_content_type: bundledTrackIds.length > 0 ? 'track' : 'none',
        individual_price: individualPrice,
        bundle_price: bundlePrice,
        quantity_available: quantityAvailable || null,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      bundle: bundle
    });

  } catch (error) {
    console.error('Create bundle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

