-- Fix for Tipping System - Create Missing Tables
-- Run this script in your Supabase SQL editor to fix the internal server error

-- ==============================================
-- 1. CREATE TIP ANALYTICS TABLE (Required for API)
-- ==============================================

CREATE TABLE IF NOT EXISTS tip_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_tier TEXT NOT NULL CHECK (tipper_tier IN ('free', 'pro', 'enterprise')),
  tip_amount DECIMAL(10,2) NOT NULL CHECK (tip_amount > 0),
  platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
  creator_earnings DECIMAL(10,2) NOT NULL CHECK (creator_earnings >= 0),
  fee_percentage DECIMAL(5,2) NOT NULL CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  tip_message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_id ON tip_analytics(creator_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_tipper_id ON tip_analytics(tipper_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_tipper_tier ON tip_analytics(tipper_tier);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_created_at ON tip_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_status ON tip_analytics(status);

-- ==============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE tip_analytics ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 4. CREATE RLS POLICIES
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tips they sent or received" ON tip_analytics;
DROP POLICY IF EXISTS "Users can insert tips they send" ON tip_analytics;

-- Create RLS policies for tip_analytics
CREATE POLICY "Users can view tips they sent or received" ON tip_analytics
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = tipper_id);

CREATE POLICY "Users can insert tips they send" ON tip_analytics
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- ==============================================
-- 5. VERIFY CREATOR_TIPS TABLE EXISTS
-- ==============================================

-- Ensure creator_tips table exists with correct schema
CREATE TABLE IF NOT EXISTS creator_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tip details
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for creator_tips if not already enabled
ALTER TABLE creator_tips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for creator_tips
DROP POLICY IF EXISTS "Users can view tips they sent or received legacy" ON creator_tips;
DROP POLICY IF EXISTS "Users can insert tips they send legacy" ON creator_tips;

CREATE POLICY "Users can view tips they sent or received legacy" ON creator_tips
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = tipper_id);

CREATE POLICY "Users can insert tips they send legacy" ON creator_tips
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- ==============================================
-- 6. GRANT PERMISSIONS
-- ==============================================

GRANT SELECT, INSERT, UPDATE ON tip_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON creator_tips TO authenticated;

-- ==============================================
-- 7. SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tipping system tables created successfully!';
  RAISE NOTICE '✅ RLS policies enabled!';
  RAISE NOTICE '✅ Permissions granted!';
  RAISE NOTICE '🎉 Your tipping system is now ready to work!';
END $$;
