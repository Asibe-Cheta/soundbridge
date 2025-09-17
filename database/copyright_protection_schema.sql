-- Copyright Protection System Database Schema
-- Includes DMCA takedown system, user reporting, and content flagging

-- DMCA Takedown Requests Table
CREATE TABLE dmca_takedown_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('takedown', 'counter_notice')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'withdrawn')),
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Complainant Information
    complainant_name VARCHAR(255) NOT NULL,
    complainant_email VARCHAR(255) NOT NULL,
    complainant_phone VARCHAR(50),
    complainant_address TEXT,
    complainant_type VARCHAR(20) NOT NULL CHECK (complainant_type IN ('copyright_owner', 'authorized_agent', 'legal_representative')),
    
    -- Content Information
    content_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    content_title VARCHAR(500),
    content_url TEXT,
    infringing_urls TEXT[], -- Array of URLs where content appears
    
    -- Copyright Information
    copyrighted_work_title VARCHAR(500) NOT NULL,
    copyrighted_work_author VARCHAR(255) NOT NULL,
    copyrighted_work_copyright_owner VARCHAR(255) NOT NULL,
    copyrighted_work_registration_number VARCHAR(100),
    copyrighted_work_date_created DATE,
    
    -- Legal Information
    good_faith_belief BOOLEAN NOT NULL DEFAULT false,
    accuracy_statement BOOLEAN NOT NULL DEFAULT false,
    perjury_penalty BOOLEAN NOT NULL DEFAULT false,
    authorized_agent BOOLEAN NOT NULL DEFAULT false,
    
    -- Request Details
    description TEXT NOT NULL,
    evidence_urls TEXT[], -- URLs to supporting evidence
    attachments TEXT[], -- File paths to uploaded documents
    
    -- Processing Information
    assigned_to UUID REFERENCES profiles(id),
    processing_notes TEXT,
    resolution_notes TEXT,
    action_taken VARCHAR(100), -- 'takedown', 'rejected', 'counter_notice_received', etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE -- For counter-notice deadlines
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    legal_review_required BOOLEAN DEFAULT false,
    escalation_level INTEGER DEFAULT 0
);

-- User Content Reports Table
CREATE TABLE content_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'copyright_infringement', 'spam', 'inappropriate_content', 
        'harassment', 'fake_content', 'unauthorized_use', 'other'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed', 'escalated')),
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Reporter Information
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reporter_email VARCHAR(255),
    reporter_name VARCHAR(255),
    reporter_type VARCHAR(20) DEFAULT 'user' CHECK (reporter_type IN ('user', 'anonymous', 'copyright_owner', 'authorized_agent')),
    
    -- Content Information
    content_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('track', 'profile', 'comment', 'playlist')),
    content_title VARCHAR(500),
    content_url TEXT,
    
    -- Report Details
    reason TEXT NOT NULL,
    description TEXT,
    evidence_urls TEXT[],
    additional_info TEXT,
    
    -- Copyright Specific Fields (if applicable)
    copyrighted_work_title VARCHAR(500),
    copyrighted_work_owner VARCHAR(255),
    copyright_evidence TEXT,
    
    -- Processing Information
    assigned_to UUID REFERENCES profiles(id),
    review_notes TEXT,
    resolution_notes TEXT,
    action_taken VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    auto_flagged BOOLEAN DEFAULT false,
    requires_legal_review BOOLEAN DEFAULT false
);

-- Content Flags Table (for internal flagging system)
CREATE TABLE content_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flag_type VARCHAR(50) NOT NULL CHECK (flag_type IN (
        'copyright_suspected', 'low_quality', 'spam_suspected', 
        'inappropriate', 'fake_metadata', 'duplicate_content', 'other'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'escalated')),
    confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Content Information
    content_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL,
    
    -- Flag Details
    reason TEXT NOT NULL,
    evidence JSONB DEFAULT '{}',
    auto_generated BOOLEAN DEFAULT false,
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'automated', 'user_report', 'system_analysis')),
    
    -- Processing Information
    flagged_by UUID REFERENCES profiles(id),
    reviewed_by UUID REFERENCES profiles(id),
    review_notes TEXT,
    action_taken VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Legal Compliance Log Table
CREATE TABLE legal_compliance_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'dmca_takedown', 'content_removal', 'user_suspension', 
        'account_termination', 'legal_notice_sent', 'counter_notice_received',
        'evidence_collected', 'legal_review_completed'
    )),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('user', 'content', 'dmca_request', 'report')),
    entity_id UUID NOT NULL,
    
    -- Action Details
    action_description TEXT NOT NULL,
    performed_by UUID REFERENCES profiles(id),
    automated BOOLEAN DEFAULT false,
    
    -- Legal Information
    legal_basis VARCHAR(100), -- 'DMCA', 'Terms of Service', 'Copyright Law', etc.
    jurisdiction VARCHAR(100),
    compliance_standard VARCHAR(100),
    
    -- Evidence and Documentation
    evidence_urls TEXT[],
    documentation_urls TEXT[],
    legal_references TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    audit_trail JSONB DEFAULT '{}'
);

-- Admin Review Queue Table
CREATE TABLE admin_review_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    queue_type VARCHAR(30) NOT NULL CHECK (queue_type IN ('dmca', 'content_report', 'content_flag', 'escalated_issue')),
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'completed', 'escalated')),
    
    -- Reference Information
    reference_type VARCHAR(20) NOT NULL, -- 'dmca_takedown_requests', 'content_reports', etc.
    reference_id UUID NOT NULL,
    
    -- Assignment Information
    assigned_to UUID REFERENCES profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID REFERENCES profiles(id),
    
    -- Review Information
    review_notes TEXT,
    resolution TEXT,
    action_taken VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    escalation_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX idx_dmca_takedown_requests_status ON dmca_takedown_requests(status);
CREATE INDEX idx_dmca_takedown_requests_priority ON dmca_takedown_requests(priority);
CREATE INDEX idx_dmca_takedown_requests_created_at ON dmca_takedown_requests(created_at);
CREATE INDEX idx_dmca_takedown_requests_content_id ON dmca_takedown_requests(content_id);

CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_type ON content_reports(report_type);
CREATE INDEX idx_content_reports_content_id ON content_reports(content_id);
CREATE INDEX idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX idx_content_reports_created_at ON content_reports(created_at);

CREATE INDEX idx_content_flags_status ON content_flags(status);
CREATE INDEX idx_content_flags_type ON content_flags(flag_type);
CREATE INDEX idx_content_flags_content_id ON content_flags(content_id);
CREATE INDEX idx_content_flags_confidence_score ON content_flags(confidence_score);

CREATE INDEX idx_legal_compliance_log_action_type ON legal_compliance_log(action_type);
CREATE INDEX idx_legal_compliance_log_entity_type ON legal_compliance_log(entity_type);
CREATE INDEX idx_legal_compliance_log_entity_id ON legal_compliance_log(entity_id);
CREATE INDEX idx_legal_compliance_log_created_at ON legal_compliance_log(created_at);

CREATE INDEX idx_admin_review_queue_status ON admin_review_queue(status);
CREATE INDEX idx_admin_review_queue_priority ON admin_review_queue(priority);
CREATE INDEX idx_admin_review_queue_type ON admin_review_queue(queue_type);
CREATE INDEX idx_admin_review_queue_assigned_to ON admin_review_queue(assigned_to);

-- Enable Row Level Security (RLS)
ALTER TABLE dmca_takedown_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_compliance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_review_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for DMCA Takedown Requests
CREATE POLICY "Admin can manage all DMCA requests" ON dmca_takedown_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'legal_admin', 'moderator')
        )
    );

CREATE POLICY "Users can view their own DMCA requests" ON dmca_takedown_requests
    FOR SELECT USING (
        complainant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- RLS Policies for Content Reports
CREATE POLICY "Users can create content reports" ON content_reports
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own reports" ON content_reports
    FOR SELECT USING (
        reporter_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'legal_admin', 'moderator')
        )
    );

CREATE POLICY "Admin can manage all content reports" ON content_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'legal_admin', 'moderator')
        )
    );

-- RLS Policies for Content Flags
CREATE POLICY "Admin can manage all content flags" ON content_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'legal_admin', 'moderator')
        )
    );

-- RLS Policies for Legal Compliance Log
CREATE POLICY "Admin can manage legal compliance log" ON legal_compliance_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'legal_admin')
        )
    );

-- RLS Policies for Admin Review Queue
CREATE POLICY "Admin can manage review queue" ON admin_review_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'legal_admin', 'moderator')
        )
    );

-- Functions for automated processing
CREATE OR REPLACE FUNCTION add_to_review_queue()
RETURNS TRIGGER AS $$
BEGIN
    -- Add DMCA requests to review queue
    IF TG_TABLE_NAME = 'dmca_takedown_requests' THEN
        INSERT INTO admin_review_queue (
            queue_type, priority, status, reference_type, reference_id,
            due_date, metadata
        ) VALUES (
            'dmca', 
            NEW.priority,
            'pending',
            'dmca_takedown_requests',
            NEW.id,
            CASE 
                WHEN NEW.priority = 'urgent' THEN NOW() + INTERVAL '24 hours'
                WHEN NEW.priority = 'high' THEN NOW() + INTERVAL '72 hours'
                ELSE NOW() + INTERVAL '7 days'
            END,
            jsonb_build_object('request_type', NEW.request_type, 'complainant_type', NEW.complainant_type)
        );
    END IF;
    
    -- Add high-priority content reports to review queue
    IF TG_TABLE_NAME = 'content_reports' AND NEW.priority IN ('high', 'urgent') THEN
        INSERT INTO admin_review_queue (
            queue_type, priority, status, reference_type, reference_id,
            due_date, metadata
        ) VALUES (
            'content_report',
            NEW.priority,
            'pending',
            'content_reports',
            NEW.id,
            CASE 
                WHEN NEW.priority = 'urgent' THEN NOW() + INTERVAL '4 hours'
                ELSE NOW() + INTERVAL '24 hours'
            END,
            jsonb_build_object('report_type', NEW.report_type, 'content_type', NEW.content_type)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_add_dmca_to_queue
    AFTER INSERT ON dmca_takedown_requests
    FOR EACH ROW
    EXECUTE FUNCTION add_to_review_queue();

CREATE TRIGGER trigger_add_report_to_queue
    AFTER INSERT ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION add_to_review_queue();

-- Function to log legal compliance actions
CREATE OR REPLACE FUNCTION log_legal_action(
    action_type_param VARCHAR(50),
    entity_type_param VARCHAR(20),
    entity_id_param UUID,
    description_param TEXT,
    performed_by_param UUID DEFAULT NULL,
    legal_basis_param VARCHAR(100) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO legal_compliance_log (
        action_type, entity_type, entity_id, action_description,
        performed_by, legal_basis, created_at
    ) VALUES (
        action_type_param, entity_type_param, entity_id_param, description_param,
        performed_by_param, legal_basis_param, NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically flag suspicious content
CREATE OR REPLACE FUNCTION auto_flag_suspicious_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Flag content with suspicious patterns
    IF NEW.title ~* '.*(free download|leak|unofficial|remix without permission).*' THEN
        INSERT INTO content_flags (
            flag_type, content_id, content_type, reason, evidence,
            auto_generated, source, confidence_score
        ) VALUES (
            'copyright_suspected',
            NEW.id,
            'track',
            'Title contains suspicious keywords indicating potential copyright infringement',
            jsonb_build_object('title', NEW.title, 'keywords_detected', 'free download, leak, unofficial, remix'),
            true,
            'automated',
            0.7
        );
    END IF;
    
    -- Flag content with very generic titles
    IF NEW.title IN ('Untitled', 'Track 1', 'Audio', 'Music', 'Song') THEN
        INSERT INTO content_flags (
            flag_type, content_id, content_type, reason, evidence,
            auto_generated, source, confidence_score
        ) VALUES (
            'fake_metadata',
            NEW.id,
            'track',
            'Generic or placeholder title detected',
            jsonb_build_object('title', NEW.title),
            true,
            'automated',
            0.5
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-flagging
CREATE TRIGGER trigger_auto_flag_content
    AFTER INSERT ON audio_tracks
    FOR EACH ROW
    EXECUTE FUNCTION auto_flag_suspicious_content();
