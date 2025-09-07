-- =============================================
-- SELLAR MOBILE APP - SOCIAL FEATURES
-- Migration 06: Reviews, follows, and social interactions
-- =============================================

-- =============================================
-- REVIEWS TABLE
-- =============================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Review Content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    
    -- Review Context
    transaction_type TEXT CHECK (transaction_type IN ('purchase', 'sale', 'inquiry')),
    
    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'flagged')),
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    flagged_at TIMESTAMPTZ,
    
    -- Helpfulness
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Response
    response TEXT,
    response_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure reviewer can't review themselves
    CHECK (reviewer_id != reviewed_user_id),
    
    -- One review per listing per user
    UNIQUE(listing_id, reviewer_id)
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
-- FOLLOWS TABLE
-- =============================================

CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can't follow themselves
    CHECK (follower_id != following_id),
    
    UNIQUE(follower_id, following_id)
);

-- =============================================
-- POSTS TABLE (Community Features)
-- =============================================

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Post Content
    content TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    
    -- Post Context
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    location TEXT,
    
    -- Post Type
    post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general', 'question', 'tip', 'announcement')),
    
    -- Engagement
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'deleted')),
    is_pinned BOOLEAN DEFAULT false,
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POST LIKES TABLE
-- =============================================

CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(post_id, user_id)
);

-- =============================================
-- COMMENTS TABLE
-- =============================================

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Comment Content
    content TEXT NOT NULL,
    
    -- Reply Structure
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Engagement
    like_count INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMENT LIKES TABLE
-- =============================================

CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(comment_id, user_id)
);

-- =============================================
-- SHARES TABLE
-- =============================================

CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Share Context
    share_type TEXT DEFAULT 'standard' CHECK (share_type IN ('standard', 'boost', 'sponsored')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can't share the same post twice
    UNIQUE(user_id, post_id)
);

-- =============================================
-- POST BOOKMARKS TABLE
-- =============================================

CREATE TABLE post_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Bookmark Context
    folder TEXT DEFAULT 'default', -- For organizing saved posts
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can't bookmark the same post twice
    UNIQUE(user_id, post_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Reviews indexes
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Review helpful votes indexes
CREATE INDEX idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX idx_review_helpful_votes_user_id ON review_helpful_votes(user_id);

-- Follows indexes
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at);

-- Posts indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_post_type ON posts(post_type);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_like_count ON posts(like_count);
CREATE INDEX idx_posts_listing_id ON posts(listing_id);
CREATE INDEX idx_posts_location ON posts(location);
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned);

-- Post likes indexes
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);

-- Comments indexes
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Comment likes indexes
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

-- Shares indexes
CREATE INDEX idx_shares_user_id ON shares(user_id);
CREATE INDEX idx_shares_post_id ON shares(post_id);
CREATE INDEX idx_shares_created_at ON shares(created_at DESC);
CREATE INDEX idx_shares_share_type ON shares(share_type);

-- Bookmarks indexes
CREATE INDEX idx_post_bookmarks_user_id ON post_bookmarks(user_id);
CREATE INDEX idx_post_bookmarks_post_id ON post_bookmarks(post_id);
CREATE INDEX idx_post_bookmarks_folder ON post_bookmarks(folder);
CREATE INDEX idx_post_bookmarks_created_at ON post_bookmarks(created_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on reviews
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on posts
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on comments
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SOCIAL FUNCTIONS
-- =============================================

-- Function to update review helpful counts
CREATE OR REPLACE FUNCTION update_review_helpful_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_helpful THEN
            UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
        ELSE
            UPDATE reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_helpful != NEW.is_helpful THEN
            IF NEW.is_helpful THEN
                UPDATE reviews SET 
                    helpful_count = helpful_count + 1,
                    not_helpful_count = not_helpful_count - 1
                WHERE id = NEW.review_id;
            ELSE
                UPDATE reviews SET 
                    helpful_count = helpful_count - 1,
                    not_helpful_count = not_helpful_count + 1
                WHERE id = NEW.review_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_helpful THEN
            UPDATE reviews SET helpful_count = helpful_count - 1 WHERE id = OLD.review_id;
        ELSE
            UPDATE reviews SET not_helpful_count = not_helpful_count - 1 WHERE id = OLD.review_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for review helpful counts
CREATE TRIGGER update_review_helpful_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpful_counts();

-- Function to update follow counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower count for the followed user
        UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
        -- Increment following count for the follower
        UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower count for the unfollowed user
        UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
        -- Decrement following count for the unfollower
        UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for follow counts
CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR DELETE ON follows
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_counts();

-- Function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET posts_count = posts_count - 1 WHERE id = OLD.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for post counts
CREATE TRIGGER update_post_counts_trigger
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_counts();

-- Function to update post like counts
CREATE OR REPLACE FUNCTION update_post_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for post like counts
CREATE TRIGGER update_post_like_counts_trigger
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_like_counts();

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment counts
CREATE TRIGGER update_comment_counts_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_counts();

-- Function to update comment like counts
CREATE OR REPLACE FUNCTION update_comment_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment like counts
CREATE TRIGGER update_comment_like_counts_trigger
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_like_counts();

-- Function to update post share counts
CREATE OR REPLACE FUNCTION update_post_share_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET share_count = share_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET share_count = GREATEST(0, share_count - 1) WHERE id = OLD.post_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for post share counts
CREATE TRIGGER update_post_share_counts_trigger
    AFTER INSERT OR DELETE ON shares
    FOR EACH ROW
    EXECUTE FUNCTION update_post_share_counts();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to toggle post bookmark
CREATE OR REPLACE FUNCTION toggle_post_bookmark(
    p_post_id UUID,
    p_folder TEXT DEFAULT 'default'
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_bookmark_id UUID;
    v_action TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if bookmark exists
    SELECT id INTO v_bookmark_id
    FROM post_bookmarks
    WHERE user_id = v_user_id AND post_id = p_post_id;
    
    IF v_bookmark_id IS NOT NULL THEN
        -- Remove bookmark
        DELETE FROM post_bookmarks WHERE id = v_bookmark_id;
        v_action := 'removed';
    ELSE
        -- Add bookmark
        INSERT INTO post_bookmarks (user_id, post_id, folder)
        VALUES (v_user_id, p_post_id, p_folder);
        v_action := 'added';
    END IF;
    
    RETURN json_build_object('success', true, 'action', v_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to share a post
CREATE OR REPLACE FUNCTION share_post(
    p_post_id UUID,
    p_share_type TEXT DEFAULT 'standard'
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_share_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if already shared
    SELECT id INTO v_share_id
    FROM shares
    WHERE user_id = v_user_id AND post_id = p_post_id;
    
    IF v_share_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Post already shared');
    END IF;
    
    -- Create share
    INSERT INTO shares (user_id, post_id, share_type)
    VALUES (v_user_id, p_post_id, p_share_type)
    RETURNING id INTO v_share_id;
    
    RETURN json_build_object('success', true, 'share_id', v_share_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's bookmarked posts
CREATE OR REPLACE FUNCTION get_user_bookmarks(
    p_folder TEXT DEFAULT 'default',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_id UUID,
    folder TEXT,
    bookmarked_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.post_id,
        pb.folder,
        pb.created_at
    FROM post_bookmarks pb
    WHERE pb.user_id = auth.uid()
        AND (p_folder IS NULL OR pb.folder = p_folder)
    ORDER BY pb.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Social features tables created successfully!' as status;
