import { Metadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';
import { notFound } from 'next/navigation';

interface Props {
  params: { playlistId: string };
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

  const { data: playlist } = await supabase
    .from('playlists')
    .select(`
      id,
      name,
      description,
      cover_image_url,
      tracks_count,
      creator:profiles!playlists_creator_id_fkey(
        username,
        display_name
      )
    `)
    .eq('id', params.playlistId)
    .single();

  if (!playlist) {
    return {
      title: 'Playlist Not Found - SoundBridge',
    };
  }

  const creatorName = playlist.creator?.display_name || playlist.creator?.username || 'Unknown User';
  const playlistUrl = `https://soundbridge.live/playlist/${params.playlistId}`;

  return {
    title: `${playlist.name} by ${creatorName} - SoundBridge`,
    description: playlist.description || `Listen to the playlist "${playlist.name}" curated by ${creatorName} on SoundBridge. ${playlist.tracks_count} tracks.`,
    openGraph: {
      title: `${playlist.name} by ${creatorName}`,
      description: playlist.description || `Listen to "${playlist.name}" curated by ${creatorName} on SoundBridge`,
      url: playlistUrl,
      siteName: 'SoundBridge',
      images: [
        {
          url: playlist.cover_image_url || 'https://soundbridge.live/default-playlist-cover.jpg',
          width: 1200,
          height: 1200,
          alt: `${playlist.name} cover art`,
        },
      ],
      type: 'music.playlist',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${playlist.name} by ${creatorName}`,
      description: playlist.description || `Listen to "${playlist.name}" curated by ${creatorName} on SoundBridge`,
      images: [playlist.cover_image_url || 'https://soundbridge.live/default-playlist-cover.jpg'],
    },
    alternates: {
      canonical: playlistUrl,
    },
  };
}

export default async function PlaylistPage({ params }: Props) {
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

  const { data: playlist } = await supabase
    .from('playlists')
    .select(`
      *,
      creator:profiles!playlists_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      ),
      playlist_tracks(
        position,
        track:audio_tracks(
          id,
          title,
          duration,
          creator:profiles!audio_tracks_creator_id_fkey(
            username,
            display_name
          )
        )
      )
    `)
    .eq('id', params.playlistId)
    .single();

  if (!playlist) {
    notFound();
  }

  const creatorName = playlist.creator?.display_name || playlist.creator?.username || 'Unknown User';

  // Sort tracks by position
  const sortedTracks = playlist.playlist_tracks?.sort((a, b) => a.position - b.position) || [];

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
            {playlist.cover_image_url && (
              <img
                src={playlist.cover_image_url}
                alt={`${playlist.name} cover art`}
                className="w-64 h-64 rounded-xl shadow-lg object-cover mx-auto md:mx-0"
              />
            )}

            {/* Playlist Info */}
            <div className="flex-1">
              <div className="text-sm text-gray-400 mb-2">PLAYLIST</div>
              <h1 className="text-4xl font-bold mb-2">{playlist.name}</h1>
              <p className="text-xl text-gray-300 mb-4">by {creatorName}</p>

              {playlist.description && (
                <p className="text-gray-400 mb-4">{playlist.description}</p>
              )}

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold">{playlist.tracks_count}</span> tracks
                </div>
                <div>
                  <span className="font-semibold">{playlist.followers_count?.toLocaleString() || 0}</span> followers
                </div>
              </div>
            </div>
          </div>

          {/* Track List */}
          {sortedTracks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Tracks</h2>
              <div className="space-y-2">
                {sortedTracks.map((item, index) => {
                  const trackCreator = item.track.creator?.display_name || item.track.creator?.username || 'Unknown Artist';
                  return (
                    <div
                      key={item.track.id}
                      className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-gray-400 w-6">{index + 1}</span>
                        <div>
                          <div>{item.track.title}</div>
                          <div className="text-sm text-gray-400">{trackCreator}</div>
                        </div>
                      </div>
                      <span className="text-gray-400">
                        {formatDuration(item.track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Download CTA */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold mb-3">Listen on SoundBridge</h2>
            <p className="text-white/90 mb-6">
              Download the SoundBridge app to listen to this playlist and discover more amazing music
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
