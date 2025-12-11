import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { calculateFees } from '@/src/lib/stripe-esg';
import type { Database } from '@/src/lib/types';
import { bookingNotificationService } from '@/src/services/BookingNotificationService';
import type { BookingStatus } from '@/src/constants/bookings';

type ServiceBookingRow = Database['public']['Tables']['service_bookings']['Row'];
type ServiceBookingInsert = Database['public']['Tables']['service_bookings']['Insert'];
type ServiceBookingUpdate = Database['public']['Tables']['service_bookings']['Update'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only view your own bookings' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;
  type ServiceBookingRow = Database['public']['Tables']['service_bookings']['Row'];
  type ServiceBookingInsert = Database['public']['Tables']['service_bookings']['Insert'];
  type ServiceBookingUpdate = Database['public']['Tables']['service_bookings']['Update'];

  const { data, error: queryError } = await supabaseClient
    .from('service_bookings')
    .select(
      `
        *,
        booker:profiles!service_bookings_booker_id_fkey(
          id,
          display_name,
          username,
          avatar_url
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
    .eq('provider_id', userId)
    .order('scheduled_start', { ascending: true });

  if (queryError) {
    return NextResponse.json(
      { error: 'Failed to load bookings', details: queryError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ bookings: data ?? [] }, { headers: corsHeaders });
}

interface CreateBookingRequest {
  providerId: string;
  bookerId: string;
  serviceOfferingId?: string | null;
  venueId?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  totalAmount: number;
  currency: string;
  bookingNotes?: string | null;
  bookingType: 'service' | 'venue';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  let payload: CreateBookingRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (payload.providerId !== userId) {
    return NextResponse.json(
      { error: 'Provider ID mismatch with URL parameter' },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!payload.bookerId || !payload.scheduledStart || !payload.scheduledEnd) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
  }

  const start = new Date(payload.scheduledStart);
  const end = new Date(payload.scheduledEnd);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    return NextResponse.json({ error: 'Invalid scheduled times' }, { status: 400, headers: corsHeaders });
  }

  // Get service offering category for category-based fee calculation
  let serviceCategory: string | undefined;
  if (payload.serviceOfferingId) {
    const { data: offering } = await supabaseClient
      .from('service_offerings')
      .select('category')
      .eq('id', payload.serviceOfferingId)
      .single();
    serviceCategory = offering?.category;
  }
  
  const { platformFee, providerPayout } = calculateFees(
    payload.totalAmount, 
    payload.bookingType,
    serviceCategory
  );

  const { data: insertData, error: insertError } = await supabaseClient
    .from('service_bookings')
    .insert({
      provider_id: payload.providerId,
      booker_id: payload.bookerId,
      service_offering_id: payload.serviceOfferingId ?? null,
      venue_id: payload.venueId ?? null,
      scheduled_start: payload.scheduledStart,
      scheduled_end: payload.scheduledEnd,
      timezone: payload.timezone,
      total_amount: payload.totalAmount,
      currency: payload.currency,
      booking_notes: payload.bookingNotes ?? null,
      platform_fee: platformFee,
      provider_payout: providerPayout,
      status: 'pending',
    })
    .select('*')
    .single();

  const data = (insertData ?? null) as ServiceBookingRow | null;

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to create booking request', details: insertError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  await supabaseClient.from('booking_activity').insert({
    booking_id: data.id,
    actor_id: user.id,
    action: 'booking_requested',
    metadata: {
      timezone: payload.timezone,
    },
  });

  return NextResponse.json({ booking: data }, { status: 201, headers: corsHeaders });
}

interface UpdateBookingRequest {
  status: BookingStatus;
  notes?: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  let payload: UpdateBookingRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  const bookingId = request.nextUrl.searchParams.get('bookingId');
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId query parameter required' }, { status: 400, headers: corsHeaders });
  }

  const { data: existingBooking, error: fetchError } = await supabaseClient
    .from('service_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !existingBooking) {
    return NextResponse.json(
      { error: 'Booking not found', details: fetchError?.message },
      { status: 404, headers: corsHeaders },
    );
  }

  if (existingBooking.provider_id !== userId && existingBooking.booker_id !== user.id) {
    return NextResponse.json({ error: 'You do not have permission to modify this booking' }, { status: 403, headers: corsHeaders });
  }

  const finalisedStatuses: BookingStatus[] = ['cancelled', 'completed', 'disputed'];
  if (finalisedStatuses.includes(existingBooking.status)) {
    return NextResponse.json(
      { error: `Cannot update a booking once it is ${existingBooking.status}.` },
      { status: 400, headers: corsHeaders },
    );
  }

  const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
    pending: ['pending', 'confirmed_awaiting_payment', 'cancelled'],
    confirmed_awaiting_payment: ['confirmed_awaiting_payment', 'paid', 'cancelled'],
    paid: ['paid', 'completed', 'disputed'],
    completed: ['completed'],
    cancelled: ['cancelled'],
    disputed: ['disputed'],
  };

  if (
    existingBooking.status !== payload.status &&
    !allowedTransitions[existingBooking.status]?.includes(payload.status)
  ) {
    return NextResponse.json(
      {
        error: `Cannot transition booking from ${existingBooking.status} to ${payload.status}.`,
      },
      { status: 400, headers: corsHeaders },
    );
  }

  const now = new Date().toISOString();
  const statusUpdates: Partial<ServiceBookingUpdate> = {
    status: payload.status,
  };
  let holdDaysApplied: number | null = null;

  switch (payload.status) {
    case 'confirmed_awaiting_payment':
      statusUpdates.confirmed_at = now;
      break;
    case 'cancelled':
      statusUpdates.cancelled_at = now;
      statusUpdates.cancellation_reason =
        payload.notes ?? existingBooking.cancellation_reason ?? 'Booking cancelled';
      break;
    case 'paid': {
      statusUpdates.paid_at = now;
      let holdDays = 14;
      const { count: completedCount, error: completedError } = await supabaseClient
        .from('service_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', existingBooking.provider_id)
        .eq('status', 'completed');
      if (completedError) {
        console.error('Failed to determine completed booking count for hold calculation', completedError);
      } else if (typeof completedCount === 'number' && completedCount >= 3) {
        holdDays = 7;
      }
      holdDaysApplied = holdDays;
      const releaseBase = existingBooking.scheduled_end ?? existingBooking.scheduled_start ?? now;
      const releaseDate = new Date(releaseBase);
      if (!Number.isNaN(releaseDate.valueOf())) {
        releaseDate.setDate(releaseDate.getDate() + holdDays);
        statusUpdates.auto_release_at = releaseDate.toISOString();
      }
      break;
    }
    case 'completed':
      statusUpdates.completed_at = now;
      break;
    case 'disputed':
      statusUpdates.disputed_at = now;
      statusUpdates.dispute_reason = payload.notes ?? existingBooking.dispute_reason ?? 'Booking disputed';
      break;
    default:
  }

  if (typeof payload.notes === 'string') {
    statusUpdates.booking_notes = payload.notes;
  }

  const { data: updatedBooking, error: updateError } = await supabaseClient
    .from('service_bookings')
    .update(statusUpdates)
    .eq('id', bookingId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update booking', details: updateError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const activityMetadata: Record<string, unknown> = {
    from: existingBooking.status,
    to: payload.status,
    notes: payload.notes ?? null,
  };
  if (statusUpdates.auto_release_at) {
    activityMetadata.auto_release_at = statusUpdates.auto_release_at;
  }
  if (holdDaysApplied !== null) {
    activityMetadata.hold_days = holdDaysApplied;
  }
  if (statusUpdates.cancellation_reason) {
    activityMetadata.cancellation_reason = statusUpdates.cancellation_reason;
  }
  if (statusUpdates.dispute_reason) {
    activityMetadata.dispute_reason = statusUpdates.dispute_reason;
  }

  await supabaseClient.from('booking_activity').insert({
    booking_id: bookingId,
    actor_id: user.id,
    action: `status_changed_${payload.status}`,
    metadata: activityMetadata,
  });

  const { data: hydratedBooking, error: hydrateError } = await supabaseClient
    .from('service_bookings')
    .select(
      `
        *,
        booker:profiles!service_bookings_booker_id_fkey(
          id,
          display_name,
          username,
          avatar_url
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
    .eq('id', bookingId)
    .single();

  if (hydrateError) {
    console.error('Failed to hydrate booking after status change', hydrateError);
  }

  try {
    if (payload.status === 'confirmed_awaiting_payment') {
      await bookingNotificationService.queueBookingConfirmed(bookingId);
    } else if (payload.status === 'cancelled') {
      await bookingNotificationService.queueBookingCancelled(bookingId, statusUpdates.cancellation_reason ?? null);
    } else if (payload.status === 'disputed') {
      await bookingNotificationService.queueBookingDisputed(bookingId, statusUpdates.dispute_reason ?? null);
    }
  } catch (notificationError) {
    console.error('Failed to queue booking status notification', notificationError);
  }

  return NextResponse.json({ booking: hydratedBooking ?? updatedBooking }, { headers: corsHeaders });
}

