-- =============================================================================
-- Run ONLY in SoundBridge project: aunxdbqukbxyyiusaeqi
-- https://supabase.com/dashboard/project/aunxdbqukbxyyiusaeqi
--
-- If auth_users ≈ 38k or profiles has email/full_name as main columns → WRONG PROJECT
-- (that is GlobalReady Mobile, not SoundBridge)
-- =============================================================================

SELECT 'SoundBridge sanity check' AS check_name;

SELECT COUNT(*)::bigint AS auth_users FROM auth.users;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('username', 'display_name', 'early_adopter', 'email', 'full_name', 'subscription_tier')
ORDER BY column_name;

SELECT
  COUNT(*) FILTER (WHERE early_adopter) AS early_adopters,
  COUNT(*) FILTER (WHERE lower(COALESCE(subscription_tier::text, 'free')) <> 'free') AS paid_on_profiles
FROM public.profiles;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'founding_members'
) AS has_founding_members;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'waitlist_premium_3mo_2026'
) AS has_early_adopter_waitlist;
