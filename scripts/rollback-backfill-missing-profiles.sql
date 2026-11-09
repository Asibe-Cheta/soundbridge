-- Rollback for supabase/migrations/20261109151000_backfill_missing_profiles.sql
--
-- WARNING: only run this if none of the 225 backfilled users have touched
-- their account since the backfill (logged in again, started onboarding,
-- edited their profile). The WHERE clause below only deletes rows that are
-- still exactly as the backfill left them (updated_at = created_at,
-- onboarding_completed still false) AND are present in profile_backfill_log —
-- it will not touch a real user's profile for any other reason, but it also
-- means a user who DID come back and start onboarding will be silently left
-- in place rather than deleted (check profile_backfill_log against profiles
-- first if you need to know which ones that affects).
DELETE FROM public.profiles p
USING public.profile_backfill_log l
WHERE p.id = l.user_id
  AND p.updated_at = p.created_at
  AND p.onboarding_completed = false;

DELETE FROM public.profile_backfill_log;
DROP TABLE IF EXISTS public.profile_backfill_log;
