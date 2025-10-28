-- ============================================
-- PLATFORM QUALIFICATION SYSTEM - DATABASE SCHEMA
-- ============================================
-- This schema implements the backend infrastructure to qualify SoundBridge
-- as a destination platform for external distribution platforms
-- Date: January 2025
-- Status: Ready to execute
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PLATFORM QUALIFICATION REQUIREMENTS
-- ============================================

-- Platform qualification requirements tracking
CREATE TABLE IF NOT EXISTS platform_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name VARCHAR(100) NOT NULL,  -- 'TuneCore', 'DistroKid', 'CD Baby', 'Spotify for Artists', etc.
    requirement_type VARCHAR(50) NOT NULL,  -- 'technical', 'legal', 'business', 'content'
    requirement_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_met BOOLEAN DEFAULT false,
    evidence_url TEXT,  -- Link to documentation/proof
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    estimated_effort_hours INTEGER DEFAULT 1,
    dependencies TEXT[], -- Array of requirement IDs this depends on
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform_name, requirement_name)
);

-- Content quality standards tracking
CREATE TABLE IF NOT EXISTS content_quality_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,  -- 'audio', 'metadata', 'artwork', 'legal'
    is_implemented BOOLEAN DEFAULT false,
    implementation_details JSONB,
    test_results JSONB,  -- Results from quality tests
    min_score DECIMAL(5,2) DEFAULT 0.0,  -- Minimum score to pass (0-100)
    max_score DECIMAL(5,2) DEFAULT 100.0,  -- Maximum possible score
    weight DECIMAL(3,2) DEFAULT 1.0,  -- Weight in overall quality score
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform readiness checklist
CREATE TABLE IF NOT EXISTS platform_readiness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_item VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,  -- 'technical', 'legal', 'business', 'content'
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    completion_date TIMESTAMPTZ,
    notes TEXT,
    assigned_to UUID REFERENCES profiles(id),
    estimated_completion_date TIMESTAMPTZ,
    dependencies TEXT[], -- Array of checklist item IDs this depends on
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ISRC GENERATION AND MANAGEMENT
-- ============================================

-- ISRC registry
CREATE TABLE IF NOT EXISTS isrc_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isrc VARCHAR(12) UNIQUE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'retired', 'replaced')),
    replaced_by UUID REFERENCES isrc_registry(id), -- If this ISRC was replaced
    metadata JSONB DEFAULT '{}', -- Additional metadata about the ISRC
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ISRC generation counter (to ensure unique designation codes)
CREATE TABLE IF NOT EXISTS isrc_generation_counter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_code VARCHAR(2) NOT NULL,
    counter INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(year_code)
);

-- ============================================
-- 3. CONTENT QUALITY TESTING
-- ============================================

-- Content quality test results
CREATE TABLE IF NOT EXISTS content_quality_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    standard_id UUID REFERENCES content_quality_standards(id) ON DELETE CASCADE,
    test_date TIMESTAMPTZ DEFAULT NOW(),
    passed BOOLEAN NOT NULL,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    details JSONB, -- Detailed test results
    recommendations TEXT[], -- Array of improvement recommendations
    retest_required BOOLEAN DEFAULT false,
    retest_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PLATFORM QUALIFICATION ANALYTICS
-- ============================================

-- Qualification progress tracking
CREATE TABLE IF NOT EXISTS qualification_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    total_requirements INTEGER DEFAULT 0,
    completed_requirements INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform_name, category, date)
);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to generate ISRC
CREATE OR REPLACE FUNCTION generate_isrc(user_id UUID, track_title TEXT)
RETURNS VARCHAR(12) AS $$
DECLARE
    country_code VARCHAR(2) := 'GB';  -- UK-based, GB prioritized
    registrant_code VARCHAR(3) := 'SBR';  -- SoundBridge registrant code
    year_code VARCHAR(2);
    designation_code VARCHAR(5);
    full_isrc VARCHAR(12);
    current_counter INTEGER;
BEGIN
    -- Get current year (last 2 digits)
    year_code := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
    
    -- Get or create counter for this year
    INSERT INTO isrc_generation_counter (year_code, counter)
    VALUES (year_code, 0)
    ON CONFLICT (year_code) DO NOTHING;
    
    -- Get current counter and increment
    UPDATE isrc_generation_counter 
    SET counter = counter + 1,
        updated_at = NOW()
    WHERE year_code = year_code
    RETURNING counter INTO current_counter;
    
    -- Generate designation code (5 digits, padded with zeros)
    designation_code := LPAD(current_counter::TEXT, 5, '0');
    
    -- Combine to form ISRC
    full_isrc := country_code || registrant_code || year_code || designation_code;
    
    -- Insert into registry
    INSERT INTO isrc_registry (isrc, user_id, track_id, metadata)
    VALUES (full_isrc, user_id, NULL, jsonb_build_object('track_title', track_title, 'generated_at', NOW()))
    ON CONFLICT (isrc) DO NOTHING;
    
    RETURN full_isrc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate ISRC format
CREATE OR REPLACE FUNCTION validate_isrc(isrc_code VARCHAR(12))
RETURNS BOOLEAN AS $$
BEGIN
    -- ISRC format: CC-XXX-YY-NNNNN
    -- CC = Country code (2 letters)
    -- XXX = Registrant code (3 alphanumeric)
    -- YY = Year (2 digits)
    -- NNNNN = Designation code (5 digits)
    
    RETURN isrc_code ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{2}[0-9]{5}$';
END;
$$ LANGUAGE plpgsql;

-- Function to get qualification progress
CREATE OR REPLACE FUNCTION get_qualification_progress(platform_name VARCHAR(100))
RETURNS TABLE (
    category VARCHAR(50),
    total_requirements INTEGER,
    completed_requirements INTEGER,
    completion_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pq.requirement_type as category,
        COUNT(*)::INTEGER as total_requirements,
        COUNT(CASE WHEN pq.is_met = true THEN 1 END)::INTEGER as completed_requirements,
        ROUND(
            (COUNT(CASE WHEN pq.is_met = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
            2
        ) as completion_percentage
    FROM platform_qualifications pq
    WHERE pq.platform_name = platform_name
    GROUP BY pq.requirement_type
    ORDER BY pq.requirement_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate content quality score
CREATE OR REPLACE FUNCTION calculate_content_quality_score(track_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_score DECIMAL(5,2) := 0;
    total_weight DECIMAL(3,2) := 0;
    weighted_score DECIMAL(5,2);
BEGIN
    SELECT 
        COALESCE(SUM(cqt.score * cqs.weight), 0) as weighted_sum,
        COALESCE(SUM(cqs.weight), 0) as total_weight
    INTO total_score, total_weight
    FROM content_quality_tests cqt
    JOIN content_quality_standards cqs ON cqt.standard_id = cqs.id
    WHERE cqt.track_id = track_id
    AND cqt.passed = true;
    
    IF total_weight > 0 THEN
        weighted_score := total_score / total_weight;
    ELSE
        weighted_score := 0;
    END IF;
    
    RETURN LEAST(weighted_score, 100.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================

-- Platform qualifications indexes
CREATE INDEX IF NOT EXISTS idx_platform_qualifications_platform ON platform_qualifications(platform_name);
CREATE INDEX IF NOT EXISTS idx_platform_qualifications_type ON platform_qualifications(requirement_type);
CREATE INDEX IF NOT EXISTS idx_platform_qualifications_met ON platform_qualifications(is_met);
CREATE INDEX IF NOT EXISTS idx_platform_qualifications_priority ON platform_qualifications(priority);

-- Content quality standards indexes
CREATE INDEX IF NOT EXISTS idx_content_quality_standards_category ON content_quality_standards(category);
CREATE INDEX IF NOT EXISTS idx_content_quality_standards_implemented ON content_quality_standards(is_implemented);

-- Platform readiness indexes
CREATE INDEX IF NOT EXISTS idx_platform_readiness_category ON platform_readiness(category);
CREATE INDEX IF NOT EXISTS idx_platform_readiness_status ON platform_readiness(status);
CREATE INDEX IF NOT EXISTS idx_platform_readiness_priority ON platform_readiness(priority);
CREATE INDEX IF NOT EXISTS idx_platform_readiness_assigned ON platform_readiness(assigned_to);

-- ISRC registry indexes
CREATE INDEX IF NOT EXISTS idx_isrc_registry_user ON isrc_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_isrc_registry_track ON isrc_registry(track_id);
CREATE INDEX IF NOT EXISTS idx_isrc_registry_status ON isrc_registry(status);
CREATE INDEX IF NOT EXISTS idx_isrc_registry_isrc ON isrc_registry(isrc);

-- Content quality tests indexes
CREATE INDEX IF NOT EXISTS idx_content_quality_tests_track ON content_quality_tests(track_id);
CREATE INDEX IF NOT EXISTS idx_content_quality_tests_user ON content_quality_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_content_quality_tests_standard ON content_quality_tests(standard_id);
CREATE INDEX IF NOT EXISTS idx_content_quality_tests_date ON content_quality_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_content_quality_tests_passed ON content_quality_tests(passed);

-- Qualification progress indexes
CREATE INDEX IF NOT EXISTS idx_qualification_progress_platform ON qualification_progress(platform_name);
CREATE INDEX IF NOT EXISTS idx_qualification_progress_category ON qualification_progress(category);
CREATE INDEX IF NOT EXISTS idx_qualification_progress_date ON qualification_progress(date);

-- ============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE platform_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_quality_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE isrc_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_quality_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_progress ENABLE ROW LEVEL SECURITY;

-- Platform qualifications policies
CREATE POLICY "Platform qualifications are viewable by all authenticated users" 
ON platform_qualifications FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify platform qualifications" 
ON platform_qualifications FOR ALL 
USING (auth.role() = 'service_role');

-- Content quality standards policies
CREATE POLICY "Content quality standards are viewable by all authenticated users" 
ON content_quality_standards FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify content quality standards" 
ON content_quality_standards FOR ALL 
USING (auth.role() = 'service_role');

-- Platform readiness policies
CREATE POLICY "Platform readiness is viewable by all authenticated users" 
ON platform_readiness FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify platform readiness" 
ON platform_readiness FOR ALL 
USING (auth.role() = 'service_role');

-- ISRC registry policies
CREATE POLICY "Users can view their own ISRCs" 
ON isrc_registry FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create ISRCs for their tracks" 
ON isrc_registry FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ISRCs" 
ON isrc_registry FOR UPDATE 
USING (auth.uid() = user_id);

-- Content quality tests policies
CREATE POLICY "Users can view their own quality tests" 
ON content_quality_tests FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create quality tests for their tracks" 
ON content_quality_tests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Qualification progress policies
CREATE POLICY "Qualification progress is viewable by all authenticated users" 
ON qualification_progress FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify qualification progress" 
ON qualification_progress FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================
-- 8. INITIAL DATA POPULATION
-- ============================================

-- Insert initial platform qualification requirements
INSERT INTO platform_qualifications (platform_name, requirement_type, requirement_name, description, priority, estimated_effort_hours) VALUES
-- Technical Requirements
('TuneCore', 'technical', 'RESTful API', 'Implement RESTful API for track management and metadata exchange', 'high', 40),
('TuneCore', 'technical', 'Webhook Support', 'Implement webhook system for real-time status updates', 'high', 20),
('TuneCore', 'technical', 'Rate Limiting', 'Implement proper rate limiting and throttling', 'medium', 8),
('TuneCore', 'technical', 'Authentication', 'Implement secure API authentication (OAuth 2.0)', 'high', 16),
('TuneCore', 'technical', 'API Documentation', 'Create comprehensive API documentation', 'medium', 12),

('DistroKid', 'technical', 'RESTful API', 'Implement RESTful API for track management and metadata exchange', 'high', 40),
('DistroKid', 'technical', 'Webhook Support', 'Implement webhook system for real-time status updates', 'high', 20),
('DistroKid', 'technical', 'Rate Limiting', 'Implement proper rate limiting and throttling', 'medium', 8),
('DistroKid', 'technical', 'Authentication', 'Implement secure API authentication (OAuth 2.0)', 'high', 16),
('DistroKid', 'technical', 'API Documentation', 'Create comprehensive API documentation', 'medium', 12),

-- Content Requirements
('TuneCore', 'content', 'ISRC Generation', 'Implement ISRC generation and management system', 'critical', 24),
('TuneCore', 'content', 'Audio Quality Standards', 'Implement audio quality validation (320kbps+, 44.1kHz+)', 'high', 16),
('TuneCore', 'content', 'Metadata Completeness', 'Ensure all required metadata fields are captured', 'high', 8),
('TuneCore', 'content', 'Artwork Standards', 'Implement artwork quality and format validation', 'medium', 12),

('DistroKid', 'content', 'ISRC Generation', 'Implement ISRC generation and management system', 'critical', 24),
('DistroKid', 'content', 'Audio Quality Standards', 'Implement audio quality validation (320kbps+, 44.1kHz+)', 'high', 16),
('DistroKid', 'content', 'Metadata Completeness', 'Ensure all required metadata fields are captured', 'high', 8),
('DistroKid', 'content', 'Artwork Standards', 'Implement artwork quality and format validation', 'medium', 12),

-- Legal Requirements
('TuneCore', 'legal', 'DMCA Compliance', 'Implement DMCA takedown procedures and compliance', 'critical', 32),
('TuneCore', 'legal', 'Copyright Protection', 'Implement copyright detection and protection systems', 'high', 40),
('TuneCore', 'legal', 'Terms of Service', 'Create comprehensive terms of service and user agreements', 'high', 16),
('TuneCore', 'legal', 'Privacy Policy', 'Create GDPR/CCPA compliant privacy policy', 'high', 12),

('DistroKid', 'legal', 'DMCA Compliance', 'Implement DMCA takedown procedures and compliance', 'critical', 32),
('DistroKid', 'legal', 'Copyright Protection', 'Implement copyright detection and protection systems', 'high', 40),
('DistroKid', 'legal', 'Terms of Service', 'Create comprehensive terms of service and user agreements', 'high', 16),
('DistroKid', 'legal', 'Privacy Policy', 'Create GDPR/CCPA compliant privacy policy', 'high', 12),

-- Business Requirements
('TuneCore', 'business', 'Financial Stability', 'Demonstrate financial stability and revenue streams', 'high', 8),
('TuneCore', 'business', 'Content Volume', 'Maintain minimum content volume and user base', 'medium', 4),
('TuneCore', 'business', 'Technical Infrastructure', 'Demonstrate scalable technical infrastructure', 'high', 16),
('TuneCore', 'business', 'Support System', 'Implement customer support and help system', 'medium', 20),

('DistroKid', 'business', 'Financial Stability', 'Demonstrate financial stability and revenue streams', 'high', 8),
('DistroKid', 'business', 'Content Volume', 'Maintain minimum content volume and user base', 'medium', 4),
('DistroKid', 'business', 'Technical Infrastructure', 'Demonstrate scalable technical infrastructure', 'high', 16),
('DistroKid', 'business', 'Support System', 'Implement customer support and help system', 'medium', 20);

-- Insert initial content quality standards
INSERT INTO content_quality_standards (standard_name, description, category, min_score, weight) VALUES
-- Audio Quality Standards
('Audio Bitrate', 'Minimum 320 kbps bitrate for MP3, lossless for WAV/FLAC', 'audio', 80.0, 1.0),
('Sample Rate', 'Minimum 44.1 kHz sample rate', 'audio', 90.0, 1.0),
('Audio Duration', 'Track duration between 30 seconds and 10 minutes', 'audio', 70.0, 0.8),
('Audio Channels', 'Stereo audio required', 'audio', 95.0, 0.5),
('Audio Format', 'Supported formats: WAV, FLAC, AIFF, MP3 (320kbps+)', 'audio', 85.0, 0.8),

-- Metadata Standards
('Title Completeness', 'Track title is present and meaningful', 'metadata', 90.0, 1.0),
('Artist Information', 'Artist name is present and complete', 'metadata', 90.0, 1.0),
('Genre Classification', 'Genre is selected and appropriate', 'metadata', 80.0, 0.8),
('ISRC Assignment', 'ISRC is generated and assigned', 'metadata', 100.0, 1.0),
('Copyright Information', 'Copyright year and holder information present', 'metadata', 85.0, 0.9),

-- Artwork Standards
('Artwork Resolution', 'Minimum 3000x3000 pixel resolution', 'artwork', 90.0, 1.0),
('Artwork Format', 'JPG or PNG format required', 'artwork', 95.0, 0.8),
('Artwork Aspect Ratio', 'Square aspect ratio (1:1)', 'artwork', 100.0, 0.9),
('Artwork Quality', 'High quality, professional appearance', 'artwork', 80.0, 1.0),

-- Legal Standards
('Copyright Ownership', 'User confirms copyright ownership', 'legal', 100.0, 1.0),
('Rights Verification', 'No conflicting distribution rights', 'legal', 100.0, 1.0),
('Explicit Content Labeling', 'Explicit content properly labeled', 'legal', 90.0, 0.7),
('DMCA Compliance', 'Content complies with DMCA requirements', 'legal', 100.0, 1.0);

-- Insert initial platform readiness checklist
INSERT INTO platform_readiness (checklist_item, category, priority, estimated_completion_date) VALUES
-- Technical Readiness
('API Infrastructure Complete', 'technical', 'critical', NOW() + INTERVAL '30 days'),
('Webhook System Implemented', 'technical', 'high', NOW() + INTERVAL '45 days'),
('Rate Limiting Configured', 'technical', 'medium', NOW() + INTERVAL '15 days'),
('Authentication System Ready', 'technical', 'critical', NOW() + INTERVAL '20 days'),
('API Documentation Published', 'technical', 'medium', NOW() + INTERVAL '25 days'),

-- Content Readiness
('ISRC Generation System Live', 'content', 'critical', NOW() + INTERVAL '10 days'),
('Audio Quality Validation Active', 'content', 'high', NOW() + INTERVAL '20 days'),
('Metadata Validation Complete', 'content', 'high', NOW() + INTERVAL '15 days'),
('Artwork Standards Enforced', 'content', 'medium', NOW() + INTERVAL '25 days'),

-- Legal Readiness
('DMCA Procedures Documented', 'legal', 'critical', NOW() + INTERVAL '35 days'),
('Copyright Protection Active', 'legal', 'high', NOW() + INTERVAL '40 days'),
('Terms of Service Updated', 'legal', 'high', NOW() + INTERVAL '20 days'),
('Privacy Policy Compliant', 'legal', 'high', NOW() + INTERVAL '25 days'),

-- Business Readiness
('Financial Reporting Ready', 'business', 'high', NOW() + INTERVAL '30 days'),
('Content Volume Targets Met', 'business', 'medium', NOW() + INTERVAL '60 days'),
('Support System Operational', 'business', 'medium', NOW() + INTERVAL '35 days'),
('Infrastructure Monitoring Active', 'business', 'high', NOW() + INTERVAL '20 days');

-- ============================================
-- 9. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_platform_qualifications_updated_at 
    BEFORE UPDATE ON platform_qualifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_quality_standards_updated_at 
    BEFORE UPDATE ON content_quality_standards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_readiness_updated_at 
    BEFORE UPDATE ON platform_readiness 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_isrc_registry_updated_at 
    BEFORE UPDATE ON isrc_registry 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. COMMENTS AND DOCUMENTATION
-- ============================================

COMMENT ON TABLE platform_qualifications IS 'Tracks platform-specific qualification requirements for external distribution platforms';
COMMENT ON TABLE content_quality_standards IS 'Defines content quality standards and validation criteria';
COMMENT ON TABLE platform_readiness IS 'Checklist items for platform readiness assessment';
COMMENT ON TABLE isrc_registry IS 'Registry of ISRC codes generated for tracks';
COMMENT ON TABLE content_quality_tests IS 'Results of content quality tests performed on tracks';
COMMENT ON TABLE qualification_progress IS 'Daily progress tracking for platform qualification';

COMMENT ON FUNCTION generate_isrc IS 'Generates a unique ISRC code for a track';
COMMENT ON FUNCTION validate_isrc IS 'Validates the format of an ISRC code';
COMMENT ON FUNCTION get_qualification_progress IS 'Returns qualification progress by platform and category';
COMMENT ON FUNCTION calculate_content_quality_score IS 'Calculates overall content quality score for a track';

-- ============================================
-- SCHEMA COMPLETE
-- ============================================

-- This schema provides a comprehensive foundation for qualifying SoundBridge
-- as a destination platform for external distribution services.
-- 
-- Key Features:
-- - Platform-specific qualification tracking
-- - Content quality standards and testing
-- - ISRC generation and management
-- - Platform readiness checklist
-- - Progress analytics and reporting
-- - Row-level security policies
-- - Performance-optimized indexes
-- 
-- Next Steps:
-- 1. Run this schema in Supabase SQL Editor
-- 2. Implement API endpoints for mobile integration
-- 3. Create admin dashboard for qualification management
-- 4. Test ISRC generation and content quality validation
