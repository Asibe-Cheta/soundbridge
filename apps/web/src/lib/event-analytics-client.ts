/** Fire-and-forget event analytics tracking from the browser. */

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

  if (ref === 'notification') {
    try {
      await fetch('/api/events/notification-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
    } catch {
      /* non-blocking */
    }
  }
}
