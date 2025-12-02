-- ============================================================================
-- Check Triggers on user_subscriptions Table
-- Date: December 2, 2025
-- Purpose: Find triggers that might be interfering with INSERT/UPDATE
-- ============================================================================

-- Check all triggers on user_subscriptions
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
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- Check trigger functions
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%user_subscriptions%'
  OR p.oid IN (
    SELECT tgfoid
    FROM pg_trigger
    WHERE tgrelid = 'public.user_subscriptions'::regclass
  )
ORDER BY n.nspname, p.proname;
