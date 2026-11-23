-- Rollback for supabase/migrations/20261111100000_admin_mfa_step_up.sql
-- Safe at any time — drops one standalone table. If ADMIN_MFA_STEP_UP_ENFORCED
-- is "true" in Vercel when you run this, set it back to unset/false first,
-- or every sensitive admin route will start failing closed (requireFreshMfa
-- treats a missing table as "not verified", not "feature off").
DROP TABLE IF EXISTS public.admin_step_up_sessions;
