-- CONTEXT_FEATURE_NUDGES.MD — contextual nudge state (web + mobile parity)
CREATE TABLE IF NOT EXISTS public.creator_context_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nudge_type text NOT NULL CHECK (nudge_type IN (
    'post_upload_distribution',
    'ai_career_adviser_deferred',
    'event_promotion',
    'signup_setup_checklist'
  )),
  track_id uuid REFERENCES public.audio_tracks(id) ON DELETE SET NULL,
  related_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_upload_at timestamptz,
  shown_at timestamptz,
  dismissed_at timestamptz,
  expired_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_context_nudges_user_type_idx
  ON public.creator_context_nudges (user_id, nudge_type);

CREATE UNIQUE INDEX IF NOT EXISTS creator_context_nudges_ai_adviser_user_idx
  ON public.creator_context_nudges (user_id)
  WHERE nudge_type = 'ai_career_adviser_deferred';

CREATE UNIQUE INDEX IF NOT EXISTS creator_context_nudges_distribution_track_idx
  ON public.creator_context_nudges (user_id, track_id)
  WHERE nudge_type = 'post_upload_distribution' AND track_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS creator_context_nudges_signup_checklist_user_idx
  ON public.creator_context_nudges (user_id)
  WHERE nudge_type = 'signup_setup_checklist';

ALTER TABLE public.creator_context_nudges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own context nudges" ON public.creator_context_nudges;
CREATE POLICY "Users read own context nudges"
  ON public.creator_context_nudges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own context nudges" ON public.creator_context_nudges;
CREATE POLICY "Users insert own context nudges"
  ON public.creator_context_nudges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own context nudges" ON public.creator_context_nudges;
CREATE POLICY "Users update own context nudges"
  ON public.creator_context_nudges FOR UPDATE
  USING (auth.uid() = user_id);
