export type FeedEventRecord = {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  location?: string | null;
  venue?: string | null;
  city?: string | null;
  category?: string | null;
  image_url?: string | null;
  ticket_price?: number | null;
  tickets_available?: number | null;
  country?: string | null;
  price_gbp?: number | null;
  price_ngn?: number | null;
  max_attendees?: number | null;
  current_attendees?: number | null;
};

export function currencySymbolForCountry(country?: string | null): string {
  const c = String(country ?? '').trim().toUpperCase();
  if (c === 'NG' || c === 'NIGERIA') return '₦';
  if (c === 'GH' || c === 'GHANA') return '₵';
  if (c === 'KE' || c === 'KENYA') return 'KSh';
  if (c === 'US' || c === 'USA' || c === 'UNITED STATES') return '$';
  if (c === 'CA' || c === 'CANADA') return 'CA$';
  if (c === 'EU' || c === 'EUROPE') return '€';
  return '£';
}

export function resolveEventTicketPrice(event: FeedEventRecord): number {
  const country = String(event.country ?? '').toUpperCase();
  if ((country === 'NG' || country === 'NIGERIA') && event.price_ngn != null) {
    return Number(event.price_ngn);
  }
  if (event.ticket_price != null && Number(event.ticket_price) > 0) {
    return Number(event.ticket_price);
  }
  if (event.price_gbp != null && Number(event.price_gbp) > 0) {
    return Number(event.price_gbp);
  }
  return 0;
}

export function resolveTicketsAvailable(event: FeedEventRecord): number {
  if (event.tickets_available != null) {
    return Number(event.tickets_available);
  }
  const max = Number(event.max_attendees ?? 0);
  const current = Number(event.current_attendees ?? 0);
  if (max > 0) {
    return Math.max(0, max - current);
  }
  return 0;
}

export function eventCtaLabel(event: FeedEventRecord): string {
  const price = resolveEventTicketPrice(event);
  const available = resolveTicketsAvailable(event);
  const symbol = currencySymbolForCountry(event.country);

  if (price > 0) {
    return `Buy Ticket — ${symbol}${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
  }
  if (available > 0) {
    return 'Register Free';
  }
  return 'View Event';
}

export function formatEventLongDate(eventDate: string): string {
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return eventDate;
  return date.toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatEventShortDate(eventDate: string): string {
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return eventDate;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatEventLocation(event: FeedEventRecord): string {
  const parts = [event.venue, event.location, event.city, event.country].filter(Boolean);
  return parts.join(' · ') || 'Location TBA';
}

export function formatEventCity(event: FeedEventRecord): string {
  if (event.city) return event.city;
  const loc = String(event.location ?? '');
  return loc.split(',')[0]?.trim() || loc || '—';
}

export function formatMiniCardPrice(event: FeedEventRecord): string {
  const price = resolveEventTicketPrice(event);
  const symbol = currencySymbolForCountry(event.country);
  if (price > 0) {
    return `${symbol}${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
  }
  return 'Free';
}

export async function incrementEventFeedStat(
  eventId: string,
  field: 'feed_impressions' | 'feed_cta_taps',
): Promise<void> {
  try {
    await fetch('/api/events/feed-stat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ event_id: eventId, field }),
    });
  } catch {
    // Analytics must never break the UI
  }
}
