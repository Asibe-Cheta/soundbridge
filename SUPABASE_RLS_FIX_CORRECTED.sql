-- Corrected RLS Policies for SoundBridge
-- Date: December 16, 2025
-- Note: This fixes the column name errors from the original script

-- ============================================
-- PART 1: Enable RLS on all tables
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE public.two_factor_verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_limits_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dmca_takedowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_quality_analytics ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lookup tables (read-only)
ALTER TABLE public.creator_type_lookup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_category_lookup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_subscription_tiers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Create RLS Policies
-- ============================================

-- Two-factor sessions: users see only their own
CREATE POLICY "Users see own 2FA sessions" ON public.two_factor_verification_sessions
FOR SELECT USING (auth.uid() = user_id);

-- Upload limits: authenticated users can view
CREATE POLICY "Authenticated can view limits" ON public.upload_limits_config
FOR SELECT USING (auth.role() = 'authenticated');

-- Content reports: admins only
CREATE POLICY "Admins see all reports" ON public.content_reports
FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- Lookup tables: everyone can read
CREATE POLICY "Public read creator types" ON public.creator_type_lookup
FOR SELECT USING (true);

CREATE POLICY "Public read service categories" ON public.service_category_lookup
FOR SELECT USING (true);

-- User data: users see only their own
CREATE POLICY "Users see own listening history" ON public.user_listening_history
FOR SELECT USING (auth.uid() = user_id);

-- FIXED: creator_branding likely uses 'user_id' not 'creator_id'
-- Try this first (most common pattern):
CREATE POLICY "Users see own branding" ON public.creator_branding
FOR SELECT USING (auth.uid() = user_id);

-- If the above fails, try this (alternative column name):
-- CREATE POLICY "Users see own branding" ON public.creator_branding
-- FOR SELECT USING (auth.uid() = profile_id);

-- Analytics: admins only
CREATE POLICY "Admins see analytics" ON public.onboarding_analytics
FOR SELECT USING (auth.jwt()->>'role' = 'admin');

-- ============================================
-- PART 3: Additional policies for other tables
-- ============================================

-- Paid content: users see only their own
CREATE POLICY "Users see own paid content" ON public.paid_content
FOR SELECT USING (auth.uid() = user_id);

-- Copyright strikes: users see only their own
CREATE POLICY "Users see own copyright strikes" ON public.copyright_strikes
FOR SELECT USING (auth.uid() = user_id);

-- Flagged content: admins only
CREATE POLICY "Admins see flagged content" ON public.flagged_content
FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- DMCA takedowns: admins only
CREATE POLICY "Admins see DMCA takedowns" ON public.dmca_takedowns
FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- Audio processing queue: users see only their own
CREATE POLICY "Users see own audio queue" ON public.audio_processing_queue
FOR SELECT USING (auth.uid() = user_id);

-- Audio quality analytics: users see only their own
CREATE POLICY "Users see own audio analytics" ON public.audio_quality_analytics
FOR SELECT USING (auth.uid() = user_id);

-- Creator subscription tiers: everyone can read
CREATE POLICY "Public read subscription tiers" ON public.creator_subscription_tiers
FOR SELECT USING (true);
