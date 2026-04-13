import type { Metadata } from 'next';
import { createServiceClient } from '@/src/lib/supabase';
import { notFound } from 'next/navigation';
import { getSiteUrl } from '@/src/lib/site-url';

interface Props {
  params: { id: string };
}

const SITE_URL = getSiteUrl();
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.jpg`;

function toAbsoluteUrl(url: string | undefined): string {
  if (!url) return DEFAULT_OG_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

async function getDropTrack(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('audio_tracks')
    .select(
      `
      id,
      title,
      description,
      duration,
      cover_image_url,
      creator:profiles!audio_tracks_creator_id_fkey(
        username,
        display_name,
        avatar_url,
        bio
      )
    `
    )
    .eq('id', id)
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = await getDropTrack(params.id);
  if (!track) {
    return {
      title: 'Drop Not Found — SoundBridge',
      description: 'This drop could not be found on SoundBridge.',
    };
  }

  const creatorName = track.creator?.display_name || track.creator?.username || 'Unknown Artist';
  const url = `${SITE_URL}/drop/${params.id}`;
  const description =
    track.description?.trim() ||
    track.creator?.bio?.trim() ||
    `Listen to "${track.title}" by ${creatorName} on SoundBridge.`;
  const imageUrl = toAbsoluteUrl(track.cover_image_url || track.creator?.avatar_url || undefined);

  return {
    title: `${track.title} by ${creatorName} — SoundBridge`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${track.title} by ${creatorName} — SoundBridge`,
      description,
      url,
      type: 'music.song',
      images: [{ url: imageUrl, alt: `${track.title} cover art` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${track.title} by ${creatorName} — SoundBridge`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function DropPage({ params }: Props) {
  const track = await getDropTrack(params.id);
  if (!track) notFound();

  const creatorName = track.creator?.display_name || track.creator?.username || 'Unknown Artist';
  const url = `${SITE_URL}/drop/${params.id}`;
  const description =
    track.description?.trim() ||
    track.creator?.bio?.trim() ||
    `Listen to "${track.title}" by ${creatorName} on SoundBridge.`;
  const imageUrl = toAbsoluteUrl(track.cover_image_url || track.creator?.avatar_url || undefined);
  const durationSeconds = Number(track.duration || 0);
  const durationIso =
    durationSeconds > 0
      ? `PT${Math.floor(durationSeconds / 60)}M${durationSeconds % 60}S`
      : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.title,
    byArtist: { '@type': 'MusicGroup', name: creatorName },
    url,
    ...(description ? { description } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(durationIso ? { duration: durationIso } : {}),
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-2xl w-full bg-gray-800/60 rounded-2xl p-8 shadow-2xl">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${track.title} cover art`}
            className="w-64 h-64 mx-auto rounded-xl shadow-lg mb-6 object-cover"
          />
        ) : null}
        <h1 className="text-3xl font-bold text-center mb-2">{track.title}</h1>
        <p className="text-gray-300 text-center mb-4">by {creatorName}</p>
        <p className="text-gray-400 text-center mb-8">{description}</p>
        <div className="flex gap-4 justify-center">
          <a href={`/track/${track.id}`} className="px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-700">
            Open Track
          </a>
          <a
            href="https://soundbridge.live"
            className="px-5 py-3 rounded-lg bg-white text-black hover:bg-gray-100"
          >
            Open SoundBridge
          </a>
        </div>
      </div>
    </main>
  );
}
