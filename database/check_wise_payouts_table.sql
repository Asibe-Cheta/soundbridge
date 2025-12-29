-- Check if wise_payouts table exists and what columns it has
-- Run this in Supabase SQL Editor to verify

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'wise_payouts'
) AS table_exists;

-- List all columns in the table (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'wise_payouts'
ORDER BY ordinal_position;

