-- =============================================
-- FIX: Add missing rating columns to profiles table
-- =============================================

-- The profiles table is missing rating-related columns that the frontend expects.
-- This script adds the missing columns to match the frontend expectations.

-- =============================================
-- 1. Add missing rating columns to profiles table
-- =============================================

-- Add rating column (the main one the frontend expects)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;

-- Add total_reviews column (for review count)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Add total_sales column (for sales count)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;

-- Add credit_balance column (for user credits)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_balance INTEGER DEFAULT 0;

-- Add response_time column (for response time display)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS response_time TEXT DEFAULT 'within_hours';

-- Add account_type column (for account type display)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'personal';

-- =============================================
-- 2. Create indexes for performance
-- =============================================

-- Index for rating queries
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating);

-- Index for total_reviews queries
CREATE INDEX IF NOT EXISTS idx_profiles_total_reviews ON profiles(total_reviews);

-- Index for total_sales queries
CREATE INDEX IF NOT EXISTS idx_profiles_total_sales ON profiles(total_sales);

-- =============================================
-- 3. Update the rating calculation function
-- =============================================

-- Function to update user ratings (corrected to use the right column names)
CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_total_reviews INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Calculate new average rating for reviewed user
        SELECT 
            ROUND(AVG(rating), 2),
            COUNT(*)
        INTO v_avg_rating, v_total_reviews
        FROM reviews 
        WHERE reviewed_user_id = NEW.reviewed_user_id 
        AND is_public = true;
        
        -- Update profile with correct column names
        UPDATE profiles 
        SET 
            rating = COALESCE(v_avg_rating, 0),
            total_reviews = v_total_reviews
        WHERE id = NEW.reviewed_user_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Recalculate if rating changed or visibility changed
        IF OLD.rating != NEW.rating OR OLD.is_public != NEW.is_public THEN
            SELECT 
                ROUND(AVG(rating), 2),
                COUNT(*)
            INTO v_avg_rating, v_total_reviews
            FROM reviews 
            WHERE reviewed_user_id = NEW.reviewed_user_id 
            AND is_public = true;
            
            UPDATE profiles 
            SET 
                rating = COALESCE(v_avg_rating, 0),
                total_reviews = v_total_reviews
            WHERE id = NEW.reviewed_user_id;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Recalculate after deletion
        SELECT 
            ROUND(AVG(rating), 2),
            COUNT(*)
        INTO v_avg_rating, v_total_reviews
        FROM reviews 
        WHERE reviewed_user_id = OLD.reviewed_user_id 
        AND is_public = true;
        
        UPDATE profiles 
        SET 
            rating = COALESCE(v_avg_rating, 0),
            total_reviews = v_total_reviews
        WHERE id = OLD.reviewed_user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. Create trigger for automatic rating updates
-- =============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_ratings_trigger ON reviews;

-- Create new trigger
CREATE TRIGGER update_user_ratings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_ratings();

-- =============================================
-- 5. Backfill existing data
-- =============================================

-- Update existing profiles with calculated ratings
UPDATE profiles 
SET 
    rating = COALESCE((
        SELECT ROUND(AVG(rating), 2)
        FROM reviews 
        WHERE reviewed_user_id = profiles.id 
        AND is_public = true
    ), 0),
    total_reviews = COALESCE((
        SELECT COUNT(*)
        FROM reviews 
        WHERE reviewed_user_id = profiles.id 
        AND is_public = true
    ), 0);

-- =============================================
-- 6. Update the fix_multiple_relationships.sql script
-- =============================================

-- The helper function in fix_multiple_relationships.sql also needs to be updated
-- to use the correct column name

-- =============================================
-- 7. Grant permissions
-- =============================================

-- Ensure authenticated users can read these columns
GRANT SELECT ON profiles TO authenticated;

-- =============================================
-- 8. Add comments for clarity
-- =============================================

COMMENT ON COLUMN profiles.rating IS 'Average rating calculated from reviews (0.00 to 5.00)';
COMMENT ON COLUMN profiles.total_reviews IS 'Total number of public reviews received';
COMMENT ON COLUMN profiles.total_sales IS 'Total number of sales completed';
COMMENT ON COLUMN profiles.credit_balance IS 'Current credit balance for the user';
COMMENT ON COLUMN profiles.response_time IS 'Expected response time for messages';

-- Success message
SELECT 'Rating columns added to profiles table successfully!' as status;
