import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe } from '@/src/lib/stripe-esg';
import type { Database } from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500, headers: corsHeaders });
  }

  const { bookingId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  type ServiceBookingRow = Database['public']['Tables']['service_bookings']['Row'];
  type ProviderConnectAccountRow = Database['public']['Tables']['provider_connect_accounts']['Row'];

  const supabaseClient = supabase as any;

  const { data: bookingData, error: bookingError } = await supabaseClient
    .from('service_bookings')
    .select(
      `
        *,
        provider_profile:service_provider_profiles!service_bookings_provider_id_fkey(
          user_id,
          display_name
        )
      `,
    )
    .eq('id', bookingId)
    .single();

  const booking = (bookingData ?? null) as (ServiceBookingRow & {
    provider_profile?: { display_name?: string | null } | null;
  }) | null;

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: 'Booking not found', details: bookingError?.message },
      { status: 404, headers: corsHeaders },
    );
  }

  if (booking.booker_id !== user.id) {
    return NextResponse.json(
      { error: 'You do not have permission to pay for this booking.' },
      { status: 403, headers: corsHeaders },
    );
  }

  if (booking.status !== 'confirmed_awaiting_payment') {
    return NextResponse.json(
      { error: 'Payment can only be initiated once the provider has confirmed the booking.' },
      { status: 409, headers: corsHeaders },
    );
  }

  const { data: connectData, error: connectError } = await supabaseClient
    .from('provider_connect_accounts')
    .select('*')
    .eq('provider_id', booking.provider_id)
    .single();

  const connectAccount = (connectData ?? null) as ProviderConnectAccountRow | null;

  if (connectError || !connectAccount?.stripe_account_id) {
    return NextResponse.json(
      { error: 'The provider has not completed payout setup yet. Please try again later.' },
      { status: 409, headers: corsHeaders },
    );
  }

  if (
    !connectAccount.charges_enabled ||
    !connectAccount.payouts_enabled ||
    !connectAccount.details_submitted
  ) {
    return NextResponse.json(
      {
        error:
          'The provider is finalising their payout setup. We will notify you once they are ready to accept payments.',
      },
      { status: 409, headers: corsHeaders },
    );
  }

  const amountInMinorUnits = Math.round(Number(booking.total_amount) * 100);
  if (!Number.isFinite(amountInMinorUnits) || amountInMinorUnits <= 0) {
    return NextResponse.json(
      { error: 'Invalid booking amount. Please contact support.' },
      { status: 422, headers: corsHeaders },
    );
  }

  let paymentIntentId = booking.stripe_payment_intent_id ?? null;

  if (paymentIntentId) {
    try {
      const existingIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (existingIntent.status === 'requires_payment_method' || existingIntent.status === 'requires_confirmation') {
        return NextResponse.json(
          {
            paymentIntentId: existingIntent.id,
            clientSecret: existingIntent.client_secret,
            status: existingIntent.status,
          },
          { headers: corsHeaders },
        );
      }

      if (existingIntent.status === 'succeeded' || existingIntent.status === 'requires_capture') {
        return NextResponse.json(
          {
            paymentIntentId: existingIntent.id,
            clientSecret: existingIntent.client_secret,
            status: existingIntent.status,
          },
          { headers: corsHeaders },
        );
      }

      if (existingIntent.status === 'canceled') {
        paymentIntentId = null;
      }
    } catch (intentError) {
      console.warn('Failed to reuse payment intent, creating a new one instead', intentError);
      paymentIntentId = null;
    }
  }

  if (!paymentIntentId) {
    const applicationFeeAmount = Math.round(Number(booking.platform_fee) * 100);
    const currency = booking.currency ?? 'USD';

    const newIntent = await stripe.paymentIntents.create({
      amount: amountInMinorUnits,
      currency,
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: connectAccount?.stripe_account_id ?? undefined,
      },
      application_fee_amount: applicationFeeAmount,
      metadata: {
        bookingId: booking.id,
        providerId: booking.provider_id,
        bookerId: booking.booker_id,
      },
      description: `SoundBridge booking with ${booking.provider_profile?.display_name ?? 'provider'}`,
    });

    paymentIntentId = newIntent.id;

    const { error: updateError } = await supabaseClient
      .from('service_bookings')
      .update({
        stripe_payment_intent_id: newIntent.id,
        currency,
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Booking updated but failed to persist payment intent id', updateError);
    }

    await supabaseClient.from('booking_activity').insert({
      booking_id: booking.id,
      actor_id: user.id,
      action: 'payment_intent_created',
      metadata: {
        payment_intent_id: newIntent.id,
        amount: booking.total_amount,
        currency,
      },
    });

    return NextResponse.json(
      {
        paymentIntentId: newIntent.id,
        clientSecret: newIntent.client_secret,
        status: newIntent.status,
      },
      { headers: corsHeaders },
    );
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return NextResponse.json(
    {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status,
    },
    { headers: corsHeaders },
  );
}


