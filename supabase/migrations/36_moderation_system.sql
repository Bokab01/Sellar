-- =====================================================
-- MODERATION SYSTEM TABLES
-- Creates moderation queue, content flags, and user reputation
-- =====================================================

-- =====================================================
-- 1. MODERATION QUEUE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('listing', 'post', 'comment', 'message', 'profile')),
    content_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_text TEXT,
    flagged_reason TEXT[], -- Array of flag types
    manual_review_required BOOLEAN DEFAULT false,
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
    -- Add user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Add content_text if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'content_text'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN content_text TEXT;
    END IF;
    
    -- Add flagged_reason if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'flagged_reason'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN flagged_reason TEXT[];
    END IF;
    
    -- Add priority_level if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'priority_level'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5);
    END IF;
    
    -- Add manual_review_required if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'manual_review_required'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN manual_review_required BOOLEAN DEFAULT false;
    END IF;
    
    -- Add reviewed_by if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Add reviewed_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add review_notes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'review_notes'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN review_notes TEXT;
    END IF;
    
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moderation_queue' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE moderation_queue 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Indexes for moderation queue
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON moderation_queue(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_user ON moderation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON moderation_queue(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created ON moderation_queue(created_at DESC);

-- =====================================================
-- 2. CONTENT FLAGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS content_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('listing', 'post', 'comment', 'message', 'profile')),
    content_id UUID NOT NULL,
    flag_type VARCHAR(50) NOT NULL CHECK (flag_type IN ('profanity', 'spam', 'inappropriate', 'suspicious_links', 'personal_info', 'copyright', 'harassment', 'fake')),
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    auto_generated BOOLEAN DEFAULT true,
    metadata JSONB, -- Store additional details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for content flags
CREATE INDEX IF NOT EXISTS idx_content_flags_content ON content_flags(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_type ON content_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_content_flags_severity ON content_flags(severity);
CREATE INDEX IF NOT EXISTS idx_content_flags_created ON content_flags(created_at DESC);

-- =====================================================
-- 3. USER REPUTATION TABLE (Enhanced)
-- =====================================================
-- Check if user_reputation exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_reputation') THEN
        CREATE TABLE user_reputation (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
            reputation_score INTEGER DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 1000),
            trust_level VARCHAR(20) DEFAULT 'new' CHECK (trust_level IN ('new', 'bronze', 'silver', 'gold', 'platinum', 'restricted', 'banned')),
            total_flags INTEGER DEFAULT 0,
            total_violations INTEGER DEFAULT 0,
            successful_transactions INTEGER DEFAULT 0,
            failed_transactions INTEGER DEFAULT 0,
            positive_reviews INTEGER DEFAULT 0,
            negative_reviews INTEGER DEFAULT 0,
            response_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (response_rate BETWEEN 0 AND 100),
            avg_response_time INTEGER, -- in minutes
            last_violation_at TIMESTAMP WITH TIME ZONE,
            restriction_ends_at TIMESTAMP WITH TIME ZONE,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_reputation_user ON user_reputation(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON user_reputation(reputation_score DESC);
        CREATE INDEX IF NOT EXISTS idx_user_reputation_trust ON user_reputation(trust_level);
    END IF;
END $$;

-- Add missing columns to user_reputation if table already exists
DO $$ 
BEGIN
    -- Add trust_level if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'trust_level'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN trust_level VARCHAR(20) DEFAULT 'new' CHECK (trust_level IN ('new', 'bronze', 'silver', 'gold', 'platinum', 'restricted', 'banned'));
    END IF;
    
    -- Add total_flags if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'total_flags'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN total_flags INTEGER DEFAULT 0;
    END IF;
    
    -- Add total_violations if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'total_violations'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN total_violations INTEGER DEFAULT 0;
    END IF;
    
    -- Add successful_transactions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'successful_transactions'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN successful_transactions INTEGER DEFAULT 0;
    END IF;
    
    -- Add failed_transactions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'failed_transactions'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN failed_transactions INTEGER DEFAULT 0;
    END IF;
    
    -- Add positive_reviews if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'positive_reviews'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN positive_reviews INTEGER DEFAULT 0;
    END IF;
    
    -- Add negative_reviews if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'negative_reviews'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN negative_reviews INTEGER DEFAULT 0;
    END IF;
    
    -- Add response_rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'response_rate'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN response_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (response_rate BETWEEN 0 AND 100);
    END IF;
    
    -- Add avg_response_time if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'avg_response_time'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN avg_response_time INTEGER;
    END IF;
    
    -- Add last_violation_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'last_violation_at'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN last_violation_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add restriction_ends_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'restriction_ends_at'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN restriction_ends_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add notes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_reputation' AND column_name = 'notes'
    ) THEN
        ALTER TABLE user_reputation 
        ADD COLUMN notes TEXT;
    END IF;
END $$;

-- =====================================================
-- 4. REPUTATION HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reputation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'flag', 'violation', 'positive_review', 'negative_review', 'transaction_complete', etc.
    points_change INTEGER NOT NULL, -- Can be positive or negative
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    reason TEXT,
    related_content_type VARCHAR(20),
    related_content_id UUID,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who triggered this change (moderator, system, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for reputation history
CREATE INDEX IF NOT EXISTS idx_reputation_history_user ON reputation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_history_created ON reputation_history(created_at DESC);

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Moderation Queue RLS
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- Admins and moderators can see all (check admin_users table or email domain)
DROP POLICY IF EXISTS "Admins can view all moderation queue" ON moderation_queue;
CREATE POLICY "Admins can view all moderation queue" ON moderation_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.profile_id = auth.uid()
            AND admin_users.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email LIKE '%@sellarghana.com'
        )
    );

-- Admins and moderators can update
DROP POLICY IF EXISTS "Admins can update moderation queue" ON moderation_queue;
CREATE POLICY "Admins can update moderation queue" ON moderation_queue
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.profile_id = auth.uid()
            AND admin_users.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email LIKE '%@sellarghana.com'
        )
    );

-- System can insert (using service role)
DROP POLICY IF EXISTS "System can insert moderation queue" ON moderation_queue;
CREATE POLICY "System can insert moderation queue" ON moderation_queue
    FOR INSERT WITH CHECK (true);

-- Content Flags RLS
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

-- Admins can view all flags
DROP POLICY IF EXISTS "Admins can view content flags" ON content_flags;
CREATE POLICY "Admins can view content flags" ON content_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.profile_id = auth.uid()
            AND admin_users.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email LIKE '%@sellarghana.com'
        )
    );

-- System can insert flags (using service role)
DROP POLICY IF EXISTS "System can insert content flags" ON content_flags;
CREATE POLICY "System can insert content flags" ON content_flags
    FOR INSERT WITH CHECK (true);

-- User Reputation RLS
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

-- Users can view their own reputation
DROP POLICY IF EXISTS "Users can view own reputation" ON user_reputation;
CREATE POLICY "Users can view own reputation" ON user_reputation
    FOR SELECT USING (user_id = auth.uid());

-- Anyone can view reputation scores (public info)
DROP POLICY IF EXISTS "Public can view reputation scores" ON user_reputation;
CREATE POLICY "Public can view reputation scores" ON user_reputation
    FOR SELECT USING (true);

-- Only admins can update reputation
DROP POLICY IF EXISTS "Admins can update reputation" ON user_reputation;
CREATE POLICY "Admins can update reputation" ON user_reputation
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.profile_id = auth.uid()
            AND admin_users.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email LIKE '%@sellarghana.com'
        )
    );

-- System can insert reputation (using service role)
DROP POLICY IF EXISTS "System can insert reputation" ON user_reputation;
CREATE POLICY "System can insert reputation" ON user_reputation
    FOR INSERT WITH CHECK (true);

-- Reputation History RLS
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
DROP POLICY IF EXISTS "Users can view own reputation history" ON reputation_history;
CREATE POLICY "Users can view own reputation history" ON reputation_history
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all history
DROP POLICY IF EXISTS "Admins can view all reputation history" ON reputation_history;
CREATE POLICY "Admins can view all reputation history" ON reputation_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.profile_id = auth.uid()
            AND admin_users.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email LIKE '%@sellarghana.com'
        )
    );

-- System can insert history (using service role)
DROP POLICY IF EXISTS "System can insert reputation history" ON reputation_history;
CREATE POLICY "System can insert reputation history" ON reputation_history
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 6. FUNCTIONS
-- =====================================================

-- Function to update reputation score
CREATE OR REPLACE FUNCTION update_user_reputation(
    p_user_id UUID,
    p_action_type VARCHAR,
    p_points_change INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_related_content_type VARCHAR DEFAULT NULL,
    p_related_content_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_score INTEGER;
    v_new_score INTEGER;
    v_trust_level VARCHAR;
BEGIN
    -- Get or create user reputation
    INSERT INTO user_reputation (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current score
    SELECT reputation_score INTO v_current_score
    FROM user_reputation
    WHERE user_id = p_user_id;
    
    -- Calculate new score (min 0, max 1000)
    v_new_score := GREATEST(0, LEAST(1000, v_current_score + p_points_change));
    
    -- Determine trust level based on score
    v_trust_level := CASE
        WHEN v_new_score >= 800 THEN 'platinum'
        WHEN v_new_score >= 600 THEN 'gold'
        WHEN v_new_score >= 400 THEN 'silver'
        WHEN v_new_score >= 200 THEN 'bronze'
        WHEN v_new_score < 50 THEN 'restricted'
        ELSE 'new'
    END;
    
    -- Update reputation
    UPDATE user_reputation
    SET 
        reputation_score = v_new_score,
        trust_level = v_trust_level,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log history
    INSERT INTO reputation_history (
        user_id,
        action_type,
        points_change,
        previous_score,
        new_score,
        reason,
        related_content_type,
        related_content_id,
        created_by
    ) VALUES (
        p_user_id,
        p_action_type,
        p_points_change,
        v_current_score,
        v_new_score,
        p_reason,
        p_related_content_type,
        p_related_content_id,
        p_created_by
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'previous_score', v_current_score,
        'new_score', v_new_score,
        'trust_level', v_trust_level
    );
END;
$$;

-- Function to get user reputation summary
CREATE OR REPLACE FUNCTION get_user_reputation_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', user_id,
        'reputation_score', reputation_score,
        'trust_level', trust_level,
        'total_flags', total_flags,
        'total_violations', total_violations,
        'successful_transactions', successful_transactions,
        'positive_reviews', positive_reviews,
        'negative_reviews', negative_reviews,
        'response_rate', response_rate,
        'avg_response_time', avg_response_time
    ) INTO v_result
    FROM user_reputation
    WHERE user_id = p_user_id;
    
    IF v_result IS NULL THEN
        -- Create default reputation if doesn't exist
        INSERT INTO user_reputation (user_id)
        VALUES (p_user_id)
        RETURNING jsonb_build_object(
            'user_id', user_id,
            'reputation_score', reputation_score,
            'trust_level', trust_level,
            'total_flags', 0,
            'total_violations', 0,
            'successful_transactions', 0,
            'positive_reviews', 0,
            'negative_reviews', 0,
            'response_rate', 0,
            'avg_response_time', NULL
        ) INTO v_result;
    END IF;
    
    RETURN v_result;
END;
$$;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update moderation_queue updated_at
CREATE OR REPLACE FUNCTION update_moderation_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_moderation_queue_timestamp
    BEFORE UPDATE ON moderation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_moderation_queue_timestamp();

-- Update user_reputation updated_at
CREATE OR REPLACE FUNCTION update_user_reputation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_reputation_timestamp
    BEFORE UPDATE ON user_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_user_reputation_timestamp();

-- =====================================================
-- 8. SEED DATA
-- =====================================================

-- Create reputation records for existing users
INSERT INTO user_reputation (user_id)
SELECT id FROM profiles
WHERE NOT EXISTS (
    SELECT 1 FROM user_reputation WHERE user_reputation.user_id = profiles.id
)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE moderation_queue IS 'Queue for content requiring moderation review';
COMMENT ON TABLE content_flags IS 'Automated flags detected in content';
COMMENT ON TABLE user_reputation IS 'User reputation scores and trust levels';
COMMENT ON TABLE reputation_history IS 'History of reputation score changes';
