import { Metadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';
import { notFound } from 'next/navigation';
import TrackActionsClient from '@/src/components/track/TrackActionsClient';

interface Props {
  params: { trackId: string };
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
      cover_image_url,
      genre,
      creator:profiles!audio_tracks_creator_id_fkey(
        username,
        display_name
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
  const trackUrl = `https://soundbridge.live/track/${params.trackId}`;

  return {
    title: `${track.title} by ${creatorName} - SoundBridge`,
    description: `Listen to "${track.title}" by ${creatorName} on SoundBridge. ${track.genre ? `Genre: ${track.genre}` : ''}`,
    openGraph: {
      title: `${track.title} by ${creatorName}`,
      description: `Listen to "${track.title}" by ${creatorName} on SoundBridge`,
      url: trackUrl,
      siteName: 'SoundBridge',
      images: [
        {
          url: track.cover_image_url || 'https://soundbridge.live/default-track-cover.jpg',
          width: 1200,
          height: 1200,
          alt: `${track.title} cover art`,
        },
      ],
      type: 'music.song',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${track.title} by ${creatorName}`,
      description: `Listen to "${track.title}" by ${creatorName} on SoundBridge`,
      images: [track.cover_image_url || 'https://soundbridge.live/default-track-cover.jpg'],
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
  const trackUrl = `https://soundbridge.live/track/${params.trackId}`;

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
          <p className="text-xl text-gray-300 text-center mb-6">by {creatorName}</p>

          {track.genre && (
            <div className="flex justify-center mb-6">
              <span className="px-4 py-2 bg-purple-600/30 rounded-full text-sm">
                {track.genre}
              </span>
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
