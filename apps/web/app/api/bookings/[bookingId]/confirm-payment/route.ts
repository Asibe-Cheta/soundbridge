import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe } from '@/src/lib/stripe-esg';
import { bookingNotificationService } from '@/src/services/BookingNotificationService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/lib/types';
type SupabaseTypedClient = SupabaseClient<Database>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface ConfirmPaymentRequest {
  paymentIntentId: string;
}

const FINAL_STATUSES = ['cancelled', 'completed', 'disputed'];

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

  let payload: ConfirmPaymentRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!payload.paymentIntentId) {
    return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400, headers: corsHeaders });
  }

  type ServiceBookingRow = Database['public']['Tables']['service_bookings']['Row'];
  const supabaseClient = supabase as unknown as SupabaseTypedClient;

  const { data: booking, error: bookingError } = await supabaseClient
    .from('service_bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle<ServiceBookingRow>();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: 'Booking not found', details: bookingError?.message },
      { status: 404, headers: corsHeaders },
    );
  }

  if (booking.booker_id !== user.id) {
    return NextResponse.json({ error: 'You are not allowed to update this booking.' }, { status: 403, headers: corsHeaders });
  }

  if (FINAL_STATUSES.includes(booking.status)) {
    return NextResponse.json(
      { error: `This booking has already been finalised (${booking.status}).` },
      { status: 409, headers: corsHeaders },
    );
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(payload.paymentIntentId);

  if (
    paymentIntent.status !== 'succeeded' &&
    paymentIntent.status !== 'requires_capture' &&
    paymentIntent.status !== 'processing'
  ) {
    return NextResponse.json(
      {
        error: 'Payment has not been completed yet.',
        status: paymentIntent.status,
      },
      { status: 409, headers: corsHeaders },
    );
  }

  const now = new Date().toISOString();
  let holdDays = 14;

  const { count: completedCount, error: completedError } = await supabaseClient
    .from('service_bookings')
    .select('id', { head: true, count: 'exact' })
    .eq('provider_id', booking.provider_id)
    .eq('status', 'completed');

  if (completedError) {
    console.warn('Unable to determine completed booking count for provider', completedError);
  } else if (typeof completedCount === 'number' && completedCount >= 3) {
    holdDays = 7;
  }

  const releaseReference = booking.scheduled_end ?? booking.scheduled_start ?? now;
  const releaseDate = new Date(releaseReference);

  if (!Number.isNaN(releaseDate.valueOf())) {
    releaseDate.setDate(releaseDate.getDate() + holdDays);
  }

  const bookingUpdate: Database['public']['Tables']['service_bookings']['Update'] = {
    status: 'paid' as const,
    paid_at: now,
    stripe_payment_intent_id: paymentIntent.id,
    auto_release_at: Number.isNaN(releaseDate.valueOf()) ? null : releaseDate.toISOString(),
  } satisfies Database['public']['Tables']['service_bookings']['Update'];

  const { data: updatedBooking, error: updateError } = await supabaseClient
    .from('service_bookings')
    .update(bookingUpdate as Database['public']['Tables']['service_bookings']['Update'])
    .eq('id', booking.id)
    .select('*')
    .single<ServiceBookingRow>();

  if (updateError || !updatedBooking) {
    return NextResponse.json(
      { error: 'Failed to update booking status', details: updateError?.message },
      { status: 500, headers: corsHeaders },
    );
  }

  await supabaseClient.from('booking_activity').insert({
    booking_id: booking.id,
    actor_id: user.id,
    action: 'status_changed_paid',
    metadata: {
      payment_intent_id: paymentIntent.id,
      amount: booking.total_amount,
      currency: booking.currency,
      hold_days: holdDays,
      auto_release_at: Number.isNaN(releaseDate.valueOf()) ? null : releaseDate.toISOString(),
    },
  });

  await supabaseClient.from('booking_ledger').insert([
    {
      booking_id: booking.id,
      entry_type: 'charge_captured',
      amount: booking.total_amount,
      currency: booking.currency ?? 'USD',
      metadata: {
        payment_intent_id: paymentIntent.id,
        stripe_status: paymentIntent.status,
      },
    },
    {
      booking_id: booking.id,
      entry_type: 'platform_fee_reserved',
      amount: booking.platform_fee,
      currency: booking.currency ?? 'USD',
      metadata: {
        payment_intent_id: paymentIntent.id,
      },
    },
    {
      booking_id: booking.id,
      entry_type: 'payout_pending',
      amount: booking.provider_payout,
      currency: booking.currency ?? 'USD',
      metadata: {
        payment_intent_id: paymentIntent.id,
        auto_release_at: Number.isNaN(releaseDate.valueOf()) ? null : releaseDate.toISOString(),
      },
    },
  ]);

  const { data: hydratedBooking, error: hydrateError } = await supabaseClient
    .from('service_bookings')
    .select(
      `
        *,
        provider:service_provider_profiles!service_bookings_provider_id_fkey(
          user_id,
          display_name,
          headline,
          rate_currency,
          default_rate,
          is_verified
        ),
        offering:service_offerings!service_bookings_service_offering_id_fkey(
          id,
          title,
          category,
          rate_amount,
          rate_currency,
          rate_unit
        ),
        venue:venues!service_bookings_venue_id_fkey(
          id,
          name,
          address
        )
      `,
    )
    .eq('id', booking.id)
    .single();

  if (hydrateError) {
    console.error('Failed to hydrate booking after payment confirmation', hydrateError);
  }

  try {
    await bookingNotificationService.queuePaymentReceived(bookingId);
  } catch (notificationError) {
    console.error('Failed to queue payment received notifications', notificationError);
  }

  return NextResponse.json(
    {
      booking: hydratedBooking ?? updatedBooking,
      paymentIntentStatus: paymentIntent.status,
    },
    { headers: corsHeaders },
  );
}


