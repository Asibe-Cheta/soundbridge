-- Store Fincra customerReference alongside numeric transfer id for webhook + status polling.
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS fincra_customer_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_payout_requests_fincra_customer_reference
  ON payout_requests (fincra_customer_reference)
  WHERE fincra_customer_reference IS NOT NULL;

COMMENT ON COLUMN payout_requests.fincra_customer_reference IS
  'Fincra customerReference sent on disbursement (e.g. fincra_<payout_request_id>_<ts>). Used for webhooks and status polling.';
