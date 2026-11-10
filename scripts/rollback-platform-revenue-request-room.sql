-- Rollback for supabase/migrations/20261109160000_platform_revenue_request_room.sql
--
-- Only run this BEFORE the backfill migration (20261109161000) and the code
-- changes to request-room-payment-intent-webhook.ts/paypal-finalize.ts are
-- applied, or after they've been reverted first — removing 'request_room'
-- while rows with that charge_type still exist, or while live code is still
-- inserting them, will break on the next Request Room payment.
ALTER TABLE public.platform_revenue
  DROP CONSTRAINT IF EXISTS platform_revenue_charge_type_check;

ALTER TABLE public.platform_revenue
  ADD CONSTRAINT platform_revenue_charge_type_check
  CHECK (charge_type IN ('gig_payment', 'tip', 'event_ticket', 'audio_sale', 'album_sale'));
