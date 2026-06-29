-- Post comments API: BFS reply fetch by parent_comment_id + aggregated like counts.
-- Complements 20260625130000_post_comments_performance_indexes.sql (apply both if missing).

CREATE INDEX IF NOT EXISTS idx_post_comments_post_top_level_created
  ON public.post_comments (post_id, created_at DESC)
  WHERE deleted_at IS NULL AND parent_comment_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_post_comments_post_replies_created
  ON public.post_comments (post_id, created_at ASC)
  WHERE deleted_at IS NULL AND parent_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_comments_parent_created
  ON public.post_comments (parent_comment_id, created_at ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_active
  ON public.post_comments (post_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_user
  ON public.comment_likes (comment_id, user_id);

CREATE OR REPLACE FUNCTION public.get_comment_like_summaries(
  p_comment_ids uuid[],
  p_viewer_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  comment_id uuid,
  like_count bigint,
  user_liked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cl.comment_id,
    COUNT(*)::bigint AS like_count,
    COALESCE(BOOL_OR(cl.user_id = p_viewer_user_id), false) AS user_liked
  FROM public.comment_likes cl
  WHERE cl.comment_id = ANY (p_comment_ids)
  GROUP BY cl.comment_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_comment_like_summaries(uuid[], uuid) TO service_role;

ANALYZE public.post_comments;
ANALYZE public.comment_likes;
