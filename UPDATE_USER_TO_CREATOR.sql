-- =====================================================
-- UPDATE USER TO CREATOR ROLE
-- =====================================================
-- This script changes the specific user from listener to creator
-- Run this in your Supabase SQL Editor

-- Update the user role from 'listener' to 'creator'
UPDATE profiles 
SET 
  role = 'creator',
  updated_at = NOW()
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- Verify the update
SELECT 
  id,
  username,
  display_name,
  role,
  bio,
  location,
  onboarding_completed,
  updated_at
FROM profiles 
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- Optional: If you want to mark onboarding as completed for this user
-- (since they've been using the platform already)
UPDATE profiles 
SET 
  onboarding_completed = TRUE,
  onboarding_step = 'completed',
  profile_completed = TRUE,
  onboarding_completed_at = NOW()
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- Final verification
SELECT 
  id,
  username,
  display_name,
  role,
  onboarding_completed,
  onboarding_step,
  profile_completed,
  updated_at
FROM profiles 
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
