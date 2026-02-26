-- DMCA / Copyright Takedown System (Web + Mobile)
-- Based on WEB_TEAM_DMCA_TAKEDOWN_IMPLEMENTATION.md

-- 1) New takedowns table
CREATE TABLE IF NOT EXISTS takedowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('track', 'post', 'playlist')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'actioned',
      'counter_notice_received',
      'restored',
      'dismissed',
      'court_action_filed'
    )),

  -- Claimant information (17 USC 512(c)(3) fields)
  claimant_name text NOT NULL,
  claimant_email text NOT NULL,
  claimant_address text NOT NULL,
  claimant_phone text,
  copyrighted_work_description text NOT NULL,
  infringing_url text NOT NULL,
  good_faith_statement boolean NOT NULL DEFAULT true,
  accuracy_statement boolean NOT NULL DEFAULT true,
  signature text NOT NULL,
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('DMCA', 'CDPA')),

  -- Strike tracking
  uploader_id uuid REFERENCES profiles(id),
  strike_count integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  actioned_at timestamptz,
  counter_notice_at timestamptz,
  restore_after timestamptz,

  -- Counter-notice fields (512(g))
  counter_statement text,
  counter_perjury_consent boolean,
  counter_court_consent boolean,
  counter_service_address text,
  counter_submitted_at timestamptz,

  -- Admin
  reviewed_by uuid REFERENCES profiles(id),
  admin_notes text
);

CREATE INDEX IF NOT EXISTS idx_takedowns_content ON takedowns(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_takedowns_uploader ON takedowns(uploader_id);
CREATE INDEX IF NOT EXISTS idx_takedowns_status ON takedowns(status);
CREATE INDEX IF NOT EXISTS idx_takedowns_restore ON takedowns(restore_after) WHERE restore_after IS NOT NULL;

-- 2) Moderation status extension on audio_tracks
ALTER TABLE audio_tracks
  DROP CONSTRAINT IF EXISTS audio_tracks_moderation_status_check;

ALTER TABLE audio_tracks
  ADD CONSTRAINT audio_tracks_moderation_status_check
  CHECK (
    moderation_status IN (
      'pending_check',
      'checking',
      'clean',
      'flagged',
      'approved',
      'rejected',
      'appealed',
      'taken_down'
    )
  );

-- 3) Infringer strike counter on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS copyright_strikes integer NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS upload_suspended_until timestamptz;

