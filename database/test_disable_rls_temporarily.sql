-- ============================================================================
-- Test: Temporarily Disable RLS to Confirm Root Cause
-- Date: December 3, 2025
-- Purpose: Disable RLS to test if RLS policy is causing the UPDATE failure
--          This will confirm if the issue is with RLS policy validation
-- ============================================================================

-- Disable RLS completely
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;

-- Test UPDATE (should work now if RLS was the issue)
-- You can test this via your API or directly:
-- UPDATE user_subscriptions SET tier = 'pro' WHERE id = 'your-subscription-id';

-- IMPORTANT: Re-enable RLS after testing!
-- ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
