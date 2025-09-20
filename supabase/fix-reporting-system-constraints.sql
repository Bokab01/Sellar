-- Fix reporting system constraints and missing columns
-- This script fixes the constraint violations in the reporting system

-- =============================================
-- 1. ADD 'hidden' STATUS TO LISTINGS CONSTRAINT
-- =============================================

-- Drop the existing constraint
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;

-- Add the new constraint with 'hidden' status
ALTER TABLE listings ADD CONSTRAINT listings_status_check 
    CHECK (status IN ('active', 'sold', 'draft', 'expired', 'suspended', 'pending', 'reserved', 'hidden'));

-- Update the comment to reflect the new status
COMMENT ON COLUMN listings.status IS 'Listing status: active (available), sold (completed), draft (not published), expired (time expired), suspended (moderated), pending (awaiting approval), reserved (temporarily held during offer process), hidden (hidden by moderation)';

-- =============================================
-- 2. ADD STATUS COLUMN TO POSTS TABLE
-- =============================================

-- Add status column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'hidden', 'suspended', 'deleted'));

-- Add comment for the new column
COMMENT ON COLUMN posts.status IS 'Post status: active (visible), hidden (hidden by moderation), suspended (temporarily hidden), deleted (soft deleted)';

-- =============================================
-- 3. ADD STATUS COLUMN TO COMMENTS TABLE
-- =============================================

-- Add status column to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'hidden', 'suspended', 'deleted'));

-- Add comment for the new column
COMMENT ON COLUMN comments.status IS 'Comment status: active (visible), hidden (hidden by moderation), suspended (temporarily hidden), deleted (soft deleted)';

-- =============================================
-- 4. UPDATE EXISTING RECORDS
-- =============================================

-- Set all existing posts to 'active' status
UPDATE posts SET status = 'active' WHERE status IS NULL;

-- Set all existing comments to 'active' status
UPDATE comments SET status = 'active' WHERE status IS NULL;

-- =============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Create indexes for the new status columns
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

-- =============================================
-- 6. FIX MODERATION_ACTIONS MODERATOR_ID CONSTRAINT
-- =============================================

-- Make moderator_id nullable to allow system actions
ALTER TABLE moderation_actions ALTER COLUMN moderator_id DROP NOT NULL;

-- =============================================
-- 7. UPDATE RLS POLICIES (if needed)
-- =============================================

-- Note: You may need to update RLS policies to respect the new status columns
-- This would typically be done in a separate migration or policy update

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify the constraints are working
DO $$
BEGIN
    -- Test listings constraint
    BEGIN
        INSERT INTO listings (user_id, title, description, price, category_id, condition, location, status) 
        VALUES ('00000000-0000-4000-8000-000000000001', 'Test', 'Test', 0, '00000000-0000-4000-8000-000000000001', 'new', 'Test', 'hidden');
        DELETE FROM listings WHERE title = 'Test';
        RAISE NOTICE 'Listings constraint with hidden status: OK';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Listings constraint with hidden status: FAILED - %', SQLERRM;
    END;
    
    -- Test posts constraint
    BEGIN
        INSERT INTO posts (user_id, content, status) 
        VALUES ('00000000-0000-4000-8000-000000000001', 'Test', 'hidden');
        DELETE FROM posts WHERE content = 'Test';
        RAISE NOTICE 'Posts constraint with hidden status: OK';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Posts constraint with hidden status: FAILED - %', SQLERRM;
    END;
    
    -- Test comments constraint
    BEGIN
        INSERT INTO comments (post_id, user_id, content, status) 
        VALUES ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Test', 'hidden');
        DELETE FROM comments WHERE content = 'Test';
        RAISE NOTICE 'Comments constraint with hidden status: OK';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Comments constraint with hidden status: FAILED - %', SQLERRM;
    END;
    
    -- Test moderation_actions with NULL moderator_id
    BEGIN
        INSERT INTO moderation_actions (report_id, moderator_id, action_type, target_type, target_id, reason) 
        VALUES ('00000000-0000-4000-8000-000000000001', NULL, 'hide', 'listing', '00000000-0000-4000-8000-000000000001', 'System test');
        DELETE FROM moderation_actions WHERE reason = 'System test';
        RAISE NOTICE 'Moderation actions with NULL moderator_id: OK';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Moderation actions with NULL moderator_id: FAILED - %', SQLERRM;
    END;
END $$;
