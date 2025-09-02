/*
  GDPR Compliance Tables Migration
  
  This migration adds tables for GDPR compliance:
  1. Data export requests
  2. Data deletion requests
  3. Consent tracking
  4. Data processing logs
*/

-- =============================================
-- DATA EXPORT REQUESTS
-- =============================================

-- Table for tracking data export requests (GDPR Article 20)
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Request details
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    
    -- Export details
    export_format TEXT DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'pdf')),
    download_url TEXT,
    file_size_bytes BIGINT,
    expires_at TIMESTAMPTZ,
    
    -- Processing metadata
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- DATA DELETION REQUESTS
-- =============================================

-- Table for tracking account deletion requests (GDPR Article 17)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Request details
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_at TIMESTAMPTZ DEFAULT now(),
    scheduled_for TIMESTAMPTZ NOT NULL, -- When deletion will occur
    processed_at TIMESTAMPTZ,
    
    -- Deletion details
    reason TEXT,
    deletion_type TEXT DEFAULT 'full' CHECK (deletion_type IN ('full', 'anonymize', 'partial')),
    grace_period_days INTEGER DEFAULT 30,
    
    -- Cancellation details
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES profiles(id),
    cancellation_reason TEXT,
    
    -- Processing metadata
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CONSENT TRACKING
-- =============================================

-- Table for tracking consent changes over time
CREATE TABLE IF NOT EXISTS consent_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Consent details
    consent_type TEXT NOT NULL CHECK (consent_type IN (
        'data_processing', 'marketing', 'analytics', 'cookies', 
        'third_party_sharing', 'profiling', 'automated_decisions'
    )),
    consent_given BOOLEAN NOT NULL,
    consent_method TEXT CHECK (consent_method IN ('explicit', 'implicit', 'opt_in', 'opt_out')),
    
    -- Context
    consent_source TEXT, -- e.g., 'registration', 'settings_page', 'cookie_banner'
    ip_address INET,
    user_agent TEXT,
    
    -- Legal basis
    legal_basis TEXT CHECK (legal_basis IN (
        'consent', 'contract', 'legal_obligation', 
        'vital_interests', 'public_task', 'legitimate_interests'
    )),
    
    -- Metadata
    consent_text TEXT, -- The actual consent text shown to user
    consent_version TEXT, -- Version of privacy policy/terms
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- DATA PROCESSING LOGS
-- =============================================

-- Table for logging data processing activities (GDPR Article 30)
CREATE TABLE IF NOT EXISTS data_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Processing details
    processing_activity TEXT NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis TEXT NOT NULL CHECK (legal_basis IN (
        'consent', 'contract', 'legal_obligation', 
        'vital_interests', 'public_task', 'legitimate_interests'
    )),
    
    -- Data details
    data_categories TEXT[] DEFAULT '{}', -- e.g., ['personal_identifiers', 'contact_data']
    data_subjects TEXT[] DEFAULT '{}', -- e.g., ['customers', 'employees']
    
    -- Recipients
    recipients TEXT[] DEFAULT '{}', -- Who receives the data
    third_country_transfers BOOLEAN DEFAULT FALSE,
    safeguards TEXT, -- Safeguards for international transfers
    
    -- Retention
    retention_period TEXT,
    deletion_schedule TEXT,
    
    -- Technical and organizational measures
    security_measures TEXT[] DEFAULT '{}',
    
    -- Metadata
    controller_name TEXT,
    processor_name TEXT,
    dpo_contact TEXT, -- Data Protection Officer contact
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- DATA BREACH INCIDENTS
-- =============================================

-- Table for tracking data breach incidents (GDPR Article 33-34)
CREATE TABLE IF NOT EXISTS data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Incident details
    incident_reference TEXT UNIQUE NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN (
        'confidentiality_breach', 'integrity_breach', 'availability_breach'
    )),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Timeline
    discovered_at TIMESTAMPTZ NOT NULL,
    occurred_at TIMESTAMPTZ,
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Impact assessment
    affected_data_subjects_count INTEGER DEFAULT 0,
    data_categories_affected TEXT[] DEFAULT '{}',
    likely_consequences TEXT,
    risk_level TEXT CHECK (risk_level IN ('low', 'high')),
    
    -- Response actions
    containment_measures TEXT,
    recovery_measures TEXT,
    preventive_measures TEXT,
    
    -- Notifications
    supervisory_authority_notified BOOLEAN DEFAULT FALSE,
    authority_notification_date TIMESTAMPTZ,
    data_subjects_notified BOOLEAN DEFAULT FALSE,
    subjects_notification_date TIMESTAMPTZ,
    
    -- Investigation
    root_cause TEXT,
    lessons_learned TEXT,
    
    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Data export requests indexes
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_requested_at ON data_export_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_expires_at ON data_export_requests(expires_at);

-- Data deletion requests indexes
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_scheduled_for ON data_deletion_requests(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_requested_at ON data_deletion_requests(requested_at DESC);

-- Consent history indexes
CREATE INDEX IF NOT EXISTS idx_consent_history_user_id ON consent_history(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_type ON consent_history(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_history_created_at ON consent_history(created_at DESC);

-- Data processing logs indexes
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_activity ON data_processing_logs(processing_activity);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_purpose ON data_processing_logs(purpose);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_created_at ON data_processing_logs(created_at DESC);

-- Data breach incidents indexes
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_reference ON data_breach_incidents(incident_reference);
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_type ON data_breach_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_severity ON data_breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_status ON data_breach_incidents(status);
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_discovered_at ON data_breach_incidents(discovered_at DESC);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all GDPR tables
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_incidents ENABLE ROW LEVEL SECURITY;

-- Data export requests policies
CREATE POLICY "Users can view their own export requests" ON data_export_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export requests" ON data_export_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Data deletion requests policies
CREATE POLICY "Users can view their own deletion requests" ON data_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deletion requests" ON data_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deletion requests" ON data_deletion_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- Consent history policies
CREATE POLICY "Users can view their own consent history" ON consent_history
    FOR SELECT USING (auth.uid() = user_id);

-- Data processing logs - admin only (no user access)
-- Data breach incidents - admin only (no user access)

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_data_export_requests_updated_at
    BEFORE UPDATE ON data_export_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_deletion_requests_updated_at
    BEFORE UPDATE ON data_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_processing_logs_updated_at
    BEFORE UPDATE ON data_processing_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_breach_incidents_updated_at
    BEFORE UPDATE ON data_breach_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- GDPR COMPLIANCE FUNCTIONS
-- =============================================

-- Function to log consent changes
CREATE OR REPLACE FUNCTION log_consent_change(
    p_user_id UUID,
    p_consent_type TEXT,
    p_consent_given BOOLEAN,
    p_consent_method TEXT DEFAULT 'explicit',
    p_consent_source TEXT DEFAULT NULL,
    p_legal_basis TEXT DEFAULT 'consent',
    p_consent_text TEXT DEFAULT NULL,
    p_consent_version TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    consent_id UUID;
BEGIN
    INSERT INTO consent_history (
        user_id, consent_type, consent_given, consent_method,
        consent_source, legal_basis, consent_text, consent_version
    ) VALUES (
        p_user_id, p_consent_type, p_consent_given, p_consent_method,
        p_consent_source, p_legal_basis, p_consent_text, p_consent_version
    ) RETURNING id INTO consent_id;
    
    RETURN consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has valid consent
CREATE OR REPLACE FUNCTION has_valid_consent(
    p_user_id UUID,
    p_consent_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    latest_consent BOOLEAN;
BEGIN
    SELECT consent_given INTO latest_consent
    FROM consent_history
    WHERE user_id = p_user_id 
      AND consent_type = p_consent_type
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(latest_consent, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule data deletion
CREATE OR REPLACE FUNCTION schedule_data_deletion(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_grace_period_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    deletion_id UUID;
    scheduled_date TIMESTAMPTZ;
BEGIN
    scheduled_date := now() + (p_grace_period_days || ' days')::INTERVAL;
    
    INSERT INTO data_deletion_requests (
        user_id, reason, scheduled_for, grace_period_days
    ) VALUES (
        p_user_id, p_reason, scheduled_date, p_grace_period_days
    ) RETURNING id INTO deletion_id;
    
    RETURN deletion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process expired data export requests
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired export files and update requests
    UPDATE data_export_requests 
    SET download_url = NULL,
        status = 'expired'
    WHERE expires_at < now() 
      AND status = 'completed'
      AND download_url IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's data processing activities
CREATE OR REPLACE FUNCTION get_user_data_processing(p_user_id UUID)
RETURNS TABLE (
    activity TEXT,
    purpose TEXT,
    legal_basis TEXT,
    retention_period TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        dpl.processing_activity,
        dpl.purpose,
        dpl.legal_basis,
        dpl.retention_period
    FROM data_processing_logs dpl
    WHERE 'customers' = ANY(dpl.data_subjects)
       OR 'users' = ANY(dpl.data_subjects);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
