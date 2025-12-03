-- ============================================================================
-- Force PostgREST Schema Reload - Multiple Methods
-- Date: December 3, 2025
-- Purpose: Force PostgREST to reload its schema cache
--          This should fix column visibility issues
-- ============================================================================

-- Method 1: NOTIFY (standard method)
NOTIFY pgrst, 'reload schema';

-- Method 2: Check if PostgREST is listening
SELECT 
  pid,
  usename,
  application_name,
  state
FROM pg_stat_activity
WHERE application_name LIKE '%postgrest%' OR application_name LIKE '%PostgREST%';

-- Method 3: Try alternative notification channel
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '✅ Sent NOTIFY to pgrst channel';
END $$;

-- Method 4: Check PostgREST configuration
-- (This requires PostgREST to be configured to expose this)
-- SELECT * FROM pg_settings WHERE name LIKE '%postgrest%' OR name LIKE '%schema%';

-- Verification: Check if schema is accessible
DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'user_subscriptions'
      AND a.attname = 'user_id'
      AND NOT a.attisdropped
  ) INTO col_exists;
  
  IF col_exists THEN
    RAISE NOTICE '✅ Column user_id exists in pg_attribute (what PostgREST uses)';
  ELSE
    RAISE WARNING '❌ Column user_id NOT found in pg_attribute';
  END IF;
END $$;
