-- Staging table for early adopter launch email cohort (~397 emails).
-- Seed via scripts/waitlist-premium-2026-seed-emails.sql then apply scripts/early-adopter-cohort-apply-prod.sql

CREATE TABLE IF NOT EXISTS public.waitlist_premium_3mo_2026 (
  email text NOT NULL PRIMARY KEY
);

COMMENT ON TABLE public.waitlist_premium_3mo_2026 IS
  'Emails for 3-month Premium promo (Apr–Jul 2026). Match auth.users on signup.';

ALTER TABLE public.waitlist_premium_3mo_2026 ENABLE ROW LEVEL SECURITY;
