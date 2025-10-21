-- Grant admin access to multiple user accounts
-- Admin emails: asibechetachukwu@gmail.com, dmca@soundbridge.live, contact@soundbridge.live

-- Step 1: Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'legal_admin', 'creator', 'listener')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles" ON user_roles 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles 
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Step 2: Find all user IDs by joining with auth.users
SELECT p.id, u.email, p.display_name, p.role
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email IN ('asibechetachukwu@gmail.com', 'dmca@soundbridge.live', 'contact@soundbridge.live');

-- Step 3: Insert admin roles into user_roles table for each user
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT u.id, 'admin', NOW(), NOW()
FROM auth.users u 
WHERE u.email IN ('asibechetachukwu@gmail.com', 'dmca@soundbridge.live', 'contact@soundbridge.live')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Verify the changes
SELECT p.id, u.email, p.display_name, p.role as profile_role, ur.role as admin_role
FROM profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN user_roles ur ON p.id = ur.user_id AND ur.role = 'admin'
WHERE u.email IN ('asibechetachukwu@gmail.com', 'dmca@soundbridge.live', 'contact@soundbridge.live');
