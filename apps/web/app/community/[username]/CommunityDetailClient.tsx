'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Loader2,
  MapPin,
  Music2,
  Pause,
  Play,
} from 'lucide-react';
import { PostCard } from '@/src/components/posts/PostCard';
import { TipCreator } from '@/src/components/revenue/TipCreator';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { getCreatorProfilePath } from '@/src/lib/profile-links';
import type {
  CommunityCreatorProfile,
  CommunityEvent,
  CommunityMemberAvatar,
  CommunityPost,
  CommunityTrack,
} from '@/src/lib/community-service';

export type CommunityDetailData = {
  creator: CommunityCreatorProfile;
  member_count: number;
  tracks: CommunityTrack[];
  events: CommunityEvent[];
  posts: CommunityPost[];
  member_preview: { avatars: CommunityMemberAvatar[]; others_count: number };
};

function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function CommunityDetailClient({ initial }: { initial: CommunityDetailData }) {
  const { creator, member_count, tracks, events, posts, member_preview } = initial;
  const audioPlayer = useAudioPlayer();
  const [bioExpanded, setBioExpanded] = useState(false);

  const displayName = creator.display_name || creator.username || 'Creator';
  const profilePath = getCreatorProfilePath({ username: creator.username, id: creator.id });
  const musicPath = creator.username ? `/creator/${creator.username}/music` : profilePath;

  const playTrack = useCallback(
    (track: CommunityTrack) => {
      if (!track.file_url || !audioPlayer?.playTrack) return;
      audioPlayer.playTrack({
        id: track.id,
        title: track.title,
        artist: displayName,
        album: '',
        duration: track.duration ?? 0,
        artwork: track.cover_art_url ?? '',
        url: track.file_url,
        liked: false,
        genre: track.genre ?? undefined,
      });
    },
    [audioPlayer, displayName],
  );

  const isPlaying = (trackId: string) =>
    audioPlayer?.currentTrack?.id === trackId && audioPlayer?.isPlaying;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/network?tab=communities"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Communities
        </Link>

        {/* Header */}
        <header className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg text-center">
          <div className="mx-auto mb-4 relative h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-red-600 to-pink-500">
            {creator.avatar_url ? (
              <Image src={creator.avatar_url} alt={displayName} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{displayName}</h1>
          {creator.genre_tag ? (
            <p className="mt-1 text-sm text-gray-400">{creator.genre_tag}</p>
          ) : null}
          {creator.bio ? (
            <div className="mt-3 text-sm text-gray-300">
              <p className={bioExpanded ? '' : 'line-clamp-2'}>{creator.bio}</p>
              {creator.bio.length > 120 ? (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  className="mt-1 text-xs text-red-400 hover:text-red-300"
                >
                  {bioExpanded ? 'Show less' : 'Read more'}
                </button>
              ) : null}
            </div>
          ) : null}
          <p className="mt-3 text-sm text-gray-400">
            {member_count.toLocaleString()} {member_count === 1 ? 'member' : 'members'} in this community
          </p>
          <div className="mt-5">
            <TipCreator creatorId={creator.id} creatorName={displayName} />
          </div>
        </header>

        {/* Latest Music */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Latest Music</h2>
          {tracks.length === 0 ? (
            <p className="text-sm text-gray-500">No tracks yet.</p>
          ) : (
            <div className="space-y-3">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
                    {track.cover_art_url ? (
                      <Image src={track.cover_art_url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music2 className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{track.title}</p>
                    <p className="text-xs text-gray-500">{formatDuration(track.duration)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => playTrack(track)}
                    disabled={!track.file_url}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-pink-500 text-white disabled:opacity-40"
                    aria-label={isPlaying(track.id) ? 'Pause' : 'Play'}
                  >
                    {isPlaying(track.id) ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
          <Link href={musicPath} className="mt-3 inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-300">
            See all music
            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Upcoming Events */}
        {events.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-white">Upcoming Events</h2>
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  {event.image_url ? (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image src={event.image_url} alt="" fill className="object-cover" />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{event.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatEventDate(event.event_date)}
                    </p>
                    {(event.city || event.location) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {[event.city, event.location].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <Link
                      href={`/events/${event.id}`}
                      className="mt-2 inline-block text-xs font-medium text-red-400 hover:text-red-300"
                    >
                      View Event
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Posts */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white">From {displayName}</h2>
          {posts.length === 0 ? (
            <p className="text-sm text-gray-500">No posts yet.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    ...post,
                    user_id: creator.id,
                    post_type: post.post_type as 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event',
                    visibility: post.visibility as 'public' | 'connections',
                  }}
                />
              ))}
            </div>
          )}
          <Link href={profilePath} className="mt-3 inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-300">
            See all posts
            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Members preview */}
        {member_preview.avatars.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-white">Others in this community</h2>
            <div className="flex items-center gap-2">
              {member_preview.avatars.map((m) => (
                <div
                  key={m.id}
                  className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-gray-900 bg-gradient-to-br from-red-600 to-pink-500"
                  title={m.display_name ?? undefined}
                >
                  {m.avatar_url ? (
                    <Image src={m.avatar_url} alt="" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                      {(m.display_name ?? '?').charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {member_preview.others_count > 0 ? (
              <p className="mt-2 text-sm text-gray-400">and {member_preview.others_count} others</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function CommunityDetailLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
    </div>
  );
}
