-- =====================================================
-- SUPABASE SECURITY FIXES (MINIMAL VERSION)
-- =====================================================
-- This script only fixes the critical issues that definitely exist

-- =====================================================
-- 1. ENABLE RLS ON MISSING TABLES
-- =====================================================

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
-- 2. ADD MISSING INDEXES FOR FOREIGN KEYS
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
-- COMPLETION MESSAGE
-- =====================================================

-- This script has fixed:
-- ✅ Enabled RLS on 2 missing tables
-- ✅ Added proper RLS policies for security
-- ✅ Added missing foreign key indexes
--
-- Note: Function search_path issues and unused indexes can be addressed later
-- if needed, but these are the critical security issues that must be fixed
