-- Rollback for supabase/migrations/20261109150000_handle_new_user_trigger.sql
--
-- Safe to run at any time: this only removes the trigger/function. It does
-- NOT touch any profiles rows already created, by the trigger or otherwise.
-- After rollback, profile-row creation reverts to depending entirely on
-- post-signup-confirm/route.ts and auth/callback/route.ts succeeding — i.e.
-- the original drop-off bug condition returns. Redeploy the pre-trigger
-- version of auth/callback/route.ts (revert its OAuth-enrichment change)
-- before or at the same time as running this, so the two stay consistent.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
