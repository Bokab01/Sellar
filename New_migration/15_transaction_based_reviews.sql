-- =============================================
-- SELLAR MOBILE APP - TRANSACTION-BASED REVIEW SYSTEM
-- Migration 15: Enhanced review system for in-person transactions
-- =============================================

-- =============================================
-- TRANSACTIONS TABLE (For In-Person Meetups)
-- =============================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction Participants
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Transaction Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'disputed')),
    confirmed_by UUID[] DEFAULT '{}', -- Array of user IDs who confirmed
    
    -- Transaction Details
    agreed_price DECIMAL(12,2),
    currency TEXT DEFAULT 'GHS',
    meetup_location TEXT,
    meetup_time TIMESTAMPTZ,
    
    -- Confirmation Details
    buyer_confirmed_at TIMESTAMPTZ,
    seller_confirmed_at TIMESTAMPTZ,
    
    -- QR Code for meetup verification (optional)
    verification_code TEXT UNIQUE,
    verification_code_expires_at TIMESTAMPTZ,
    
    -- Notes
    buyer_notes TEXT,
    seller_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (buyer_id != seller_id),
    CHECK (agreed_price > 0)
);

-- =============================================
-- ENHANCED REVIEWS TABLE
-- =============================================

-- Drop existing reviews table and recreate with transaction support
DROP TABLE IF EXISTS review_helpful_votes CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Review Participants
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction Context (REQUIRED for authenticity)
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    
    -- Review Content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL CHECK (LENGTH(comment) >= 10 AND LENGTH(comment) <= 1000),
    
    -- Review Type & Verification
    review_type TEXT NOT NULL CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer')),
    is_transaction_confirmed BOOLEAN DEFAULT false, -- True if both parties confirmed transaction
    verification_level TEXT DEFAULT 'unconfirmed' CHECK (verification_level IN ('unconfirmed', 'single_confirmed', 'mutual_confirmed')),
    
    -- Trust Signals
    reviewer_verification_score INTEGER DEFAULT 0, -- Based on phone/email verification, activity, etc.
    transaction_value DECIMAL(12,2), -- Value of the transaction for context
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    flagged_at TIMESTAMPTZ,
    flagged_by UUID REFERENCES profiles(id),
    
    -- Response from reviewed user
    response TEXT,
    response_at TIMESTAMPTZ,
    
    -- Helpfulness tracking
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'flagged', 'removed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (reviewer_id != reviewed_user_id),
    UNIQUE(transaction_id, reviewer_id) -- One review per transaction per reviewer
);

-- =============================================
-- REVIEW HELPFUL VOTES TABLE
-- =============================================

CREATE TABLE review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Vote
    is_helpful BOOLEAN NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

-- =============================================
-- USER VERIFICATION SIGNALS TABLE
-- =============================================

CREATE TABLE user_verification_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Verification Types
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    id_document_verified BOOLEAN DEFAULT false,
    
    -- Activity Signals
    successful_transactions INTEGER DEFAULT 0,
    total_reviews_given INTEGER DEFAULT 0,
    total_reviews_received INTEGER DEFAULT 0,
    account_age_days INTEGER DEFAULT 0,
    
    -- Trust Score (calculated)
    trust_score INTEGER DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
    
    -- Verification Dates
    phone_verified_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    id_verified_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Transactions indexes
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_transactions_listing_id ON transactions(listing_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Reviews indexes
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_transaction_id ON reviews(transaction_id);
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX idx_reviews_verification_level ON reviews(verification_level);
CREATE INDEX idx_reviews_is_transaction_confirmed ON reviews(is_transaction_confirmed);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Verification signals indexes
CREATE INDEX idx_verification_signals_user_id ON user_verification_signals(user_id);
CREATE INDEX idx_verification_signals_trust_score ON user_verification_signals(trust_score);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification_signals ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create transactions as buyer" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Transaction participants can update" ON transactions
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Reviews policies
CREATE POLICY "Anyone can view published reviews" ON reviews
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can create reviews for their transactions" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM transactions 
            WHERE id = transaction_id 
            AND (buyer_id = auth.uid() OR seller_id = auth.uid())
        )
    );

CREATE POLICY "Reviewers can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewed users can respond to reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewed_user_id);

-- Review votes policies
CREATE POLICY "Users can view review votes" ON review_helpful_votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON review_helpful_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON review_helpful_votes
    FOR UPDATE USING (auth.uid() = user_id);

-- Verification signals policies
CREATE POLICY "Users can view verification signals" ON user_verification_signals
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own verification" ON user_verification_signals
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update transaction confirmation status
CREATE OR REPLACE FUNCTION update_transaction_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update confirmation arrays and status
    IF NEW.buyer_confirmed_at IS NOT NULL AND OLD.buyer_confirmed_at IS NULL THEN
        NEW.confirmed_by = array_append(NEW.confirmed_by, NEW.buyer_id);
    END IF;
    
    IF NEW.seller_confirmed_at IS NOT NULL AND OLD.seller_confirmed_at IS NULL THEN
        NEW.confirmed_by = array_append(NEW.confirmed_by, NEW.seller_id);
    END IF;
    
    -- Update status based on confirmations
    IF NEW.buyer_confirmed_at IS NOT NULL AND NEW.seller_confirmed_at IS NOT NULL THEN
        NEW.status = 'confirmed';
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_confirmation
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_confirmation();

-- Function to update review verification level
CREATE OR REPLACE FUNCTION update_review_verification_level()
RETURNS TRIGGER AS $$
DECLARE
    transaction_status TEXT;
    buyer_confirmed BOOLEAN;
    seller_confirmed BOOLEAN;
BEGIN
    -- Get transaction confirmation status
    SELECT 
        status,
        buyer_confirmed_at IS NOT NULL,
        seller_confirmed_at IS NOT NULL
    INTO transaction_status, buyer_confirmed, seller_confirmed
    FROM transactions 
    WHERE id = NEW.transaction_id;
    
    -- Set verification level based on transaction confirmation
    IF transaction_status = 'confirmed' AND buyer_confirmed AND seller_confirmed THEN
        NEW.verification_level = 'mutual_confirmed';
        NEW.is_transaction_confirmed = true;
    ELSIF buyer_confirmed OR seller_confirmed THEN
        NEW.verification_level = 'single_confirmed';
        NEW.is_transaction_confirmed = false;
    ELSE
        NEW.verification_level = 'unconfirmed';
        NEW.is_transaction_confirmed = false;
    END IF;
    
    -- Get reviewer's verification score
    SELECT COALESCE(trust_score, 0)
    INTO NEW.reviewer_verification_score
    FROM user_verification_signals
    WHERE user_id = NEW.reviewer_id;
    
    -- Set transaction value
    SELECT agreed_price
    INTO NEW.transaction_value
    FROM transactions
    WHERE id = NEW.transaction_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_verification_level
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_verification_level();

-- Function to update user ratings (enhanced for transaction-based reviews)
CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_total_reviews INTEGER;
    v_confirmed_reviews INTEGER;
    v_avg_confirmed_rating DECIMAL(3,2);
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Calculate ratings for the reviewed user
        SELECT 
            ROUND(AVG(rating), 2),
            COUNT(*),
            COUNT(*) FILTER (WHERE is_transaction_confirmed = true),
            ROUND(AVG(rating) FILTER (WHERE is_transaction_confirmed = true), 2)
        INTO v_avg_rating, v_total_reviews, v_confirmed_reviews, v_avg_confirmed_rating
        FROM reviews 
        WHERE reviewed_user_id = NEW.reviewed_user_id 
        AND status = 'published';
        
        -- Update profile with enhanced metrics
        UPDATE profiles 
        SET 
            rating = COALESCE(v_avg_rating, 0),
            total_reviews = v_total_reviews,
            confirmed_reviews = v_confirmed_reviews,
            confirmed_rating = COALESCE(v_avg_confirmed_rating, 0),
            updated_at = NOW()
        WHERE id = NEW.reviewed_user_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Recalculate after deletion
        SELECT 
            ROUND(AVG(rating), 2),
            COUNT(*),
            COUNT(*) FILTER (WHERE is_transaction_confirmed = true),
            ROUND(AVG(rating) FILTER (WHERE is_transaction_confirmed = true), 2)
        INTO v_avg_rating, v_total_reviews, v_confirmed_reviews, v_avg_confirmed_rating
        FROM reviews 
        WHERE reviewed_user_id = OLD.reviewed_user_id 
        AND status = 'published';
        
        UPDATE profiles 
        SET 
            rating = COALESCE(v_avg_rating, 0),
            total_reviews = v_total_reviews,
            confirmed_reviews = v_confirmed_reviews,
            confirmed_rating = COALESCE(v_avg_confirmed_rating, 0),
            updated_at = NOW()
        WHERE id = OLD.reviewed_user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_ratings
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_ratings();

-- Function to update user verification signals
CREATE OR REPLACE FUNCTION update_user_verification_signals()
RETURNS TRIGGER AS $$
DECLARE
    v_successful_transactions INTEGER;
    v_reviews_given INTEGER;
    v_reviews_received INTEGER;
    v_account_age_days INTEGER;
    v_trust_score INTEGER;
BEGIN
    -- Calculate metrics
    SELECT COUNT(*)
    INTO v_successful_transactions
    FROM transactions
    WHERE (buyer_id = NEW.user_id OR seller_id = NEW.user_id)
    AND status = 'confirmed';
    
    SELECT COUNT(*)
    INTO v_reviews_given
    FROM reviews
    WHERE reviewer_id = NEW.user_id
    AND status = 'published';
    
    SELECT COUNT(*)
    INTO v_reviews_received
    FROM reviews
    WHERE reviewed_user_id = NEW.user_id
    AND status = 'published';
    
    SELECT EXTRACT(DAYS FROM (NOW() - created_at))::INTEGER
    INTO v_account_age_days
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Calculate trust score (0-100)
    v_trust_score = 0;
    
    -- Phone verification: +20 points
    IF NEW.phone_verified THEN
        v_trust_score = v_trust_score + 20;
    END IF;
    
    -- Email verification: +10 points
    IF NEW.email_verified THEN
        v_trust_score = v_trust_score + 10;
    END IF;
    
    -- ID verification: +30 points
    IF NEW.id_document_verified THEN
        v_trust_score = v_trust_score + 30;
    END IF;
    
    -- Successful transactions: +2 points each (max 20)
    v_trust_score = v_trust_score + LEAST(v_successful_transactions * 2, 20);
    
    -- Reviews given: +1 point each (max 10)
    v_trust_score = v_trust_score + LEAST(v_reviews_given, 10);
    
    -- Account age: +1 point per 30 days (max 10)
    v_trust_score = v_trust_score + LEAST(v_account_age_days / 30, 10);
    
    -- Update the record
    NEW.successful_transactions = v_successful_transactions;
    NEW.total_reviews_given = v_reviews_given;
    NEW.total_reviews_received = v_reviews_received;
    NEW.account_age_days = v_account_age_days;
    NEW.trust_score = LEAST(v_trust_score, 100);
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_verification_signals
    BEFORE INSERT OR UPDATE ON user_verification_signals
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_signals();

-- =============================================
-- ADD COLUMNS TO EXISTING PROFILES TABLE
-- =============================================

-- Add new columns to profiles for enhanced review metrics
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS confirmed_reviews INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS confirmed_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS successful_meetups INTEGER DEFAULT 0;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to generate verification code for meetups
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Function to create transaction from accepted offer
CREATE OR REPLACE FUNCTION create_transaction_from_offer(
    p_offer_id UUID,
    p_meetup_location TEXT DEFAULT NULL,
    p_meetup_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_offer_record RECORD;
BEGIN
    -- Get offer details
    SELECT o.*, l.price
    INTO v_offer_record
    FROM offers o
    JOIN listings l ON o.listing_id = l.id
    WHERE o.id = p_offer_id
    AND o.status = 'accepted';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer not found or not accepted';
    END IF;
    
    -- Create transaction
    INSERT INTO transactions (
        buyer_id,
        seller_id,
        listing_id,
        conversation_id,
        agreed_price,
        meetup_location,
        meetup_time,
        verification_code,
        verification_code_expires_at
    ) VALUES (
        v_offer_record.buyer_id,
        v_offer_record.seller_id,
        v_offer_record.listing_id,
        v_offer_record.conversation_id,
        v_offer_record.amount,
        p_meetup_location,
        p_meetup_time,
        generate_verification_code(),
        NOW() + INTERVAL '7 days'
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user trust metrics
CREATE OR REPLACE FUNCTION get_user_trust_metrics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_metrics JSON;
BEGIN
    SELECT json_build_object(
        'trust_score', COALESCE(uvs.trust_score, 0),
        'phone_verified', COALESCE(uvs.phone_verified, false),
        'email_verified', COALESCE(uvs.email_verified, false),
        'id_verified', COALESCE(uvs.id_document_verified, false),
        'successful_transactions', COALESCE(uvs.successful_transactions, 0),
        'total_reviews', COALESCE(p.total_reviews, 0),
        'confirmed_reviews', COALESCE(p.confirmed_reviews, 0),
        'average_rating', COALESCE(p.rating, 0),
        'confirmed_rating', COALESCE(p.confirmed_rating, 0),
        'account_age_days', COALESCE(uvs.account_age_days, 0)
    )
    INTO v_metrics
    FROM profiles p
    LEFT JOIN user_verification_signals uvs ON p.id = uvs.user_id
    WHERE p.id = p_user_id;
    
    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Create verification signals for existing users
INSERT INTO user_verification_signals (user_id, email_verified, phone_verified)
SELECT 
    id,
    email_confirmed_at IS NOT NULL,
    phone IS NOT NULL AND phone != ''
FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Success message
SELECT 'Transaction-based review system migration completed successfully!' as status;
