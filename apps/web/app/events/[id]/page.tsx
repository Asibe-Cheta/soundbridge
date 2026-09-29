import type { Metadata } from 'next';
import { createServiceClient } from '../../../src/lib/supabase';
import { EventDetailClient } from './EventDetailClient';

// Server-rendered so a shared link actually produces a real preview (title/description/
// image) when pasted into WhatsApp/iMessage/Twitter/etc. — those unfurlers don't run JS,
// so the previous fully-client-rendered page always showed the generic site title/no
// image no matter what event was shared. Service-role client: this page must work for a
// completely logged-out visitor, so it can't depend on any session/RLS context.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: event } = await supabase
    .from('events')
    .select('title, description, image_url, event_date, location, venue')
    .eq('id', id)
    .maybeSingle();

  if (!event) {
    return { title: 'Event' };
  }

  const description =
    event.description?.slice(0, 200) ||
    `${event.venue || event.location} · ${new Date(event.event_date).toLocaleDateString()}`;

  return {
    // Bare title — the root layout's title template ('%s | SoundBridge') already appends
    // the suffix; adding it here too produced "Event | SoundBridge | SoundBridge".
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: 'website',
      ...(event.image_url ? { images: [{ url: event.image_url }] } : {}),
    },
    twitter: {
      card: event.image_url ? 'summary_large_image' : 'summary',
      title: event.title,
      description,
      ...(event.image_url ? { images: [event.image_url] } : {}),
    },
  };
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <EventDetailClient params={params} />;
}
