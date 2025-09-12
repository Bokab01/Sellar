-- =============================================
-- MEETUP TRANSACTIONS AND ENHANCED REVIEW SYSTEM
-- Creates meetup transaction tracking and enhanced reviews for in-person trades
-- This works alongside the existing financial transactions table
-- =============================================

-- 1. Create meetup_transactions table (for in-person trade tracking)
CREATE TABLE IF NOT EXISTS meetup_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Transaction status and confirmation
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'cancelled', 'disputed'
    )),
    confirmed_by UUID[] DEFAULT '{}', -- Array of user IDs who confirmed
    buyer_confirmed_at TIMESTAMPTZ,
    seller_confirmed_at TIMESTAMPTZ,
    
    -- Transaction details
    agreed_price DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    meetup_location TEXT,
    meetup_time TIMESTAMPTZ,
    
    -- Verification
    verification_code TEXT UNIQUE,
    verification_code_expires_at TIMESTAMPTZ,
    
    -- Notes
    buyer_notes TEXT,
    seller_notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create enhanced reviews table (replacing/extending existing reviews)
-- First, check if reviews table exists and backup if needed
DO $$
BEGIN
    -- Create backup of existing reviews if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
        -- Create backup table
        EXECUTE 'CREATE TABLE reviews_backup AS SELECT * FROM reviews';
        -- Drop existing table
        DROP TABLE reviews CASCADE;
    END IF;
END $$;

-- Create new enhanced reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Link to meetup transaction (optional for backward compatibility)
    meetup_transaction_id UUID REFERENCES meetup_transactions(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL CHECK (LENGTH(comment) >= 10 AND LENGTH(comment) <= 1000),
    review_type TEXT NOT NULL CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer')),
    
    -- Transaction verification status
    is_transaction_confirmed BOOLEAN DEFAULT false,
    verification_level TEXT DEFAULT 'unconfirmed' CHECK (verification_level IN (
        'unconfirmed', 'single_confirmed', 'mutual_confirmed'
    )),
    
    -- Trust and verification metrics
    reviewer_verification_score INTEGER DEFAULT 0,
    transaction_value DECIMAL(12,2),
    
    -- Helpful votes
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Moderation
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'flagged', 'removed')),
    moderation_notes TEXT,
    moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(reviewer_id, meetup_transaction_id), -- One review per transaction per user
    CHECK (reviewer_id != reviewed_user_id) -- Can't review yourself
);

-- 3. Create user verification signals table
CREATE TABLE IF NOT EXISTS user_verification_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- Verification status
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    id_verified BOOLEAN DEFAULT false,
    
    -- Activity metrics
    successful_transactions INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    reviews_given INTEGER DEFAULT 0,
    reviews_received INTEGER DEFAULT 0,
    
    -- Trust score (0-100)
    trust_score INTEGER DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
    
    -- Account metrics
    account_age_days INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Verification dates
    phone_verified_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    id_verified_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create review helpful votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(review_id, user_id) -- One vote per review per user
);

-- 5. Enable RLS on all tables
ALTER TABLE meetup_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for meetup_transactions
CREATE POLICY "Users can view transactions they're involved in" ON meetup_transactions 
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "Users can create transactions for their listings" ON meetup_transactions 
    FOR INSERT WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "Users can update their own transactions" ON meetup_transactions 
    FOR UPDATE USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- 7. Create RLS policies for reviews
CREATE POLICY "Anyone can view published reviews" ON reviews 
    FOR SELECT USING (status = 'published');
CREATE POLICY "Users can create reviews for their transactions" ON reviews 
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Users can update their own reviews" ON reviews 
    FOR UPDATE USING (reviewer_id = auth.uid());

-- 8. Create RLS policies for user verification signals
CREATE POLICY "Users can view all verification signals" ON user_verification_signals 
    FOR SELECT USING (true);
CREATE POLICY "Users can update their own verification signals" ON user_verification_signals 
    FOR UPDATE USING (user_id = auth.uid());

-- 9. Create RLS policies for review helpful votes
CREATE POLICY "Users can view all helpful votes" ON review_helpful_votes 
    FOR SELECT USING (true);
CREATE POLICY "Users can create their own votes" ON review_helpful_votes 
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own votes" ON review_helpful_votes 
    FOR UPDATE USING (user_id = auth.uid());

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetup_transactions_buyer ON meetup_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_meetup_transactions_seller ON meetup_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_meetup_transactions_listing ON meetup_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_meetup_transactions_conversation ON meetup_transactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_meetup_transactions_status ON meetup_transactions(status);
CREATE INDEX IF NOT EXISTS idx_meetup_transactions_created_at ON meetup_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user ON reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction ON reviews(meetup_transaction_id);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_verification_level ON reviews(verification_level);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_verification_signals_user ON user_verification_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verification_signals_trust_score ON user_verification_signals(trust_score DESC);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user ON review_helpful_votes(user_id);

-- 11. Create trigger to update verification level on reviews
CREATE OR REPLACE FUNCTION update_review_verification_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Update verification level based on transaction confirmation
    IF NEW.meetup_transaction_id IS NOT NULL THEN
        SELECT 
            CASE 
                WHEN buyer_confirmed_at IS NOT NULL AND seller_confirmed_at IS NOT NULL THEN 'mutual_confirmed'
                WHEN buyer_confirmed_at IS NOT NULL OR seller_confirmed_at IS NOT NULL THEN 'single_confirmed'
                ELSE 'unconfirmed'
            END,
            CASE 
                WHEN buyer_confirmed_at IS NOT NULL AND seller_confirmed_at IS NOT NULL THEN true
                ELSE false
            END
        INTO NEW.verification_level, NEW.is_transaction_confirmed
        FROM meetup_transactions 
        WHERE id = NEW.meetup_transaction_id;
        
        -- Get transaction value
        SELECT agreed_price INTO NEW.transaction_value
        FROM meetup_transactions 
        WHERE id = NEW.meetup_transaction_id;
    END IF;
    
    -- Get reviewer verification score
    SELECT COALESCE(trust_score, 0) INTO NEW.reviewer_verification_score
    FROM user_verification_signals 
    WHERE user_id = NEW.reviewer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_verification_level
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_verification_level();

-- 12. Create trigger to update helpful vote counts
CREATE OR REPLACE FUNCTION update_review_helpful_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update helpful counts on the review
    UPDATE reviews SET
        helpful_count = (
            SELECT COUNT(*) FROM review_helpful_votes 
            WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) AND is_helpful = true
        ),
        not_helpful_count = (
            SELECT COUNT(*) FROM review_helpful_votes 
            WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) AND is_helpful = false
        )
    WHERE id = COALESCE(NEW.review_id, OLD.review_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_helpful_counts
    AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpful_counts();

-- 13. Create function to update user verification signals
CREATE OR REPLACE FUNCTION update_user_verification_signals()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_account_age_days INTEGER;
    v_trust_score INTEGER;
BEGIN
    -- Determine which user to update
    IF TG_TABLE_NAME = 'meetup_transactions' THEN
        -- Update both buyer and seller
        FOR v_user_id IN SELECT unnest(ARRAY[NEW.buyer_id, NEW.seller_id]) LOOP
            PERFORM update_single_user_verification_signals(v_user_id);
        END LOOP;
    ELSIF TG_TABLE_NAME = 'reviews' THEN
        -- Update both reviewer and reviewed user
        PERFORM update_single_user_verification_signals(NEW.reviewer_id);
        PERFORM update_single_user_verification_signals(NEW.reviewed_user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create helper function to update single user verification signals
CREATE OR REPLACE FUNCTION update_single_user_verification_signals(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_account_age_days INTEGER;
    v_trust_score INTEGER;
    v_successful_transactions INTEGER;
    v_total_transactions INTEGER;
    v_reviews_given INTEGER;
    v_reviews_received INTEGER;
BEGIN
    -- Calculate account age
    SELECT EXTRACT(days FROM NOW() - created_at)::INTEGER
    INTO v_account_age_days
    FROM profiles WHERE id = p_user_id;
    
    -- Count transactions
    SELECT 
        COUNT(*) FILTER (WHERE status = 'confirmed'),
        COUNT(*)
    INTO v_successful_transactions, v_total_transactions
    FROM meetup_transactions 
    WHERE buyer_id = p_user_id OR seller_id = p_user_id;
    
    -- Count reviews
    SELECT COUNT(*) INTO v_reviews_given
    FROM reviews WHERE reviewer_id = p_user_id AND status = 'published';
    
    SELECT COUNT(*) INTO v_reviews_received
    FROM reviews WHERE reviewed_user_id = p_user_id AND status = 'published';
    
    -- Calculate trust score (0-100)
    v_trust_score := 0;
    
    -- Phone verification: +20 points
    IF EXISTS (SELECT 1 FROM user_verification_signals WHERE user_id = p_user_id AND phone_verified = true) THEN
        v_trust_score := v_trust_score + 20;
    END IF;
    
    -- Email verification: +10 points
    IF EXISTS (SELECT 1 FROM user_verification_signals WHERE user_id = p_user_id AND email_verified = true) THEN
        v_trust_score := v_trust_score + 10;
    END IF;
    
    -- ID verification: +30 points
    IF EXISTS (SELECT 1 FROM user_verification_signals WHERE user_id = p_user_id AND id_verified = true) THEN
        v_trust_score := v_trust_score + 30;
    END IF;
    
    -- Successful transactions: +2 each (max 20 points)
    v_trust_score := v_trust_score + LEAST(v_successful_transactions * 2, 20);
    
    -- Reviews given: +1 each (max 10 points)
    v_trust_score := v_trust_score + LEAST(v_reviews_given, 10);
    
    -- Account age: +1 per 30 days (max 10 points)
    v_trust_score := v_trust_score + LEAST(v_account_age_days / 30, 10);
    
    -- Ensure trust score doesn't exceed 100
    v_trust_score := LEAST(v_trust_score, 100);
    
    -- Insert or update verification signals
    INSERT INTO user_verification_signals (
        user_id, successful_transactions, total_transactions, 
        reviews_given, reviews_received, trust_score, account_age_days,
        last_activity_at, updated_at
    ) VALUES (
        p_user_id, v_successful_transactions, v_total_transactions,
        v_reviews_given, v_reviews_received, v_trust_score, v_account_age_days,
        NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        successful_transactions = EXCLUDED.successful_transactions,
        total_transactions = EXCLUDED.total_transactions,
        reviews_given = EXCLUDED.reviews_given,
        reviews_received = EXCLUDED.reviews_received,
        trust_score = EXCLUDED.trust_score,
        account_age_days = EXCLUDED.account_age_days,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- 15. Create triggers to update verification signals
CREATE TRIGGER trigger_update_verification_signals_transactions
    AFTER INSERT OR UPDATE ON meetup_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_signals();

CREATE TRIGGER trigger_update_verification_signals_reviews
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_signals();

-- 16. Create function to get user trust metrics (for frontend)
CREATE OR REPLACE FUNCTION get_user_trust_metrics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_metrics JSON;
BEGIN
    -- Ensure user has verification signals record
    PERFORM update_single_user_verification_signals(p_user_id);
    
    SELECT json_build_object(
        'trust_score', COALESCE(uvs.trust_score, 0),
        'verification_badges', json_build_object(
            'phone_verified', COALESCE(uvs.phone_verified, false),
            'email_verified', COALESCE(uvs.email_verified, false),
            'id_verified', COALESCE(uvs.id_verified, false)
        ),
        'transaction_stats', json_build_object(
            'successful_transactions', COALESCE(uvs.successful_transactions, 0),
            'total_transactions', COALESCE(uvs.total_transactions, 0),
            'success_rate', CASE 
                WHEN COALESCE(uvs.total_transactions, 0) > 0 
                THEN ROUND((COALESCE(uvs.successful_transactions, 0)::DECIMAL / uvs.total_transactions) * 100, 1)
                ELSE 0 
            END
        ),
        'review_stats', json_build_object(
            'reviews_given', COALESCE(uvs.reviews_given, 0),
            'reviews_received', COALESCE(uvs.reviews_received, 0),
            'average_rating', COALESCE(
                (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE reviewed_user_id = p_user_id AND status = 'published'),
                0
            ),
            'confirmed_reviews', COALESCE(
                (SELECT COUNT(*) FROM reviews WHERE reviewed_user_id = p_user_id AND is_transaction_confirmed = true AND status = 'published'),
                0
            )
        ),
        'account_info', json_build_object(
            'account_age_days', COALESCE(uvs.account_age_days, 0),
            'last_activity_at', uvs.last_activity_at,
            'member_since', p.created_at
        )
    ) INTO v_metrics
    FROM user_verification_signals uvs
    RIGHT JOIN profiles p ON p.id = p_user_id
    WHERE uvs.user_id = p_user_id OR uvs.user_id IS NULL;
    
    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Grant permissions
GRANT EXECUTE ON FUNCTION get_user_trust_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION update_single_user_verification_signals TO authenticated;

-- 18. Initialize verification signals for existing users
INSERT INTO user_verification_signals (user_id, created_at, updated_at)
SELECT id, created_at, NOW()
FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- 19. Update verification signals for all users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM profiles LOOP
        PERFORM update_single_user_verification_signals(user_record.id);
    END LOOP;
END $$;

-- Success message
SELECT 'Meetup transactions and enhanced review system created successfully!' as status;
