-- Admin Dashboard Database Schema
-- This file contains all the SQL needed for the admin dashboard functionality

-- 1. Admin Settings Table (if not already exists)
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  
  -- System Settings
  maintenance_mode BOOLEAN DEFAULT FALSE,
  auto_moderation BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  
  -- File Upload Settings
  max_file_size INTEGER DEFAULT 50, -- MB
  allowed_file_types TEXT[] DEFAULT ARRAY['mp3', 'wav', 'flac'],
  
  -- Event Settings
  max_users_per_event INTEGER DEFAULT 1000,
  
  -- Content Settings
  content_retention_days INTEGER DEFAULT 365,
  auto_delete_inactive_users BOOLEAN DEFAULT FALSE,
  inactive_user_threshold_days INTEGER DEFAULT 365,
  
  -- Feature Flags
  user_registration BOOLEAN DEFAULT TRUE,
  content_upload BOOLEAN DEFAULT TRUE,
  event_creation BOOLEAN DEFAULT TRUE,
  messaging BOOLEAN DEFAULT TRUE,
  social_features BOOLEAN DEFAULT TRUE,
  monetization BOOLEAN DEFAULT TRUE,
  
  -- System Info
  last_backup TIMESTAMP WITH TIME ZONE,
  system_uptime TEXT DEFAULT '99.9%',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Roles Table (for admin access)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, role)
);

-- 3. Admin Review Queue Table (for content moderation)
CREATE TABLE IF NOT EXISTS admin_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type TEXT NOT NULL CHECK (queue_type IN ('dmca', 'content_report', 'content_flag', 'user_report')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'completed', 'rejected')),
  
  -- Reference data (flexible JSON for different types of reports)
  reference_data JSONB,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add ban-related columns to profiles table (if not exists)
DO $$ 
BEGIN
  -- Add banned_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'banned_at') THEN
    ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add ban_reason column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'ban_reason') THEN
    ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
  END IF;
  
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  
  -- Add last_login_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'last_login_at') THEN
    ALTER TABLE profiles ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 5. Create function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
  database_size_mb NUMERIC,
  total_tables INTEGER,
  total_indexes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(
      (SELECT SUM(pg_total_relation_size(oid)) FROM pg_class WHERE relkind = 'r') / 1024 / 1024, 
      2
    ) as database_size_mb,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to update user login timestamp
CREATE OR REPLACE FUNCTION update_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_login_at when user signs in
  UPDATE profiles 
  SET last_login_at = NOW() 
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for user login updates
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_login();

-- 8. Insert default admin settings
INSERT INTO admin_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_settings_id ON admin_settings(id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_type ON admin_review_queue(queue_type);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_status ON admin_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_priority ON admin_review_queue(priority);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_assigned_to ON admin_review_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_banned_at ON profiles(banned_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON profiles(last_login_at);

-- 10. RLS Policies for admin_settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Only admins can manage settings" ON admin_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- 11. RLS Policies for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage user roles
CREATE POLICY "Only super admins can manage user roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 12. RLS Policies for admin_review_queue
ALTER TABLE admin_review_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can access review queue
CREATE POLICY "Only admins can access review queue" ON admin_review_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- 13. Create view for admin dashboard statistics
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
  -- User statistics
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_this_week,
  (SELECT COUNT(*) FROM profiles WHERE last_login_at >= NOW() - INTERVAL '30 days') as active_users_30d,
  
  -- Content statistics
  (SELECT COUNT(*) FROM audio_tracks WHERE deleted_at IS NULL) as total_tracks,
  (SELECT COUNT(*) FROM events WHERE deleted_at IS NULL) as total_events,
  (SELECT COUNT(*) FROM messages) as total_messages,
  
  -- Review queue statistics
  (SELECT COUNT(*) FROM admin_review_queue WHERE status = 'pending') as pending_reviews,
  (SELECT COUNT(*) FROM admin_review_queue WHERE priority = 'urgent' AND status IN ('pending', 'assigned')) as urgent_items,
  (SELECT COUNT(*) FROM admin_review_queue WHERE queue_type = 'dmca' AND status IN ('pending', 'assigned', 'in_review')) as dmca_requests,
  (SELECT COUNT(*) FROM admin_review_queue WHERE queue_type = 'content_report' AND status IN ('pending', 'assigned', 'in_review')) as content_reports,
  
  -- Revenue statistics
  (SELECT COALESCE(SUM(amount_paid), 0) FROM ticket_purchases WHERE status = 'completed') as total_revenue,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM user_subscriptions WHERE status = 'active') as subscription_revenue;

-- 14. Grant permissions
GRANT SELECT ON admin_dashboard_stats TO authenticated;
GRANT ALL ON admin_settings TO authenticated;
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON admin_review_queue TO authenticated;
