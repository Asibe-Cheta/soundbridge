-- Fresh-MFA ("step-up") check for sensitive admin actions: bank-details
-- reveal, payout execution (single + batch), and manual-complete. A step-up
-- is short-lived (10 minutes) and separate from the regular login session —
-- re-entering a TOTP code right before a sensitive action, not just having
-- logged in at some point earlier (which today's requireAdmin alone allows,
-- with no MFA check of any kind — confirmed in this session's investigation).
--
-- Reuses the existing two_factor_secrets table (this codebase's own TOTP
-- system, not Supabase Auth's native MFA) — "enrolled" is proven by actually
-- verifying a real code at step-up time, not a separate status flag (there
-- is no verified/is_active column on two_factor_secrets to check instead).
--
-- NOT enforced by this migration alone — see src/lib/admin-mfa.ts: the
-- check is gated behind the ADMIN_MFA_STEP_UP_ENFORCED env var, unset/false
-- by default, so deploying this is inert until that's flipped on.

CREATE TABLE IF NOT EXISTS public.admin_step_up_sessions (
  user_id UUID PRIMARY KEY,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE public.admin_step_up_sessions IS
  'One row per admin, holding their most recent fresh-MFA verification. A sensitive route checks expires_at > now(); requireFreshMfa in admin-mfa.ts is the only place that reads or writes this.';

ALTER TABLE public.admin_step_up_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_step_up_sessions FROM PUBLIC;
REVOKE ALL ON public.admin_step_up_sessions FROM anon;
REVOKE ALL ON public.admin_step_up_sessions FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_step_up_sessions TO service_role;
