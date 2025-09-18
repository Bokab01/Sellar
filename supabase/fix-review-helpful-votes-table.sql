-- Create review_helpful_votes table for community feedback on reviews
-- This table tracks which users found reviews helpful

CREATE TABLE IF NOT EXISTS review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate votes from same user on same review
    UNIQUE(review_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user_id ON review_helpful_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_created_at ON review_helpful_votes(created_at DESC);

-- Add trigger to update review helpful_count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update helpful_count in reviews table
    UPDATE reviews 
    SET helpful_count = (
        SELECT COUNT(*) 
        FROM review_helpful_votes 
        WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
        AND is_helpful = true
    )
    WHERE id = COALESCE(NEW.review_id, OLD.review_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for helpful count updates
DROP TRIGGER IF EXISTS trigger_update_review_helpful_count ON review_helpful_votes;
CREATE TRIGGER trigger_update_review_helpful_count
    AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
    FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- Add RLS policies
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Users can view all helpful votes
CREATE POLICY "Anyone can view helpful votes" ON review_helpful_votes
    FOR SELECT USING (true);

-- Users can insert their own helpful votes (but not on their own reviews)
CREATE POLICY "Users can vote on others' reviews" ON review_helpful_votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND NOT EXISTS (
            SELECT 1 FROM reviews 
            WHERE reviews.id = review_id 
            AND reviews.reviewer_id = auth.uid()
        )
    );

-- Users can update their own votes
CREATE POLICY "Users can update their own votes" ON review_helpful_votes
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes" ON review_helpful_votes
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE review_helpful_votes IS 'Tracks helpful votes on reviews by community members';
COMMENT ON COLUMN review_helpful_votes.review_id IS 'Reference to the review being voted on';
COMMENT ON COLUMN review_helpful_votes.user_id IS 'User who cast the vote';
COMMENT ON COLUMN review_helpful_votes.is_helpful IS 'Whether the vote is helpful (true) or not helpful (false)';
-- Note: Self-voting prevention is handled by RLS policies and application logic
