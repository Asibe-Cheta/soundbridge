-- ============================================================================
-- Check Trigger Functions for user_id References
-- Date: December 3, 2025
-- Purpose: Check if trigger functions reference user_id in a way that could cause issues
-- ============================================================================

-- Check the trigger functions that fire on user_subscriptions
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('auto_restore_tracks_on_upgrade', 'update_updated_at_column');

-- Check what columns the triggers reference
SELECT 
  t.tgname AS trigger_name,
  t.tgenabled AS is_enabled,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'user_subscriptions'
  AND NOT t.tgisinternal;
