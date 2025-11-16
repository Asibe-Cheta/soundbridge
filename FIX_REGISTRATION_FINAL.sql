-- ============================================================================
-- SoundBridge: FINAL Registration Fix
-- ============================================================================
-- Creates the missing trigger with explicit schema references
-- ============================================================================

-- STEP 1: Create user_genres table (if not exists)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_genres (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    genre_id UUID REFERENCES public.genres(id) ON DELETE CASCADE NOT NULL,
    preference_strength DECIMAL(3,2) DEFAULT 1.00 CHECK (preference_strength >= 0 AND preference_strength <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, genre_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_genres_user_id ON public.user_genres(user_id);
CREATE INDEX IF NOT EXISTS idx_user_genres_genre_id ON public.user_genres(genre_id);

-- Enable RLS
ALTER TABLE public.user_genres ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own genre preferences" ON public.user_genres;
DROP POLICY IF EXISTS "Users can insert their own genre preferences" ON public.user_genres;
DROP POLICY IF EXISTS "Users can update their own genre preferences" ON public.user_genres;
DROP POLICY IF EXISTS "Users can delete their own genre preferences" ON public.user_genres;

CREATE POLICY "Users can view their own genre preferences" 
    ON public.user_genres FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own genre preferences" 
    ON public.user_genres FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own genre preferences" 
    ON public.user_genres FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own genre preferences" 
    ON public.user_genres FOR DELETE USING (auth.uid() = user_id);

-- STEP 2: Create detect_user_reconstruction function
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.detect_user_reconstruction(UUID);

CREATE OR REPLACE FUNCTION public.detect_user_reconstruction(new_user_id UUID)
RETURNS TABLE (
    is_reconstruction BOOLEAN,
    previous_user_id UUID,
    confidence_score DECIMAL(3,2),
    matching_factors TEXT[]
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Simple implementation: return no reconstruction
    RETURN QUERY SELECT false, NULL::UUID, 0.00::DECIMAL(3,2), '{}'::TEXT[];
END;
$$;

-- STEP 3: Create handle_new_user trigger function with explicit schema refs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_username TEXT;
    v_display_name TEXT;
BEGIN
    -- Generate username from email
    v_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
    
    -- Make username unique by checking public.profiles explicitly
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
        v_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6);
    END LOOP;
    
    -- Generate display name
    v_display_name := INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ' '));
    
    -- Insert into public.profiles explicitly
    INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
    VALUES (NEW.id, v_username, v_display_name, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Profile created for user % with username %', NEW.id, v_username;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- STEP 4: Create trigger on auth.users
-- ----------------------------------------------------------------------------
-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger (must be created by superuser/admin on auth.users)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Grant permissions
-- ----------------------------------------------------------------------------
GRANT ALL ON public.user_genres TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_user_reconstruction TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;

-- Allow trigger to access profiles table
GRANT SELECT, INSERT ON public.profiles TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- STEP 6: Verify everything was created
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_trigger_count INTEGER;
    v_function_count INTEGER;
    v_table_count INTEGER;
BEGIN
    -- Check user_genres table
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_genres';
    
    IF v_table_count = 0 THEN
        RAISE EXCEPTION '❌ user_genres table not created';
    END IF;
    
    -- Check functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname IN ('detect_user_reconstruction', 'handle_new_user');
    
    IF v_function_count < 2 THEN
        RAISE EXCEPTION '❌ Functions not created. Found % of 2', v_function_count;
    END IF;
    
    -- Check trigger
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_auth_user_created' 
    AND n.nspname = 'auth' 
    AND c.relname = 'users';
    
    IF v_trigger_count = 0 THEN
        RAISE EXCEPTION '❌ Trigger not created on auth.users';
    END IF;
    
    RAISE NOTICE '✅ user_genres table created';
    RAISE NOTICE '✅ detect_user_reconstruction function created';
    RAISE NOTICE '✅ handle_new_user function created';
    RAISE NOTICE '✅ on_auth_user_created trigger created on auth.users';
    RAISE NOTICE '🎉 Registration fix complete! Try signing up now.';
END $$;

