import type { Post } from '@/src/lib/types/post';

export const CAUGHT_UP_MARKER_ID = '__caught_up_marker__';

/** Default cursor for first-time users: 7 days ago. */
export function resolveFeedCursor(lastCaughtUpAt: string | null | undefined): Date {
  if (lastCaughtUpAt) {
    const parsed = new Date(lastCaughtUpAt);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export function splitPostsByFeedCursor(
  posts: Post[],
  cursor: Date,
): { newPosts: Post[]; olderPosts: Post[] } {
  const cursorMs = cursor.getTime();
  const newPosts: Post[] = [];
  const olderPosts: Post[] = [];

  for (const post of posts) {
    const createdMs = new Date(post.created_at).getTime();
    if (createdMs > cursorMs) {
      newPosts.push(post);
    } else {
      olderPosts.push(post);
    }
  }

  return { newPosts, olderPosts };
}
