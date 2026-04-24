-- WEB_TEAM_FINCRA_INTEGRATION.MD: allow fincra method + optional Fincra metadata columns

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_method_check;

ALTER TABLE public.payouts
  ADD CONSTRAINT payouts_method_check
  CHECK (method IN ('stripe', 'wise', 'fincra'));

ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS fincra_reference TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS customer_reference TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS source_currency CHAR(3);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS bank_code TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS beneficiary_name TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payouts_customer_reference_unique
  ON public.payouts (customer_reference)
  WHERE customer_reference IS NOT NULL;
