-- =====================================================
-- SUPABASE SECURITY FIXES
-- =====================================================
-- This script fixes the critical security issues found in your Supabase logs

-- =====================================================
-- 1. ENABLE RLS ON MISSING TABLES
-- =====================================================

-- Enable RLS on spatial_ref_sys (PostGIS system table - usually safe to be public)
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy for spatial_ref_sys (allow read access to all)
CREATE POLICY "Allow read access to spatial_ref_sys" ON public.spatial_ref_sys
    FOR SELECT USING (true);

-- Enable RLS on creator_availability
ALTER TABLE public.creator_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for creator_availability
CREATE POLICY "Users can view creator availability" ON public.creator_availability
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own availability" ON public.creator_availability
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own availability" ON public.creator_availability
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own availability" ON public.creator_availability
    FOR DELETE USING (auth.uid() = creator_id);

-- Enable RLS on collaboration_requests
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration_requests
CREATE POLICY "Users can view collaboration requests they're involved in" ON public.collaboration_requests
    FOR SELECT USING (
        auth.uid() = creator_id OR 
        auth.uid() = requester_id
    );

CREATE POLICY "Users can insert collaboration requests" ON public.collaboration_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update collaboration requests they're involved in" ON public.collaboration_requests
    FOR UPDATE USING (
        auth.uid() = creator_id OR 
        auth.uid() = requester_id
    );

CREATE POLICY "Users can delete collaboration requests they're involved in" ON public.collaboration_requests
    FOR DELETE USING (
        auth.uid() = creator_id OR 
        auth.uid() = requester_id
    );

-- =====================================================
-- 2. FIX FUNCTION SEARCH PATH SECURITY
-- =====================================================

-- Fix search_path for all functions to prevent security issues
ALTER FUNCTION public.update_notifications_updated_at() SET search_path = public;
ALTER FUNCTION public.get_nearby_events(double precision, double precision, integer) SET search_path = public;
ALTER FUNCTION public.increment_play_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_user_feed(uuid, integer) SET search_path = public;
ALTER FUNCTION public.increment_like_count(uuid) SET search_path = public;
ALTER FUNCTION public.decrement_like_count(uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_event_attendees_count() SET search_path = public;
ALTER FUNCTION public.send_custom_email(text, text, text) SET search_path = public;
ALTER FUNCTION public.create_default_user_preferences(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- =====================================================
-- 3. ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

-- Add indexes for collaboration_requests foreign keys
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_availability_id ON public.collaboration_requests(availability_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_creator_id ON public.collaboration_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_requester_id ON public.collaboration_requests(requester_id);

-- Add indexes for copyright tables foreign keys
CREATE INDEX IF NOT EXISTS idx_copyright_blacklist_added_by ON public.copyright_blacklist(added_by);
CREATE INDEX IF NOT EXISTS idx_copyright_protection_reviewed_by ON public.copyright_protection(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_copyright_whitelist_added_by ON public.copyright_whitelist(added_by);

-- Add indexes for other tables
CREATE INDEX IF NOT EXISTS idx_creator_availability_creator_id ON public.creator_availability(creator_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON public.shares(user_id);

-- =====================================================
-- 4. REMOVE UNUSED INDEXES (PERFORMANCE OPTIMIZATION)
-- =====================================================

-- Remove unused indexes to improve performance
DROP INDEX IF EXISTS public.idx_audio_tracks_like_count;
DROP INDEX IF EXISTS public.idx_event_attendees_status;
DROP INDEX IF EXISTS public.idx_events_category;
DROP INDEX IF EXISTS public.idx_events_coordinates;
DROP INDEX IF EXISTS public.idx_events_location;
DROP INDEX IF EXISTS public.idx_messages_created_at;
DROP INDEX IF EXISTS public.idx_messages_is_read;
DROP INDEX IF EXISTS public.idx_profiles_country;
DROP INDEX IF EXISTS public.idx_profiles_created_at;
DROP INDEX IF EXISTS public.idx_profiles_onboarding_completed;
DROP INDEX IF EXISTS public.idx_profiles_onboarding_step;
DROP INDEX IF EXISTS public.idx_notifications_type;
DROP INDEX IF EXISTS public.idx_notifications_is_read;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_copyright_protection_status;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This script has fixed:
-- ✅ Enabled RLS on 3 missing tables
-- ✅ Added proper RLS policies for security
-- ✅ Fixed function search_path security issues
-- ✅ Added missing foreign key indexes
-- ✅ Removed unused indexes for better performance
--
-- Next steps:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Test your application to ensure everything works
-- 3. Check Supabase logs again - most warnings should be resolved
