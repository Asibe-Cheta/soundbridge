-- Daily solvency check: compares total wallet liabilities (what SoundBridge
-- owes creators, per the investor payout report this session) against actual
-- confirmed funds — live Stripe balance (API) + a manually-entered Fincra
-- funded balance, since Fincra is pre-funded externally and this codebase
-- has no Fincra balance API call. Justice updates the Fincra figure at each
-- top-up.

CREATE TABLE IF NOT EXISTS public.fincra_funded_balance (
  id INTEGER PRIMARY KEY DEFAULT 1,
  amount NUMERIC NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT fincra_funded_balance_singleton CHECK (id = 1)
);

COMMENT ON TABLE public.fincra_funded_balance IS
  'Single-row, manually-updated record of how much is actually sitting in the Fincra account — there is no balance-query API wired up for Fincra in this codebase. Update this every time Fincra is topped up.';

ALTER TABLE public.fincra_funded_balance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fincra_funded_balance FROM PUBLIC;
REVOKE ALL ON public.fincra_funded_balance FROM anon;
REVOKE ALL ON public.fincra_funded_balance FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fincra_funded_balance TO service_role;

CREATE TABLE IF NOT EXISTS public.solvency_check_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  wallet_liabilities_usd NUMERIC NOT NULL,
  stripe_balance_usd NUMERIC NOT NULL,
  fincra_funded_usd NUMERIC NOT NULL,
  is_solvent BOOLEAN NOT NULL,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_solvency_check_log_checked_at ON public.solvency_check_log (checked_at);

ALTER TABLE public.solvency_check_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.solvency_check_log FROM PUBLIC;
REVOKE ALL ON public.solvency_check_log FROM anon;
REVOKE ALL ON public.solvency_check_log FROM authenticated;
GRANT SELECT, INSERT ON public.solvency_check_log TO service_role;
