import { createBrowserClient } from './supabase';
import type { Database } from './types';

const supabase = createBrowserClient();

export type BookingStatus =
  | 'pending'
  | 'confirmed_awaiting_payment'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface CreateBookingPayload {
  providerId: string;
  bookerId: string;
  serviceOfferingId?: string;
  venueId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  totalAmount: number;
  currency: string;
  bookingNotes?: string;
}

export const bookingService = {
  async createBooking(payload: CreateBookingPayload) {
    const { data, error } = await supabase
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
        status: 'pending',
      })
      .select('*')
      .single();

    return { data, error };
  },

  async listBookingsForProvider(providerId: string) {
    return supabase
      .from('service_bookings')
      .select('*')
      .eq('provider_id', providerId)
      .order('scheduled_start', { ascending: true });
  },

  async listBookingsForBooker(bookerId: string) {
    return supabase
      .from('service_bookings')
      .select('*')
      .eq('booker_id', bookerId)
      .order('created_at', { ascending: false });
  },

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    fields: Partial<Database['public']['Tables']['service_bookings']['Update']> = {},
  ) {
    const { data, error } = await supabase
      .from('service_bookings')
      .update({
        status,
        ...fields,
      })
      .eq('id', bookingId)
      .select('*')
      .single();

    return { data, error };
  },
};

export type BookingRecord = Database['public']['Tables']['service_bookings']['Row'];

