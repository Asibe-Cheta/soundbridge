import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/src/lib/supabase';

export type CommunityCreatorProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  genre_tag: string | null;
};

export type CommunityListItem = CommunityCreatorProfile & {
  member_count: number;
  has_tipped: boolean;
  followed_at: string | null;
  last_tip_at: string | null;
};

export type CommunityTrack = {
  id: string;
  title: string;
  duration: number | null;
  cover_art_url: string | null;
  genre: string | null;
  file_url: string | null;
};

export type CommunityEvent = {
  id: string;
  title: string;
  event_date: string;
  city: string | null;
  location: string | null;
  image_url: string | null;
};

export type CommunityMemberAvatar = {
  id: string;
  avatar_url: string | null;
  display_name: string | null;
};

export type CommunityPost = {
  id: string;
  content: string;
  post_type: string;
  created_at: string;
  visibility: string;
  author: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string | null;
    role?: string | null;
    is_verified?: boolean;
  };
  attachments: Array<Record<string, unknown>>;
  reactions: {
    support: number;
    love: number;
    fire: number;
    congrats: number;
    user_reaction: null;
  };
  comment_count: number;
};

function profileGenreTag(
  profile: Record<string, unknown>,
  trackGenre?: string | null,
): string | null {
  const headline =
    (typeof profile.professional_headline === 'string' && profile.professional_headline.trim()) ||
    null;
  if (headline) return headline;
  if (trackGenre?.trim()) return trackGenre.trim();
  return null;
}

function mapProfile(row: Record<string, unknown>, trackGenre?: string | null): CommunityCreatorProfile {
  return {
    id: String(row.id),
    username: (row.username as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    genre_tag: profileGenreTag(row, trackGenre),
  };
}

/** tips uses recipient_id (not creator_id) for the tipped creator. */
export async function getTippedCreatorIdsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, string>> {
  const byCreator = new Map<string, string>();

  const { data: tipRows } = await supabase
    .from('tips')
    .select('recipient_id, completed_at, created_at')
    .eq('sender_id', userId)
    .eq('status', 'completed');

  for (const row of tipRows ?? []) {
    const creatorId = row.recipient_id as string;
    if (!creatorId) continue;
    const at = String(row.completed_at || row.created_at || '');
    const prev = byCreator.get(creatorId);
    if (!prev || at > prev) byCreator.set(creatorId, at);
  }

  try {
    const { data: liveRows } = await supabase
      .from('live_session_tips')
      .select('creator_id, created_at')
      .eq('tipper_id', userId)
      .eq('status', 'completed');

    for (const row of liveRows ?? []) {
      const creatorId = row.creator_id as string;
      if (!creatorId) continue;
      const at = String(row.created_at || '');
      const prev = byCreator.get(creatorId);
      if (!prev || at > prev) byCreator.set(creatorId, at);
    }
  } catch {
    /* live_session_tips may be absent in some environments */
  }

  return byCreator;
}

export async function getCommunityMemberCounts(
  supabase: SupabaseClient,
  creatorIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, Set<string>>();
  for (const id of creatorIds) counts.set(id, new Set());

  if (creatorIds.length === 0) return new Map();

  const { data: followRows } = await supabase
    .from('follows')
    .select('following_id, follower_id')
    .in('following_id', creatorIds);

  for (const row of followRows ?? []) {
    const set = counts.get(row.following_id as string);
    if (set && row.follower_id) set.add(row.follower_id as string);
  }

  const { data: tipRows } = await supabase
    .from('tips')
    .select('recipient_id, sender_id')
    .in('recipient_id', creatorIds)
    .eq('status', 'completed');

  for (const row of tipRows ?? []) {
    const set = counts.get(row.recipient_id as string);
    if (set && row.sender_id) set.add(row.sender_id as string);
  }

  try {
    const { data: liveRows } = await supabase
      .from('live_session_tips')
      .select('creator_id, tipper_id')
      .in('creator_id', creatorIds)
      .eq('status', 'completed');

    for (const row of liveRows ?? []) {
      const set = counts.get(row.creator_id as string);
      if (set && row.tipper_id) set.add(row.tipper_id as string);
    }
  } catch {
    /* optional table */
  }

  const result = new Map<string, number>();
  for (const [id, set] of counts) result.set(id, set.size);
  return result;
}

export async function userIsCommunityMember(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
): Promise<boolean> {
  if (userId === creatorId) return true;

  const { data: follow } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', userId)
    .eq('following_id', creatorId)
    .maybeSingle();
  if (follow) return true;

  const tipped = await getTippedCreatorIdsForUser(supabase, userId);
  return tipped.has(creatorId);
}

export async function getMyTippedCreators(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<CommunityCreatorProfile & { last_tip_at: string | null }>> {
  const tippedMap = await getTippedCreatorIdsForUser(supabase, userId);
  const creatorIds = [...tippedMap.keys()];
  if (creatorIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, professional_headline')
    .in('id', creatorIds);

  const { data: genres } = await supabase
    .from('audio_tracks')
    .select('creator_id, genre')
    .in('creator_id', creatorIds)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  const genreByCreator = new Map<string, string>();
  for (const t of genres ?? []) {
    const cid = t.creator_id as string;
    if (!genreByCreator.has(cid) && t.genre) genreByCreator.set(cid, String(t.genre));
  }

  return (profiles ?? []).map((p) => ({
    ...mapProfile(p as Record<string, unknown>, genreByCreator.get(String(p.id))),
    last_tip_at: tippedMap.get(String(p.id)) ?? null,
  }));
}

export async function getCommunitiesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<CommunityListItem[]> {
  const tippedMap = await getTippedCreatorIdsForUser(supabase, userId);

  const { data: followingRows } = await supabase
    .from('follows')
    .select(
      `
      following_id,
      created_at,
      following:profiles!follows_following_id_fkey (
        id, username, display_name, avatar_url, bio, professional_headline, role
      )
    `,
    )
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });

  const merged = new Map<
    string,
    {
      profile: CommunityCreatorProfile;
      has_tipped: boolean;
      followed_at: string | null;
      last_tip_at: string | null;
    }
  >();

  for (const row of followingRows ?? []) {
    const following = row.following as Record<string, unknown> | null;
    if (!following?.id) continue;
    const id = String(following.id);
    if (String(following.role ?? '').toLowerCase() !== 'creator') continue;
    merged.set(id, {
      profile: mapProfile(following),
      has_tipped: tippedMap.has(id),
      followed_at: row.created_at as string,
      last_tip_at: tippedMap.get(id) ?? null,
    });
  }

  const tippedOnlyIds = [...tippedMap.keys()].filter((id) => !merged.has(id));
  if (tippedOnlyIds.length > 0) {
    const { data: tippedProfiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, professional_headline, role')
      .in('id', tippedOnlyIds);

    for (const p of tippedProfiles ?? []) {
      const id = String(p.id);
      if (String(p.role ?? '').toLowerCase() !== 'creator') continue;
      merged.set(id, {
        profile: mapProfile(p as Record<string, unknown>),
        has_tipped: true,
        followed_at: null,
        last_tip_at: tippedMap.get(id) ?? null,
      });
    }
  }

  const creatorIds = [...merged.keys()];
  const memberCounts = await getCommunityMemberCounts(createServiceClient(), creatorIds);

  const { data: genreRows } = await supabase
    .from('audio_tracks')
    .select('creator_id, genre')
    .in('creator_id', creatorIds)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  const genreByCreator = new Map<string, string>();
  for (const t of genreRows ?? []) {
    const cid = t.creator_id as string;
    if (!genreByCreator.has(cid) && t.genre) genreByCreator.set(cid, String(t.genre));
  }

  const items: CommunityListItem[] = creatorIds.map((id) => {
    const entry = merged.get(id)!;
    const genre = genreByCreator.get(id);
    return {
      ...entry.profile,
      genre_tag: entry.profile.genre_tag || genre || null,
      member_count: memberCounts.get(id) ?? 0,
      has_tipped: entry.has_tipped,
      followed_at: entry.followed_at,
      last_tip_at: entry.last_tip_at,
    };
  });

  items.sort((a, b) => {
    if (a.has_tipped !== b.has_tipped) return a.has_tipped ? -1 : 1;
    if (a.has_tipped && b.has_tipped) {
      return String(b.last_tip_at || '').localeCompare(String(a.last_tip_at || ''));
    }
    return String(b.followed_at || '').localeCompare(String(a.followed_at || ''));
  });

  return items;
}

async function getMemberPreview(
  supabase: SupabaseClient,
  creatorId: string,
  excludeUserId: string,
): Promise<{ avatars: CommunityMemberAvatar[]; others_count: number }> {
  const members = new Set<string>();

  const { data: followers } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', creatorId)
    .limit(200);

  for (const r of followers ?? []) {
    if (r.follower_id && r.follower_id !== excludeUserId) members.add(r.follower_id as string);
  }

  const { data: tippers } = await supabase
    .from('tips')
    .select('sender_id')
    .eq('recipient_id', creatorId)
    .eq('status', 'completed')
    .limit(200);

  for (const r of tippers ?? []) {
    if (r.sender_id && r.sender_id !== excludeUserId) members.add(r.sender_id as string);
  }

  try {
    const { data: liveTippers } = await supabase
      .from('live_session_tips')
      .select('tipper_id')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .limit(200);

    for (const r of liveTippers ?? []) {
      if (r.tipper_id && r.tipper_id !== excludeUserId) members.add(r.tipper_id as string);
    }
  } catch {
    /* optional */
  }

  const memberIds = [...members];
  const others_count = Math.max(0, memberIds.length - 5);
  const previewIds = memberIds.slice(0, 5);

  if (previewIds.length === 0) {
    return { avatars: [], others_count: 0 };
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, avatar_url, display_name')
    .in('id', previewIds);

  return {
    avatars: (profiles ?? []).map((p) => ({
      id: String(p.id),
      avatar_url: (p.avatar_url as string | null) ?? null,
      display_name: (p.display_name as string | null) ?? null,
    })),
    others_count,
  };
}

export async function getCommunityDetail(
  supabase: SupabaseClient,
  creatorId: string,
  viewerUserId: string,
) {
  const service = createServiceClient();

  const isMember = await userIsCommunityMember(supabase, viewerUserId, creatorId);
  if (!isMember) {
    return { ok: false as const, reason: 'not_member' as const };
  }

  const { data: profile, error: profileErr } = await service
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, professional_headline, role')
    .eq('id', creatorId)
    .maybeSingle();

  if (profileErr || !profile) {
    return { ok: false as const, reason: 'not_found' as const };
  }

  const memberCounts = await getCommunityMemberCounts(service, [creatorId]);
  const member_count = memberCounts.get(creatorId) ?? 0;

  const nowIso = new Date().toISOString();

  const [{ data: tracksRaw }, { data: eventsRaw }, { data: postsRaw }, memberPreview, { data: genreRow }] =
    await Promise.all([
      service
        .from('audio_tracks')
        .select('id, title, duration, cover_art_url, genre, file_url')
        .eq('creator_id', creatorId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(3),
      service
        .from('events')
        .select('id, title, event_date, city, location, image_url')
        .eq('creator_id', creatorId)
        .gte('event_date', nowIso)
        .order('event_date', { ascending: true })
        .limit(10),
      service
        .from('posts')
        .select('id, content, post_type, created_at, visibility, user_id')
        .eq('user_id', creatorId)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      getMemberPreview(service, creatorId, viewerUserId),
      service
        .from('audio_tracks')
        .select('genre')
        .eq('creator_id', creatorId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const creator = mapProfile(
    profile as Record<string, unknown>,
    (genreRow?.genre as string | null) ?? null,
  );

  const tracks: CommunityTrack[] = (tracksRaw ?? []).map((t) => ({
    id: String(t.id),
    title: String(t.title ?? 'Untitled'),
    duration: typeof t.duration === 'number' ? t.duration : null,
    cover_art_url: (t.cover_art_url as string | null) ?? null,
    genre: (t.genre as string | null) ?? null,
    file_url: (t.file_url as string | null) ?? null,
  }));

  const events: CommunityEvent[] = (eventsRaw ?? []).map((e) => ({
    id: String(e.id),
    title: String(e.title ?? 'Event'),
    event_date: String(e.event_date),
    city: (e.city as string | null) ?? null,
    location: (e.location as string | null) ?? null,
    image_url: (e.image_url as string | null) ?? null,
  }));

  const postIds = (postsRaw ?? []).map((p) => p.id as string);
  let attachmentsMap = new Map<string, Array<Record<string, unknown>>>();
  if (postIds.length > 0) {
    const { data: attachments } = await service
      .from('post_attachments')
      .select('*')
      .in('post_id', postIds);
    for (const a of attachments ?? []) {
      const pid = a.post_id as string;
      if (!attachmentsMap.has(pid)) attachmentsMap.set(pid, []);
      attachmentsMap.get(pid)!.push(a as Record<string, unknown>);
    }
  }

  const posts: CommunityPost[] = (postsRaw ?? []).map((p) => ({
    id: String(p.id),
    content: String(p.content ?? ''),
    post_type: String(p.post_type ?? 'update'),
    created_at: String(p.created_at),
    visibility: String(p.visibility ?? 'public'),
    author: {
      id: creatorId,
      name: creator.display_name || creator.username || 'Creator',
      username: creator.username ?? undefined,
      avatar_url: creator.avatar_url,
      role: creator.genre_tag,
      is_verified: false,
    },
    attachments: attachmentsMap.get(String(p.id)) ?? [],
    reactions: { support: 0, love: 0, fire: 0, congrats: 0, user_reaction: null },
    comment_count: 0,
  }));

  return {
    ok: true as const,
    community: {
      creator,
      member_count,
      is_member: true,
      tracks,
      events,
      posts,
      member_preview: memberPreview,
    },
  };
}
