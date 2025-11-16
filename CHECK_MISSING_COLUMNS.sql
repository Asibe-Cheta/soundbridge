-- Check if is_public and deleted_at columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
AND column_name IN ('is_public', 'deleted_at')
ORDER BY column_name;

-- Also check for ANY column that might not exist but is referenced
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

