-- ============================================================================
-- SoundBridge: Registration Fix WITHOUT detect_user_reconstruction
-- ============================================================================
-- Removes the problematic detect_user_reconstruction function dependency
-- ============================================================================

-- STEP 1: Drop and recreate handle_new_user WITHOUT detect_user_reconstruction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    v_username TEXT;
    v_display_name TEXT;
BEGIN
    -- Generate username from email
    v_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
    
    -- Make username unique
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
        v_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6);
    END LOOP;
    
    -- Generate display name
    v_display_name := INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ' '));
    
    -- Insert profile (explicitly use public schema)
    INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
    VALUES (NEW.id, v_username, v_display_name, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Log success
    RAISE NOTICE 'Profile created for user % with username %', NEW.id, v_username;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- STEP 2: Recreate trigger
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: Grant all necessary permissions
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.handle_new_user TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO anon;

-- Allow trigger to access profiles table
GRANT SELECT, INSERT ON public.profiles TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- STEP 4: Verify
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_trigger_count INTEGER;
BEGIN
    -- Check trigger exists
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_auth_user_created' 
    AND n.nspname = 'auth' 
    AND c.relname = 'users';
    
    IF v_trigger_count = 0 THEN
        RAISE EXCEPTION '❌ Trigger not created';
    END IF;
    
    RAISE NOTICE '✅ handle_new_user function updated (no detect_user_reconstruction dependency)';
    RAISE NOTICE '✅ on_auth_user_created trigger recreated';
    RAISE NOTICE '✅ Permissions granted to supabase_auth_admin';
    RAISE NOTICE '🎉 Registration should work now! Try signing up.';
END $$;

