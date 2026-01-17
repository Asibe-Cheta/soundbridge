-- Tips table for mobile tipping flow
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  payment_intent_id TEXT,
  platform_fee DECIMAL,
  creator_earnings DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert tips" ON tips;
CREATE POLICY "Users can insert tips" ON tips
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can view their own tips" ON tips;
CREATE POLICY "Users can view their own tips" ON tips
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
