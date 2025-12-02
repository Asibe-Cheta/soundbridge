-- ============================================================================
-- Temporarily Disable RLS for Testing
-- Date: December 2, 2025
-- Purpose: Test if RLS is causing the INSERT/UPDATE issue
-- WARNING: Only use for testing! Re-enable RLS after testing.
-- ============================================================================

-- ============================================================================
-- STEP 1: Disable RLS (for testing only)
-- ============================================================================
ALTER TABLE public.user_subscriptions DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOW: Try your upsert operation in the API
-- If it works, the problem is definitely RLS policies
-- ============================================================================

-- ============================================================================
-- STEP 2: Re-enable RLS after testing
-- ============================================================================
-- Uncomment the line below after you've confirmed RLS is the issue:
-- ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Run fix_rls_policies_user_subscriptions.sql to fix the policies
-- ============================================================================
