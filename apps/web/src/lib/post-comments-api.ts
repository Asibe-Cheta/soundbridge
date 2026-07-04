import type { SupabaseClient } from '@supabase/supabase-js';

export type PostCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  image_url?: string | null;
  created_at: string;
};

export type FormattedPostComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  image_url: string | null;
  user: {
    id: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
  };
  author: {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
  created_at: string;
  likes_count: number;
  like_count: number;
  user_liked: boolean;
  replies_count: number;
  replies: FormattedPostComment[];
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
};

/** One cheap visibility check — avoids post_comments RLS subquery per row. */
export async function assertUserCanViewPost(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
): Promise<'ok' | 'not_found' | 'forbidden'> {
  const { data: post, error } = await supabase
    .from('posts')
    .select('id, user_id, visibility')
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !post) return 'not_found';
  if (post.user_id === userId) return 'ok';
  if (post.visibility === 'public') return 'ok';

  const { data: connection } = await supabase
    .from('connections')
    .select('id')
    .eq('status', 'connected')
    .or(
      `and(user_id.eq.${userId},connected_user_id.eq.${post.user_id}),and(user_id.eq.${post.user_id},connected_user_id.eq.${userId})`,
    )
    .limit(1)
    .maybeSingle();

  return connection ? 'ok' : 'forbidden';
}

/** Load reply threads only for the top-level comments on this page (not the whole post). */
async function fetchDescendantsForRoots(
  supabase: SupabaseClient,
  postId: string,
  roots: PostCommentRow[],
): Promise<PostCommentRow[]> {
  if (roots.length === 0) return [];

  const allDescendants: PostCommentRow[] = [];
  let frontierIds = roots.map((r) => r.id);
  const maxDepth = 32;

  for (let depth = 0; depth < maxDepth && frontierIds.length > 0; depth++) {
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, post_id, user_id, parent_comment_id, content, created_at')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .in('parent_comment_id', frontierIds)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const batch = (data ?? []) as PostCommentRow[];
    if (batch.length === 0) break;

    allDescendants.push(...batch);
    frontierIds = batch.map((row) => row.id);
  }

  return allDescendants;
}

async function fetchLikesForCommentIds(
  supabase: SupabaseClient,
  commentIds: string[],
  viewerUserId: string,
): Promise<Map<string, { count: number; user_liked: boolean }>> {
  const likesMap = new Map<string, { count: number; user_liked: boolean }>();
  if (commentIds.length === 0) return likesMap;

  const chunkSize = 200;
  for (let i = 0; i < commentIds.length; i += chunkSize) {
    const chunk = commentIds.slice(i, i + chunkSize);
    const { data: summaries, error: rpcError } = await supabase.rpc(
      'get_comment_like_summaries',
      {
        p_comment_ids: chunk,
        p_viewer_user_id: viewerUserId,
      },
    );

    if (!rpcError && summaries) {
      for (const row of summaries as {
        comment_id: string;
        like_count: number;
        user_liked: boolean;
      }[]) {
        likesMap.set(row.comment_id, {
          count: Number(row.like_count ?? 0),
          user_liked: Boolean(row.user_liked),
        });
      }
      continue;
    }

    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', chunk);

    for (const like of likes ?? []) {
      const existing = likesMap.get(like.comment_id) ?? { count: 0, user_liked: false };
      existing.count += 1;
      if (like.user_id === viewerUserId) existing.user_liked = true;
      likesMap.set(like.comment_id, existing);
    }
  }

  return likesMap;
}

function formatCommentTree(
  topLevel: PostCommentRow[],
  descendants: PostCommentRow[],
  profileMap: Map<string, ProfileRow>,
  likesMap: Map<string, { count: number; user_liked: boolean }>,
): FormattedPostComment[] {
  const allRows = [...topLevel, ...descendants];
  const childrenMap = new Map<string, PostCommentRow[]>();
  for (const row of allRows) {
    if (!row.parent_comment_id) continue;
    const arr = childrenMap.get(row.parent_comment_id) ?? [];
    arr.push(row);
    childrenMap.set(row.parent_comment_id, arr);
  }
  childrenMap.forEach((arr) =>
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  );

  const buildNode = (comment: PostCommentRow): FormattedPostComment => {
    const profile = profileMap.get(comment.user_id);
    const likeData = likesMap.get(comment.id) ?? { count: 0, user_liked: false };
    const directChildren = (childrenMap.get(comment.id) ?? []).map((child) => buildNode(child));
    const authorLike = {
      id: comment.user_id,
      name: profile?.display_name || profile?.username || 'User',
      username: profile?.username || null,
      avatar_url: profile?.avatar_url || null,
      is_verified: Boolean(profile?.is_verified),
    };

    return {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      parent_comment_id: comment.parent_comment_id,
      content: comment.content,
      image_url: comment.image_url ?? null,
      user: {
        id: authorLike.id,
        display_name: authorLike.name,
        username: authorLike.username,
        avatar_url: authorLike.avatar_url,
      },
      author: authorLike,
      created_at: comment.created_at,
      likes_count: likeData.count,
      like_count: likeData.count,
      user_liked: likeData.user_liked,
      replies_count: directChildren.length,
      replies: directChildren,
    };
  };

  return topLevel.map((comment) => buildNode(comment));
}

export async function fetchPostCommentsPage(
  supabase: SupabaseClient,
  params: {
    postId: string;
    viewerUserId: string;
    page: number;
    limit: number;
  },
): Promise<{
  comments: FormattedPostComment[];
  pagination: { page: number; limit: number; total: number; has_more: boolean };
}> {
  const { postId, viewerUserId, page, limit } = params;
  const offset = (page - 1) * limit;

  // Do not select image_url — column is not present on all environments yet.
  const topLevelQuery = supabase
    .from('post_comments')
    .select('id, post_id, user_id, parent_comment_id, content, created_at')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const [{ count: totalTopLevel, error: countError }, { data: topLevel, error: topError }] =
    await Promise.all([
      supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)
        .is('deleted_at', null)
        .is('parent_comment_id', null),
      topLevelQuery,
    ]);

  if (countError) throw countError;
  if (topError) throw topError;

  const total = totalTopLevel ?? 0;
  if (total === 0) {
    return {
      comments: [],
      pagination: { page, limit, total: 0, has_more: false },
    };
  }

  const topRows = (topLevel ?? []) as PostCommentRow[];
  if (topRows.length === 0) {
    return {
      comments: [],
      pagination: { page, limit, total, has_more: total > offset + limit },
    };
  }

  const descendants = await fetchDescendantsForRoots(supabase, postId, topRows);
  const rowsForTree = [...topRows, ...descendants];
  const userIds = [...new Set(rowsForTree.map((c) => c.user_id))];

  const [{ data: profiles }, likesMap] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', userIds),
    fetchLikesForCommentIds(
      supabase,
      rowsForTree.map((c) => c.id),
      viewerUserId,
    ),
  ]);

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of (profiles ?? []) as ProfileRow[]) {
    profileMap.set(profile.id, profile);
  }

  return {
    comments: formatCommentTree(topRows, descendants, profileMap, likesMap),
    pagination: {
      page,
      limit,
      total,
      has_more: total > offset + limit,
    },
  };
}
