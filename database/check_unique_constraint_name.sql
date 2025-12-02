-- ============================================================================
-- Check Unique Constraint Name for user_subscriptions.user_id
-- Date: December 2, 2025
-- Purpose: Verify the exact constraint name for onConflict parameter
-- ============================================================================

-- Check unique constraints on user_subscriptions
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_subscriptions'::regclass
  AND contype = 'u'
ORDER BY conname;

-- Also check unique indexes (which can be used for onConflict)
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public'
  AND indexdef LIKE '%UNIQUE%'
  AND indexdef LIKE '%user_id%'
ORDER BY indexname;
