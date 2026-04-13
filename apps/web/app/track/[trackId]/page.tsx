import { Metadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';
import { notFound } from 'next/navigation';
import TrackActionsClient from '@/src/components/track/TrackActionsClient';
import { SellContentSection } from '@/src/components/monetization/SellContentSection';
import { ContentPurchaseSection } from '@/src/components/monetization/ContentPurchaseSection';
import { getSiteUrl } from '@/src/lib/site-url';

interface Props {
  params: { trackId: string };
}

const SITE_URL = getSiteUrl();
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.jpg`;

function toAbsoluteUrl(url: string | undefined): string {
  if (!url) return DEFAULT_OG_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {}
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );

  const { data: track } = await supabase
    .from('audio_tracks')
    .select(`
      id,
      title,
      description,
      duration,
      cover_image_url,
      genre,
      updated_at,
      creator:profiles!audio_tracks_creator_id_fkey(
        username,
        display_name,
        avatar_url,
        bio
      )
    `)
    .eq('id', params.trackId)
    .single();

  if (!track) {
    return {
      title: 'Track Not Found - SoundBridge',
    };
  }

  const creatorName = track.creator?.display_name || track.creator?.username || 'Unknown Artist';
  const trackUrl = `${SITE_URL}/track/${params.trackId}`;
  const description =
    track.description?.trim() ||
    track.creator?.bio?.trim() ||
    `Listen to "${track.title}" by ${creatorName} on SoundBridge.`;
  const imageUrl = toAbsoluteUrl(track.cover_image_url || track.creator?.avatar_url || undefined);

  return {
    title: `${track.title} by ${creatorName} — SoundBridge`,
    description,
    openGraph: {
      title: `${track.title} by ${creatorName} — SoundBridge`,
      description,
      url: trackUrl,
      siteName: 'SoundBridge',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: `${track.title} cover art`,
        },
      ],
      type: 'music.song',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${track.title} by ${creatorName} — SoundBridge`,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: trackUrl,
    },
  };
}

export default async function TrackPage({ params }: Props) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {}
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );

  const { data: track } = await supabase
    .from('audio_tracks')
    .select(`
      *,
      creator:profiles!audio_tracks_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('id', params.trackId)
    .single();

  if (!track) {
    notFound();
  }

  // Get current authenticated user to determine ownership (for report/counter-notice UX)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user && user.id === track.creator_id;
  const creatorName = track.creator?.display_name || track.creator?.username || 'Unknown Artist';
  const mixedByName = (track as { dj_name?: string | null }).dj_name || null;
  const isMixtape = !!(track as { is_mixtape?: boolean | null }).is_mixtape;
  const trackUrl = `${SITE_URL}/track/${params.trackId}`;
  const trackDescription =
    (track as { description?: string | null }).description?.trim() ||
    `Listen to "${track.title}" by ${creatorName} on SoundBridge.`;
  const imageUrl = toAbsoluteUrl(
    (track as { cover_image_url?: string | null }).cover_image_url ||
      (track.creator as { avatar_url?: string | null })?.avatar_url ||
      undefined
  );
  const durationSeconds = Number((track as { duration?: number | null }).duration || 0);
  const durationIso =
    durationSeconds > 0
      ? `PT${Math.floor(durationSeconds / 60)}M${durationSeconds % 60}S`
      : undefined;
  const trackJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.title,
    byArtist: {
      '@type': 'MusicGroup',
      name: creatorName,
    },
    url: trackUrl,
    ...(trackDescription ? { description: trackDescription } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(durationIso ? { duration: durationIso } : {}),
  };

  // Fetch latest takedown (if any) for this track so owner can submit counter-notice
  const { data: takedown } = await supabase
    .from('takedowns')
    .select('id, status')
    .eq('content_id', track.id)
    .eq('content_type', 'track')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(trackJsonLd) }}
      />
      <div className="max-w-2xl w-full">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          {/* Cover Image */}
          {track.cover_image_url && (
            <img
              src={track.cover_image_url}
              alt={`${track.title} cover art`}
              className="w-64 h-64 mx-auto rounded-xl shadow-lg mb-6 object-cover"
            />
          )}

          {/* Track Info */}
          <h1 className="text-4xl font-bold text-center mb-2">{track.title}</h1>
          <p className="text-xl text-gray-300 text-center mb-3">
            {isMixtape && mixedByName ? `Mixed by: ${mixedByName}` : `by ${creatorName}`}
          </p>

          {isMixtape && (
            <div className="flex justify-center mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Mix
              </span>
            </div>
          )}

          {track.genre && (
            <div className="flex justify-center mb-6">
              <span className="px-4 py-2 bg-purple-600/30 rounded-full text-sm">
                {track.genre}
              </span>
            </div>
          )}

          {(track as { tracklist?: string | null }).tracklist && (
            <div className="mb-6 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
              <h3 className="text-sm font-semibold text-amber-300 mb-2">Tracklist</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                {(track as { tracklist?: string | null }).tracklist}
              </pre>
            </div>
          )}

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-8 text-center">
            <div>
              <div className="text-2xl font-bold">{track.play_count?.toLocaleString() || 0}</div>
              <div className="text-sm text-gray-400">Plays</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{track.like_count?.toLocaleString() || 0}</div>
              <div className="text-sm text-gray-400">Likes</div>
            </div>
          </div>

          <SellContentSection
            resource="track"
            resourceId={track.id}
            isOwner={isOwner}
            initial={{
              is_paid: !!(track as { is_paid?: boolean }).is_paid,
              price: (track as { price?: number | null }).price ?? null,
              currency: (track as { currency?: string | null }).currency ?? null,
              total_sales_count: (track as { total_sales_count?: number | null }).total_sales_count ?? null,
            }}
          />

          <ContentPurchaseSection
            contentType="track"
            contentId={track.id}
            title={track.title}
            price={Number((track as { price?: number | null }).price ?? 0)}
            currency={(track as { currency?: string | null }).currency || 'USD'}
            coverUrl={
              (track as { cover_image_url?: string | null }).cover_image_url ||
              (track as { cover_art_url?: string | null }).cover_art_url ||
              null
            }
            creatorLabel={creatorName}
            isOwner={isOwner}
            isPaid={!!(track as { is_paid?: boolean }).is_paid}
          />

          {/* Actions: report button for non-owners, copyright-removed state for owner */}
          <div className="mb-8">
            <TrackActionsClient
              trackId={track.id}
              trackTitle={track.title}
              trackUrl={trackUrl}
              isOwner={isOwner}
              moderationStatus={track.moderation_status as any}
              takedownId={takedown?.id || null}
            />
          </div>

          {/* Download CTA */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold mb-3">Listen on SoundBridge</h2>
            <p className="text-white/90 mb-6">
              Download the SoundBridge app to listen to this track and discover more amazing music
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="https://apps.apple.com/app/soundbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.soundbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Google Play
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 mt-6 text-sm">
          © 2025 SoundBridge. All rights reserved.
        </p>
      </div>
    </div>
  );
}
