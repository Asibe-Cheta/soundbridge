-- Check what actually exists in the database

-- 1. Check if profiles table exists and in which schema
SELECT 
    schemaname, 
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'profiles';

-- 2. Check if user_genres table exists
SELECT 
    schemaname, 
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'user_genres';

-- 3. Check if detect_user_reconstruction function exists
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'detect_user_reconstruction';

-- 4. Check if handle_new_user function exists
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user';

-- 5. Check if trigger exists
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 6. Check current search_path
SHOW search_path;

