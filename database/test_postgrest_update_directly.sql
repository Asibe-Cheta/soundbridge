-- ============================================================================
-- Test PostgREST UPDATE Directly
-- Date: December 3, 2025
-- Purpose: Test if UPDATE works when called directly via SQL
--          This will help identify if it's a PostgREST issue
-- ============================================================================

-- Test 1: Direct UPDATE in SQL (should work)
DO $$
DECLARE
  test_user_id UUID := 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
  rows_updated INTEGER;
BEGIN
  UPDATE public.user_subscriptions
  SET 
    tier = 'pro',
    status = 'active',
    updated_at = NOW()
  WHERE user_id = test_user_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  IF rows_updated > 0 THEN
    RAISE NOTICE '✅ Direct SQL UPDATE succeeded: % rows updated', rows_updated;
  ELSE
    RAISE WARNING '⚠️ Direct SQL UPDATE: No rows updated (user might not exist)';
  END IF;
END $$;

-- Test 2: Check if PostgREST can see the column in UPDATE context
-- This simulates what PostgREST does internally
SELECT 
  a.attname AS column_name,
  a.attnum AS column_number,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  a.attnotnull AS not_null,
  a.atthasdef AS has_default
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'user_subscriptions'
  AND a.attname = 'user_id'
  AND NOT a.attisdropped
ORDER BY a.attnum;

-- Test 3: Try UPDATE with explicit schema qualification
DO $$
DECLARE
  test_user_id UUID := 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
BEGIN
  EXECUTE format('UPDATE %I.%I SET tier = $1 WHERE user_id = $2', 'public', 'user_subscriptions')
  USING 'pro', test_user_id;
  
  RAISE NOTICE '✅ Dynamic SQL UPDATE with format succeeded';
END $$;
