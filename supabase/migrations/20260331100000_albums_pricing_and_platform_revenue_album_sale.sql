-- Album paid content (parity with audio_tracks) + platform_revenue charge_type for album sales

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

-- 2) platform_revenue: allow album_sale (analytics / P&L)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'platform_revenue'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%charge_type%'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE platform_revenue DROP CONSTRAINT IF EXISTS %I', conname);
  END IF;
END $$;

ALTER TABLE platform_revenue
  ADD CONSTRAINT platform_revenue_charge_type_check
  CHECK (charge_type IN ('gig_payment', 'tip', 'event_ticket', 'audio_sale', 'album_sale'));
