-- =====================================================
-- Fix Onboarding Status for Subscribed Users
-- =====================================================
-- This script marks onboarding as completed for users
-- with active Premium/Unlimited subscriptions
-- =====================================================

-- STEP 1: Check current status
-- Run this first to see your current profile status
-- First, get your user ID from auth.users
SELECT
  u.id as user_id,
  u.email,
  p.username,
  p.display_name,
  p.role,
  p.onboarding_completed,
  p.onboarding_step,
  p.subscription_tier,
  p.subscription_status,
  p.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'asibechetachukwu@gmail.com'; -- Replace with your email

-- =====================================================

-- STEP 2: Fix onboarding status for subscribed users
-- This will mark onboarding as completed for all users
-- with active Premium/Unlimited subscriptions
UPDATE profiles
SET
  onboarding_completed = true,
  onboarding_step = 'completed',
  updated_at = NOW()
WHERE
  subscription_tier IN ('premium', 'unlimited')
  AND subscription_status = 'active'
  AND (onboarding_completed = false OR onboarding_completed IS NULL);

-- Check how many rows were updated
SELECT
  COUNT(*) as updated_count,
  'Users with active subscriptions marked as onboarding completed' as message
FROM profiles
WHERE
  subscription_tier IN ('premium', 'unlimited')
  AND subscription_status = 'active'
  AND onboarding_completed = true;

-- =====================================================

-- STEP 3: Verify the fix worked
SELECT
  u.id as user_id,
  u.email,
  p.username,
  p.display_name,
  p.role,
  p.onboarding_completed,
  p.onboarding_step,
  p.subscription_tier,
  p.subscription_status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'asibechetachukwu@gmail.com'; -- Replace with your email

-- =====================================================

-- ALTERNATIVE: If profile doesn't exist, create it
-- ONLY run this if STEP 1 returns no rows

-- First, get your user ID from auth.users
-- SELECT id, email FROM auth.users WHERE email = 'asibechetachukwu@gmail.com';

-- Then insert profile (replace 'YOUR_USER_ID' with the ID from above)
-- INSERT INTO profiles (
--   id,
--   username,
--   display_name,
--   role,
--   onboarding_completed,
--   onboarding_step,
--   subscription_tier,
--   subscription_status
-- ) VALUES (
--   'YOUR_USER_ID', -- Replace with your user ID from auth.users
--   'justice_asibe', -- Your username
--   'Justice Asibe', -- Your display name
--   'musician', -- or 'listener' or 'label' or 'venue'
--   true, -- Mark onboarding as completed
--   'completed',
--   'premium', -- or 'unlimited' or 'free'
--   'active'
-- );

-- =====================================================
