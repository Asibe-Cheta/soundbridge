-- Rollback for supabase/migrations/20261109161000_backfill_request_room_platform_revenue.sql
--
-- Safe at any time: targets only the exact 3 payment intents backfilled by
-- that migration, by charge_type and stripe_payment_intent_id, so it cannot
-- touch any real Request Room row recorded by live code after this ships.
DELETE FROM public.platform_revenue
WHERE charge_type = 'request_room'
  AND stripe_payment_intent_id IN (
    'pi_3TRdf10Bt6mXrdye104Judbo',
    'pi_3TTlxo0Bt6mXrdye1YCs8ZWM',
    'pi_3TTm1r0Bt6mXrdye1wfigoTJ'
  );
