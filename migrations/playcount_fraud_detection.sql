-- Reference copy — canonical migration: supabase/migrations/20260612120000_playcount_fraud_detection.sql
-- Play count fraud detection — web/backend implementation reference

ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS is_valid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_suspicious boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_reason text,
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS idx_play_sessions_track_user_played_valid
  ON public.play_sessions (track_id, user_id, played_at DESC)
  WHERE is_valid = true AND is_rejected = false;

CREATE INDEX IF NOT EXISTS idx_play_sessions_track_ip_played
  ON public.play_sessions (track_id, ip_address, played_at DESC)
  WHERE ip_address IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.creator_fraud_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.audio_tracks(id) ON DELETE SET NULL,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  total_plays integer NOT NULL DEFAULT 0,
  unique_listeners integer NOT NULL DEFAULT 0,
  play_to_listener_ratio numeric(10,2),
  platform_ratio numeric(10,4),
  ip_concentration_score numeric(10,4),
  time_clustering_score numeric(10,4),
  suspicious_plays_count integer NOT NULL DEFAULT 0,
  rejected_plays_count integer NOT NULL DEFAULT 0,
  fraud_score numeric(5,2) NOT NULL DEFAULT 0,
  fraud_status text NOT NULL DEFAULT 'clean'
    CHECK (fraud_status IN ('clean', 'monitor', 'flagged', 'hold')),
  fraud_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  payout_held boolean NOT NULL DEFAULT false,
  reviewed_by_admin boolean NOT NULL DEFAULT false,
  admin_decision text CHECK (admin_decision IN ('approved', 'withheld', 'banned')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, track_id, analysis_date)
);

COMMENT ON TABLE public.creator_fraud_analysis IS
  'Daily fraud analysis per creator/track; drives payout holds and admin review.';

-- Full record_play_session implementation: see supabase/migrations/20260612120000_playcount_fraud_detection.sql
