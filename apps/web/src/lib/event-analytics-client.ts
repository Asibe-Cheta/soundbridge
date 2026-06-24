/** Fire-and-forget event analytics tracking from the browser. */

import { promotionSourceFromRef } from '@/src/lib/event-promotion-tracking';
import { trackEventPromotionInteraction } from '@/src/lib/event-promotion-tracking-client';

export async function trackEventPageView(eventId: string, ref?: string | null): Promise<void> {
  try {
    await fetch(`/api/events/${eventId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view' }),
    });
  } catch {
    /* non-blocking */
  }

  const promotionSource = promotionSourceFromRef(ref);
  if (promotionSource === 'notification') {
    try {
      await fetch('/api/events/notification-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId }),
      });
    } catch {
      /* non-blocking */
    }
  } else if (promotionSource) {
    trackEventPromotionInteraction(eventId, promotionSource);
  }
}
