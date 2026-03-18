-- WEB_TEAM_PLATFORM_FEE_TRACKING_REQUIRED.md: platform revenue for P&L and reconciliation
-- All amounts in smallest currency unit (pence/cents) for consistency.

CREATE TABLE IF NOT EXISTS platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_type TEXT NOT NULL CHECK (charge_type IN ('gig_payment', 'tip', 'event_ticket', 'audio_sale')),
  gross_amount INTEGER NOT NULL,
  platform_fee_amount INTEGER NOT NULL,
  platform_fee_percent DECIMAL(5,2),
  creator_payout_amount INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  reference_id TEXT,
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_charge_type ON platform_revenue(charge_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created_at ON platform_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_stripe_pi ON platform_revenue(stripe_payment_intent_id);

COMMENT ON TABLE platform_revenue IS 'Platform fee tracking per transaction for P&L and Stripe reconciliation; amounts in minor units (pence/cents)';

-- Idempotent insert by stripe_payment_intent_id (avoid duplicates from retries)
CREATE OR REPLACE FUNCTION insert_platform_revenue(
  p_charge_type TEXT,
  p_gross_amount INTEGER,
  p_platform_fee_amount INTEGER,
  p_platform_fee_percent DECIMAL,
  p_creator_payout_amount INTEGER,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_creator_user_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT 'GBP'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_stripe_payment_intent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM platform_revenue WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
  ) THEN
    SELECT id INTO v_id FROM platform_revenue WHERE stripe_payment_intent_id = p_stripe_payment_intent_id LIMIT 1;
    RETURN v_id;
  END IF;
  INSERT INTO platform_revenue (charge_type, gross_amount, platform_fee_amount, platform_fee_percent, creator_payout_amount, stripe_payment_intent_id, reference_id, creator_user_id, currency)
  VALUES (p_charge_type, p_gross_amount, p_platform_fee_amount, p_platform_fee_percent, p_creator_payout_amount, p_stripe_payment_intent_id, p_reference_id, p_creator_user_id, p_currency)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_platform_revenue(TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_platform_revenue(TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT, TEXT, UUID, TEXT) TO service_role;

-- Ops runbook: revenue reconciliation by charge type (amounts in minor units; divide by 100 for GBP)
-- SELECT charge_type, COUNT(*) AS transactions, SUM(gross_amount)/100.0 AS gross_gbp, SUM(platform_fee_amount)/100.0 AS fees_gbp, SUM(creator_payout_amount)/100.0 AS creator_payouts_gbp FROM platform_revenue GROUP BY charge_type ORDER BY fees_gbp DESC;
