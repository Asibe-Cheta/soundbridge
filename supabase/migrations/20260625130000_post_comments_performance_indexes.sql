-- Performance: post_comments RLS runs a heavy posts+connections subquery per row.
-- These indexes support the service-role comments API and direct post_id filters.

CREATE INDEX IF NOT EXISTS idx_post_comments_post_top_level_created
  ON public.post_comments (post_id, created_at DESC)
  WHERE deleted_at IS NULL AND parent_comment_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_post_comments_post_replies_created
  ON public.post_comments (post_id, created_at ASC)
  WHERE deleted_at IS NULL AND parent_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user
  ON public.comment_likes (comment_id, user_id);

ANALYZE public.post_comments;
ANALYZE public.comment_likes;
