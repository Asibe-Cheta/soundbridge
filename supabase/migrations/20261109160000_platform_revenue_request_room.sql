-- Adds 'request_room' as an allowed platform_revenue.charge_type, the same
-- way 'album_sale' was added in 20260331100000_albums_pricing_and_platform_revenue_album_sale.sql.
--
-- Request Room payments (Stripe: request-room-payment-intent-webhook.ts;
-- PayPal: paypal-finalize.ts's finalizeRequestRoomTip) credit the creator's
-- wallet correctly via add_wallet_transaction, but neither path has ever
-- called insert_platform_revenue — confirmed by reading both files, and by
-- paypal-finalize.ts's own comment above finalizeRequestRoomTip: "the Stripe
-- path doesn't call insert_platform_revenue for this flow either — mirrored
-- as-is." So Request Room fees are real money, correctly paid to creators,
-- but invisible to every platform_revenue-based report — the only place the
-- fee is recoverable today is wallet_transactions.metadata.
--
-- A distinct 'request_room' charge_type (rather than reusing 'tip') keeps
-- Request Room separately reportable, matching why this gap was worth
-- fixing in the first place.
ALTER TABLE public.platform_revenue
  DROP CONSTRAINT IF EXISTS platform_revenue_charge_type_check;

ALTER TABLE public.platform_revenue
  ADD CONSTRAINT platform_revenue_charge_type_check
  CHECK (charge_type IN ('gig_payment', 'tip', 'event_ticket', 'audio_sale', 'album_sale', 'request_room'));
