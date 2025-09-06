-- Content Moderation System - Simple Step-by-Step Approach
-- This version creates everything step by step to avoid any dependency issues

-- Step 1: Create moderation_categories table (no dependencies)
CREATE TABLE IF NOT EXISTS moderation_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  severity_level INTEGER NOT NULL DEFAULT 1,
  auto_action TEXT NOT NULL DEFAULT 'flag',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert categories
INSERT INTO moderation_categories (name, description, severity_level, auto_action) VALUES
('illegal_items', 'Illegal goods, drugs, weapons, stolen items', 4, 'reject'),
('adult_content', 'Adult/sexual content, nudity', 3, 'reject'),
('scams', 'Fraudulent listings, fake items, misleading content', 3, 'flag'),
('offensive_material', 'Hate speech, harassment, discriminatory content', 3, 'flag'),
('spam', 'Repetitive, promotional, or irrelevant content', 2, 'flag'),
('violence', 'Violent imagery or threatening content', 4, 'reject'),
('copyright', 'Copyright infringement, counterfeit goods', 2, 'flag'),
('personal_info', 'Sharing personal information inappropriately', 2, 'flag')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create moderation_logs table (minimal version first)
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  moderation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  confidence_score DECIMAL(3,2),
  flagged_content JSONB,
  ai_response JSONB,
  moderator_notes TEXT,
  auto_action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add columns to moderation_logs one by one
ALTER TABLE moderation_logs ADD COLUMN IF NOT EXISTS listing_id UUID;
ALTER TABLE moderation_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE moderation_logs ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE moderation_logs ADD COLUMN IF NOT EXISTS moderator_id UUID;

-- Step 4: Create reports table (minimal version first)
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 1,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Add columns to reports one by one
ALTER TABLE reports ADD COLUMN IF NOT EXISTS listing_id UUID;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_id UUID;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_user_id UUID;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by UUID;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
-- Ensure priority column exists (in case table was created without it)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1;

-- Step 6: Create user_reputation table (minimal version first)
CREATE TABLE IF NOT EXISTS user_reputation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reputation_score INTEGER NOT NULL DEFAULT 100,
  trust_level INTEGER NOT NULL DEFAULT 1,
  total_listings INTEGER NOT NULL DEFAULT 0,
  flagged_listings INTEGER NOT NULL DEFAULT 0,
  successful_sales INTEGER NOT NULL DEFAULT 0,
  reports_against INTEGER NOT NULL DEFAULT 0,
  reports_upheld INTEGER NOT NULL DEFAULT 0,
  last_violation_at TIMESTAMP WITH TIME ZONE,
  moderation_bypass BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Add user_id column to user_reputation
ALTER TABLE user_reputation ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- Step 8: Create keyword_blacklist table (minimal version first)
CREATE TABLE IF NOT EXISTS keyword_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  severity_level INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  match_type TEXT NOT NULL DEFAULT 'exact',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 9: Add columns to keyword_blacklist
ALTER TABLE keyword_blacklist ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE keyword_blacklist ADD COLUMN IF NOT EXISTS created_by UUID;

-- Step 10: Add foreign key constraints to moderation_categories references
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'moderation_logs_category_fkey') THEN
        ALTER TABLE moderation_logs ADD CONSTRAINT moderation_logs_category_fkey 
        FOREIGN KEY (category_id) REFERENCES moderation_categories(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_category_fkey') THEN
        ALTER TABLE reports ADD CONSTRAINT reports_category_fkey 
        FOREIGN KEY (category_id) REFERENCES moderation_categories(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'keyword_blacklist_category_fkey') THEN
        ALTER TABLE keyword_blacklist ADD CONSTRAINT keyword_blacklist_category_fkey 
        FOREIGN KEY (category_id) REFERENCES moderation_categories(id);
    END IF;
END $$;

-- Step 11: Insert keywords (now that category_id constraint exists)
INSERT INTO keyword_blacklist (keyword, category_id, severity_level, match_type) VALUES
-- Illegal items
('cocaine', (SELECT id FROM moderation_categories WHERE name = 'illegal_items'), 4, 'exact'),
('heroin', (SELECT id FROM moderation_categories WHERE name = 'illegal_items'), 4, 'exact'),
('marijuana', (SELECT id FROM moderation_categories WHERE name = 'illegal_items'), 4, 'exact'),
('weed', (SELECT id FROM moderation_categories WHERE name = 'illegal_items'), 3, 'exact'),
('gun', (SELECT id FROM moderation_categories WHERE name = 'illegal_items'), 4, 'exact'),
('weapon', (SELECT id FROM moderation_categories WHERE name = 'illegal_items'), 3, 'partial'),
('stolen', (SELECT id FROM moderation_categories WHERE name = 'illegal_items'), 4, 'exact'),
-- Adult content
('escort', (SELECT id FROM moderation_categories WHERE name = 'adult_content'), 4, 'exact'),
('massage', (SELECT id FROM moderation_categories WHERE name = 'adult_content'), 2, 'exact'),
('adult services', (SELECT id FROM moderation_categories WHERE name = 'adult_content'), 4, 'exact'),
-- Scams
('too good to be true', (SELECT id FROM moderation_categories WHERE name = 'scams'), 3, 'partial'),
('send money first', (SELECT id FROM moderation_categories WHERE name = 'scams'), 4, 'partial'),
('wire transfer', (SELECT id FROM moderation_categories WHERE name = 'scams'), 3, 'partial'),
('western union', (SELECT id FROM moderation_categories WHERE name = 'scams'), 3, 'partial'),
('fake', (SELECT id FROM moderation_categories WHERE name = 'scams'), 2, 'exact'),
('replica', (SELECT id FROM moderation_categories WHERE name = 'copyright'), 2, 'exact')
ON CONFLICT (keyword) DO NOTHING;

-- Step 12: Add foreign key constraints to listings table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        -- Add constraint for moderation_logs.listing_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'moderation_logs_listing_fkey') THEN
            ALTER TABLE moderation_logs ADD CONSTRAINT moderation_logs_listing_fkey 
            FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
        END IF;
        
        -- Add constraint for reports.listing_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_listing_fkey') THEN
            ALTER TABLE reports ADD CONSTRAINT reports_listing_fkey 
            FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Step 13: Add foreign key constraints to profiles table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Add constraints for moderation_logs
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'moderation_logs_user_fkey') THEN
            ALTER TABLE moderation_logs ADD CONSTRAINT moderation_logs_user_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'moderation_logs_moderator_fkey') THEN
            ALTER TABLE moderation_logs ADD CONSTRAINT moderation_logs_moderator_fkey 
            FOREIGN KEY (moderator_id) REFERENCES profiles(id);
        END IF;
        
        -- Add constraints for reports
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_reporter_fkey') THEN
            ALTER TABLE reports ADD CONSTRAINT reports_reporter_fkey 
            FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_reported_user_fkey') THEN
            ALTER TABLE reports ADD CONSTRAINT reports_reported_user_fkey 
            FOREIGN KEY (reported_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_resolved_by_fkey') THEN
            ALTER TABLE reports ADD CONSTRAINT reports_resolved_by_fkey 
            FOREIGN KEY (resolved_by) REFERENCES profiles(id);
        END IF;
        
        -- Add constraint for user_reputation
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_reputation_user_fkey') THEN
            ALTER TABLE user_reputation ADD CONSTRAINT user_reputation_user_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        -- Add constraint for keyword_blacklist
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'keyword_blacklist_created_by_fkey') THEN
            ALTER TABLE keyword_blacklist ADD CONSTRAINT keyword_blacklist_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- Step 14: Add moderation columns to existing tables
DO $$
BEGIN
    -- Add columns to listings table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        ALTER TABLE listings ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';
        ALTER TABLE listings ADD COLUMN IF NOT EXISTS moderation_score DECIMAL(3,2) DEFAULT 0.00;
        ALTER TABLE listings ADD COLUMN IF NOT EXISTS flagged_reasons TEXT[];
        ALTER TABLE listings ADD COLUMN IF NOT EXISTS auto_moderated_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE listings ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE listings ADD COLUMN IF NOT EXISTS admin_reviewed_by UUID;
        
        -- Add constraint for admin_reviewed_by if profiles exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'listings_admin_reviewed_by_fkey') THEN
            ALTER TABLE listings ADD CONSTRAINT listings_admin_reviewed_by_fkey 
            FOREIGN KEY (admin_reviewed_by) REFERENCES profiles(id);
        END IF;
    END IF;
    
    -- Add columns to profiles table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
    END IF;
END $$;

-- Step 15: Create indexes
CREATE INDEX IF NOT EXISTS idx_moderation_logs_listing_id ON moderation_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_id ON moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_status ON moderation_logs(status);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON moderation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_reports_listing_id ON reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);

CREATE INDEX IF NOT EXISTS idx_user_reputation_user_id ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_trust_level ON user_reputation(trust_level);

-- Step 16: Enable RLS
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_categories ENABLE ROW LEVEL SECURITY;

-- Step 17: Create basic RLS policies (simplified)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'moderation_categories_public_read') THEN
        CREATE POLICY "moderation_categories_public_read" ON moderation_categories FOR SELECT USING (TRUE);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_reputation_public_read') THEN
        CREATE POLICY "user_reputation_public_read" ON user_reputation FOR SELECT USING (TRUE);
    END IF;
END $$;

-- Step 18: Create functions
CREATE OR REPLACE FUNCTION should_apply_strict_moderation(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_rep user_reputation%ROWTYPE;
BEGIN
  SELECT * INTO user_rep FROM user_reputation WHERE user_id = user_uuid;
  
  IF user_rep IS NULL OR user_rep.trust_level = 1 OR user_rep.reputation_score < 50 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_moderation_threshold(user_uuid UUID)
RETURNS DECIMAL AS $$
BEGIN
  IF should_apply_strict_moderation(user_uuid) THEN
    RETURN 0.3;
  ELSE
    RETURN 0.7;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 19: Initialize user reputation for existing users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        INSERT INTO user_reputation (user_id, total_listings)
        SELECT 
          id,
          CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') 
            THEN (SELECT COUNT(*) FROM listings WHERE user_id = profiles.id)
            ELSE 0
          END
        FROM profiles
        WHERE NOT EXISTS (SELECT 1 FROM user_reputation WHERE user_id = profiles.id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors in initialization
        NULL;
END $$;

-- Step 20: Add table comments
COMMENT ON TABLE moderation_categories IS 'Categories of content violations';
COMMENT ON TABLE moderation_logs IS 'Audit trail of all moderation actions';
COMMENT ON TABLE reports IS 'Community reports of inappropriate content';
COMMENT ON TABLE user_reputation IS 'User trust scores and moderation history';
COMMENT ON TABLE keyword_blacklist IS 'Banned keywords and phrases';

-- Success message
SELECT 'Content moderation system installed successfully!' as status,
       (SELECT COUNT(*) FROM moderation_categories) as categories_created,
       (SELECT COUNT(*) FROM keyword_blacklist) as keywords_added;
