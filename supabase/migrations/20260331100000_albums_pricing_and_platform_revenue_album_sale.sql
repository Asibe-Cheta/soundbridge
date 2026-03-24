-- Album paid content (parity with audio_tracks) + platform_revenue for album_sale
-- Safe if platform_revenue was never created (older migration not applied on prod).

-- 1) albums: pricing + sales metrics
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS total_sales_count INTEGER DEFAULT 0;

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10, 2) DEFAULT 0.00;

ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_check_price_range;
ALTER TABLE public.albums
  ADD CONSTRAINT albums_check_price_range
  CHECK (
    (is_paid = FALSE)
    OR (is_paid = TRUE AND price IS NOT NULL AND price >= 0.99 AND price <= 50.00)
  );

ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_check_currency;
ALTER TABLE public.albums
  ADD CONSTRAINT albums_check_currency
  CHECK (currency IS NULL OR currency IN ('USD', 'GBP', 'EUR'));

COMMENT ON COLUMN public.albums.is_paid IS 'When true, album is sold as a bundle; price/currency required';
COMMENT ON COLUMN public.albums.total_sales_count IS 'Completed purchases (content_purchases content_type=album)';
COMMENT ON COLUMN public.albums.total_revenue IS 'Sum of buyer-paid amounts for album purchases';

-- 2) platform_revenue: ensure table exists (from 20260328000000_platform_revenue.sql) + album_sale
CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_type TEXT NOT NULL,
  gross_amount INTEGER NOT NULL,
  platform_fee_amount INTEGER NOT NULL,
  platform_fee_percent DECIMAL(5, 2),
  creator_payout_amount INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  reference_id TEXT,
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_charge_type ON public.platform_revenue(charge_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created_at ON public.platform_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_stripe_pi ON public.platform_revenue(stripe_payment_intent_id);

COMMENT ON TABLE public.platform_revenue IS 'Platform fee tracking per transaction for P&L and Stripe reconciliation; amounts in minor units (pence/cents)';

-- Replace charge_type CHECK (covers legacy table created without album_sale)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'platform_revenue'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%charge_type%'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.platform_revenue DROP CONSTRAINT IF EXISTS %I', conname);
  END IF;
END $$;

ALTER TABLE public.platform_revenue
  DROP CONSTRAINT IF EXISTS platform_revenue_charge_type_check;

ALTER TABLE public.platform_revenue
  ADD CONSTRAINT platform_revenue_charge_type_check
  CHECK (charge_type IN ('gig_payment', 'tip', 'event_ticket', 'audio_sale', 'album_sale'));

-- RPC used by /api/content/purchase (idempotent)
CREATE OR REPLACE FUNCTION public.insert_platform_revenue(
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
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_stripe_payment_intent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.platform_revenue WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
  ) THEN
    SELECT id INTO v_id FROM public.platform_revenue WHERE stripe_payment_intent_id = p_stripe_payment_intent_id LIMIT 1;
    RETURN v_id;
  END IF;
  INSERT INTO public.platform_revenue (
    charge_type, gross_amount, platform_fee_amount, platform_fee_percent, creator_payout_amount,
    stripe_payment_intent_id, reference_id, creator_user_id, currency
  )
  VALUES (
    p_charge_type, p_gross_amount, p_platform_fee_amount, p_platform_fee_percent, p_creator_payout_amount,
    p_stripe_payment_intent_id, p_reference_id, p_creator_user_id, p_currency
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_platform_revenue(TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_platform_revenue(TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT, TEXT, UUID, TEXT) TO service_role;
