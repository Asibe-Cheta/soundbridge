import { Metadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';
import { notFound } from 'next/navigation';
import { SellContentSection } from '@/src/components/monetization/SellContentSection';
import { ContentPurchaseSection } from '@/src/components/monetization/ContentPurchaseSection';
import { getSiteUrl } from '@/src/lib/site-url';

interface Props {
  params: { albumId: string };
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

  const { data: album } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      cover_image_url,
      genre,
      tracks_count,
      updated_at,
      creator:profiles!albums_creator_id_fkey(
        username,
        display_name,
        avatar_url,
        bio
      )
    `)
    .eq('id', params.albumId)
    .single();

  if (!album) {
    return {
      title: 'Album Not Found - SoundBridge',
    };
  }

  const creatorName = album.creator?.display_name || album.creator?.username || 'Unknown Artist';
  const albumUrl = `${SITE_URL}/album/${params.albumId}`;
  const description =
    album.description?.trim() ||
    album.creator?.bio?.trim() ||
    `Listen to the album "${album.title}" by ${creatorName} on SoundBridge.`;
  const imageUrl = toAbsoluteUrl(album.cover_image_url || album.creator?.avatar_url || undefined);

  return {
    title: `${album.title} by ${creatorName} — SoundBridge`,
    description,
    openGraph: {
      title: `${album.title} by ${creatorName} — SoundBridge`,
      description,
      url: albumUrl,
      siteName: 'SoundBridge',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: `${album.title} cover art`,
        },
      ],
      type: 'music.album',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${album.title} by ${creatorName} — SoundBridge`,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: albumUrl,
    },
  };
}

export default async function AlbumPage({ params }: Props) {
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

  const { data: album } = await supabase
    .from('albums')
    .select(`
      *,
      creator:profiles!albums_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      ),
      album_tracks(
        track_number,
        track:audio_tracks(
          id,
          title,
          duration
        )
      )
    `)
    .eq('id', params.albumId)
    .single();

  if (!album) {
    notFound();
  }

  const {
    data: { user: albumViewer },
  } = await supabase.auth.getUser();
  const isAlbumOwner = !!albumViewer && albumViewer.id === album.creator_id;

  const creatorName = album.creator?.display_name || album.creator?.username || 'Unknown Artist';
  const albumUrl = `${SITE_URL}/album/${params.albumId}`;
  const albumDescription =
    (album as { description?: string | null }).description?.trim() ||
    `Listen to the album "${album.title}" by ${creatorName} on SoundBridge.`;
  const albumImageUrl = toAbsoluteUrl(
    (album as { cover_image_url?: string | null }).cover_image_url ||
      (album.creator as { avatar_url?: string | null })?.avatar_url ||
      undefined
  );

  // Sort tracks by track_number
  const sortedTracks = album.album_tracks?.sort((a, b) => a.track_number - b.track_number) || [];

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const albumJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: album.title,
    byArtist: {
      '@type': 'MusicGroup',
      name: creatorName,
    },
    url: albumUrl,
    numTracks: sortedTracks.length || Number((album as { tracks_count?: number | null }).tracks_count || 0),
    ...(albumDescription ? { description: albumDescription } : {}),
    ...(albumImageUrl ? { image: albumImageUrl } : {}),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(albumJsonLd) }}
      />
      <div className="max-w-4xl w-full">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            {/* Cover Image */}
            {album.cover_image_url && (
              <img
                src={album.cover_image_url}
                alt={`${album.title} cover art`}
                className="w-64 h-64 rounded-xl shadow-lg object-cover mx-auto md:mx-0"
              />
            )}

            {/* Album Info */}
            <div className="flex-1">
              <div className="text-sm text-gray-400 mb-2">ALBUM</div>
              <h1 className="text-4xl font-bold mb-2">{album.title}</h1>
              <p className="text-xl text-gray-300 mb-4">by {creatorName}</p>

              {album.description && (
                <p className="text-gray-400 mb-4">{album.description}</p>
              )}

              {album.genre && (
                <div className="mb-4">
                  <span className="px-4 py-2 bg-purple-600/30 rounded-full text-sm">
                    {album.genre}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold">{album.tracks_count}</span> tracks
                </div>
                <div>
                  <span className="font-semibold">{album.total_plays?.toLocaleString() || 0}</span> plays
                </div>
                <div>
                  <span className="font-semibold">{album.total_likes?.toLocaleString() || 0}</span> likes
                </div>
              </div>

              <div className="mt-6 w-full">
                <SellContentSection
                  resource="album"
                  resourceId={album.id}
                  isOwner={isAlbumOwner}
                  initial={{
                    is_paid: !!(album as { is_paid?: boolean }).is_paid,
                    price: (album as { price?: number | null }).price ?? null,
                    currency: (album as { currency?: string | null }).currency ?? null,
                    total_sales_count: (album as { total_sales_count?: number | null }).total_sales_count ?? null,
                  }}
                />
              </div>

              <ContentPurchaseSection
                contentType="album"
                contentId={album.id}
                title={album.title}
                price={Number((album as { price?: number | null }).price ?? 0)}
                currency={(album as { currency?: string | null }).currency || 'USD'}
                coverUrl={(album as { cover_image_url?: string | null }).cover_image_url}
                creatorLabel={creatorName}
                isOwner={isAlbumOwner}
                isPaid={!!(album as { is_paid?: boolean }).is_paid}
              />
            </div>
          </div>

          {/* Track List */}
          {sortedTracks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Tracks</h2>
              <div className="space-y-2">
                {sortedTracks.map((item) => (
                  <div
                    key={item.track.id}
                    className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 w-6">{item.track_number}</span>
                      <span>{item.track.title}</span>
                    </div>
                    <span className="text-gray-400">
                      {formatDuration(item.track.duration)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download CTA */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold mb-3">Listen on SoundBridge</h2>
            <p className="text-white/90 mb-6">
              Download the SoundBridge app to listen to this album and discover more amazing music
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
