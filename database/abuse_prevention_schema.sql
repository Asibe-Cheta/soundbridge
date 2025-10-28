-- ============================================
-- ABUSE PREVENTION SYSTEM - DATABASE SCHEMA
-- ============================================
-- This schema implements comprehensive abuse prevention measures
-- to prevent users from creating multiple accounts to bypass free tier limits
-- Date: January 2025
-- Status: Ready to execute
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USER FINGERPRINTING & DEVICE TRACKING
-- ============================================

-- User device fingerprinting table
CREATE TABLE IF NOT EXISTS user_device_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL, -- Browser/device fingerprint
    ip_address INET NOT NULL,
    user_agent TEXT,
    screen_resolution VARCHAR(20),
    timezone VARCHAR(50),
    language VARCHAR(10),
    platform VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    is_mobile BOOLEAN DEFAULT false,
    is_tablet BOOLEAN DEFAULT false,
    is_desktop BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, device_fingerprint)
);

-- IP address tracking table
CREATE TABLE IF NOT EXISTS ip_address_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    request_count INTEGER DEFAULT 1,
    is_vpn BOOLEAN DEFAULT false,
    is_proxy BOOLEAN DEFAULT false,
    is_tor BOOLEAN DEFAULT false,
    country VARCHAR(2),
    city VARCHAR(100),
    isp VARCHAR(200),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(ip_address, user_id)
);

-- ============================================
-- 2. ACCOUNT LINKING & DETECTION
-- ============================================

-- Account linking detection table
CREATE TABLE IF NOT EXISTS account_linking_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN (
        'same_ip', 'same_device', 'same_email_domain', 'same_phone', 
        'similar_name', 'same_payment_method', 'same_bank_account',
        'behavioral_pattern', 'upload_pattern', 'content_similarity'
    )),
    evidence_strength DECIMAL(3,2) NOT NULL CHECK (evidence_strength >= 0 AND evidence_strength <= 1),
    evidence_details JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    is_confirmed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    action_taken VARCHAR(50) CHECK (action_taken IN (
        'none', 'flagged', 'merged', 'suspended', 'banned'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suspicious account patterns table
CREATE TABLE IF NOT EXISTS suspicious_account_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
        'rapid_signup', 'similar_emails', 'same_ip_multiple_accounts',
        'upload_immediately', 'no_engagement', 'suspicious_behavior',
        'payment_abuse', 'content_abuse', 'device_fingerprint_match'
    )),
    pattern_score DECIMAL(3,2) NOT NULL CHECK (pattern_score >= 0 AND pattern_score <= 1),
    pattern_details JSONB NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. UPLOAD ABUSE DETECTION
-- ============================================

-- Upload abuse tracking table
CREATE TABLE IF NOT EXISTS upload_abuse_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    upload_id UUID, -- References audio_tracks or events
    abuse_type VARCHAR(50) NOT NULL CHECK (abuse_type IN (
        'free_tier_abuse', 'rapid_uploads', 'duplicate_content',
        'copyright_violation', 'spam_content', 'fake_content',
        'storage_abuse', 'bandwidth_abuse', 'api_abuse'
    )),
    abuse_score DECIMAL(3,2) NOT NULL CHECK (abuse_score >= 0 AND abuse_score <= 1),
    abuse_details JSONB NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    is_confirmed BOOLEAN DEFAULT false,
    confirmed_by UUID REFERENCES profiles(id),
    confirmed_at TIMESTAMPTZ,
    action_taken VARCHAR(50) CHECK (action_taken IN (
        'none', 'flagged', 'blocked', 'deleted', 'suspended', 'banned'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content similarity detection table
CREATE TABLE IF NOT EXISTS content_similarity_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL, -- References audio_tracks or events
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('audio', 'event')),
    similar_content_id UUID NOT NULL,
    similarity_score DECIMAL(3,2) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    similarity_type VARCHAR(50) NOT NULL CHECK (similarity_type IN (
        'title_similarity', 'description_similarity', 'audio_fingerprint',
        'metadata_similarity', 'upload_pattern', 'user_behavior'
    )),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    action_taken VARCHAR(50) CHECK (action_taken IN (
        'none', 'flagged', 'merged', 'deleted', 'investigate'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. FRAUD DETECTION & RISK SCORING
-- ============================================

-- User risk scoring table
CREATE TABLE IF NOT EXISTS user_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    overall_risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (overall_risk_score >= 0 AND overall_risk_score <= 1),
    account_risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    behavior_risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    content_risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    payment_risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    device_risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    ip_risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    risk_factors JSONB DEFAULT '[]',
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud detection rules table
CREATE TABLE IF NOT EXISTS fraud_detection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_description TEXT NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'account_creation', 'upload_behavior', 'payment_behavior',
        'device_behavior', 'ip_behavior', 'content_behavior'
    )),
    rule_conditions JSONB NOT NULL,
    risk_weight DECIMAL(3,2) NOT NULL DEFAULT 0.1 CHECK (risk_weight >= 0 AND risk_weight <= 1),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ABUSE PREVENTION ACTIONS
-- ============================================

-- Abuse prevention actions table
CREATE TABLE IF NOT EXISTS abuse_prevention_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'account_flagged', 'upload_blocked', 'account_suspended',
        'account_banned', 'content_removed', 'limits_reduced',
        'verification_required', 'manual_review', 'warning_sent'
    )),
    action_reason TEXT NOT NULL,
    action_details JSONB,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to calculate user risk score
CREATE OR REPLACE FUNCTION calculate_user_risk_score(user_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    account_score DECIMAL(3,2) := 0;
    behavior_score DECIMAL(3,2) := 0;
    content_score DECIMAL(3,2) := 0;
    device_score DECIMAL(3,2) := 0;
    ip_score DECIMAL(3,2) := 0;
    overall_score DECIMAL(3,2) := 0;
    risk_factors JSONB := '[]';
BEGIN
    -- Calculate account risk (multiple accounts, similar emails, etc.)
    SELECT COALESCE(
        (SELECT COUNT(*)::DECIMAL / 10 FROM account_linking_evidence WHERE primary_user_id = user_uuid OR linked_user_id = user_uuid),
        0
    ) INTO account_score;
    
    -- Calculate behavior risk (rapid uploads, suspicious patterns)
    SELECT COALESCE(
        (SELECT AVG(pattern_score) FROM suspicious_account_patterns WHERE user_id = user_uuid AND is_resolved = false),
        0
    ) INTO behavior_score;
    
    -- Calculate content risk (abuse, copyright violations)
    SELECT COALESCE(
        (SELECT AVG(abuse_score) FROM upload_abuse_tracking WHERE user_id = user_uuid AND is_confirmed = true),
        0
    ) INTO content_score;
    
    -- Calculate device risk (multiple devices, suspicious fingerprints)
    SELECT COALESCE(
        (SELECT COUNT(*)::DECIMAL / 5 FROM user_device_fingerprints WHERE user_id = user_uuid),
        0
    ) INTO device_score;
    
    -- Calculate IP risk (VPN, proxy, multiple accounts from same IP)
    SELECT COALESCE(
        (SELECT AVG(risk_score::DECIMAL / 100) FROM ip_address_tracking WHERE user_id = user_uuid),
        0
    ) INTO ip_score;
    
    -- Calculate overall score (weighted average)
    overall_score := (account_score * 0.3 + behavior_score * 0.25 + content_score * 0.25 + device_score * 0.1 + ip_score * 0.1);
    
    -- Ensure score is between 0 and 1
    overall_score := LEAST(1.0, GREATEST(0.0, overall_score));
    
    -- Update or insert risk score
    INSERT INTO user_risk_scores (
        user_id, overall_risk_score, account_risk_score, behavior_risk_score,
        content_risk_score, device_risk_score, ip_risk_score, last_calculated
    ) VALUES (
        user_uuid, overall_score, account_score, behavior_score,
        content_score, device_score, ip_score, NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        overall_risk_score = EXCLUDED.overall_risk_score,
        account_risk_score = EXCLUDED.account_risk_score,
        behavior_risk_score = EXCLUDED.behavior_risk_score,
        content_risk_score = EXCLUDED.content_risk_score,
        device_risk_score = EXCLUDED.device_risk_score,
        ip_risk_score = EXCLUDED.ip_risk_score,
        last_calculated = EXCLUDED.last_calculated,
        updated_at = NOW();
    
    RETURN overall_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect account linking
CREATE OR REPLACE FUNCTION detect_account_linking(user_uuid UUID)
RETURNS TABLE (
    linked_user_id UUID,
    evidence_count INTEGER,
    confidence_score DECIMAL(3,2),
    evidence_types TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH linked_accounts AS (
        SELECT 
            CASE 
                WHEN primary_user_id = user_uuid THEN linked_user_id
                ELSE primary_user_id
            END as other_user_id,
            COUNT(*) as evidence_count,
            AVG(confidence_score) as avg_confidence,
            ARRAY_AGG(evidence_type) as evidence_types
        FROM account_linking_evidence
        WHERE (primary_user_id = user_uuid OR linked_user_id = user_uuid)
        AND is_confirmed = false
        GROUP BY other_user_id
        HAVING COUNT(*) >= 2 OR AVG(confidence_score) >= 0.7
    )
    SELECT 
        la.other_user_id,
        la.evidence_count::INTEGER,
        la.avg_confidence,
        la.evidence_types
    FROM linked_accounts la
    ORDER BY la.avg_confidence DESC, la.evidence_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can upload (with abuse prevention)
CREATE OR REPLACE FUNCTION can_user_upload_with_abuse_check(user_uuid UUID)
RETURNS TABLE (
    can_upload BOOLEAN,
    reason TEXT,
    risk_score DECIMAL(3,2),
    requires_verification BOOLEAN
) AS $$
DECLARE
    user_tier TEXT;
    current_uploads INTEGER;
    upload_limit INTEGER;
    risk_score DECIMAL(3,2);
    is_flagged BOOLEAN;
    has_active_actions BOOLEAN;
BEGIN
    -- Get user tier
    SELECT COALESCE(us.current_tier, 'free') INTO user_tier
    FROM user_upload_stats us
    WHERE us.user_id = user_uuid;
    
    -- Calculate risk score
    SELECT calculate_user_risk_score(user_uuid) INTO risk_score;
    
    -- Check if user is flagged
    SELECT is_flagged INTO is_flagged
    FROM user_risk_scores
    WHERE user_id = user_uuid;
    
    -- Check for active abuse prevention actions
    SELECT EXISTS(
        SELECT 1 FROM abuse_prevention_actions 
        WHERE user_id = user_uuid 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
        AND action_type IN ('account_flagged', 'upload_blocked', 'account_suspended')
    ) INTO has_active_actions;
    
    -- If user has active restrictions, block upload
    IF has_active_actions THEN
        RETURN QUERY SELECT false, 'Account has active restrictions', risk_score, true;
        RETURN;
    END IF;
    
    -- If risk score is very high, require verification
    IF risk_score >= 0.8 THEN
        RETURN QUERY SELECT false, 'High risk score - verification required', risk_score, true;
        RETURN;
    END IF;
    
    -- If user is flagged, require verification
    IF is_flagged THEN
        RETURN QUERY SELECT false, 'Account flagged for review', risk_score, true;
        RETURN;
    END IF;
    
    -- Check normal upload limits
    upload_limit := CASE 
        WHEN user_tier = 'free' THEN 3
        WHEN user_tier = 'pro' THEN 10
        WHEN user_tier = 'enterprise' THEN NULL
        ELSE 3
    END;
    
    -- If unlimited, allow
    IF upload_limit IS NULL THEN
        RETURN QUERY SELECT true, 'Unlimited uploads', risk_score, false;
        RETURN;
    END IF;
    
    -- For free tier, check total uploads
    IF user_tier = 'free' THEN
        SELECT COALESCE(total_uploads, 0) 
        INTO current_uploads
        FROM user_upload_stats 
        WHERE user_id = user_uuid;
        
        IF current_uploads >= upload_limit THEN
            RETURN QUERY SELECT false, 'Free tier limit reached (3 uploads)', risk_score, false;
            RETURN;
        END IF;
    END IF;
    
    -- For pro tier, check monthly uploads
    IF user_tier = 'pro' THEN
        SELECT COUNT(*) 
        INTO current_uploads
        FROM upload_validation_logs 
        WHERE user_id = user_uuid 
        AND created_at >= date_trunc('month', CURRENT_DATE)
        AND validation_status = 'success';
        
        IF current_uploads >= upload_limit THEN
            RETURN QUERY SELECT false, 'Monthly limit reached (10 uploads)', risk_score, false;
            RETURN;
        END IF;
    END IF;
    
    -- If risk score is medium-high, require verification
    IF risk_score >= 0.6 THEN
        RETURN QUERY SELECT true, 'Upload allowed with verification', risk_score, true;
        RETURN;
    END IF;
    
    -- Allow upload
    RETURN QUERY SELECT true, 'Upload allowed', risk_score, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

-- Device fingerprinting indexes
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON user_device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fingerprint ON user_device_fingerprints(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_ip ON user_device_fingerprints(ip_address);

-- IP tracking indexes
CREATE INDEX IF NOT EXISTS idx_ip_tracking_ip ON ip_address_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_user ON ip_address_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_flagged ON ip_address_tracking(is_flagged);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_risk ON ip_address_tracking(risk_score);

-- Account linking indexes
CREATE INDEX IF NOT EXISTS idx_account_linking_primary ON account_linking_evidence(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_account_linking_linked ON account_linking_evidence(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_account_linking_type ON account_linking_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_account_linking_confirmed ON account_linking_evidence(is_confirmed);

-- Suspicious patterns indexes
CREATE INDEX IF NOT EXISTS idx_suspicious_patterns_user ON suspicious_account_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_patterns_type ON suspicious_account_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_suspicious_patterns_resolved ON suspicious_account_patterns(is_resolved);

-- Upload abuse indexes
CREATE INDEX IF NOT EXISTS idx_upload_abuse_user ON upload_abuse_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_abuse_type ON upload_abuse_tracking(abuse_type);
CREATE INDEX IF NOT EXISTS idx_upload_abuse_confirmed ON upload_abuse_tracking(is_confirmed);

-- Content similarity indexes
CREATE INDEX IF NOT EXISTS idx_content_similarity_content ON content_similarity_detection(content_id);
CREATE INDEX IF NOT EXISTS idx_content_similarity_similar ON content_similarity_detection(similar_content_id);
CREATE INDEX IF NOT EXISTS idx_content_similarity_type ON content_similarity_detection(similarity_type);

-- Risk scoring indexes
CREATE INDEX IF NOT EXISTS idx_risk_scores_user ON user_risk_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_flagged ON user_risk_scores(is_flagged);
CREATE INDEX IF NOT EXISTS idx_risk_scores_score ON user_risk_scores(overall_risk_score);

-- Abuse prevention actions indexes
CREATE INDEX IF NOT EXISTS idx_abuse_actions_user ON abuse_prevention_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_actions_type ON abuse_prevention_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_abuse_actions_active ON abuse_prevention_actions(is_active);

-- ============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_address_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_linking_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_account_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_abuse_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_similarity_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_prevention_actions ENABLE ROW LEVEL SECURITY;

-- Device fingerprints policies
CREATE POLICY "Users can view their own device fingerprints" 
ON user_device_fingerprints FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage device fingerprints" 
ON user_device_fingerprints FOR ALL 
USING (auth.role() = 'service_role');

-- IP tracking policies
CREATE POLICY "Users can view their own IP tracking" 
ON ip_address_tracking FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage IP tracking" 
ON ip_address_tracking FOR ALL 
USING (auth.role() = 'service_role');

-- Account linking policies
CREATE POLICY "Users can view their own account linking evidence" 
ON account_linking_evidence FOR SELECT 
USING (auth.uid() = primary_user_id OR auth.uid() = linked_user_id);

CREATE POLICY "Only admins can manage account linking" 
ON account_linking_evidence FOR ALL 
USING (auth.role() = 'service_role');

-- Suspicious patterns policies
CREATE POLICY "Users can view their own suspicious patterns" 
ON suspicious_account_patterns FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage suspicious patterns" 
ON suspicious_account_patterns FOR ALL 
USING (auth.role() = 'service_role');

-- Upload abuse policies
CREATE POLICY "Users can view their own upload abuse tracking" 
ON upload_abuse_tracking FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage upload abuse tracking" 
ON upload_abuse_tracking FOR ALL 
USING (auth.role() = 'service_role');

-- Content similarity policies
CREATE POLICY "Users can view content similarity for their content" 
ON content_similarity_detection FOR SELECT 
USING (
    content_id IN (
        SELECT id FROM audio_tracks WHERE creator_id = auth.uid()
        UNION
        SELECT id FROM events WHERE creator_id = auth.uid()
    )
);

CREATE POLICY "Only admins can manage content similarity" 
ON content_similarity_detection FOR ALL 
USING (auth.role() = 'service_role');

-- Risk scores policies
CREATE POLICY "Users can view their own risk scores" 
ON user_risk_scores FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage risk scores" 
ON user_risk_scores FOR ALL 
USING (auth.role() = 'service_role');

-- Fraud detection rules policies
CREATE POLICY "Only admins can manage fraud detection rules" 
ON fraud_detection_rules FOR ALL 
USING (auth.role() = 'service_role');

-- Abuse prevention actions policies
CREATE POLICY "Users can view their own abuse prevention actions" 
ON abuse_prevention_actions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage abuse prevention actions" 
ON abuse_prevention_actions FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================
-- 9. INITIAL FRAUD DETECTION RULES
-- ============================================

-- Insert initial fraud detection rules
INSERT INTO fraud_detection_rules (rule_name, rule_description, rule_type, rule_conditions, risk_weight) VALUES
-- Account creation rules
('Multiple accounts same IP', 'Multiple accounts created from same IP address within 24 hours', 'account_creation', 
 '{"time_window_hours": 24, "max_accounts_per_ip": 3, "check_period_days": 7}', 0.8),

('Similar email domains', 'Multiple accounts with similar email domains', 'account_creation',
 '{"similarity_threshold": 0.7, "max_similar_domains": 2}', 0.6),

('Rapid account creation', 'Account created immediately after another account deletion', 'account_creation',
 '{"time_window_minutes": 30, "check_deleted_accounts": true}', 0.7),

-- Upload behavior rules
('Rapid uploads after signup', 'Multiple uploads within 1 hour of account creation', 'upload_behavior',
 '{"time_window_hours": 1, "max_uploads": 2, "check_new_accounts": true}', 0.5),

('Free tier abuse pattern', 'User consistently hits free tier limit and creates new account', 'upload_behavior',
 '{"check_account_linking": true, "free_tier_abuse_threshold": 0.8}', 0.9),

('Duplicate content uploads', 'Same or very similar content uploaded by different accounts', 'content_behavior',
 '{"similarity_threshold": 0.8, "check_metadata": true, "check_audio_fingerprint": true}', 0.7),

-- Device behavior rules
('Multiple devices same user', 'Same user accessing from multiple devices frequently', 'device_behavior',
 '{"max_devices_per_user": 5, "check_frequency": "daily"}', 0.4),

('Suspicious device fingerprint', 'Device fingerprint matches known suspicious patterns', 'device_behavior',
 '{"check_vpn": true, "check_proxy": true, "check_tor": true}', 0.6),

-- IP behavior rules
('High-risk IP address', 'IP address flagged as high-risk (VPN, proxy, Tor)', 'ip_behavior',
 '{"check_vpn": true, "check_proxy": true, "check_tor": true, "check_blacklist": true}', 0.8),

('Geographic inconsistency', 'IP address location inconsistent with user profile', 'ip_behavior',
 '{"check_country_mismatch": true, "check_city_mismatch": true}', 0.5);

-- ============================================
-- 10. TRIGGERS FOR AUTOMATIC DETECTION
-- ============================================

-- Trigger to detect account linking on user creation
CREATE OR REPLACE FUNCTION detect_account_linking_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    existing_user_id UUID;
    evidence_count INTEGER;
BEGIN
    -- Check for existing users with same IP
    SELECT user_id INTO existing_user_id
    FROM ip_address_tracking
    WHERE ip_address = NEW.ip_address
    AND user_id != NEW.user_id
    AND first_seen > NOW() - INTERVAL '7 days'
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        -- Create account linking evidence
        INSERT INTO account_linking_evidence (
            primary_user_id, linked_user_id, evidence_type, 
            evidence_strength, evidence_details, confidence_score
        ) VALUES (
            existing_user_id, NEW.user_id, 'same_ip',
            0.7, jsonb_build_object('ip_address', NEW.ip_address, 'detected_at', NOW()),
            0.7
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_detect_account_linking_on_signup
    AFTER INSERT ON ip_address_tracking
    FOR EACH ROW
    EXECUTE FUNCTION detect_account_linking_on_signup();

-- Trigger to detect suspicious upload patterns
CREATE OR REPLACE FUNCTION detect_suspicious_upload_patterns()
RETURNS TRIGGER AS $$
DECLARE
    user_created_at TIMESTAMPTZ;
    upload_count INTEGER;
    time_since_signup INTERVAL;
BEGIN
    -- Get user creation time
    SELECT created_at INTO user_created_at
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Calculate time since signup
    time_since_signup := NOW() - user_created_at;
    
    -- If user uploaded within 1 hour of signup
    IF time_since_signup < INTERVAL '1 hour' THEN
        -- Count uploads in first hour
        SELECT COUNT(*) INTO upload_count
        FROM upload_validation_logs
        WHERE user_id = NEW.user_id
        AND created_at <= user_created_at + INTERVAL '1 hour'
        AND validation_status = 'success';
        
        -- If more than 2 uploads in first hour, flag as suspicious
        IF upload_count > 2 THEN
            INSERT INTO suspicious_account_patterns (
                user_id, pattern_type, pattern_score, pattern_details
            ) VALUES (
                NEW.user_id, 'upload_immediately',
                0.8, jsonb_build_object(
                    'upload_count', upload_count,
                    'time_since_signup', EXTRACT(EPOCH FROM time_since_signup),
                    'detected_at', NOW()
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_detect_suspicious_upload_patterns
    AFTER INSERT ON upload_validation_logs
    FOR EACH ROW
    WHEN (NEW.validation_status = 'success')
    EXECUTE FUNCTION detect_suspicious_upload_patterns();

-- ============================================
-- 11. COMMENTS AND DOCUMENTATION
-- ============================================

COMMENT ON TABLE user_device_fingerprints IS 'Tracks device fingerprints to detect multiple accounts from same device';
COMMENT ON TABLE ip_address_tracking IS 'Tracks IP addresses and their risk scores to detect abuse';
COMMENT ON TABLE account_linking_evidence IS 'Evidence of potential account linking for abuse prevention';
COMMENT ON TABLE suspicious_account_patterns IS 'Detected suspicious patterns in user behavior';
COMMENT ON TABLE upload_abuse_tracking IS 'Tracks upload abuse and violations';
COMMENT ON TABLE content_similarity_detection IS 'Detects similar content across different accounts';
COMMENT ON TABLE user_risk_scores IS 'Comprehensive risk scoring for each user';
COMMENT ON TABLE fraud_detection_rules IS 'Configurable rules for fraud detection';
COMMENT ON TABLE abuse_prevention_actions IS 'Actions taken against abusive users';

COMMENT ON FUNCTION calculate_user_risk_score IS 'Calculates comprehensive risk score for a user';
COMMENT ON FUNCTION detect_account_linking IS 'Detects potentially linked accounts';
COMMENT ON FUNCTION can_user_upload_with_abuse_check IS 'Checks if user can upload with abuse prevention';

-- ============================================
-- SCHEMA COMPLETE
-- ============================================

-- This schema provides comprehensive abuse prevention measures to prevent
-- users from creating multiple accounts to bypass free tier limits.
-- 
-- Key Features:
-- - Device fingerprinting and IP tracking
-- - Account linking detection
-- - Suspicious behavior pattern detection
-- - Content similarity analysis
-- - Risk scoring and fraud detection
-- - Automated abuse prevention actions
-- - Row-level security policies
-- - Performance-optimized indexes
-- 
-- Next Steps:
-- 1. Run this schema in Supabase SQL Editor
-- 2. Implement API endpoints for abuse detection
-- 3. Create admin dashboard for abuse management
-- 4. Test abuse prevention measures
