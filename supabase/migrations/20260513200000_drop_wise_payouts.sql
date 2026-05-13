-- Withdrawal / payout records: use public.payout_requests (Fincra transfer id stored in stripe_transfer_id).
-- Removes legacy Wise-only table if it exists from older environments.

DROP TABLE IF EXISTS wise_payouts CASCADE;
