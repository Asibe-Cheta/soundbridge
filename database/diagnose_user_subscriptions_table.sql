-- ============================================================================
-- Diagnose user_subscriptions Table Structure
-- Date: December 2, 2025
-- Purpose: Check if table exists and what columns it has
-- Status: Diagnostic Script
-- ============================================================================

-- Check if table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_name = 'user_subscriptions'
    ) THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist'
  END AS table_status;

-- List all columns in user_subscriptions table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- Check for user_id column specifically
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'user_subscriptions' 
        AND column_name = 'user_id'
    ) THEN '✅ user_id column exists'
    ELSE '❌ user_id column does NOT exist'
  END AS user_id_status;

-- Check table constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
ORDER BY contype, conname;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
ORDER BY indexname;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions';

-- Sample data (if any)
SELECT COUNT(*) AS total_rows FROM user_subscriptions;
SELECT * FROM user_subscriptions LIMIT 5;
