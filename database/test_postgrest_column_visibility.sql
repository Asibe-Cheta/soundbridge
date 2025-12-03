-- ============================================================================
-- Test PostgREST Column Visibility
-- Date: December 3, 2025
-- Purpose: Test if PostgREST can see the user_id column for INSERT/UPDATE
--          This simulates what PostgREST sees
-- ============================================================================

-- 1. Check what columns PostgREST should see (via information_schema)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
  AND column_name = 'user_id';

-- 2. Check column permissions (what PostgREST checks)
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
  AND column_name = 'user_id';

-- 3. Check if there's a PostgREST schema cache issue
-- PostgREST uses pg_catalog.pg_attribute to check columns
SELECT 
  a.attname AS column_name,
  a.attnum AS column_number,
  a.attnotnull AS is_not_null,
  a.attgenerated AS is_generated,
  a.attisdropped AS is_dropped,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'user_subscriptions'
  AND a.attname = 'user_id'
  AND NOT a.attisdropped;

-- 4. Test if we can manually construct what PostgREST would send
-- This simulates an INSERT statement PostgREST would generate
DO $$
DECLARE
  test_user_id UUID := 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
  test_result RECORD;
BEGIN
  -- Try to see if the column is accessible in a function context
  -- (similar to how PostgREST might process it)
  SELECT 
    attname,
    attnum,
    attnotnull
  INTO test_result
  FROM pg_attribute
  WHERE attrelid = 'public.user_subscriptions'::regclass
    AND attname = 'user_id'
    AND NOT attisdropped;
  
  IF test_result.attname IS NOT NULL THEN
    RAISE NOTICE '✅ Column user_id is visible: name=%, num=%, not_null=%', 
      test_result.attname, test_result.attnum, test_result.attnotnull;
  ELSE
    RAISE WARNING '❌ Column user_id NOT found in pg_attribute';
  END IF;
END $$;
