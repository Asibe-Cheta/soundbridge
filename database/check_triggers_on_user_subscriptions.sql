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

-- Check trigger functions (simplified to avoid array_agg error)
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.oid AS function_oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.oid IN (
    SELECT tgfoid
    FROM pg_trigger
    WHERE tgrelid = 'public.user_subscriptions'::regclass
  )
ORDER BY n.nspname, p.proname;

-- Get function definition separately (if needed, run this query separately)
-- SELECT pg_get_functiondef(oid) 
-- FROM pg_proc 
-- WHERE oid = <function_oid_from_above>;
