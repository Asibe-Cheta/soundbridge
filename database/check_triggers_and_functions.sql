-- ============================================================================
-- Check Triggers and Functions on user_subscriptions
-- Date: December 2, 2025
-- Purpose: Find triggers or functions that might interfere with INSERT/UPDATE
-- ============================================================================

-- ============================================================================
-- Step 1: Check for triggers on user_subscriptions
-- ============================================================================
SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'user_subscriptions'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- ============================================================================
-- Step 2: Check for functions that reference user_subscriptions
-- ============================================================================
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc LIKE '%user_subscriptions%'
  OR p.prosrc LIKE '%user_id%'
ORDER BY n.nspname, p.proname
LIMIT 20;

-- ============================================================================
-- Step 3: Check for any BEFORE INSERT/UPDATE triggers specifically
-- ============================================================================
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.action_timing,
  t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_table = 'user_subscriptions'
  AND t.trigger_schema = 'public'
  AND t.action_timing IN ('BEFORE', 'INSTEAD OF')
  AND t.event_manipulation IN ('INSERT', 'UPDATE')
ORDER BY t.trigger_name;
