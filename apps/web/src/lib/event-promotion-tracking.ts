import type { SupabaseClient } from '@supabase/supabase-js';

export const EVENT_PROMOTION_SOURCES = [
  'notification',
  'feed_card',
  'direct_search',
  'shared_link',
  'other',
] as const;

export type EventPromotionSource = (typeof EVENT_PROMOTION_SOURCES)[number];

const PROMOTION_ATTRIBUTION_SOURCES: EventPromotionSource[] = ['notification', 'feed_card'];

export function isEventPromotionSource(value: string): value is EventPromotionSource {
  return (EVENT_PROMOTION_SOURCES as readonly string[]).includes(value);
}

export function promotionSourceFromRef(ref: string | null | undefined): EventPromotionSource | null {
  const r = String(ref ?? '').trim().toLowerCase();
  if (!r) return null;
  if (r === 'notification' || r === 'push') return 'notification';
  if (r === 'feed_card' || r === 'feed') return 'feed_card';
  if (r === 'shared_link' || r === 'share') return 'shared_link';
  if (r === 'direct_search' || r === 'search') return 'direct_search';
  if (isEventPromotionSource(r)) return r;
  return 'other';
}

export function isPromotionAttributionSource(source: EventPromotionSource): boolean {
  return PROMOTION_ATTRIBUTION_SOURCES.includes(source);
}

/** Record a promotion view/tap (fire-and-forget safe). */
export async function recordEventPromotionInteraction(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  source: EventPromotionSource,
): Promise<void> {
  const { error } = await supabase.from('event_promotion_interactions').insert({
    event_id: eventId,
    user_id: userId,
    source,
    viewed_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[event-promotion] insert interaction failed:', error.message, {
      eventId,
      userId,
      source,
    });
  }
}

/**
 * On ticket purchase: link to most recent interaction for user+event,
 * or create direct_search if none exists.
 */
export async function linkEventPromotionTicketPurchase(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const { data: recent, error: fetchError } = await supabase
    .from('event_promotion_interactions')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('purchased_ticket', false)
    .order('viewed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error('[event-promotion] fetch recent interaction failed:', fetchError.message);
    return;
  }

  if (recent?.id) {
    const { error: updateError } = await supabase
      .from('event_promotion_interactions')
      .update({
        purchased_ticket: true,
        purchased_at: now,
      })
      .eq('id', recent.id);

    if (updateError) {
      console.error('[event-promotion] update purchase link failed:', updateError.message);
    }
    return;
  }

  const { error: insertError } = await supabase.from('event_promotion_interactions').insert({
    event_id: eventId,
    user_id: userId,
    source: 'direct_search',
    viewed_at: now,
    purchased_ticket: true,
    purchased_at: now,
  });

  if (insertError) {
    console.error('[event-promotion] insert direct_search purchase failed:', insertError.message);
  }
}
