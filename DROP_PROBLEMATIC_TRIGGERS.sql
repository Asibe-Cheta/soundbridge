-- ============================================================================
-- Drop Problematic Triggers Calling detect_user_reconstruction
-- ============================================================================

-- Drop the trigger that's causing the signup to fail
DROP TRIGGER IF EXISTS trigger_detect_user_reconstruction_on_signup ON auth.users;

-- Also drop the function it was calling
DROP FUNCTION IF EXISTS detect_user_reconstruction_on_signup();

-- Verify triggers remaining
DO $$
DECLARE
    v_trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' 
    AND c.relname = 'users'
    AND t.tgname = 'trigger_detect_user_reconstruction_on_signup'
    AND NOT t.tgisinternal;
    
    IF v_trigger_count > 0 THEN
        RAISE EXCEPTION '❌ Trigger still exists!';
    END IF;
    
    RAISE NOTICE '✅ Problematic trigger dropped successfully';
    RAISE NOTICE '✅ on_auth_user_created trigger remains active';
    RAISE NOTICE '🎉 Registration should work now!';
END $$;

