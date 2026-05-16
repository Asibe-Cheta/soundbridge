-- Mobile: track-level tip gate + idempotent post-tip thank-you DM marker

ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES public.audio_tracks(id) ON DELETE SET NULL;

ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS thank_you_message_id UUID;

CREATE INDEX IF NOT EXISTS idx_tips_sender_track_completed
  ON public.tips (sender_id, track_id)
  WHERE status = 'completed' AND track_id IS NOT NULL;

COMMENT ON COLUMN public.tips.track_id IS 'Audio track that triggered the tip (mobile player).';
COMMENT ON COLUMN public.tips.thank_you_message_id IS 'DM sent from creator to tipper after successful tip (idempotency).';

-- Mobile can query: tips WHERE sender_id = auth.uid() AND track_id = $1 AND status = ''completed''
-- Existing RLS "Users can view their own tips" already allows sender SELECT.
