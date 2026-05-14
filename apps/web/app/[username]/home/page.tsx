import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/src/lib/supabase';
import { resolveCreatorProfileBySlug } from '@/src/lib/creator-profile-slug';
import { getSiteUrl } from '@/src/lib/site-url';
import { FanLandingClient, type FanLandingFollowerAvatar, type FanLandingTrack } from './FanLandingClient';

interface PageProps {
  params: Promise<{ username: string }>;
}

const SITE_URL = getSiteUrl();

function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username: slug } = await params;
  const supabase = createServerClient();
  const resolved = await resolveCreatorProfileBySlug(supabase, decodeURIComponent(slug));
  if (!resolved || String(resolved.profile.role).toLowerCase() !== 'creator') {
    return {
      title: 'SoundBridge',
      description: 'Music networking that pays.',
    };
  }
  const { profile, canonicalSlug } = resolved;
  const displayName =
    (typeof profile.display_name === 'string' && profile.display_name.trim()) ||
    (typeof profile.username === 'string' && profile.username.trim()) ||
    'Artist';
  const fanUrl = `${SITE_URL}/${encodeURIComponent(canonicalSlug)}/home`;
  const avatarUrl =
    typeof profile.avatar_url === 'string' && profile.avatar_url.trim() ? profile.avatar_url : undefined;
  const ogImage = toAbsoluteUrl(avatarUrl) || `${SITE_URL}/images/og-image.jpg`;
  const title = `${displayName} is on SoundBridge`;
  const description = `Listen to ${displayName}'s music and support them directly. No middleman. Every tip goes straight to them.`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: fanUrl },
    openGraph: {
      title,
      description,
      url: fanUrl,
      type: 'website',
      images: [{ url: ogImage, alt: `${displayName} profile photo` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function FanLandingHomePage({ params }: PageProps) {
  const { username: slug } = await params;
  const supabase = createServerClient();
  const decoded = decodeURIComponent(slug);
  const resolved = await resolveCreatorProfileBySlug(supabase, decoded);

  if (!resolved || String(resolved.profile.role).toLowerCase() !== 'creator') {
    notFound();
  }

  const { profile, canonicalSlug } = resolved;
  if (decoded !== canonicalSlug) {
    redirect(`/${encodeURIComponent(canonicalSlug)}/home`);
  }

  const creatorId = profile.id as string;
  const p = profile as Record<string, unknown>;
  const displayName =
    (typeof p.display_name === 'string' && p.display_name.trim()) ||
    (typeof p.username === 'string' && p.username.trim()) ||
    canonicalSlug;
  const avatarUrl = typeof p.avatar_url === 'string' && p.avatar_url.trim() ? p.avatar_url : null;
  const bio = typeof p.bio === 'string' && p.bio.trim() ? p.bio.trim() : null;

  const [{ count: trackCount }, { data: tracksRaw }, { data: followsRows }, { count: followerCountHead }] =
    await Promise.all([
      supabase
        .from('audio_tracks')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('is_public', true),
      supabase
        .from('audio_tracks')
        .select('id, title, duration, cover_art_url, genre, file_url')
        .eq('creator_id', creatorId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('follows').select('follower_id').eq('following_id', creatorId).limit(12),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', creatorId),
    ]);

  const followerIds = (followsRows ?? []).map((r) => r.follower_id).filter(Boolean) as string[];
  let followerAvatars: FanLandingFollowerAvatar[] = [];
  if (followerIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, avatar_url').in('id', followerIds);
    followerAvatars = (profs ?? []).map((row) => ({
      id: row.id as string,
      avatar_url: (row.avatar_url as string | null) ?? null,
    }));
  }

  const tracks: FanLandingTrack[] = (tracksRaw ?? []).map((t) => ({
    id: t.id as string,
    title: String(t.title ?? 'Untitled'),
    duration: typeof t.duration === 'number' ? t.duration : t.duration != null ? Number(t.duration) : null,
    cover_art_url: (t.cover_art_url as string | null) ?? null,
    genre: (t.genre as string | null) ?? null,
    file_url: (t.file_url as string | null) ?? null,
  }));

  const trackCountNum = trackCount ?? tracks.length;
  const followersFromProfile = typeof p.followers_count === 'number' ? p.followers_count : null;
  const followerCount =
    followersFromProfile != null && followersFromProfile >= 0
      ? followersFromProfile
      : followerCountHead ?? 0;

  const genreSet = new Set<string>();
  for (const t of tracks) {
    if (t.genre?.trim()) genreSet.add(t.genre.trim());
  }
  const genres = Array.from(genreSet).slice(0, 6);

  const joinCommunityUrl = `${SITE_URL}/${encodeURIComponent(canonicalSlug)}/home`;
  const schemeArtistUrl = `soundbridge://artist/${encodeURIComponent(canonicalSlug)}`;

  const { data: creatorWallets } = await supabase
    .from('user_wallets')
    .select('currency')
    .eq('user_id', creatorId)
    .order('balance', { ascending: false })
    .limit(1);
  const tipCurrency = String(creatorWallets?.[0]?.currency ?? 'GBP').toUpperCase();

  return (
    <FanLandingClient
        creatorId={creatorId}
        canonicalUsername={canonicalSlug}
        displayName={displayName}
        avatarUrl={avatarUrl}
        bio={bio}
        trackCount={trackCountNum}
        followerCount={followerCount}
        genres={genres}
        tracks={tracks}
        followerAvatars={followerAvatars}
        joinCommunityUrl={joinCommunityUrl}
        schemeArtistUrl={schemeArtistUrl}
        tipCurrency={tipCurrency}
      />
  );
}
