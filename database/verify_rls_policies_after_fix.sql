-- ============================================================================
-- Verify RLS Policies After Fix
-- Date: December 2, 2025
-- Purpose: Verify that RLS policies were created correctly with WITH CHECK clauses
-- ============================================================================

-- ============================================================================
-- Step 1: Check if RLS is enabled
-- ============================================================================
SELECT 
  tablename, 
  rowsecurity AS rls_enabled,
  schemaname
FROM pg_tables 
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public';

-- ============================================================================
-- Step 2: Check all RLS policies (from pg_policies view)
-- ============================================================================
SELECT 
  policyname, 
  cmd AS command_type,
  permissive,
  roles,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END,
  policyname;

-- ============================================================================
-- Step 3: Detailed policy check from pg_policy system table
-- ============================================================================
SELECT 
  p.polname AS policy_name,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command_type,
  p.polpermissive AS permissive,
  pg_get_expr(p.polqual, p.polrelid) AS using_clause,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_clause,
  CASE 
    WHEN p.polcmd = 'a' AND pg_get_expr(p.polwithcheck, p.polrelid) IS NOT NULL THEN '✅ INSERT has WITH CHECK'
    WHEN p.polcmd = 'a' AND pg_get_expr(p.polwithcheck, p.polrelid) IS NULL THEN '❌ INSERT missing WITH CHECK'
    WHEN p.polcmd = 'w' AND pg_get_expr(p.polwithcheck, p.polrelid) IS NOT NULL AND pg_get_expr(p.polqual, p.polrelid) IS NOT NULL THEN '✅ UPDATE has both USING and WITH CHECK'
    WHEN p.polcmd = 'w' AND (pg_get_expr(p.polwithcheck, p.polrelid) IS NULL OR pg_get_expr(p.polqual, p.polrelid) IS NULL) THEN '❌ UPDATE missing USING or WITH CHECK'
    ELSE '✅'
  END AS policy_status
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_subscriptions'
  AND n.nspname = 'public'
ORDER BY p.polcmd, p.polname;

-- ============================================================================
-- Step 4: Summary check
-- ============================================================================
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  insert_policy_count INTEGER;
  update_policy_count INTEGER;
  insert_with_check_count INTEGER;
  update_with_check_count INTEGER;
BEGIN
  -- Check RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = 'user_subscriptions';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_subscriptions';
  
  -- Count INSERT policies
  SELECT COUNT(*) INTO insert_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_subscriptions'
    AND cmd = 'INSERT';
  
  -- Count UPDATE policies
  SELECT COUNT(*) INTO update_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_subscriptions'
    AND cmd = 'UPDATE';
  
  -- Count INSERT policies with WITH CHECK
  SELECT COUNT(*) INTO insert_with_check_count
  FROM pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = 'user_subscriptions'
    AND n.nspname = 'public'
    AND p.polcmd = 'a'
    AND pg_get_expr(p.polwithcheck, p.polrelid) IS NOT NULL;
  
  -- Count UPDATE policies with WITH CHECK
  SELECT COUNT(*) INTO update_with_check_count
  FROM pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = 'user_subscriptions'
    AND n.nspname = 'public'
    AND p.polcmd = 'w'
    AND pg_get_expr(p.polwithcheck, p.polrelid) IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Policy Verification Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Enabled: %', rls_enabled;
  RAISE NOTICE 'Total Policies: %', policy_count;
  RAISE NOTICE 'INSERT Policies: %', insert_policy_count;
  RAISE NOTICE 'UPDATE Policies: %', update_policy_count;
  RAISE NOTICE 'INSERT Policies with WITH CHECK: %', insert_with_check_count;
  RAISE NOTICE 'UPDATE Policies with WITH CHECK: %', update_with_check_count;
  RAISE NOTICE '========================================';
  
  IF rls_enabled AND insert_policy_count >= 1 AND update_policy_count >= 1 AND insert_with_check_count >= 1 AND update_with_check_count >= 1 THEN
    RAISE NOTICE '✅ All RLS policies are correctly configured!';
  ELSE
    RAISE WARNING '⚠️ RLS policy configuration may be incomplete';
  END IF;
END $$;
