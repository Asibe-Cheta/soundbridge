-- Same bug class as creator_tips/tips/wallet_transactions (locked down in
-- 20261125100000_emergency_lock_money_tables.sql): live_session_tips' INSERT
-- policy only checked auth.uid() = tipper_id, with no restriction on
-- amount/platform_fee_amount/creator_amount/status -- a user could insert a
-- fake "completed" tip with any amount. Confirmed this table does NOT feed
-- creator earnings, payouts, or the wallet (it's read only by
-- src/lib/community-service.ts for community-join eligibility and by a
-- thank-you-DM trigger), so this is a lower-severity integrity bug than the
-- money-table ones, but the same fix applies: no user insert, service-role
-- only. The real write path is now src/lib/tip-payment-intent-webhook.ts's
-- recordLiveSessionTipIfApplicable(), called only after a Stripe
-- PaymentIntent has actually succeeded, using the same verified
-- amount/fee values already used to credit the real tip.

DROP POLICY IF EXISTS "Users can send tips" ON public.live_session_tips;
REVOKE INSERT, UPDATE, DELETE ON public.live_session_tips FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.live_session_tips FROM anon;
GRANT SELECT ON public.live_session_tips TO authenticated;
GRANT INSERT, SELECT ON public.live_session_tips TO service_role;

COMMENT ON TABLE public.live_session_tips IS
  'Live-session tip stats/notification-trigger table. Not the money ledger (tips/creator_tips are). Written only by src/lib/tip-payment-intent-webhook.ts via the service role, after a real Stripe payment succeeds.';
