-- ============================================
-- PERSISTENT USER MEMORY SYSTEM - DATABASE SCHEMA
-- ============================================
-- This schema implements persistent user memory to prevent abuse
-- through account deletion and recreation to reset free tier status
-- Date: January 2025
-- Status: Ready to execute
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PERSISTENT USER IDENTIFIERS
-- ============================================

-- Persistent user identifiers table (survives account deletion)
CREATE TABLE IF NOT EXISTS persistent_user_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    persistent_id VARCHAR(255) UNIQUE NOT NULL, -- Generated persistent identifier
    device_fingerprint VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    email_hash VARCHAR(255) NOT NULL, -- Hashed email for privacy
    phone_hash VARCHAR(255), -- Hashed phone for privacy
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique combination of device and IP
    UNIQUE(device_fingerprint, ip_address)
);

-- User subscription history (survives account deletion)
CREATE TABLE IF NOT EXISTS persistent_subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persistent_id VARCHAR(255) REFERENCES persistent_user_identifiers(persistent_id) ON DELETE CASCADE,
    subscription_tier VARCHAR(20) NOT NULL CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_status VARCHAR(20) NOT NULL CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    payment_method VARCHAR(50),
    amount_paid DECIMAL(10,2) DEFAULT 0,
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User upload history (survives account deletion)
CREATE TABLE IF NOT EXISTS persistent_upload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persistent_id VARCHAR(255) REFERENCES persistent_user_identifiers(persistent_id) ON DELETE CASCADE,
    upload_type VARCHAR(20) NOT NULL CHECK (upload_type IN ('audio', 'podcast', 'event')),
    upload_count INTEGER DEFAULT 0,
    total_storage_used BIGINT DEFAULT 0,
    first_upload_date TIMESTAMPTZ,
    last_upload_date TIMESTAMPTZ,
    free_tier_exhausted BOOLEAN DEFAULT false,
    free_tier_exhausted_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User abuse history (survives account deletion)
CREATE TABLE IF NOT EXISTS persistent_abuse_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persistent_id VARCHAR(255) REFERENCES persistent_user_identifiers(persistent_id) ON DELETE CASCADE,
    abuse_type VARCHAR(50) NOT NULL CHECK (abuse_type IN (
        'account_deletion_abuse', 'free_tier_abuse', 'subscription_abuse',
        'upload_abuse', 'payment_abuse', 'verification_abuse'
    )),
    abuse_score DECIMAL(3,2) NOT NULL CHECK (abuse_score >= 0 AND abuse_score <= 1),
    abuse_details JSONB NOT NULL,
    action_taken VARCHAR(50) CHECK (action_taken IN (
        'none', 'flagged', 'restricted', 'banned', 'verified'
    )),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USER RECONSTRUCTION DETECTION
-- ============================================

-- User reconstruction attempts table
CREATE TABLE IF NOT EXISTS user_reconstruction_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persistent_id VARCHAR(255) REFERENCES persistent_user_identifiers(persistent_id) ON DELETE CASCADE,
    new_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    detection_method VARCHAR(50) NOT NULL CHECK (detection_method IN (
        'device_fingerprint', 'ip_address', 'email_similarity', 'phone_similarity',
        'behavioral_pattern', 'content_similarity', 'payment_method'
    )),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detection_details JSONB NOT NULL,
    is_confirmed BOOLEAN DEFAULT false,
    confirmed_by UUID REFERENCES profiles(id),
    confirmed_at TIMESTAMPTZ,
    action_taken VARCHAR(50) CHECK (action_taken IN (
        'none', 'flagged', 'restricted', 'banned', 'verified', 'merged'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PERSISTENT USER STATUS TRACKING
-- ============================================

-- Persistent user status table
CREATE TABLE IF NOT EXISTS persistent_user_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persistent_id VARCHAR(255) REFERENCES persistent_user_identifiers(persistent_id) ON DELETE CASCADE UNIQUE,
    current_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (current_status IN (
        'active', 'suspended', 'banned', 'flagged', 'verified'
    )),
    free_tier_used BOOLEAN DEFAULT false,
    free_tier_exhausted_date TIMESTAMPTZ,
    last_subscription_tier VARCHAR(20),
    last_subscription_end_date TIMESTAMPTZ,
    total_abuse_score DECIMAL(3,2) DEFAULT 0,
    reconstruction_attempts INTEGER DEFAULT 0,
    is_high_risk BOOLEAN DEFAULT false,
    verification_required BOOLEAN DEFAULT false,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function to generate persistent user ID
CREATE OR REPLACE FUNCTION generate_persistent_user_id()
RETURNS VARCHAR(255) AS $$
DECLARE
    persistent_id VARCHAR(255);
BEGIN
    -- Generate a unique persistent ID based on timestamp and random
    persistent_id := 'PUI_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
                    LPAD((RANDOM() * 1000000)::INTEGER::TEXT, 6, '0');
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM persistent_user_identifiers WHERE persistent_id = persistent_id) LOOP
        persistent_id := 'PUI_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
                        LPAD((RANDOM() * 1000000)::INTEGER::TEXT, 6, '0');
    END LOOP;
    
    RETURN persistent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to hash sensitive data
CREATE OR REPLACE FUNCTION hash_sensitive_data(data TEXT)
RETURNS VARCHAR(255) AS $$
BEGIN
    -- Simple hash function - in production, use proper crypto
    RETURN 'HASH_' || MD5(COALESCE(data, '') || 'salt_key_2025');
END;
$$ LANGUAGE plpgsql;

-- Function to detect user reconstruction
CREATE OR REPLACE FUNCTION detect_user_reconstruction(new_user_id UUID)
RETURNS TABLE (
    persistent_id VARCHAR(255),
    confidence_score DECIMAL(3,2),
    detection_method VARCHAR(50),
    previous_status VARCHAR(20),
    free_tier_used BOOLEAN,
    abuse_score DECIMAL(3,2)
) AS $$
DECLARE
    device_fp VARCHAR(255);
    ip_addr INET;
    email_hash VARCHAR(255);
    phone_hash VARCHAR(255);
BEGIN
    -- Get new user's identifiers
    SELECT 
        df.device_fingerprint,
        iat.ip_address,
        hash_sensitive_data(p.email),
        hash_sensitive_data(p.phone)
    INTO device_fp, ip_addr, email_hash, phone_hash
    FROM user_device_fingerprints df
    JOIN ip_address_tracking iat ON iat.user_id = df.user_id
    JOIN profiles p ON p.id = df.user_id
    WHERE df.user_id = new_user_id
    ORDER BY df.created_at DESC
    LIMIT 1;
    
    -- Check for matches in persistent identifiers
    RETURN QUERY
    SELECT 
        pui.persistent_id,
        CASE 
            WHEN pui.device_fingerprint = device_fp AND pui.ip_address = ip_addr THEN 0.9
            WHEN pui.device_fingerprint = device_fp THEN 0.7
            WHEN pui.ip_address = ip_addr THEN 0.6
            WHEN pui.email_hash = email_hash THEN 0.8
            WHEN pui.phone_hash = phone_hash THEN 0.8
            ELSE 0.3
        END as confidence_score,
        CASE 
            WHEN pui.device_fingerprint = device_fp AND pui.ip_address = ip_addr THEN 'device_fingerprint'
            WHEN pui.device_fingerprint = device_fp THEN 'device_fingerprint'
            WHEN pui.ip_address = ip_addr THEN 'ip_address'
            WHEN pui.email_hash = email_hash THEN 'email_similarity'
            WHEN pui.phone_hash = phone_hash THEN 'phone_similarity'
            ELSE 'behavioral_pattern'
        END as detection_method,
        pus.current_status,
        pus.free_tier_used,
        pus.total_abuse_score
    FROM persistent_user_identifiers pui
    JOIN persistent_user_status pus ON pus.persistent_id = pui.persistent_id
    WHERE (pui.device_fingerprint = device_fp OR pui.ip_address = ip_addr OR 
           pui.email_hash = email_hash OR pui.phone_hash = phone_hash)
    AND pus.current_status != 'banned'
    ORDER BY confidence_score DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can use free tier
CREATE OR REPLACE FUNCTION can_user_use_free_tier_with_memory(user_uuid UUID)
RETURNS TABLE (
    can_use_free_tier BOOLEAN,
    reason TEXT,
    persistent_id VARCHAR(255),
    previous_tier VARCHAR(20),
    free_tier_used BOOLEAN,
    abuse_score DECIMAL(3,2)
) AS $$
DECLARE
    persistent_id VARCHAR(255);
    user_status VARCHAR(20);
    free_tier_used BOOLEAN;
    abuse_score DECIMAL(3,2);
    last_tier VARCHAR(20);
BEGIN
    -- Check if user is a reconstruction
    SELECT 
        pui.persistent_id,
        pus.current_status,
        pus.free_tier_used,
        pus.total_abuse_score,
        pus.last_subscription_tier
    INTO persistent_id, user_status, free_tier_used, abuse_score, last_tier
    FROM detect_user_reconstruction(user_uuid) dr
    JOIN persistent_user_identifiers pui ON pui.persistent_id = dr.persistent_id
    JOIN persistent_user_status pus ON pus.persistent_id = pui.persistent_id
    WHERE dr.confidence_score >= 0.7
    LIMIT 1;
    
    -- If no reconstruction detected, allow free tier
    IF persistent_id IS NULL THEN
        RETURN QUERY SELECT true, 'New user - free tier available', NULL::VARCHAR(255), NULL::VARCHAR(20), false, 0.0;
        RETURN;
    END IF;
    
    -- If user is banned, deny
    IF user_status = 'banned' THEN
        RETURN QUERY SELECT false, 'User previously banned', persistent_id, last_tier, free_tier_used, abuse_score;
        RETURN;
    END IF;
    
    -- If free tier already used, deny
    IF free_tier_used THEN
        RETURN QUERY SELECT false, 'Free tier already used by this user', persistent_id, last_tier, free_tier_used, abuse_score;
        RETURN;
    END IF;
    
    -- If high abuse score, require verification
    IF abuse_score >= 0.7 THEN
        RETURN QUERY SELECT false, 'High abuse score - verification required', persistent_id, last_tier, free_tier_used, abuse_score;
        RETURN;
    END IF;
    
    -- Allow free tier with monitoring
    RETURN QUERY SELECT true, 'Free tier available with monitoring', persistent_id, last_tier, free_tier_used, abuse_score;
END;
$$ LANGUAGE plpgsql;

-- Function to create persistent user record
CREATE OR REPLACE FUNCTION create_persistent_user_record(user_uuid UUID)
RETURNS VARCHAR(255) AS $$
DECLARE
    persistent_id VARCHAR(255);
    device_fp VARCHAR(255);
    ip_addr INET;
    email_hash VARCHAR(255);
    phone_hash VARCHAR(255);
BEGIN
    -- Generate persistent ID
    persistent_id := generate_persistent_user_id();
    
    -- Get user identifiers
    SELECT 
        df.device_fingerprint,
        iat.ip_address,
        hash_sensitive_data(p.email),
        hash_sensitive_data(p.phone)
    INTO device_fp, ip_addr, email_hash, phone_hash
    FROM user_device_fingerprints df
    JOIN ip_address_tracking iat ON iat.user_id = df.user_id
    JOIN profiles p ON p.id = df.user_id
    WHERE df.user_id = user_uuid
    ORDER BY df.created_at DESC
    LIMIT 1;
    
    -- Insert persistent identifier
    INSERT INTO persistent_user_identifiers (
        persistent_id, user_id, device_fingerprint, ip_address, email_hash, phone_hash
    ) VALUES (
        persistent_id, user_uuid, device_fp, ip_addr, email_hash, phone_hash
    );
    
    -- Insert persistent status
    INSERT INTO persistent_user_status (
        persistent_id, current_status, free_tier_used, last_activity
    ) VALUES (
        persistent_id, 'active', false, NOW()
    );
    
    RETURN persistent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. TRIGGERS FOR AUTOMATIC DETECTION
-- ============================================

-- Trigger to detect user reconstruction on signup
CREATE OR REPLACE FUNCTION detect_user_reconstruction_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    reconstruction_data RECORD;
    persistent_id VARCHAR(255);
BEGIN
    -- Check for reconstruction
    SELECT * INTO reconstruction_data
    FROM detect_user_reconstruction(NEW.id)
    WHERE confidence_score >= 0.7
    LIMIT 1;
    
    IF reconstruction_data.persistent_id IS NOT NULL THEN
        -- Record reconstruction attempt
        INSERT INTO user_reconstruction_attempts (
            persistent_id, new_user_id, detection_method, confidence_score,
            detection_details, action_taken
        ) VALUES (
            reconstruction_data.persistent_id, NEW.id, reconstruction_data.detection_method,
            reconstruction_data.confidence_score, 
            jsonb_build_object(
                'detected_at', NOW(),
                'previous_status', reconstruction_data.previous_status,
                'free_tier_used', reconstruction_data.free_tier_used,
                'abuse_score', reconstruction_data.abuse_score
            ),
            'flagged'
        );
        
        -- Update reconstruction count
        UPDATE persistent_user_status 
        SET reconstruction_attempts = reconstruction_attempts + 1,
            updated_at = NOW()
        WHERE persistent_id = reconstruction_data.persistent_id;
    ELSE
        -- Create new persistent record
        persistent_id := create_persistent_user_record(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_detect_user_reconstruction_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION detect_user_reconstruction_on_signup();

-- Trigger to update persistent status on account deletion
CREATE OR REPLACE FUNCTION update_persistent_status_on_deletion()
RETURNS TRIGGER AS $$
DECLARE
    persistent_id VARCHAR(255);
BEGIN
    -- Get persistent ID
    SELECT pui.persistent_id INTO persistent_id
    FROM persistent_user_identifiers pui
    WHERE pui.user_id = OLD.id;
    
    IF persistent_id IS NOT NULL THEN
        -- Update persistent status to track deletion
        UPDATE persistent_user_status 
        SET 
            current_status = 'suspended',
            last_activity = NOW(),
            updated_at = NOW()
        WHERE persistent_id = persistent_id;
        
        -- Record abuse if suspicious deletion pattern
        INSERT INTO persistent_abuse_history (
            persistent_id, abuse_type, abuse_score, abuse_details, action_taken
        ) VALUES (
            persistent_id, 'account_deletion_abuse', 0.6,
            jsonb_build_object(
                'deleted_at', NOW(),
                'deletion_reason', 'user_initiated',
                'suspicious_pattern', 'potential_free_tier_reset'
            ),
            'flagged'
        );
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_persistent_status_on_deletion
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION update_persistent_status_on_deletion();

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================

-- Persistent identifiers indexes
CREATE INDEX IF NOT EXISTS idx_persistent_identifiers_device ON persistent_user_identifiers(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_persistent_identifiers_ip ON persistent_user_identifiers(ip_address);
CREATE INDEX IF NOT EXISTS idx_persistent_identifiers_email ON persistent_user_identifiers(email_hash);
CREATE INDEX IF NOT EXISTS idx_persistent_identifiers_phone ON persistent_user_identifiers(phone_hash);
CREATE INDEX IF NOT EXISTS idx_persistent_identifiers_user ON persistent_user_identifiers(user_id);

-- Subscription history indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_persistent ON persistent_subscription_history(persistent_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_tier ON persistent_subscription_history(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_subscription_history_status ON persistent_subscription_history(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_dates ON persistent_subscription_history(start_date, end_date);

-- Upload history indexes
CREATE INDEX IF NOT EXISTS idx_upload_history_persistent ON persistent_upload_history(persistent_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_type ON persistent_upload_history(upload_type);
CREATE INDEX IF NOT EXISTS idx_upload_history_exhausted ON persistent_upload_history(free_tier_exhausted);

-- Abuse history indexes
CREATE INDEX IF NOT EXISTS idx_abuse_history_persistent ON persistent_abuse_history(persistent_id);
CREATE INDEX IF NOT EXISTS idx_abuse_history_type ON persistent_abuse_history(abuse_type);
CREATE INDEX IF NOT EXISTS idx_abuse_history_resolved ON persistent_abuse_history(is_resolved);

-- Reconstruction attempts indexes
CREATE INDEX IF NOT EXISTS idx_reconstruction_persistent ON user_reconstruction_attempts(persistent_id);
CREATE INDEX IF NOT EXISTS idx_reconstruction_user ON user_reconstruction_attempts(new_user_id);
CREATE INDEX IF NOT EXISTS idx_reconstruction_method ON user_reconstruction_attempts(detection_method);
CREATE INDEX IF NOT EXISTS idx_reconstruction_confirmed ON user_reconstruction_attempts(is_confirmed);

-- User status indexes
CREATE INDEX IF NOT EXISTS idx_user_status_persistent ON persistent_user_status(persistent_id);
CREATE INDEX IF NOT EXISTS idx_user_status_status ON persistent_user_status(current_status);
CREATE INDEX IF NOT EXISTS idx_user_status_free_tier ON persistent_user_status(free_tier_used);
CREATE INDEX IF NOT EXISTS idx_user_status_high_risk ON persistent_user_status(is_high_risk);

-- ============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE persistent_user_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE persistent_subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE persistent_upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE persistent_abuse_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reconstruction_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE persistent_user_status ENABLE ROW LEVEL SECURITY;

-- Persistent identifiers policies
CREATE POLICY "Users can view their own persistent identifiers" 
ON persistent_user_identifiers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage persistent identifiers" 
ON persistent_user_identifiers FOR ALL 
USING (auth.role() = 'service_role');

-- Subscription history policies
CREATE POLICY "Users can view their own subscription history" 
ON persistent_subscription_history FOR SELECT 
USING (
    persistent_id IN (
        SELECT persistent_id FROM persistent_user_identifiers WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Only admins can manage subscription history" 
ON persistent_subscription_history FOR ALL 
USING (auth.role() = 'service_role');

-- Upload history policies
CREATE POLICY "Users can view their own upload history" 
ON persistent_upload_history FOR SELECT 
USING (
    persistent_id IN (
        SELECT persistent_id FROM persistent_user_identifiers WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Only admins can manage upload history" 
ON persistent_upload_history FOR ALL 
USING (auth.role() = 'service_role');

-- Abuse history policies
CREATE POLICY "Users can view their own abuse history" 
ON persistent_abuse_history FOR SELECT 
USING (
    persistent_id IN (
        SELECT persistent_id FROM persistent_user_identifiers WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Only admins can manage abuse history" 
ON persistent_abuse_history FOR ALL 
USING (auth.role() = 'service_role');

-- Reconstruction attempts policies
CREATE POLICY "Users can view their own reconstruction attempts" 
ON user_reconstruction_attempts FOR SELECT 
USING (auth.uid() = new_user_id);

CREATE POLICY "Only admins can manage reconstruction attempts" 
ON user_reconstruction_attempts FOR ALL 
USING (auth.role() = 'service_role');

-- User status policies
CREATE POLICY "Users can view their own status" 
ON persistent_user_status FOR SELECT 
USING (
    persistent_id IN (
        SELECT persistent_id FROM persistent_user_identifiers WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Only admins can manage user status" 
ON persistent_user_status FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================
-- 8. COMMENTS AND DOCUMENTATION
-- ============================================

COMMENT ON TABLE persistent_user_identifiers IS 'Persistent user identifiers that survive account deletion';
COMMENT ON TABLE persistent_subscription_history IS 'User subscription history across account recreations';
COMMENT ON TABLE persistent_upload_history IS 'User upload history and free tier usage tracking';
COMMENT ON TABLE persistent_abuse_history IS 'User abuse history and violations tracking';
COMMENT ON TABLE user_reconstruction_attempts IS 'Detection of user account reconstruction attempts';
COMMENT ON TABLE persistent_user_status IS 'Current status of persistent users';

COMMENT ON FUNCTION generate_persistent_user_id IS 'Generates unique persistent user identifier';
COMMENT ON FUNCTION hash_sensitive_data IS 'Hashes sensitive data for privacy';
COMMENT ON FUNCTION detect_user_reconstruction IS 'Detects if new user is reconstruction of previous user';
COMMENT ON FUNCTION can_user_use_free_tier_with_memory IS 'Checks if user can use free tier considering persistent memory';
COMMENT ON FUNCTION create_persistent_user_record IS 'Creates persistent user record for new user';

-- ============================================
-- SCHEMA COMPLETE
-- ============================================

-- This schema provides persistent user memory to prevent abuse
-- through account deletion and recreation to reset free tier status.
-- 
-- Key Features:
-- - Persistent user identifiers that survive account deletion
-- - Subscription and upload history tracking
-- - User reconstruction detection
-- - Free tier usage memory
-- - Abuse history tracking
-- - Automated detection triggers
-- - Row-level security policies
-- - Performance-optimized indexes
-- 
-- Next Steps:
-- 1. Run this schema in Supabase SQL Editor
-- 2. Update upload validation to use persistent memory
-- 3. Test user reconstruction detection
-- 4. Monitor abuse prevention effectiveness
