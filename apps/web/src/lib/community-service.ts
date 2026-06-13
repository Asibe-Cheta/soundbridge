import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/src/lib/supabase';

export type CommunityJoinSource = 'manual' | 'post_tip_prompt';

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
  joined_at: string;
  join_source: CommunityJoinSource;
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

export async function getCommunityMemberCount(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('community_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId);

  if (error) return 0;
  return count ?? 0;
}

export async function getCommunityMemberCounts(
  supabase: SupabaseClient,
  creatorIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const id of creatorIds) result.set(id, 0);
  if (creatorIds.length === 0) return result;

  const { data, error } = await supabase
    .from('community_memberships')
    .select('creator_id')
    .in('creator_id', creatorIds);

  if (error) return result;

  for (const row of data ?? []) {
    const cid = row.creator_id as string;
    result.set(cid, (result.get(cid) ?? 0) + 1);
  }

  return result;
}

export async function userIsCommunityMember(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
): Promise<boolean> {
  if (userId === creatorId) return true;

  const { data } = await supabase
    .from('community_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('creator_id', creatorId)
    .maybeSingle();

  return Boolean(data);
}

export async function joinCommunity(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
  joinSource: CommunityJoinSource = 'manual',
): Promise<{ ok: boolean; error?: string }> {
  if (userId === creatorId) {
    return { ok: false, error: 'Cannot join your own community' };
  }

  const { error } = await supabase.from('community_memberships').insert({
    user_id: userId,
    creator_id: creatorId,
    join_source: joinSource,
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function leaveCommunity(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('community_memberships')
    .delete()
    .eq('user_id', userId)
    .eq('creator_id', creatorId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function countCompletedTipsToCreator(
  supabase: SupabaseClient,
  userId: string,
  creatorId: string,
): Promise<number> {
  let count = 0;

  const { count: tipCount } = await supabase
    .from('tips')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', userId)
    .eq('recipient_id', creatorId)
    .eq('status', 'completed');

  count += tipCount ?? 0;

  try {
    const { count: liveCount } = await supabase
      .from('live_session_tips')
      .select('*', { count: 'exact', head: true })
      .eq('tipper_id', userId)
      .eq('creator_id', creatorId)
      .eq('status', 'completed');

    count += liveCount ?? 0;
  } catch {
    /* optional table */
  }

  return count;
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
  const { data: membershipRows, error } = await supabase
    .from('community_memberships')
    .select(
      `
      joined_at,
      join_source,
      creator:profiles!community_memberships_creator_id_fkey (
        id, username, display_name, avatar_url, bio, professional_headline, role
      )
    `,
    )
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error || !membershipRows?.length) {
    return [];
  }

  const items: Array<{
    profile: CommunityCreatorProfile;
    joined_at: string;
    join_source: CommunityJoinSource;
  }> = [];

  for (const row of membershipRows) {
    const creator = row.creator as Record<string, unknown> | null;
    if (!creator?.id) continue;
    if (String(creator.role ?? '').toLowerCase() !== 'creator') continue;
    items.push({
      profile: mapProfile(creator),
      joined_at: String(row.joined_at),
      join_source: (row.join_source as CommunityJoinSource) ?? 'manual',
    });
  }

  const creatorIds = items.map((i) => i.profile.id);
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

  return items.map(({ profile, joined_at, join_source }) => {
    const genre = genreByCreator.get(profile.id);
    return {
      ...profile,
      genre_tag: profile.genre_tag || genre || null,
      member_count: memberCounts.get(profile.id) ?? 0,
      joined_at,
      join_source,
    };
  });
}

async function getMemberPreview(
  supabase: SupabaseClient,
  creatorId: string,
  excludeUserId: string,
): Promise<{ avatars: CommunityMemberAvatar[]; others_count: number }> {
  const { data: membershipRows } = await supabase
    .from('community_memberships')
    .select('user_id')
    .eq('creator_id', creatorId)
    .neq('user_id', excludeUserId)
    .order('joined_at', { ascending: false })
    .limit(50);

  const memberIds = (membershipRows ?? [])
    .map((r) => r.user_id as string)
    .filter(Boolean);

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

  const member_count = await getCommunityMemberCount(service, creatorId);
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
  const attachmentsMap = new Map<string, Array<Record<string, unknown>>>();
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
