-- ============================================================================
-- Check for Views or Schema Issues
-- Date: December 3, 2025
-- Purpose: Check if PostgREST might be using a view instead of the table
--          or if there are schema conflicts
-- ============================================================================

-- 1. Check for views on user_subscriptions
SELECT 
  table_schema,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (table_name LIKE '%subscription%' OR view_definition LIKE '%user_subscriptions%');

-- 2. Check for materialized views
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public'
  AND (matviewname LIKE '%subscription%' OR definition LIKE '%user_subscriptions%');

-- 3. Check all tables/views named user_subscriptions in all schemas
SELECT 
  n.nspname AS schema_name,
  c.relname AS object_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    ELSE 'other'
  END AS object_type
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_subscriptions'
ORDER BY n.nspname, c.relname;

-- 4. Check PostgREST exposed schemas
SELECT 
  nspname AS schemaname,
  nspname = 'public' AS is_public
FROM pg_namespace
WHERE nspname IN ('public', 'api', 'postgrest');

-- 5. Check if user_subscriptions table is in the correct schema
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_subscriptions';

-- 6. Check column visibility in information_schema (what PostgREST sees)
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- 7. Check for any triggers that might interfere
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'user_subscriptions';
