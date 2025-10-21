-- Minimal Admin Dashboard Setup
-- This script only creates the essential tables needed for the admin dashboard

-- 1. Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  auto_moderation BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 3. Create admin_review_queue table
CREATE TABLE IF NOT EXISTS admin_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type TEXT NOT NULL CHECK (queue_type IN ('dmca', 'content_report', 'content_flag', 'user_report')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'completed', 'rejected')),
  reference_data JSONB,
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

-- 6. Create basic indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_status ON admin_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- 7. Enable RLS and create basic policies
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

-- 8. Grant permissions
GRANT ALL ON admin_settings TO authenticated;
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON admin_review_queue TO authenticated;

-- 9. Make yourself an admin (replace with your actual user ID)
-- First run: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- Then run: INSERT INTO user_roles (user_id, role) VALUES ('your-user-id-here', 'admin');
