-- =============================================
-- SELLAR MOBILE APP - MODERATION SYSTEM
-- Migration 07: Content moderation and safety
-- =============================================

-- =============================================
-- MODERATION CATEGORIES TABLE
-- =============================================

CREATE TABLE moderation_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Details
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Severity and Actions
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    auto_action TEXT DEFAULT 'flag' CHECK (auto_action IN ('none', 'flag', 'hide', 'remove', 'ban')),
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MODERATION LOGS TABLE
-- =============================================

CREATE TABLE moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target Content
    content_type TEXT NOT NULL CHECK (content_type IN ('listing', 'message', 'review', 'post', 'comment', 'profile')),
    content_id UUID NOT NULL,
    
    -- Moderation Details
    category_id UUID REFERENCES moderation_categories(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('flagged', 'approved', 'rejected', 'hidden', 'removed', 'banned')),
    reason TEXT,
    
    -- Moderator Information
    moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_automated BOOLEAN DEFAULT false,
    
    -- Content Information
    content_snapshot JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REPORTS TABLE
-- =============================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reporter Information
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Reported Content
    content_type TEXT NOT NULL CHECK (content_type IN ('listing', 'message', 'review', 'post', 'comment', 'profile', 'user')),
    content_id UUID NOT NULL,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Report Details
    category_id UUID REFERENCES moderation_categories(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    description TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Resolution
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER REPUTATION TABLE
-- =============================================

CREATE TABLE user_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Reputation Scores
    trust_score INTEGER DEFAULT 100,
    safety_score INTEGER DEFAULT 100,
    quality_score INTEGER DEFAULT 100,
    
    -- Trust Level
    trust_level TEXT DEFAULT 'new' CHECK (trust_level IN ('new', 'basic', 'trusted', 'verified', 'expert')),
    
    -- Violation Counts
    total_violations INTEGER DEFAULT 0,
    minor_violations INTEGER DEFAULT 0,
    major_violations INTEGER DEFAULT 0,
    critical_violations INTEGER DEFAULT 0,
    
    -- Positive Actions
    positive_reviews INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    helpful_reports INTEGER DEFAULT 0,
    
    -- Status
    is_restricted BOOLEAN DEFAULT false,
    restriction_reason TEXT,
    restriction_expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================
-- KEYWORD BLACKLIST TABLE
-- =============================================

CREATE TABLE keyword_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Keyword Details
    keyword TEXT NOT NULL,
    pattern TEXT, -- Regex pattern for advanced matching
    
    -- Category and Severity
    category_id UUID REFERENCES moderation_categories(id) ON DELETE SET NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Action
    action TEXT DEFAULT 'flag' CHECK (action IN ('flag', 'block', 'replace')),
    replacement_text TEXT,
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    is_case_sensitive BOOLEAN DEFAULT false,
    match_whole_word BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Moderation categories indexes
CREATE INDEX idx_moderation_categories_is_active ON moderation_categories(is_active);
CREATE INDEX idx_moderation_categories_severity ON moderation_categories(severity);
CREATE INDEX idx_moderation_categories_sort_order ON moderation_categories(sort_order);

-- Moderation logs indexes
CREATE INDEX idx_moderation_logs_content_type ON moderation_logs(content_type);
CREATE INDEX idx_moderation_logs_content_id ON moderation_logs(content_id);
CREATE INDEX idx_moderation_logs_category_id ON moderation_logs(category_id);
CREATE INDEX idx_moderation_logs_moderator_id ON moderation_logs(moderator_id);
CREATE INDEX idx_moderation_logs_action ON moderation_logs(action);
CREATE INDEX idx_moderation_logs_created_at ON moderation_logs(created_at);
CREATE INDEX idx_moderation_logs_is_automated ON moderation_logs(is_automated);

-- Composite index for content moderation history
CREATE INDEX idx_moderation_logs_content ON moderation_logs(content_type, content_id, created_at DESC);

-- Reports indexes
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_content_type ON reports(content_type);
CREATE INDEX idx_reports_content_id ON reports(content_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_category_id ON reports(category_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_priority ON reports(priority);
CREATE INDEX idx_reports_resolved_by ON reports(resolved_by);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- User reputation indexes
CREATE INDEX idx_user_reputation_user_id ON user_reputation(user_id);
CREATE INDEX idx_user_reputation_trust_level ON user_reputation(trust_level);
CREATE INDEX idx_user_reputation_trust_score ON user_reputation(trust_score);
CREATE INDEX idx_user_reputation_is_restricted ON user_reputation(is_restricted);

-- Keyword blacklist indexes
CREATE INDEX idx_keyword_blacklist_keyword ON keyword_blacklist(keyword);
CREATE INDEX idx_keyword_blacklist_category_id ON keyword_blacklist(category_id);
CREATE INDEX idx_keyword_blacklist_is_active ON keyword_blacklist(is_active);
CREATE INDEX idx_keyword_blacklist_severity ON keyword_blacklist(severity);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on moderation_categories
CREATE TRIGGER update_moderation_categories_updated_at
    BEFORE UPDATE ON moderation_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on reports
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on user_reputation
CREATE TRIGGER update_user_reputation_updated_at
    BEFORE UPDATE ON user_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on keyword_blacklist
CREATE TRIGGER update_keyword_blacklist_updated_at
    BEFORE UPDATE ON keyword_blacklist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MODERATION FUNCTIONS
-- =============================================

-- Function to create or update user reputation
CREATE OR REPLACE FUNCTION ensure_user_reputation(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_reputation (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to log moderation action
CREATE OR REPLACE FUNCTION log_moderation_action(
    p_content_type TEXT,
    p_content_id UUID,
    p_action TEXT,
    p_reason TEXT DEFAULT NULL,
    p_moderator_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_is_automated BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO moderation_logs (
        content_type, content_id, action, reason, 
        moderator_id, category_id, is_automated
    )
    VALUES (
        p_content_type, p_content_id, p_action, p_reason,
        p_moderator_id, p_category_id, p_is_automated
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update user reputation based on violation
CREATE OR REPLACE FUNCTION update_user_reputation_violation(
    p_user_id UUID,
    p_severity TEXT
)
RETURNS VOID AS $$
DECLARE
    score_reduction INTEGER;
BEGIN
    -- Ensure user reputation record exists
    PERFORM ensure_user_reputation(p_user_id);
    
    -- Determine score reduction based on severity
    score_reduction := CASE p_severity
        WHEN 'low' THEN 5
        WHEN 'medium' THEN 15
        WHEN 'high' THEN 30
        WHEN 'critical' THEN 50
        ELSE 10
    END;
    
    -- Update reputation scores and violation counts
    UPDATE user_reputation
    SET
        trust_score = GREATEST(0, trust_score - score_reduction),
        safety_score = GREATEST(0, safety_score - score_reduction),
        total_violations = total_violations + 1,
        minor_violations = minor_violations + CASE WHEN p_severity = 'low' THEN 1 ELSE 0 END,
        major_violations = major_violations + CASE WHEN p_severity IN ('medium', 'high') THEN 1 ELSE 0 END,
        critical_violations = critical_violations + CASE WHEN p_severity = 'critical' THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Update trust level based on new scores
    UPDATE user_reputation
    SET trust_level = CASE
        WHEN trust_score >= 90 AND safety_score >= 90 THEN 'expert'
        WHEN trust_score >= 75 AND safety_score >= 75 THEN 'verified'
        WHEN trust_score >= 60 AND safety_score >= 60 THEN 'trusted'
        WHEN trust_score >= 40 AND safety_score >= 40 THEN 'basic'
        ELSE 'new'
    END
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if content contains blacklisted keywords
CREATE OR REPLACE FUNCTION check_content_for_violations(content_text TEXT)
RETURNS TABLE(
    keyword TEXT,
    severity TEXT,
    action TEXT,
    category_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.keyword,
        kb.severity,
        kb.action,
        mc.name as category_name
    FROM keyword_blacklist kb
    LEFT JOIN moderation_categories mc ON kb.category_id = mc.id
    WHERE kb.is_active = true
    AND (
        (kb.is_case_sensitive = true AND content_text ~ kb.pattern) OR
        (kb.is_case_sensitive = false AND content_text ~* kb.pattern) OR
        (kb.match_whole_word = true AND content_text ~* ('\y' || kb.keyword || '\y')) OR
        (kb.match_whole_word = false AND LOWER(content_text) LIKE '%' || LOWER(kb.keyword) || '%')
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL MODERATION DATA
-- =============================================

-- Insert default moderation categories
INSERT INTO moderation_categories (name, description, severity, auto_action) VALUES
('Spam', 'Spam content or repetitive posts', 'medium', 'flag'),
('Inappropriate Content', 'Content that violates community guidelines', 'high', 'hide'),
('Harassment', 'Harassment or bullying behavior', 'high', 'hide'),
('Fraud', 'Fraudulent or scam content', 'critical', 'remove'),
('Violence', 'Violent or threatening content', 'critical', 'remove'),
('Adult Content', 'Adult or sexual content', 'high', 'hide'),
('Hate Speech', 'Hate speech or discrimination', 'critical', 'remove'),
('Copyright', 'Copyright infringement', 'high', 'hide'),
('Misinformation', 'False or misleading information', 'medium', 'flag'),
('Off Topic', 'Content not relevant to the platform', 'low', 'flag')
ON CONFLICT (name) DO NOTHING;

-- Insert common blacklisted keywords
INSERT INTO keyword_blacklist (keyword, severity, action, match_whole_word, description) VALUES
('scam', 'high', 'flag', false, 'Potential scam indicator'),
('fraud', 'high', 'flag', false, 'Potential fraud indicator'),
('fake', 'medium', 'flag', false, 'Potential fake item indicator'),
('stolen', 'critical', 'flag', false, 'Potential stolen goods indicator'),
('drugs', 'critical', 'block', false, 'Illegal substances'),
('weapon', 'critical', 'block', false, 'Weapons and dangerous items'),
('gun', 'critical', 'block', true, 'Firearms'),
('bomb', 'critical', 'block', true, 'Explosives'),
('kill', 'high', 'flag', true, 'Violent language'),
('die', 'high', 'flag', true, 'Violent language')
ON CONFLICT (keyword) DO NOTHING;

-- Success message
SELECT 'Moderation system tables created successfully!' as status;
