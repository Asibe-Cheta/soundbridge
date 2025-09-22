-- Tier-Based Tipping System Enhancements
-- This script adds advanced features for the tier-based tipping system
-- Run this after the basic revenue sharing schema is in place

-- ==============================================
-- 1. TIP ANALYTICS TABLE (for Pro+ users)
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

-- Indexes for tip analytics
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_id ON tip_analytics(creator_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_tipper_id ON tip_analytics(tipper_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_tipper_tier ON tip_analytics(tipper_tier);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_created_at ON tip_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_status ON tip_analytics(status);

-- ==============================================
-- 2. TIP GOALS TABLE (for Pro+ users)
-- ==============================================

CREATE TABLE IF NOT EXISTS tip_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  goal_description TEXT,
  target_amount DECIMAL(10,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(10,2) DEFAULT 0 CHECK (current_amount >= 0),
  goal_type TEXT DEFAULT 'monthly' CHECK (goal_type IN ('one_time', 'weekly', 'monthly', 'yearly')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tip goals
CREATE INDEX IF NOT EXISTS idx_tip_goals_creator_id ON tip_goals(creator_id);
CREATE INDEX IF NOT EXISTS idx_tip_goals_active ON tip_goals(is_active);
CREATE INDEX IF NOT EXISTS idx_tip_goals_completed ON tip_goals(is_completed);
CREATE INDEX IF NOT EXISTS idx_tip_goals_end_date ON tip_goals(end_date);

-- ==============================================
-- 3. TIP REWARDS TABLE (for Enterprise users)
-- ==============================================

CREATE TABLE IF NOT EXISTS tip_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_name TEXT NOT NULL,
  reward_description TEXT,
  minimum_tip_amount DECIMAL(10,2) NOT NULL CHECK (minimum_tip_amount > 0),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('exclusive_content', 'early_access', 'personal_message', 'custom_reward')),
  reward_content TEXT, -- JSON or text content
  is_active BOOLEAN DEFAULT true,
  max_redemptions INTEGER, -- NULL means unlimited
  current_redemptions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tip rewards
CREATE INDEX IF NOT EXISTS idx_tip_rewards_creator_id ON tip_rewards(creator_id);
CREATE INDEX IF NOT EXISTS idx_tip_rewards_active ON tip_rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_tip_rewards_minimum_amount ON tip_rewards(minimum_tip_amount);

-- ==============================================
-- 4. TIP REWARD REDEMPTIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS tip_reward_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reward_id UUID REFERENCES tip_rewards(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_id UUID REFERENCES tip_analytics(id) ON DELETE CASCADE,
  tip_amount DECIMAL(10,2) NOT NULL,
  redemption_status TEXT DEFAULT 'pending' CHECK (redemption_status IN ('pending', 'fulfilled', 'expired')),
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tip reward redemptions
CREATE INDEX IF NOT EXISTS idx_tip_reward_redemptions_reward_id ON tip_reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_tip_reward_redemptions_tipper_id ON tip_reward_redemptions(tipper_id);
CREATE INDEX IF NOT EXISTS idx_tip_reward_redemptions_status ON tip_reward_redemptions(redemption_status);

-- ==============================================
-- 5. PLATFORM FEE CALCULATION FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION calculate_platform_fee(
  tip_amount DECIMAL(10,2),
  user_tier TEXT
) RETURNS DECIMAL(10,2) AS $$
BEGIN
  -- Validate inputs
  IF tip_amount <= 0 THEN
    RAISE EXCEPTION 'Tip amount must be greater than 0';
  END IF;
  
  IF user_tier NOT IN ('free', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid user tier: %', user_tier;
  END IF;
  
  -- Calculate platform fee based on tier
  RETURN CASE
    WHEN user_tier = 'free' THEN ROUND(tip_amount * 0.10, 2)
    WHEN user_tier = 'pro' THEN ROUND(tip_amount * 0.08, 2)
    WHEN user_tier = 'enterprise' THEN ROUND(tip_amount * 0.05, 2)
    ELSE ROUND(tip_amount * 0.10, 2) -- Default to free tier
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 6. TIP GOAL PROGRESS UPDATE FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION update_tip_goal_progress(
  creator_uuid UUID,
  tip_amount DECIMAL(10,2)
) RETURNS VOID AS $$
DECLARE
  goal_record RECORD;
  new_completion_percentage DECIMAL(5,2);
BEGIN
  -- Update all active goals for the creator
  FOR goal_record IN 
    SELECT id, target_amount, current_amount 
    FROM tip_goals 
    WHERE creator_id = creator_uuid 
    AND is_active = true 
    AND is_completed = false
  LOOP
    -- Calculate new completion percentage
    new_completion_percentage := LEAST(100.00, 
      ROUND(((goal_record.current_amount + tip_amount) / goal_record.target_amount) * 100, 2)
    );
    
    -- Update the goal
    UPDATE tip_goals 
    SET 
      current_amount = goal_record.current_amount + tip_amount,
      completion_percentage = new_completion_percentage,
      is_completed = (new_completion_percentage >= 100.00),
      updated_at = NOW()
    WHERE id = goal_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 7. TIP ANALYTICS TRIGGER FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION trigger_tip_analytics_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tip goal progress when a tip is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM update_tip_goal_progress(NEW.creator_id, NEW.creator_earnings);
  END IF;
  
  -- Update updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tip analytics
DROP TRIGGER IF EXISTS tip_analytics_update_trigger ON tip_analytics;
CREATE TRIGGER tip_analytics_update_trigger
  BEFORE UPDATE ON tip_analytics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_tip_analytics_update();

-- ==============================================
-- 8. TIP GOAL TRIGGER FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION trigger_tip_goal_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tip goals
DROP TRIGGER IF EXISTS tip_goal_update_trigger ON tip_goals;
CREATE TRIGGER tip_goal_update_trigger
  BEFORE UPDATE ON tip_goals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_tip_goal_update();

-- ==============================================
-- 9. TIP REWARD TRIGGER FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION trigger_tip_reward_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tip rewards
DROP TRIGGER IF EXISTS tip_reward_update_trigger ON tip_rewards;
CREATE TRIGGER tip_reward_update_trigger
  BEFORE UPDATE ON tip_rewards
  FOR EACH ROW
  EXECUTE FUNCTION trigger_tip_reward_update();

-- ==============================================
-- 10. ANALYTICS VIEWS FOR REPORTING
-- ==============================================

-- View for creator tip analytics summary
CREATE OR REPLACE VIEW creator_tip_analytics_summary AS
SELECT 
  creator_id,
  COUNT(*) as total_tips,
  SUM(tip_amount) as total_tip_amount,
  SUM(platform_fee) as total_platform_fees,
  SUM(creator_earnings) as total_creator_earnings,
  AVG(tip_amount) as average_tip_amount,
  MIN(tip_amount) as min_tip_amount,
  MAX(tip_amount) as max_tip_amount,
  COUNT(CASE WHEN tipper_tier = 'free' THEN 1 END) as tips_from_free_users,
  COUNT(CASE WHEN tipper_tier = 'pro' THEN 1 END) as tips_from_pro_users,
  COUNT(CASE WHEN tipper_tier = 'enterprise' THEN 1 END) as tips_from_enterprise_users,
  COUNT(CASE WHEN is_anonymous = true THEN 1 END) as anonymous_tips,
  DATE_TRUNC('month', created_at) as month
FROM tip_analytics
WHERE status = 'completed'
GROUP BY creator_id, DATE_TRUNC('month', created_at);

-- View for platform fee analytics
CREATE OR REPLACE VIEW platform_fee_analytics AS
SELECT 
  tipper_tier,
  COUNT(*) as total_tips,
  SUM(tip_amount) as total_tip_amount,
  SUM(platform_fee) as total_platform_fees,
  AVG(fee_percentage) as average_fee_percentage,
  DATE_TRUNC('month', created_at) as month
FROM tip_analytics
WHERE status = 'completed'
GROUP BY tipper_tier, DATE_TRUNC('month', created_at);

-- View for tip goal progress
CREATE OR REPLACE VIEW tip_goal_progress AS
SELECT 
  tg.id,
  tg.creator_id,
  tg.goal_name,
  tg.target_amount,
  tg.current_amount,
  tg.completion_percentage,
  tg.goal_type,
  tg.is_active,
  tg.is_completed,
  tg.end_date,
  CASE 
    WHEN tg.end_date IS NULL THEN NULL
    WHEN tg.end_date < NOW() THEN 'expired'
    WHEN tg.is_completed THEN 'completed'
    ELSE 'in_progress'
  END as goal_status
FROM tip_goals tg;

-- ==============================================
-- 11. HELPER FUNCTIONS FOR API ENDPOINTS
-- ==============================================

-- Function to get creator's tip analytics
CREATE OR REPLACE FUNCTION get_creator_tip_analytics(
  creator_uuid UUID,
  start_date TIMESTAMP DEFAULT NULL,
  end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  total_tips BIGINT,
  total_amount DECIMAL(10,2),
  total_earnings DECIMAL(10,2),
  total_fees DECIMAL(10,2),
  average_tip DECIMAL(10,2),
  tips_by_tier JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_tips,
    COALESCE(SUM(ta.tip_amount), 0) as total_amount,
    COALESCE(SUM(ta.creator_earnings), 0) as total_earnings,
    COALESCE(SUM(ta.platform_fee), 0) as total_fees,
    COALESCE(AVG(ta.tip_amount), 0) as average_tip,
    jsonb_build_object(
      'free', COUNT(CASE WHEN ta.tipper_tier = 'free' THEN 1 END),
      'pro', COUNT(CASE WHEN ta.tipper_tier = 'pro' THEN 1 END),
      'enterprise', COUNT(CASE WHEN ta.tipper_tier = 'enterprise' THEN 1 END)
    ) as tips_by_tier
  FROM tip_analytics ta
  WHERE ta.creator_id = creator_uuid
    AND ta.status = 'completed'
    AND (start_date IS NULL OR ta.created_at >= start_date)
    AND (end_date IS NULL OR ta.created_at <= end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get creator's active tip goals
CREATE OR REPLACE FUNCTION get_creator_tip_goals(creator_uuid UUID)
RETURNS TABLE (
  id UUID,
  goal_name TEXT,
  goal_description TEXT,
  target_amount DECIMAL(10,2),
  current_amount DECIMAL(10,2),
  completion_percentage DECIMAL(5,2),
  goal_type TEXT,
  is_active BOOLEAN,
  is_completed BOOLEAN,
  end_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tg.id,
    tg.goal_name,
    tg.goal_description,
    tg.target_amount,
    tg.current_amount,
    tg.completion_percentage,
    tg.goal_type,
    tg.is_active,
    tg.is_completed,
    tg.end_date
  FROM tip_goals tg
  WHERE tg.creator_id = creator_uuid
  ORDER BY tg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get creator's tip rewards
CREATE OR REPLACE FUNCTION get_creator_tip_rewards(creator_uuid UUID)
RETURNS TABLE (
  id UUID,
  reward_name TEXT,
  reward_description TEXT,
  minimum_tip_amount DECIMAL(10,2),
  reward_type TEXT,
  is_active BOOLEAN,
  max_redemptions INTEGER,
  current_redemptions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.reward_name,
    tr.reward_description,
    tr.minimum_tip_amount,
    tr.reward_type,
    tr.is_active,
    tr.max_redemptions,
    tr.current_redemptions
  FROM tip_rewards tr
  WHERE tr.creator_id = creator_uuid
  ORDER BY tr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 12. SAMPLE DATA FOR TESTING
-- ==============================================

-- Insert sample tip goals for testing
INSERT INTO tip_goals (creator_id, goal_name, goal_description, target_amount, goal_type)
SELECT 
  id,
  'Monthly Goal',
  'Monthly tip goal for content creation',
  500.00,
  'monthly'
FROM auth.users 
WHERE id IN (
  SELECT creator_id FROM tip_analytics LIMIT 3
)
ON CONFLICT DO NOTHING;

-- Insert sample tip rewards for testing
INSERT INTO tip_rewards (creator_id, reward_name, reward_description, minimum_tip_amount, reward_type)
SELECT 
  id,
  'Exclusive Content Access',
  'Get access to exclusive behind-the-scenes content',
  25.00,
  'exclusive_content'
FROM auth.users 
WHERE id IN (
  SELECT creator_id FROM tip_analytics LIMIT 3
)
ON CONFLICT DO NOTHING;

-- ==============================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on new tables
ALTER TABLE tip_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Tip Analytics RLS Policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own tip analytics" ON tip_analytics;
DROP POLICY IF EXISTS "Users can insert their own tip analytics" ON tip_analytics;
DROP POLICY IF EXISTS "Users can view tips they sent or received" ON tip_analytics;
DROP POLICY IF EXISTS "Users can insert tips they send" ON tip_analytics;

CREATE POLICY "Users can view their own tip analytics" ON tip_analytics
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = tipper_id);

CREATE POLICY "Users can insert their own tip analytics" ON tip_analytics
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- Tip Goals RLS Policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own tip goals" ON tip_goals;
DROP POLICY IF EXISTS "Users can manage their own tip goals" ON tip_goals;

CREATE POLICY "Users can view their own tip goals" ON tip_goals
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can manage their own tip goals" ON tip_goals
  FOR ALL USING (auth.uid() = creator_id);

-- Tip Rewards RLS Policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own tip rewards" ON tip_rewards;
DROP POLICY IF EXISTS "Users can manage their own tip rewards" ON tip_rewards;

CREATE POLICY "Users can view their own tip rewards" ON tip_rewards
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can manage their own tip rewards" ON tip_rewards
  FOR ALL USING (auth.uid() = creator_id);

-- Tip Reward Redemptions RLS Policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own tip reward redemptions" ON tip_reward_redemptions;
DROP POLICY IF EXISTS "Users can insert their own tip reward redemptions" ON tip_reward_redemptions;

CREATE POLICY "Users can view their own tip reward redemptions" ON tip_reward_redemptions
  FOR SELECT USING (auth.uid() = tipper_id);

CREATE POLICY "Users can insert their own tip reward redemptions" ON tip_reward_redemptions
  FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Tier-Based Tipping System Enhancements Successfully Created!';
  RAISE NOTICE '📊 Added Tables: tip_analytics, tip_goals, tip_rewards, tip_reward_redemptions';
  RAISE NOTICE '🔧 Added Functions: calculate_platform_fee, update_tip_goal_progress, analytics functions';
  RAISE NOTICE '📈 Added Views: creator_tip_analytics_summary, platform_fee_analytics, tip_goal_progress';
  RAISE NOTICE '🔒 Added RLS Policies for security';
  RAISE NOTICE '🚀 System ready for advanced tip features!';
END $$;
