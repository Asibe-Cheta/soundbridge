import { Metadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';
import { notFound } from 'next/navigation';

interface Props {
  params: { albumId: string };
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
      creator:profiles!albums_creator_id_fkey(
        username,
        display_name
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
  const albumUrl = `https://soundbridge.live/album/${params.albumId}`;

  return {
    title: `${album.title} by ${creatorName} - SoundBridge`,
    description: album.description || `Listen to the album "${album.title}" by ${creatorName} on SoundBridge. ${album.tracks_count} tracks.`,
    openGraph: {
      title: `${album.title} by ${creatorName}`,
      description: album.description || `Listen to "${album.title}" by ${creatorName} on SoundBridge`,
      url: albumUrl,
      siteName: 'SoundBridge',
      images: [
        {
          url: album.cover_image_url || 'https://soundbridge.live/default-album-cover.jpg',
          width: 1200,
          height: 1200,
          alt: `${album.title} cover art`,
        },
      ],
      type: 'music.album',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${album.title} by ${creatorName}`,
      description: album.description || `Listen to "${album.title}" by ${creatorName} on SoundBridge`,
      images: [album.cover_image_url || 'https://soundbridge.live/default-album-cover.jpg'],
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

  const creatorName = album.creator?.display_name || album.creator?.username || 'Unknown Artist';

  // Sort tracks by track_number
  const sortedTracks = album.album_tracks?.sort((a, b) => a.track_number - b.track_number) || [];

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-4">
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
