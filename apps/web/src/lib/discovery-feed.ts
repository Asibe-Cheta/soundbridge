import type { SupabaseClient } from '@supabase/supabase-js';
import { qualityScoreExposureTier } from '@/src/lib/discovery-intelligence';

const TRACK_SELECT = `
  *,
  creator:profiles!audio_tracks_creator_id_fkey(
    id,
    username,
    display_name,
    avatar_url,
    location,
    country,
    selected_role
  ),
  quality:track_quality_signals(
    quality_score
  )
`;

const PODCAST_GENRES = ['podcast', 'Podcast', 'PODCAST'];
const DEFAULT_LIMIT = 12;

type DiscoveryProfile = {
  genres?: string[] | null;
  preferred_moods?: string[] | null;
  location?: string | null;
  country?: string | null;
  selected_role?: string | null;
};

export type RawDiscoveryTrack = Record<string, unknown> & {
  id: string;
  creator_id: string;
  mood_tags?: string[] | null;
  creator?: Record<string, unknown> | null;
  quality?: { quality_score?: number } | { quality_score?: number }[] | null;
};

function trackQualityScore(track: RawDiscoveryTrack): number {
  const q = track.quality;
  if (Array.isArray(q)) return Number(q[0]?.quality_score ?? 0);
  return Number((q as { quality_score?: number } | null)?.quality_score ?? 0);
}

function moodOverlaps(track: RawDiscoveryTrack, preferredMoods: string[]): boolean {
  if (!preferredMoods.length) return true;
  const tags = track.mood_tags || [];
  if (!tags.length) return false;
  return tags.some((t) => preferredMoods.includes(t));
}

function locationMatches(
  track: RawDiscoveryTrack,
  location: string,
  country: string,
): boolean {
  const creator = track.creator || {};
  const creatorLocation = String(creator.location || '').toLowerCase();
  const creatorCountry = String(creator.country || '');
  if (location && creatorLocation.includes(location.toLowerCase())) return true;
  if (country && creatorCountry === country) return true;
  return !location && !country;
}

function passesQualityLocationGate(
  track: RawDiscoveryTrack,
  listenerLocation: string,
  listenerCountry: string,
): boolean {
  const score = trackQualityScore(track);
  const tier = qualityScoreExposureTier(score);
  const creator = track.creator || {};
  const creatorLocation = String(creator.location || '');
  const creatorCountry = String(creator.country || '');

  if (tier === 'featured' || tier === 'genre') return true;
  if (tier === 'expanded') {
    if (listenerCountry && creatorCountry && listenerCountry === creatorCountry) return true;
    if (listenerLocation && creatorLocation.toLowerCase().includes(listenerLocation.toLowerCase())) {
      return true;
    }
    return true;
  }
  if (listenerLocation && creatorLocation.toLowerCase().includes(listenerLocation.toLowerCase())) {
    return true;
  }
  if (listenerCountry && creatorCountry && listenerCountry === creatorCountry) return true;
  return false;
}

function matchesBucket(
  track: RawDiscoveryTrack,
  bucket: 1 | 2 | 3 | 4 | 5,
  preferredMoods: string[],
  location: string,
  country: string,
): boolean {
  switch (bucket) {
    case 1:
      return moodOverlaps(track, preferredMoods) && locationMatches(track, location, country);
    case 2:
      return moodOverlaps(track, preferredMoods);
    case 3:
      return locationMatches(track, location, country);
    case 4:
      return true;
    case 5:
      return true;
    default:
      return true;
  }
}

async function fetchCandidateTracks(
  supabase: SupabaseClient,
  genres: string[],
  role: string,
  bucket: 5 | 1 | 2 | 3 | 4,
): Promise<RawDiscoveryTrack[]> {
  let query = supabase
    .from('audio_tracks')
    .select(TRACK_SELECT)
    .eq('is_public', true)
    .not('genre', 'in', `(${PODCAST_GENRES.map((g) => `"${g}"`).join(',')})`);

  if (genres.length > 0 && role !== 'musician') {
    query = query.or(genres.map((g) => `genre.eq.${g}`).join(','));
  }

  if (bucket === 5 || role === 'musician') {
    query = query.order('play_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.limit(80);
  if (error) {
    console.error('[discovery-feed] query error:', error.message);
    return [];
  }
  return (data || []) as RawDiscoveryTrack[];
}

/**
 * Bucketed discovery: genre+mood+location → genre+mood → genre+location → genre → trending.
 */
export async function discoverTracksForListener(
  supabase: SupabaseClient,
  profile: DiscoveryProfile,
  limit = DEFAULT_LIMIT,
): Promise<RawDiscoveryTrack[]> {
  const genres = (profile.genres || []).filter(Boolean);
  const preferredMoods = (profile.preferred_moods || []).filter(Boolean);
  const location = profile.location || '';
  const country = profile.country || '';
  const role = profile.selected_role || 'listener';
  const excludeIds = new Set<string>();
  const merged: RawDiscoveryTrack[] = [];

  const buckets: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  const candidates = await fetchCandidateTracks(supabase, genres, role, 5);

  for (const bucket of buckets) {
    if (merged.length >= limit) break;
    const pool =
      bucket === 5
        ? [...candidates].sort((a, b) => (Number(b.play_count) || 0) - (Number(a.play_count) || 0))
        : candidates;

    for (const track of pool) {
      if (merged.length >= limit) break;
      if (excludeIds.has(track.id)) continue;
      if (!matchesBucket(track, bucket, preferredMoods, location, country)) continue;
      if (!passesQualityLocationGate(track, location, country)) continue;
      excludeIds.add(track.id);
      merged.push(track);
    }
  }

  merged.sort((a, b) => trackQualityScore(b) - trackQualityScore(a));
  return merged.slice(0, limit);
}

export async function formatDiscoveryTracks(
  tracks: RawDiscoveryTrack[],
  supabase: SupabaseClient,
) {
  if (!tracks.length) return [];

  if (tracks[0]?.creator) {
    return tracks.map(formatSingleTrack);
  }

  const creatorIds = [...new Set(tracks.map((t) => t.creator_id))];
  const { data: creators } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', creatorIds);

  const creatorMap = new Map((creators || []).map((c: { id: string }) => [c.id, c]));

  return tracks.map((track) => {
    const creator = creatorMap.get(track.creator_id);
    return formatSingleTrack({ ...track, creator: creator || null });
  });
}

function formatSingleTrack(track: RawDiscoveryTrack) {
  const creator = track.creator as Record<string, unknown> | null;
  return {
    id: track.id,
    title: track.title,
    artist: creator?.display_name || 'Unknown Artist',
    coverArt: track.cover_art_url,
    url: track.file_url,
    duration: track.duration || 0,
    plays: track.play_count || 0,
    likes: track.like_count || 0,
    creator: {
      id: track.creator_id,
      name: creator?.display_name || 'Unknown Artist',
      username: creator?.username || 'unknown',
      avatar: creator?.avatar_url || null,
    },
  };
}
