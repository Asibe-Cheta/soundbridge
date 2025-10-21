-- Admin Settings Table
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

-- Create function to get database statistics
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

-- Insert default settings if not exists
INSERT INTO admin_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for admin_settings
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_id ON admin_settings(id);
