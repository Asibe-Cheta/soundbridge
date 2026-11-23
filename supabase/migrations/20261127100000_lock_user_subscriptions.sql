-- Same bug as wallet_transactions/creator_tips/tips/live_session_tips:
-- user_subscriptions has a blanket table-level grant
-- (GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated,
-- from database/fix_user_subscriptions_complete.sql) plus row-ownership-only
-- RLS policies with no column restriction -- a user could set their own
-- tier/status directly. Every column on this table is billing state or
-- payment-provider linkage (tier, status, stripe_*, iap_*); there is no
-- legitimate "my own subscription nickname" field the way creator_bank_accounts
-- had, so this is a full lockdown, not a column allow-list: no user INSERT or
-- UPDATE, writes go through the service role only, same as the money tables.
--
-- Every writer that used the user's own client is now converted to a
-- service-role client as part of this change (see the commit): the one real
-- gap was app/api/subscriptions/verify-iap/route.ts (its Google Play path
-- also had its own, separate, more serious bug: it fabricated a fake-valid
-- result when GOOGLE_SERVICE_ACCOUNT_KEY_PATH wasn't configured, instead of
-- rejecting -- fixed to fail closed). app/api/subscription/upgrade/route.ts
-- (zero callers anywhere, granted a paid tier with no payment at all) and
-- app/api/onboarding/upgrade-pro-direct-sql.ts (dead reference code, no
-- route handler, zero callers) were deleted outright rather than converted.
-- Six other writers (subscription/cancel, subscription/refund,
-- onboarding/upgrade-pro, cron/downgrade-past-due,
-- cron/institutional-access-expiry, stripe/webhook) were already
-- service-role. SELECT stays available to authenticated users (read their
-- own row) -- resolveAdviserTier(), /api/user/limits, and the several
-- tier-gating reads elsewhere are unaffected.

REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM anon;
GRANT SELECT ON public.user_subscriptions TO authenticated;

COMMENT ON TABLE public.user_subscriptions IS
  'Billing state. No user write -- is_verified-class columns (tier, status, stripe_*, iap_*) are only ever set server-side after real payment/receipt verification.';
