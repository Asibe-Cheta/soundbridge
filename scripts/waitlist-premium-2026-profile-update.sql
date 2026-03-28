-- =============================================================================
-- Waitlist 3-month Premium — DB backup (1 Apr 2026 → 1 Jul 2026 UTC)
-- =============================================================================
-- This file does NOT load emails. It only creates the empty staging table.
--
-- After this file, run IN ORDER:
--   1) scripts/waitlist-premium-2026-seed-emails.sql  → loads all 397 emails from CSV
--   2) scripts/waitlist-premium-2026-step-2-preview-then-update.sql → previews + UPDATE + UUID export
--
-- Or import the CSV manually into waitlist_premium_3mo_2026, then run step 2 only.
--
-- Email match: auth.users.email ↔ staging email (case-insensitive).
-- Duplicates: one profile per lower(email) — keeps most recently created auth user.
--
-- Vercel: REVENUECAT_SECRET_API_KEY must be set for webhook GET guard (optional
-- but recommended). Do NOT put the RevenueCat *secret* key in Expo as EXPO_PUBLIC_*.
-- =============================================================================

-- Step 0 — one-time staging table (service role / SQL editor as postgres)
CREATE TABLE IF NOT EXISTS public.waitlist_premium_3mo_2026 (
  email TEXT NOT NULL PRIMARY KEY
);

COMMENT ON TABLE public.waitlist_premium_3mo_2026 IS
  'Emails for 3-month Premium promo (Apr–Jul 2026). Import CSV email column; drop after campaign if desired.';

-- Optional: tighten access (adjust if you use authenticated clients on this table)
ALTER TABLE public.waitlist_premium_3mo_2026 ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PREVIEW A: how many staging emails have at least one auth account?
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) AS matched_profiles
-- FROM (
--   SELECT DISTINCT ON (lower(trim(u.email))) p.id
--   FROM public.waitlist_premium_3mo_2026 c
--   INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
--   INNER JOIN public.profiles p ON p.id = u.id
--   ORDER BY lower(trim(u.email)), u.created_at DESC NULLS LAST
-- ) x;

-- -----------------------------------------------------------------------------
-- PREVIEW B: staging emails with NO auth user yet (grant RC after signup)
-- -----------------------------------------------------------------------------
-- SELECT lower(trim(c.email)) AS email
-- FROM public.waitlist_premium_3mo_2026 c
-- WHERE NOT EXISTS (
--   SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(trim(c.email))
-- )
-- ORDER BY 1;

-- -----------------------------------------------------------------------------
-- EXPORT UUIDs for: node scripts/revenuecat-grant-waitlist-premium.js
-- (Copy query result → one UUID per line)
-- -----------------------------------------------------------------------------
-- WITH latest AS (
--   SELECT DISTINCT ON (lower(trim(u.email)))
--     p.id AS profile_id
--   FROM public.waitlist_premium_3mo_2026 c
--   INNER JOIN auth.users u ON lower(u.email) = lower(trim(c.email))
--   INNER JOIN public.profiles p ON p.id = u.id
--   ORDER BY lower(trim(u.email)), u.created_at DESC NULLS LAST
-- )
-- SELECT profile_id::text AS app_user_id FROM latest ORDER BY 1;

-- -----------------------------------------------------------------------------
-- UPDATE profiles — moved to waitlist-premium-2026-step-2-preview-then-update.sql
-- (so you seed emails first; running UPDATE here with an empty table updates 0 rows)
-- -----------------------------------------------------------------------------
-- WITH latest AS ( ... )
-- UPDATE public.profiles p SET ... (see step-2 file)

-- If any column is missing in your DB, add it first, e.g.:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;
-- (Match your existing profiles schema / mobile spec.)
