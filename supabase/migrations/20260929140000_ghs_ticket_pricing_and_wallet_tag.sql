-- GHS ticket pricing (display/denomination currency for Ghanaian organizers) +
-- wallet tagging for ticket revenue that settles via the wallet/Fincra path instead of
-- a direct Stripe Connect transfer.
--
-- Architecture: Stripe's UK-registered platform account rejects GHS outright (confirmed
-- via a real PaymentIntent attempt: "Stripe accounts in GB do not support ghs"), so a
-- GHS-priced ticket is charged to the buyer in USD (Stripe-supported) and the organizer's
-- 85% cut is credited to their internal wallet (in USD) instead of a Stripe Connect
-- transfer, since a Ghanaian organizer has no UK Stripe Connect payout route. From there,
-- the existing, already-currency-generic Fincra payout path
-- (resolveFincraPayoutAmount/performCreatorFincraWalletPayout) converts and pays out in
-- GHS at withdrawal time — no changes needed on that side. GBP/NGN tickets are completely
-- unaffected: they keep using the direct Stripe Connect transfer they always have.

-- price_ghs mirrors price_gbp/price_ngn on both the base event price and per-tier price.
-- Nullable, additive — no existing event or tier is affected.
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_ghs NUMERIC(10, 2);
ALTER TABLE event_ticket_tiers ADD COLUMN IF NOT EXISTS price_ghs NUMERIC(10, 2);

-- Widen the tier price-presence check to also accept price_ghs alone, same "at least one
-- currency" reasoning as the original GBP/NGN check.
ALTER TABLE event_ticket_tiers DROP CONSTRAINT IF EXISTS event_ticket_tiers_price_check;
ALTER TABLE event_ticket_tiers ADD CONSTRAINT event_ticket_tiers_price_check
  CHECK (price_gbp IS NOT NULL OR price_ngn IS NOT NULL OR price_ghs IS NOT NULL);

-- Add 'ticket_sale' to wallet_transactions.transaction_type so GHS ticket revenue can be
-- tagged distinctly from a generic tip when it's credited to the organizer's wallet.
-- The other 9 values below were confirmed as the exact current live allow-list by directly
-- probing each with a real insert (not guessed/re-derived from the TS union) before writing
-- this DROP+ADD, so none of them are being silently dropped.
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'deposit', 'withdrawal', 'tip_received', 'tip_sent', 'payout',
    'refund', 'gig_payment', 'gig_refund', 'content_sale', 'ticket_sale'
  ));
