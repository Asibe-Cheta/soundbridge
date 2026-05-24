import type { SupabaseClient } from '@supabase/supabase-js';

export const EVENT_TRACK_ACTIONS = [
  'view',
  'bookmark',
  'unbookmark',
  'share_link',
  'share_card',
] as const;

export type EventTrackAction = (typeof EVENT_TRACK_ACTIONS)[number];

export type EventAnalyticsRow = {
  id: string;
  event_id: string;
  creator_id: string;
  notifications_sent: number;
  notifications_opened: number;
  event_page_views: number;
  bookmarks_count: number;
  shares_link_count: number;
  shares_card_count: number;
  ticket_sales_count: number;
  ticket_sales_revenue: number;
  views_by_city: Record<string, number> | null;
  views_by_genre_match: Record<string, number> | null;
  notification_open_rate: number | null;
  peak_view_hour: number | null;
  updated_at: string;
};

export function isEventTrackAction(value: string): value is EventTrackAction {
  return (EVENT_TRACK_ACTIONS as readonly string[]).includes(value);
}

async function ensureEventAnalyticsRow(
  supabase: SupabaseClient,
  eventId: string,
): Promise<string | null> {
  const { data: event } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', eventId)
    .maybeSingle();

  if (!event?.creator_id) return null;

  await supabase.from('event_analytics').upsert(
    { event_id: eventId, creator_id: event.creator_id },
    { onConflict: 'event_id', ignoreDuplicates: true },
  );

  return event.creator_id;
}

export async function trackEventAction(
  supabase: SupabaseClient,
  eventId: string,
  action: EventTrackAction,
): Promise<void> {
  const { error } = await supabase.rpc('track_event_action', {
    p_event_id: eventId,
    p_action: action,
  });
  if (error) {
    console.error('[event-analytics] track_event_action failed:', error.message, { eventId, action });
  }
}

export async function incrementEventNotificationsSent(
  supabase: SupabaseClient,
  eventId: string,
  count = 1,
): Promise<void> {
  if (count <= 0) return;
  if (!(await ensureEventAnalyticsRow(supabase, eventId))) return;

  const { data: row } = await supabase
    .from('event_analytics')
    .select('notifications_sent')
    .eq('event_id', eventId)
    .maybeSingle();

  await supabase
    .from('event_analytics')
    .update({
      notifications_sent: (row?.notifications_sent ?? 0) + count,
      updated_at: new Date().toISOString(),
    })
    .eq('event_id', eventId);
}

export async function incrementEventNotificationsOpened(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  if (!(await ensureEventAnalyticsRow(supabase, eventId))) return;

  const { data: row } = await supabase
    .from('event_analytics')
    .select('notifications_sent, notifications_opened')
    .eq('event_id', eventId)
    .maybeSingle();

  const opened = (row?.notifications_opened ?? 0) + 1;
  const sent = row?.notifications_sent ?? 0;
  const openRate = sent > 0 ? Math.round((opened / sent) * 10000) / 100 : null;

  await supabase
    .from('event_analytics')
    .update({
      notifications_opened: opened,
      notification_open_rate: openRate,
      updated_at: new Date().toISOString(),
    })
    .eq('event_id', eventId);
}

export async function incrementEventTicketSales(
  supabase: SupabaseClient,
  eventId: string,
  quantity: number,
  revenueMajor: number,
): Promise<void> {
  if (!(await ensureEventAnalyticsRow(supabase, eventId))) return;

  const { data: row } = await supabase
    .from('event_analytics')
    .select('ticket_sales_count, ticket_sales_revenue')
    .eq('event_id', eventId)
    .maybeSingle();

  await supabase
    .from('event_analytics')
    .update({
      ticket_sales_count: (row?.ticket_sales_count ?? 0) + quantity,
      ticket_sales_revenue: Number(row?.ticket_sales_revenue ?? 0) + revenueMajor,
      updated_at: new Date().toISOString(),
    })
    .eq('event_id', eventId);
}

export function computeEventStatus(event: {
  event_date: string;
  status?: string | null;
}): 'Upcoming' | 'Live' | 'Past' | 'Cancelled' {
  if (event.status === 'cancelled') return 'Cancelled';
  const start = new Date(event.event_date);
  const now = new Date();
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  if (event.status === 'completed' || (start < now && now > end)) return 'Past';
  if (start <= now && now <= end) return 'Live';
  if (start > now) return 'Upcoming';
  return 'Past';
}
