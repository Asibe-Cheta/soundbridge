import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { calculateFees } from '@/src/lib/stripe-esg';
import { bookingNotificationService } from '@/src/services/BookingNotificationService';
import type { Database } from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed_awaiting_payment', 'paid', 'completed'] as const;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;
  const statusFilter = request.nextUrl.searchParams.get('status');
  const statuses = statusFilter ? statusFilter.split(',') : null;

  const query = supabaseClient
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
    .eq('booker_id', user.id)
    .order('created_at', { ascending: false });

  if (statuses && statuses.length > 0) {
    query.in('status', statuses);
  }

  const { data, error: listError } = await query;

  if (listError) {
    return NextResponse.json(
      { error: 'Failed to load bookings', details: listError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ bookings: data ?? [] }, { headers: corsHeaders });
}

interface CreateBookingRequest {
  providerId: string;
  serviceOfferingId?: string | null;
  venueId?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  timezone?: string;
  totalAmount: number;
  currency?: string;
  bookingNotes?: string | null;
  bookingType: 'service' | 'venue';
}

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  type ServiceProviderProfileRow = Database['public']['Tables']['service_provider_profiles']['Row'];
  type ServiceOfferingRow = Database['public']['Tables']['service_offerings']['Row'];
  type AvailabilityRow = Database['public']['Tables']['service_provider_availability']['Row'];
  type ServiceBookingRow = Database['public']['Tables']['service_bookings']['Row'];

  const supabaseClient = supabase as any;
  let payload: CreateBookingRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!payload.providerId) {
    return NextResponse.json({ error: 'providerId is required' }, { status: 400, headers: corsHeaders });
  }
  if (!payload.scheduledStart || !payload.scheduledEnd) {
    return NextResponse.json({ error: 'scheduledStart and scheduledEnd are required' }, { status: 400, headers: corsHeaders });
  }
  if (!payload.bookingType || !['service', 'venue'].includes(payload.bookingType)) {
    return NextResponse.json({ error: 'bookingType must be either "service" or "venue"' }, { status: 400, headers: corsHeaders });
  }
  if (!payload.totalAmount || payload.totalAmount <= 0) {
    return NextResponse.json({ error: 'totalAmount must be greater than zero' }, { status: 400, headers: corsHeaders });
  }

  const startTime = new Date(payload.scheduledStart);
  const endTime = new Date(payload.scheduledEnd);

  if (Number.isNaN(startTime.valueOf()) || Number.isNaN(endTime.valueOf())) {
    return NextResponse.json({ error: 'scheduledStart and scheduledEnd must be valid date strings' }, { status: 400, headers: corsHeaders });
  }

  if (endTime <= startTime) {
    return NextResponse.json({ error: 'scheduledEnd must be after scheduledStart' }, { status: 400, headers: corsHeaders });
  }

  const { data: providerData, error: providerError } = await supabaseClient
    .from('service_provider_profiles')
    .select('*')
    .eq('user_id', payload.providerId)
    .single();

  const providerProfile = (providerData ?? null) as ServiceProviderProfileRow | null;

  if (providerError || !providerProfile) {
    return NextResponse.json({ error: 'Provider not found', details: providerError?.message }, { status: 404, headers: corsHeaders });
  }

  if (providerProfile.status !== 'active') {
    return NextResponse.json(
      { error: 'This provider is not currently accepting bookings.' },
      { status: 409, headers: corsHeaders },
    );
  }

  if (payload.serviceOfferingId) {
    const { data: offeringData, error: offeringError } = await supabaseClient
      .from('service_offerings')
      .select('*')
      .eq('id', payload.serviceOfferingId)
      .eq('provider_id', payload.providerId)
      .single();

    const offering = (offeringData ?? null) as ServiceOfferingRow | null;

    if (offeringError || !offering) {
      return NextResponse.json(
        { error: 'Service offering not found for this provider', details: offeringError?.message },
        { status: 404, headers: corsHeaders },
      );
    }

    if (!offering.is_active) {
      return NextResponse.json(
        { error: 'This service offering is not currently bookable.' },
        { status: 409, headers: corsHeaders },
      );
    }
  }

  const { data: availabilitySlots, error: availabilityError } = await supabaseClient
    .from('service_provider_availability')
    .select('*')
    .eq('provider_id', payload.providerId)
    .eq('is_bookable', true);

  if (availabilityError) {
    return NextResponse.json(
      { error: 'Failed to verify availability', details: availabilityError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const timezone = payload.timezone ?? providerProfile.timezone ?? 'UTC';
  const hasMatchingSlot =
    (availabilitySlots as AvailabilityRow[] | null)?.some((slot) => {
      if (!slot) return false;
      const slotStart = new Date(slot.start_time);
      const slotEnd = new Date(slot.end_time);
      return slotStart <= startTime && slotEnd >= endTime;
    }) ?? false;

  if (!hasMatchingSlot) {
    return NextResponse.json(
      {
        error: 'This provider has no availability covering the requested time. Try another slot.',
      },
      { status: 409, headers: corsHeaders },
    );
  }

  const { data: existingBookings, error: bookingsError } = await supabaseClient
    .from('service_bookings')
    .select('id, scheduled_start, scheduled_end, status')
    .eq('provider_id', payload.providerId)
    .in('status', Array.from(ACTIVE_BOOKING_STATUSES));

  if (bookingsError) {
    return NextResponse.json(
      { error: 'Failed to check booking overlaps', details: bookingsError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const hasConflict =
    (existingBookings as ServiceBookingRow[] | null)?.some((booking) => {
      const existingStart = new Date(booking.scheduled_start);
      const existingEnd = new Date(booking.scheduled_end);
      return existingStart < endTime && existingEnd > startTime;
    }) ?? false;

  if (hasConflict) {
    return NextResponse.json(
      {
        error: 'The provider already has a booking that overlaps with this time. Please choose another slot.',
      },
      { status: 409, headers: corsHeaders },
    );
  }

  const { platformFee, providerPayout } = calculateFees(payload.totalAmount, payload.bookingType);

  const { data: bookingData, error: insertError } = await supabaseClient
    .from('service_bookings')
    .insert({
      provider_id: payload.providerId,
      booker_id: user.id,
      service_offering_id: payload.serviceOfferingId ?? null,
      venue_id: payload.venueId ?? null,
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      timezone,
      total_amount: payload.totalAmount,
      currency: payload.currency ?? providerProfile.rate_currency ?? 'USD',
      booking_notes: payload.bookingNotes ?? null,
      platform_fee: platformFee,
      provider_payout: providerPayout,
      status: 'pending',
    })
    .select('*')
    .single();

  const booking = (bookingData ?? null) as ServiceBookingRow | null;

  if (insertError || !booking) {
    return NextResponse.json(
      { error: 'Failed to create booking request', details: insertError?.message },
      { status: 500, headers: corsHeaders },
    );
  }

  await supabaseClient.from('booking_activity').insert({
    booking_id: booking.id,
    actor_id: user.id,
    action: 'booking_requested',
    metadata: {
      from: 'booker',
      timezone,
      booking_type: payload.bookingType,
    },
  });

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
    console.error('Booking created but failed to hydrate response', hydrateError);
  }

  try {
    await bookingNotificationService.queueBookingRequested(booking.id);
  } catch (notificationError) {
    console.error('Failed to queue booking requested notifications', notificationError);
  }

  return NextResponse.json(
    { booking: hydratedBooking ?? booking, message: 'Booking requested successfully.' },
    { status: 201, headers: corsHeaders },
  );
}


