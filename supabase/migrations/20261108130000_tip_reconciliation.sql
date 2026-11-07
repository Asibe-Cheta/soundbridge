-- Supports the scheduled tip-reconciliation job (/api/cron/reconcile-pending-tips,
-- src/lib/tip-reconciliation.ts): finalizes tips that are stuck 'pending' despite
-- Stripe already succeeding, or that have no tips/creator_tips row at all, using
-- the exact creator_earnings/platform_fee Stripe recorded for that charge.

-- Flags a row as backfilled by the reconciliation job, distinct from a normal
-- webhook-completed tip.
ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_reason TEXT;

ALTER TABLE public.creator_tips
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_reason TEXT;

-- Append-only audit log, one row per payment_intent_id ever reconciled. The
-- unique constraint on payment_intent_id is what makes reconcileTipPaymentIntent()
-- idempotent at the database level, not just in application logic: a second
-- attempt to log the same PI fails the insert rather than crediting twice.
CREATE TABLE IF NOT EXISTS public.tip_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  creator_earnings NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  triggered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tip_reconciliation_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tip_reconciliation_log IS
  'Audit log of tips backfilled by the reconciliation job (stuck-pending or missing rows), keyed uniquely on payment_intent_id for idempotency. Service-role only, zero RLS policies.';

GRANT SELECT, INSERT ON public.tip_reconciliation_log TO service_role;
