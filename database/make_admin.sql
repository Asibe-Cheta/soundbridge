-- Make yourself an admin
-- Run this script in your Supabase SQL editor

-- Step 1: Find your user ID
-- Run this query first to get your user ID:
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Replace 'YOUR_USER_ID_HERE' with your actual user ID from Step 1
-- Then run this query:
INSERT INTO user_roles (user_id, role) 
VALUES ('YOUR_USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Verify you're now an admin
SELECT 
  p.email,
  p.display_name,
  ur.role,
  ur.granted_at
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'admin';

-- Alternative: Make multiple users admins at once
-- INSERT INTO user_roles (user_id, role) VALUES 
--   ('user-id-1', 'admin'),
--   ('user-id-2', 'admin'),
--   ('user-id-3', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
