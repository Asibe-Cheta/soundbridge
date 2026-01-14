-- Paid Content System Migration
-- Adds paid content fields and content_purchases table

-- 1. Add fields to audio_tracks table
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS total_sales_count INTEGER DEFAULT 0;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10, 2) DEFAULT 0.00;

-- Add check constraint for price range
ALTER TABLE audio_tracks DROP CONSTRAINT IF EXISTS check_price_range;
ALTER TABLE audio_tracks ADD CONSTRAINT check_price_range 
  CHECK (
    (is_paid = FALSE) OR 
    (is_paid = TRUE AND price >= 0.99 AND price <= 50.00)
  );

-- Add check constraint for currency
ALTER TABLE audio_tracks DROP CONSTRAINT IF EXISTS check_currency;
ALTER TABLE audio_tracks ADD CONSTRAINT check_currency 
  CHECK (currency IN ('USD', 'GBP', 'EUR'));

-- 2. Create content_purchases table
CREATE TABLE IF NOT EXISTS content_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'album', 'podcast')),
  price_paid DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  creator_earnings DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_content UNIQUE (user_id, content_id, content_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_purchases_user ON content_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_content_purchases_content ON content_purchases(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_purchases_status ON content_purchases(status);
CREATE INDEX IF NOT EXISTS idx_content_purchases_purchased_at ON content_purchases(purchased_at DESC);

-- 3. Enable RLS on content_purchases
ALTER TABLE content_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON content_purchases;
CREATE POLICY "Users can view own purchases"
  ON content_purchases FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Backend can insert purchases" ON content_purchases;
CREATE POLICY "Backend can insert purchases"
  ON content_purchases FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Creators can view content purchases" ON content_purchases;
CREATE POLICY "Creators can view content purchases"
  ON content_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audio_tracks
      WHERE audio_tracks.id = content_purchases.content_id
      AND audio_tracks.creator_id = auth.uid()
      AND content_purchases.content_type = 'track'
    )
  );

-- 4. Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND subscription_tier IN ('premium', 'unlimited')
    AND (subscription_end_date IS NULL OR subscription_end_date > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_content_purchases_updated_at ON content_purchases;
CREATE TRIGGER update_content_purchases_updated_at
  BEFORE UPDATE ON content_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_content_purchases_updated_at();
