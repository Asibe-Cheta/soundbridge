import type { SupabaseClient } from '@supabase/supabase-js';

export type AdviserCreatorData = {
  profile: {
    displayName: string;
    username: string | null;
    location: string | null;
    country: string | null;
    genres: string[];
    bio: string | null;
    totalPlays: number;
    followersCount: number;
  };
  tracks: Array<{
    id: string;
    title: string;
    playCount: number;
    genre: string | null;
    moodTags: string[];
    createdAt: string;
  }>;
  tips: {
    totalReceived: number;
    tipCount: number;
    currency: string;
    byTrack: Array<{ trackId: string; trackTitle: string; amount: number; count: number }>;
  };
  communityMemberCount: number | null;
  upcomingEvents: Array<{ id: string; title: string; date: string; location: string | null }>;
  hasMinimalData: boolean;
};

export async function fetchAdviserCreatorData(
  service: SupabaseClient,
  creatorId: string,
): Promise<AdviserCreatorData> {
  const [profileRes, tracksRes, tipsRes, communityRes, eventsRes] = await Promise.all([
    service
      .from('profiles')
      .select(
        'display_name, username, location, country, genres, bio, total_plays, followers_count',
      )
      .eq('id', creatorId)
      .maybeSingle(),
    service
      .from('audio_tracks')
      .select('id, title, play_count, genre, mood_tags, created_at')
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('play_count', { ascending: false })
      .limit(25),
    service
      .from('tips')
      .select('amount, currency, track_id, status')
      .eq('recipient_id', creatorId)
      .eq('status', 'completed')
      .limit(500),
    service
      .from('community_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId),
    service
      .from('events')
      .select('id, title, event_date, location')
      .eq('creator_id', creatorId)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(10),
  ]);

  const profile = profileRes.data;
  const tracks = tracksRes.data ?? [];
  const tips = tipsRes.data ?? [];

  const trackTitleMap = new Map(tracks.map((t) => [t.id, t.title as string]));
  const tipByTrack = new Map<string, { amount: number; count: number }>();
  let totalTips = 0;
  let tipCurrency = 'GBP';

  for (const tip of tips) {
    const amount = Number(tip.amount) || 0;
    totalTips += amount;
    if (tip.currency) tipCurrency = String(tip.currency).toUpperCase();
    const tid = tip.track_id as string | null;
    if (tid) {
      const cur = tipByTrack.get(tid) ?? { amount: 0, count: 0 };
      cur.amount += amount;
      cur.count += 1;
      tipByTrack.set(tid, cur);
    }
  }

  const trackRows = tracks.map((t) => ({
    id: t.id as string,
    title: (t.title as string) || 'Untitled',
    playCount: Number(t.play_count) || 0,
    genre: (t.genre as string | null) ?? null,
    moodTags: Array.isArray(t.mood_tags) ? (t.mood_tags as string[]) : [],
    createdAt: t.created_at as string,
  }));

  const totalPlays =
    Number(profile?.total_plays) ||
    trackRows.reduce((sum, t) => sum + t.playCount, 0);

  const genresRaw = profile?.genres;
  const genres = Array.isArray(genresRaw)
    ? (genresRaw as string[])
    : typeof genresRaw === 'string'
      ? [genresRaw]
      : [];

  const hasMinimalData =
    trackRows.length === 0 && totalPlays === 0 && totalTips === 0 && !profile?.bio;

  return {
    profile: {
      displayName: (profile?.display_name as string) || 'Creator',
      username: (profile?.username as string | null) ?? null,
      location: (profile?.location as string | null) ?? null,
      country: (profile?.country as string | null) ?? null,
      genres,
      bio: (profile?.bio as string | null) ?? null,
      totalPlays,
      followersCount: Number(profile?.followers_count) || 0,
    },
    tracks: trackRows,
    tips: {
      totalReceived: totalTips,
      tipCount: tips.length,
      currency: tipCurrency,
      byTrack: [...tipByTrack.entries()].map(([trackId, v]) => ({
        trackId,
        trackTitle: trackTitleMap.get(trackId) ?? 'Unknown track',
        amount: v.amount,
        count: v.count,
      })),
    },
    communityMemberCount: communityRes.count ?? null,
    upcomingEvents: (eventsRes.data ?? []).map((e) => ({
      id: e.id as string,
      title: (e.title as string) || 'Event',
      date: e.event_date as string,
      location: (e.location as string | null) ?? null,
    })),
    hasMinimalData,
  };
}

export function formatCreatorDataForPrompt(data: AdviserCreatorData): string {
  return JSON.stringify(data, null, 2);
}
