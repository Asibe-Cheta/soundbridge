-- ============================================================================
-- Diagnose user_id Column - Check for GENERATED or DEFAULT
-- Date: December 3, 2025
-- Purpose: Check if user_id is GENERATED or has DEFAULT that PostgREST can't handle
--          This would explain why SELECT works but INSERT/UPDATE fails
-- ============================================================================

-- Check if user_id is GENERATED or has DEFAULT
SELECT 
  column_name,
  column_default,
  is_generated,
  generation_expression,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions' 
  AND column_name = 'user_id';

-- Also check PostgreSQL-specific metadata
SELECT 
  attname AS column_name,
  attgenerated AS is_generated,
  pg_get_expr(adbin, adrelid) AS default_expression,
  CASE 
    WHEN attgenerated = 's' THEN 'STORED'
    WHEN attgenerated = 'v' THEN 'VIRTUAL'
    ELSE 'NOT GENERATED'
  END AS generation_type
FROM pg_attribute a
LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
WHERE a.attrelid = 'public.user_subscriptions'::regclass
  AND a.attname = 'user_id'
  AND NOT a.attisdropped;

-- Check for triggers that might set user_id
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'user_subscriptions'
  AND action_statement LIKE '%user_id%';
