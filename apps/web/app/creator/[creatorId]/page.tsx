import { Metadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';
import { notFound } from 'next/navigation';

interface Props {
  params: { creatorId: string };
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

  const { data: creator } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, followers_count')
    .eq('id', params.creatorId)
    .single();

  if (!creator) {
    return {
      title: 'Creator Not Found - SoundBridge',
    };
  }

  const creatorName = creator.display_name || creator.username || 'Unknown Creator';
  const creatorUrl = `https://soundbridge.live/creator/${params.creatorId}`;

  return {
    title: `${creatorName} - SoundBridge`,
    description: creator.bio || `Listen to music by ${creatorName} on SoundBridge. ${creator.followers_count} followers.`,
    openGraph: {
      title: creatorName,
      description: creator.bio || `Listen to music by ${creatorName} on SoundBridge`,
      url: creatorUrl,
      siteName: 'SoundBridge',
      images: [
        {
          url: creator.avatar_url || 'https://soundbridge.live/default-avatar.jpg',
          width: 400,
          height: 400,
          alt: `${creatorName} profile picture`,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: creatorName,
      description: creator.bio || `Listen to music by ${creatorName} on SoundBridge`,
      images: [creator.avatar_url || 'https://soundbridge.live/default-avatar.jpg'],
    },
    alternates: {
      canonical: creatorUrl,
    },
  };
}

export default async function CreatorPage({ params }: Props) {
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

  const { data: creator } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.creatorId)
    .single();

  if (!creator) {
    notFound();
  }

  // Fetch creator's tracks
  const { data: tracks } = await supabase
    .from('audio_tracks')
    .select('id, title, cover_image_url, play_count, like_count, genre')
    .eq('creator_id', params.creatorId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(6);

  // Fetch creator's albums
  const { data: albums } = await supabase
    .from('albums')
    .select('id, title, cover_image_url, tracks_count, status')
    .eq('creator_id', params.creatorId)
    .eq('status', 'published')
    .eq('is_public', true)
    .order('published_at', { ascending: false })
    .limit(6);

  const creatorName = creator.display_name || creator.username || 'Unknown Creator';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl mb-8">
          {/* Creator Header */}
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
            {/* Avatar */}
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={`${creatorName} profile picture`}
                className="w-48 h-48 rounded-full shadow-lg object-cover"
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-6xl font-bold">
                {creatorName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Creator Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-5xl font-bold mb-2">{creatorName}</h1>
              {creator.username && (
                <p className="text-xl text-gray-400 mb-4">@{creator.username}</p>
              )}

              {creator.bio && (
                <p className="text-gray-300 mb-6 max-w-2xl">{creator.bio}</p>
              )}

              {/* Stats */}
              <div className="flex gap-8 justify-center md:justify-start">
                <div>
                  <div className="text-3xl font-bold">{creator.followers_count?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-400">Followers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{creator.following_count?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-400">Following</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{tracks?.length || 0}</div>
                  <div className="text-sm text-gray-400">Tracks</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Tracks */}
          {tracks && tracks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Recent Tracks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition"
                  >
                    {track.cover_image_url && (
                      <img
                        src={track.cover_image_url}
                        alt={track.title}
                        className="w-full aspect-square object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-semibold truncate">{track.title}</h3>
                    <div className="flex gap-4 text-sm text-gray-400 mt-2">
                      <span>{track.play_count?.toLocaleString() || 0} plays</span>
                      <span>{track.like_count?.toLocaleString() || 0} likes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {albums && albums.length > 0 && (
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition"
                  >
                    {album.cover_image_url && (
                      <img
                        src={album.cover_image_url}
                        alt={album.title}
                        className="w-full aspect-square object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-semibold truncate">{album.title}</h3>
                    <p className="text-sm text-gray-400 mt-2">{album.tracks_count} tracks</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download CTA */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold mb-3">Follow on SoundBridge</h2>
            <p className="text-white/90 mb-6">
              Download the SoundBridge app to follow {creatorName} and discover more amazing artists
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
        <p className="text-center text-gray-500 text-sm">
          © 2025 SoundBridge. All rights reserved.
        </p>
      </div>
    </div>
  );
}
