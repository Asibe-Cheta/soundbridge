-- WEB_TEAM_SUBSCRIPTION_BILLING_INVOICES.MD: UK-compliant sequential invoice numbers
-- Sequential counter for INV-00001 style numbers (do not use Stripe invoice ID as public number).

CREATE TABLE IF NOT EXISTS invoice_sequences (
  id SERIAL PRIMARY KEY,
  prefix TEXT NOT NULL DEFAULT 'INV' UNIQUE,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Single row for INV prefix
INSERT INTO invoice_sequences (prefix, last_number)
VALUES ('INV', 0)
ON CONFLICT (prefix) DO NOTHING;

-- Store our invoice number per Stripe invoice (for idempotency and support lookup)
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  invoice_number TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_stripe_invoice_id ON subscription_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_user_id ON subscription_invoices(user_id);

COMMENT ON TABLE invoice_sequences IS 'Sequential invoice number counter for UK-compliant INV-00001 format';
COMMENT ON TABLE subscription_invoices IS 'Maps Stripe invoice ID to our public invoice number; one row per invoice.payment_succeeded';

-- Optional: store current price id to detect plan changes for subscription.updated email
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS subscription_price_id TEXT;
COMMENT ON COLUMN user_subscriptions.subscription_price_id IS 'Stripe price ID for plan-change detection (subscription.updated email)';

-- Atomic next invoice number (INV-00001, INV-00002, ...)
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE invoice_sequences SET last_number = last_number + 1 WHERE prefix = 'INV' RETURNING last_number INTO n;
  RETURN 'INV-' || LPAD(COALESCE(n, 1)::TEXT, 5, '0');
END;
$$;
