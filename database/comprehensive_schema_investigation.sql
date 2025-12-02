-- ============================================================================
-- Comprehensive Schema Investigation for user_subscriptions
-- Date: December 2, 2025
-- Purpose: Find all tables, views, and objects related to user_subscriptions
-- Status: Diagnostic Script
-- ============================================================================

-- ============================================================================
-- Step 1: Find ALL tables named user_subscriptions across ALL schemas
-- ============================================================================
SELECT 
  table_schema,
  table_name,
  table_type,
  CASE 
    WHEN table_type = 'BASE TABLE' THEN 'Table'
    WHEN table_type = 'VIEW' THEN 'View'
    WHEN table_type = 'FOREIGN TABLE' THEN 'Foreign Table'
    ELSE table_type
  END AS object_type
FROM information_schema.tables
WHERE table_name = 'user_subscriptions'
ORDER BY table_schema, table_type;

-- ============================================================================
-- Step 2: Check for views that might be masking the table
-- ============================================================================
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname = 'user_subscriptions'
ORDER BY schemaname;

-- ============================================================================
-- Step 3: Check for materialized views
-- ============================================================================
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE matviewname = 'user_subscriptions'
ORDER BY schemaname;

-- ============================================================================
-- Step 4: Get detailed column information from ALL schemas
-- ============================================================================
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
ORDER BY table_schema, ordinal_position;

-- ============================================================================
-- Step 5: Check for foreign key relationships
-- ============================================================================
SELECT 
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_subscriptions'
ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position;

-- ============================================================================
-- Step 6: Check for triggers on user_subscriptions
-- ============================================================================
SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_subscriptions'
ORDER BY trigger_schema, trigger_name;

-- ============================================================================
-- Step 7: Check for functions that might be affecting user_subscriptions
-- ============================================================================
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%user_subscriptions%'
ORDER BY n.nspname, p.proname;

-- ============================================================================
-- Step 8: Check RLS policies across all schemas
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY schemaname, cmd, policyname;

-- ============================================================================
-- Step 9: Check for table inheritance
-- ============================================================================
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relkind,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    WHEN 'S' THEN 'sequence'
    WHEN 'f' THEN 'foreign table'
    ELSE 'other'
  END AS object_type,
  pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_subscriptions'
ORDER BY n.nspname, c.relkind;

-- ============================================================================
-- Step 10: Check search_path configuration
-- ============================================================================
SHOW search_path;

-- ============================================================================
-- Step 11: Check current database and schema
-- ============================================================================
SELECT 
  current_database() AS current_database,
  current_schema() AS current_schema,
  current_schemas(true) AS search_path_schemas;

-- ============================================================================
-- Step 12: Check for any synonyms or aliases (PostgreSQL doesn't have synonyms, but check anyway)
-- ============================================================================
-- PostgreSQL doesn't have synonyms like Oracle, but check for any custom types or domains
SELECT 
  n.nspname AS schema_name,
  t.typname AS type_name,
  t.typtype AS type_type
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typname LIKE '%user_subscription%'
ORDER BY n.nspname, t.typname;

-- ============================================================================
-- Step 13: Check table permissions and grants
-- ============================================================================
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'user_subscriptions'
ORDER BY table_schema, grantee, privilege_type;

-- ============================================================================
-- Step 14: Check if there are any PostgREST-specific configurations
-- ============================================================================
-- Check for any API-related metadata
SELECT 
  schemaname,
  tablename,
  attname AS column_name,
  description
FROM pg_description d
JOIN pg_class c ON d.objoid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_attribute a ON d.objoid = a.attrelid AND d.objsubid = a.attnum
WHERE c.relname = 'user_subscriptions'
  AND a.attnum > 0
ORDER BY schemaname, tablename, a.attnum;

-- ============================================================================
-- Step 15: Compare table structures across schemas (if multiple exist)
-- ============================================================================
DO $$
DECLARE
  schema_rec RECORD;
  col_count INTEGER;
BEGIN
  FOR schema_rec IN (
    SELECT DISTINCT table_schema
    FROM information_schema.tables
    WHERE table_name = 'user_subscriptions'
  ) LOOP
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = schema_rec.table_schema
      AND table_name = 'user_subscriptions';
    
    RAISE NOTICE 'Schema: %, Table: user_subscriptions, Columns: %', 
      schema_rec.table_schema, col_count;
  END LOOP;
END $$;
