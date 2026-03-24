-- =====================================================
-- Founding Member Claim Tracking
-- =====================================================
-- Purpose:
-- 1) Log every founding-member claim/check attempt
-- 2) Store claim snapshots on founding_members for fast reporting
-- =====================================================

CREATE TABLE IF NOT EXISTS founding_member_claim_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  founding_member_id UUID REFERENCES founding_members(id) ON DELETE SET NULL,
  found BOOLEAN NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'founding_member_page',
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_fm_claim_events_email
  ON founding_member_claim_events (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_fm_claim_events_claimed_at
  ON founding_member_claim_events (claimed_at DESC);

ALTER TABLE founding_members
  ADD COLUMN IF NOT EXISTS first_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE VIEW founding_member_claim_status AS
SELECT
  fm.id,
  fm.email,
  fm.waitlist_signed_up_at,
  fm.first_claimed_at,
  fm.last_claimed_at,
  fm.claim_count,
  (fm.claim_count > 0) AS has_claimed
FROM founding_members fm;

-- Quick reporting queries:
-- SELECT
--   COUNT(*) AS total_founding_members,
--   COUNT(*) FILTER (WHERE claim_count > 0) AS claimed_count,
--   COUNT(*) FILTER (WHERE claim_count = 0) AS unclaimed_count,
--   ROUND(100.0 * COUNT(*) FILTER (WHERE claim_count > 0) / NULLIF(COUNT(*), 0), 2) AS claim_rate_percent
-- FROM founding_members;
--
-- SELECT email, last_claimed_at, claim_count
-- FROM founding_members
-- WHERE claim_count > 0
-- ORDER BY last_claimed_at DESC
-- LIMIT 50;
