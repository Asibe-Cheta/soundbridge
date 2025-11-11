-- Quick Setup Script for Admin Dashboard
-- Run this script in your Supabase SQL editor to set up the admin dashboard

-- 1. Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  auto_moderation BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  max_file_size INTEGER DEFAULT 50,
  allowed_file_types TEXT[] DEFAULT ARRAY['mp3', 'wav', 'flac'],
  max_users_per_event INTEGER DEFAULT 1000,
  content_retention_days INTEGER DEFAULT 365,
  auto_delete_inactive_users BOOLEAN DEFAULT FALSE,
  inactive_user_threshold_days INTEGER DEFAULT 365,
  user_registration BOOLEAN DEFAULT TRUE,
  content_upload BOOLEAN DEFAULT TRUE,
  event_creation BOOLEAN DEFAULT TRUE,
  messaging BOOLEAN DEFAULT TRUE,
  social_features BOOLEAN DEFAULT TRUE,
  monetization BOOLEAN DEFAULT TRUE,
  last_backup TIMESTAMP WITH TIME ZONE,
  system_uptime TEXT DEFAULT '99.9%',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_roles table
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

-- 3. Create admin_review_queue table
CREATE TABLE IF NOT EXISTS admin_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type TEXT NOT NULL CHECK (queue_type IN ('dmca', 'content_report', 'content_flag', 'user_report')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'completed', 'rejected')),
  reference_data JSONB,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add missing columns to profiles table
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

-- 5. Insert default admin settings
INSERT INTO admin_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- 6. Create database stats function
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

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_settings_id ON admin_settings(id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_type ON admin_review_queue(queue_type);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_status ON admin_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_priority ON admin_review_queue(priority);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_banned_at ON profiles(banned_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON profiles(last_login_at);

-- 8. Enable RLS and create policies
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_review_queue ENABLE ROW LEVEL SECURITY;

-- Admin settings policy
DROP POLICY IF EXISTS "Only admins can manage settings" ON admin_settings;
CREATE POLICY "Only admins can manage settings" ON admin_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- User roles policy
DROP POLICY IF EXISTS "Only super admins can manage user roles" ON user_roles;
CREATE POLICY "Only super admins can manage user roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Review queue policy
DROP POLICY IF EXISTS "Only admins can access review queue" ON admin_review_queue;
CREATE POLICY "Only admins can access review queue" ON admin_review_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- 9. Grant permissions
GRANT ALL ON admin_settings TO authenticated;
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON admin_review_queue TO authenticated;

-- 10. Create admin dashboard stats view
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_this_week,
  (SELECT COUNT(*) FROM profiles WHERE last_login_at >= NOW() - INTERVAL '30 days') as active_users_30d,
  (SELECT COUNT(*) FROM audio_tracks) as total_tracks,
  (SELECT COUNT(*) FROM events) as total_events,
  (SELECT COUNT(*) FROM messages) as total_messages,
  (SELECT COUNT(*) FROM admin_review_queue WHERE status = 'pending') as pending_reviews,
  (SELECT COUNT(*) FROM admin_review_queue WHERE priority = 'urgent' AND status IN ('pending', 'assigned')) as urgent_items,
  (SELECT COUNT(*) FROM admin_review_queue WHERE queue_type = 'dmca' AND status IN ('pending', 'assigned', 'in_review')) as dmca_requests,
  (SELECT COUNT(*) FROM admin_review_queue WHERE queue_type = 'content_report' AND status IN ('pending', 'assigned', 'in_review')) as content_reports,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM ticket_purchases WHERE status = 'completed') as total_revenue,
  0 as subscription_revenue;

GRANT SELECT ON admin_dashboard_stats TO authenticated;

-- 11. Make yourself an admin (replace with your user ID)
-- First, get your user ID from auth.users table
-- Then run: INSERT INTO user_roles (user_id, role) VALUES ('your-user-id-here', 'admin');

-- Example: INSERT INTO user_roles (user_id, role) VALUES ('12345678-1234-1234-1234-123456789012', 'admin');

