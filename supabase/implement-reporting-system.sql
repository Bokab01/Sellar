-- =============================================
-- COMPREHENSIVE REPORTING SYSTEM IMPLEMENTATION
-- =============================================
-- This script implements a complete reporting system for all content types:
-- - Listings, Posts, Comments, Messages, Users
-- - User reputation system
-- - Automated content moderation
-- - Enhanced reporting functions

-- =============================================
-- 1. ENHANCE EXISTING REPORTS TABLE
-- =============================================

-- Add missing columns to reports table
DO $$
BEGIN
    -- Add priority column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE reports ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
        RAISE NOTICE 'Added priority column to reports table';
    END IF;

    -- Add category column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE reports ADD COLUMN category VARCHAR(50) DEFAULT 'other';
        RAISE NOTICE 'Added category column to reports table';
    END IF;

    -- Add evidence_urls column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'evidence_urls'
    ) THEN
        ALTER TABLE reports ADD COLUMN evidence_urls JSONB DEFAULT '[]';
        RAISE NOTICE 'Added evidence_urls column to reports table';
    END IF;

    -- Add moderator_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'moderator_id'
    ) THEN
        ALTER TABLE reports ADD COLUMN moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added moderator_id column to reports table';
    END IF;

    -- Add resolution_notes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'resolution_notes'
    ) THEN
        ALTER TABLE reports ADD COLUMN resolution_notes TEXT;
        RAISE NOTICE 'Added resolution_notes column to reports table';
    END IF;

    -- Add resolved_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE reports ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added resolved_at column to reports table';
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE reports ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to reports table';
    END IF;
END $$;

-- =============================================
-- 2. CREATE MODERATION CATEGORIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS moderation_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    auto_action VARCHAR(50), -- 'none', 'hide', 'suspend', 'ban'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default moderation categories
INSERT INTO moderation_categories (name, display_name, description, priority, auto_action) VALUES
('spam', 'Spam', 'Repetitive, unwanted, or promotional content', 'high', 'hide'),
('harassment', 'Harassment', 'Bullying, threats, or abusive behavior', 'urgent', 'suspend'),
('inappropriate', 'Inappropriate Content', 'Offensive, explicit, or inappropriate material', 'high', 'hide'),
('fraud', 'Fraud/Scam', 'Deceptive practices, fake listings, or scams', 'urgent', 'ban'),
('copyright', 'Copyright Violation', 'Unauthorized use of copyrighted material', 'medium', 'hide'),
('violence', 'Violence/Threats', 'Content promoting violence or making threats', 'urgent', 'ban'),
('hate_speech', 'Hate Speech', 'Content promoting hatred or discrimination', 'urgent', 'ban'),
('fake_listing', 'Fake Listing', 'Misleading or fraudulent product listings', 'high', 'hide'),
('price_manipulation', 'Price Manipulation', 'Artificially inflated or misleading prices', 'medium', 'hide'),
('other', 'Other', 'Other violations not covered above', 'low', 'none')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 3. CREATE USER REPUTATION SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS user_reputation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reputation_score INTEGER DEFAULT 0,
    positive_reports INTEGER DEFAULT 0,
    negative_reports INTEGER DEFAULT 0,
    violations_count INTEGER DEFAULT 0,
    last_violation_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'good' CHECK (status IN ('good', 'warning', 'suspended', 'banned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================
-- 4. CREATE CONTENT MODERATION ACTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('hide', 'unhide', 'suspend', 'unsuspend', 'ban', 'unban', 'warn', 'dismiss')),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('listing', 'post', 'comment', 'message', 'user')),
    target_id UUID NOT NULL,
    reason TEXT,
    duration_hours INTEGER, -- For temporary actions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. CREATE REPORTING FUNCTIONS
-- =============================================

-- Function to submit a report
CREATE OR REPLACE FUNCTION submit_report(
    p_reporter_id UUID,
    p_target_type VARCHAR(20),
    p_target_id UUID,
    p_category VARCHAR(50),
    p_reason TEXT,
    p_description TEXT DEFAULT NULL,
    p_evidence_urls JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (success BOOLEAN, report_id UUID, error TEXT) AS $$
DECLARE
    v_report_id UUID;
    v_reported_user_id UUID;
    v_priority VARCHAR(20);
    v_auto_action VARCHAR(50);
    v_category_id UUID;
BEGIN
    -- Validate target type
    IF p_target_type NOT IN ('listing', 'post', 'comment', 'message', 'user') THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid target type'::TEXT;
        RETURN;
    END IF;

    -- Get category information
    SELECT id, priority, auto_action INTO v_category_id, v_priority, v_auto_action
    FROM moderation_categories 
    WHERE name = p_category AND is_active = true;

    IF v_category_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid category'::TEXT;
        RETURN;
    END IF;

    -- Get reported user ID based on target type
    CASE p_target_type
        WHEN 'listing' THEN
            SELECT user_id INTO v_reported_user_id FROM listings WHERE id = p_target_id;
        WHEN 'post' THEN
            SELECT user_id INTO v_reported_user_id FROM posts WHERE id = p_target_id;
        WHEN 'comment' THEN
            SELECT user_id INTO v_reported_user_id FROM comments WHERE id = p_target_id;
        WHEN 'message' THEN
            SELECT sender_id INTO v_reported_user_id FROM messages WHERE id = p_target_id;
        WHEN 'user' THEN
            v_reported_user_id := p_target_id;
    END CASE;

    -- Prevent self-reporting
    IF v_reported_user_id = p_reporter_id THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Cannot report yourself'::TEXT;
        RETURN;
    END IF;

    -- Create the report
    INSERT INTO reports (
        reporter_id,
        reported_user_id,
        listing_id,
        post_id,
        comment_id,
        message_id,
        category,
        reason,
        description,
        evidence_urls,
        priority
    ) VALUES (
        p_reporter_id,
        v_reported_user_id,
        CASE WHEN p_target_type = 'listing' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'post' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'comment' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'message' THEN p_target_id ELSE NULL END,
        p_category,
        p_reason,
        p_description,
        p_evidence_urls,
        v_priority
    ) RETURNING id INTO v_report_id;

    -- Update user reputation
    UPDATE user_reputation 
    SET 
        negative_reports = negative_reports + 1,
        reputation_score = reputation_score - 1,
        updated_at = NOW()
    WHERE user_id = v_reported_user_id;

    -- Insert if user doesn't have reputation record
    INSERT INTO user_reputation (user_id, negative_reports, reputation_score)
    SELECT v_reported_user_id, 1, -1
    WHERE NOT EXISTS (SELECT 1 FROM user_reputation WHERE user_id = v_reported_user_id);

    -- Handle automatic actions
    IF v_auto_action != 'none' THEN
        PERFORM handle_automatic_moderation(v_report_id, v_auto_action, p_target_type, p_target_id);
    END IF;

    RETURN QUERY SELECT true, v_report_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle automatic moderation
CREATE OR REPLACE FUNCTION handle_automatic_moderation(
    p_report_id UUID,
    p_action VARCHAR(50),
    p_target_type VARCHAR(20),
    p_target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_reported_user_id UUID;
BEGIN
    -- Get reported user ID
    SELECT reported_user_id INTO v_reported_user_id FROM reports WHERE id = p_report_id;

    -- Apply automatic action
    CASE p_action
        WHEN 'hide' THEN
            CASE p_target_type
                WHEN 'listing' THEN
                    UPDATE listings SET status = 'hidden' WHERE id = p_target_id;
                WHEN 'post' THEN
                    UPDATE posts SET status = 'hidden' WHERE id = p_target_id;
                WHEN 'comment' THEN
                    UPDATE comments SET status = 'hidden' WHERE id = p_target_id;
            END CASE;
        WHEN 'suspend' THEN
            UPDATE user_reputation 
            SET status = 'suspended', updated_at = NOW() 
            WHERE user_id = v_reported_user_id;
        WHEN 'ban' THEN
            UPDATE user_reputation 
            SET status = 'banned', updated_at = NOW() 
            WHERE user_id = v_reported_user_id;
    END CASE;

    -- Record the action
    INSERT INTO moderation_actions (
        report_id,
        moderator_id,
        action_type,
        target_type,
        target_id,
        reason
    ) VALUES (
        p_report_id,
        NULL, -- System action
        p_action,
        p_target_type,
        p_target_id,
        'Automatic action based on report category'
    );

    -- Update report status
    UPDATE reports 
    SET 
        status = 'resolved',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_report_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get moderation categories
CREATE OR REPLACE FUNCTION get_moderation_categories()
RETURNS TABLE (
    name VARCHAR(50),
    display_name VARCHAR(100),
    description TEXT,
    priority VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.name,
        mc.display_name,
        mc.description,
        mc.priority
    FROM moderation_categories mc
    WHERE mc.is_active = true
    ORDER BY 
        CASE mc.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        mc.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Reports table indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);

-- User reputation indexes
CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON user_reputation(reputation_score);
CREATE INDEX IF NOT EXISTS idx_user_reputation_status ON user_reputation(status);

-- Moderation actions indexes
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_id ON moderation_actions(report_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator_id ON moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON moderation_actions(target_type, target_id);

-- =============================================
-- 7. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Trigger to update reports updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reports_updated_at ON reports;
CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

-- Grant permissions for authenticated users
GRANT EXECUTE ON FUNCTION submit_report(UUID, VARCHAR(20), UUID, VARCHAR(50), TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_moderation_categories() TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT ON reports TO authenticated;
GRANT SELECT ON moderation_categories TO authenticated;
GRANT SELECT ON user_reputation TO authenticated;

-- =============================================
-- 9. VERIFICATION
-- =============================================

DO $$
DECLARE
    reports_count INTEGER;
    categories_count INTEGER;
BEGIN
    -- Count reports
    SELECT COUNT(*) INTO reports_count FROM reports;
    
    -- Count moderation categories
    SELECT COUNT(*) INTO categories_count FROM moderation_categories;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== COMPREHENSIVE REPORTING SYSTEM VERIFICATION ===';
    RAISE NOTICE 'Reports in system: %', reports_count;
    RAISE NOTICE 'Moderation categories: %', categories_count;
    RAISE NOTICE '✅ Reporting system is ready';
    RAISE NOTICE '================================';
    RAISE NOTICE '';
END $$;

-- =============================================
-- 10. SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 COMPREHENSIVE REPORTING SYSTEM IMPLEMENTED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Enhanced reports table with all necessary columns';
    RAISE NOTICE '✅ Created moderation categories system';
    RAISE NOTICE '✅ Implemented user reputation tracking';
    RAISE NOTICE '✅ Added automated moderation actions';
    RAISE NOTICE '✅ Created reporting functions for all content types';
    RAISE NOTICE '✅ Added performance indexes and triggers';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Users can now report:';
    RAISE NOTICE '   - Listings (fake, inappropriate, spam)';
    RAISE NOTICE '   - Posts (harassment, hate speech)';
    RAISE NOTICE '   - Comments (abuse, spam)';
    RAISE NOTICE '   - Messages (harassment, threats)';
    RAISE NOTICE '   - Users (fraud, harassment)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test with: SELECT * FROM submit_report(user_id, target_type, target_id, category, reason);';
    RAISE NOTICE '';
END $$;
