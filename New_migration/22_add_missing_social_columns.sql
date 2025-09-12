-- =============================================
-- SELLAR MOBILE APP - ADD MISSING SOCIAL COLUMNS
-- Migration 22: Add missing social count columns to profiles table
-- =============================================

-- Add missing social count columns to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add followers_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'followers_count'
    ) THEN
        ALTER TABLE profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
    END IF;

    -- Add following_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'following_count'
    ) THEN
        ALTER TABLE profiles ADD COLUMN following_count INTEGER DEFAULT 0;
    END IF;

    -- Add posts_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'posts_count'
    ) THEN
        ALTER TABLE profiles ADD COLUMN posts_count INTEGER DEFAULT 0;
    END IF;

    -- Add listings_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'listings_count'
    ) THEN
        ALTER TABLE profiles ADD COLUMN listings_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes for performance on the new columns
CREATE INDEX IF NOT EXISTS idx_profiles_followers_count ON profiles(followers_count);
CREATE INDEX IF NOT EXISTS idx_profiles_following_count ON profiles(following_count);
CREATE INDEX IF NOT EXISTS idx_profiles_posts_count ON profiles(posts_count);
CREATE INDEX IF NOT EXISTS idx_profiles_listings_count ON profiles(listings_count);

-- Update existing profiles to have correct counts
-- Note: This will set all counts to 0 initially, which is safe for a new feature

-- If follows table exists, update follower/following counts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
        -- Update followers_count
        UPDATE profiles SET followers_count = (
            SELECT COUNT(*) FROM follows WHERE following_id = profiles.id
        );
        
        -- Update following_count
        UPDATE profiles SET following_count = (
            SELECT COUNT(*) FROM follows WHERE follower_id = profiles.id
        );
    END IF;
END $$;

-- If posts table exists, update posts_count
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        UPDATE profiles SET posts_count = (
            SELECT COUNT(*) FROM posts WHERE user_id = profiles.id
        );
    END IF;
END $$;

-- If listings table exists, update listings_count
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        UPDATE profiles SET listings_count = (
            SELECT COUNT(*) FROM listings WHERE user_id = profiles.id
        );
    END IF;
END $$;

-- Create or replace triggers to maintain counts (if the related tables exist)

-- Trigger for follows table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS update_follow_counts_trigger ON follows;
        
        -- Create the trigger function
        CREATE OR REPLACE FUNCTION update_follow_counts()
        RETURNS TRIGGER AS $trigger$
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
        $trigger$ LANGUAGE plpgsql;

        -- Create the trigger
        CREATE TRIGGER update_follow_counts_trigger
            AFTER INSERT OR DELETE ON follows
            FOR EACH ROW EXECUTE FUNCTION update_follow_counts();
    END IF;
END $$;

-- Trigger for posts table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS update_posts_count_trigger ON posts;
        
        -- Create the trigger function
        CREATE OR REPLACE FUNCTION update_posts_count()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                UPDATE profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE profiles SET posts_count = posts_count - 1 WHERE id = OLD.user_id;
            END IF;
            
            RETURN COALESCE(NEW, OLD);
        END;
        $trigger$ LANGUAGE plpgsql;

        -- Create the trigger
        CREATE TRIGGER update_posts_count_trigger
            AFTER INSERT OR DELETE ON posts
            FOR EACH ROW EXECUTE FUNCTION update_posts_count();
    END IF;
END $$;

-- Trigger for listings table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS update_listings_count_trigger ON listings;
        
        -- Create the trigger function
        CREATE OR REPLACE FUNCTION update_listings_count()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                UPDATE profiles SET listings_count = listings_count + 1 WHERE id = NEW.user_id;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE profiles SET listings_count = listings_count - 1 WHERE id = OLD.user_id;
            END IF;
            
            RETURN COALESCE(NEW, OLD);
        END;
        $trigger$ LANGUAGE plpgsql;

        -- Create the trigger
        CREATE TRIGGER update_listings_count_trigger
            AFTER INSERT OR DELETE ON listings
            FOR EACH ROW EXECUTE FUNCTION update_listings_count();
    END IF;
END $$;
