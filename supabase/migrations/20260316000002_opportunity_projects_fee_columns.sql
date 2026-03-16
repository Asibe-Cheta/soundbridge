-- WEB_TEAM_ACCEPT_INTEREST_500_FIX: Ensure opportunity_projects has fee columns (some envs may have older schema)
ALTER TABLE opportunity_projects
  ADD COLUMN IF NOT EXISTS platform_fee_percent  NUMERIC NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS platform_fee_amount   NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_payout_amount NUMERIC NOT NULL DEFAULT 0;
