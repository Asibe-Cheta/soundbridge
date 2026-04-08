-- Block user feature (mobile + web)

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
CREATE POLICY "Users can view their own blocks"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "Users can block others" ON public.user_blocks;
CREATE POLICY "Users can block others"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock" ON public.user_blocks;
CREATE POLICY "Users can unblock"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);
