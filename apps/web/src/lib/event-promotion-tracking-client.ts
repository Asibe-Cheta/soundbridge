import type { EventPromotionSource } from '@/src/lib/event-promotion-tracking';

/** Non-blocking promotion interaction tracking from the browser. */
export function trackEventPromotionInteraction(
  eventId: string,
  source: EventPromotionSource,
): void {
  void fetch('/api/events/promotion-interaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ event_id: eventId, source }),
  }).catch(() => {
    /* analytics must not block navigation */
  });
}
