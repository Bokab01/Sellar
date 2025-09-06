-- Content Moderation System Database Schema (Fixed)
-- This migration adds comprehensive moderation capabilities
-- Fixed to handle cases where listings table might not exist yet

-- Create moderation_categories table
CREATE TABLE IF NOT EXISTS moderation_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  severity_level INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=critical
  auto_action TEXT NOT NULL DEFAULT 'flag', -- flag, reject, ban
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default moderation categories
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

-- Create moderation_logs table (without foreign key to listings initially)
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID, -- Will add foreign key constraint later if listings table exists
  user_id UUID, -- Will add foreign key constraint later if profiles table exists
  moderation_type TEXT NOT NULL, -- 'ai_text', 'ai_image', 'keyword', 'community_report', 'admin_review'
  category_id UUID REFERENCES moderation_categories(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, escalated
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 for AI confidence
  flagged_content JSONB, -- Store specific flagged content details
  ai_response JSONB, -- Store full AI API response for auditing
  moderator_id UUID, -- Admin who reviewed (will add FK later)
  moderator_notes TEXT,
  auto_action_taken TEXT, -- What automatic action was taken
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table (without foreign key to listings initially)
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID, -- Will add foreign key constraint later
  reporter_id UUID, -- Will add foreign key constraint later
  reported_user_id UUID, -- Will add foreign key constraint later
  category_id UUID REFERENCES moderation_categories(id),
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[], -- Screenshots or other evidence
  status TEXT NOT NULL DEFAULT 'pending', -- pending, investigating, resolved, dismissed
  priority INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
  admin_notes TEXT,
  resolved_by UUID, -- Will add foreign key constraint later
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_reputation table (without foreign key to profiles initially)
CREATE TABLE IF NOT EXISTS user_reputation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE, -- Will add foreign key constraint later
  reputation_score INTEGER NOT NULL DEFAULT 100, -- Start at 100, can go down to 0
  trust_level INTEGER NOT NULL DEFAULT 1, -- 1=new, 2=basic, 3=trusted, 4=verified
  total_listings INTEGER NOT NULL DEFAULT 0,
  flagged_listings INTEGER NOT NULL DEFAULT 0,
  successful_sales INTEGER NOT NULL DEFAULT 0,
  reports_against INTEGER NOT NULL DEFAULT 0,
  reports_upheld INTEGER NOT NULL DEFAULT 0,
  last_violation_at TIMESTAMP WITH TIME ZONE,
  moderation_bypass BOOLEAN NOT NULL DEFAULT FALSE, -- For trusted sellers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create keyword_blacklist table (without foreign key to profiles initially)
CREATE TABLE IF NOT EXISTS keyword_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES moderation_categories(id),
  severity_level INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  match_type TEXT NOT NULL DEFAULT 'exact', -- exact, partial, regex
  created_by UUID, -- Will add foreign key constraint later
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default blacklisted keywords
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
-- Add more as needed
('fake', (SELECT id FROM moderation_categories WHERE name = 'scams'), 2, 'exact'),
('replica', (SELECT id FROM moderation_categories WHERE name = 'copyright'), 2, 'exact')
ON CONFLICT (keyword) DO NOTHING;

-- Now add foreign key constraints if the referenced tables exist
DO $$
BEGIN
    -- Add foreign key constraints for moderation_logs if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'moderation_logs_listing_id_fkey') THEN
            ALTER TABLE moderation_logs 
            ADD CONSTRAINT moderation_logs_listing_id_fkey 
            FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'moderation_logs_user_id_fkey') THEN
            ALTER TABLE moderation_logs 
            ADD CONSTRAINT moderation_logs_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'moderation_logs_moderator_id_fkey') THEN
            ALTER TABLE moderation_logs 
            ADD CONSTRAINT moderation_logs_moderator_id_fkey 
            FOREIGN KEY (moderator_id) REFERENCES profiles(id);
        END IF;
    END IF;

    -- Add foreign key constraints for reports if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'reports_listing_id_fkey') THEN
            ALTER TABLE reports 
            ADD CONSTRAINT reports_listing_id_fkey 
            FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'reports_reporter_id_fkey') THEN
            ALTER TABLE reports 
            ADD CONSTRAINT reports_reporter_id_fkey 
            FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'reports_reported_user_id_fkey') THEN
            ALTER TABLE reports 
            ADD CONSTRAINT reports_reported_user_id_fkey 
            FOREIGN KEY (reported_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'reports_resolved_by_fkey') THEN
            ALTER TABLE reports 
            ADD CONSTRAINT reports_resolved_by_fkey 
            FOREIGN KEY (resolved_by) REFERENCES profiles(id);
        END IF;
    END IF;

    -- Add foreign key constraints for user_reputation if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'user_reputation_user_id_fkey') THEN
            ALTER TABLE user_reputation 
            ADD CONSTRAINT user_reputation_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Add foreign key constraints for keyword_blacklist if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'keyword_blacklist_created_by_fkey') THEN
            ALTER TABLE keyword_blacklist 
            ADD CONSTRAINT keyword_blacklist_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
    END IF;
END $$;

-- Add moderation fields to listings table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        -- Add moderation columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'listings' AND column_name = 'moderation_status') THEN
            ALTER TABLE listings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'pending';
            ALTER TABLE listings ADD CONSTRAINT listings_moderation_status_check 
            CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'listings' AND column_name = 'moderation_score') THEN
            ALTER TABLE listings ADD COLUMN moderation_score DECIMAL(3,2) DEFAULT 0.00;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'listings' AND column_name = 'flagged_reasons') THEN
            ALTER TABLE listings ADD COLUMN flagged_reasons TEXT[];
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'listings' AND column_name = 'auto_moderated_at') THEN
            ALTER TABLE listings ADD COLUMN auto_moderated_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'listings' AND column_name = 'admin_reviewed_at') THEN
            ALTER TABLE listings ADD COLUMN admin_reviewed_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'listings' AND column_name = 'admin_reviewed_by') THEN
            ALTER TABLE listings ADD COLUMN admin_reviewed_by UUID;
            
            -- Add foreign key constraint if profiles table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
                ALTER TABLE listings 
                ADD CONSTRAINT listings_admin_reviewed_by_fkey 
                FOREIGN KEY (admin_reviewed_by) REFERENCES profiles(id);
            END IF;
        END IF;
    END IF;
END $$;

-- Add moderation fields to profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
            ALTER TABLE profiles ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'ban_reason') THEN
            ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'banned_until') THEN
            ALTER TABLE profiles ADD COLUMN banned_until TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'moderation_notes') THEN
            ALTER TABLE profiles ADD COLUMN moderation_notes TEXT;
        END IF;
    END IF;
END $$;

-- Create indexes for performance
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

-- Add indexes to listings table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
        CREATE INDEX IF NOT EXISTS idx_listings_moderation_status ON listings(moderation_status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);
    END IF;
END $$;

-- RLS Policies
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_categories ENABLE ROW LEVEL SECURITY;

-- Moderation logs: Only admins and the user can see their own logs
DROP POLICY IF EXISTS "Users can view their own moderation logs" ON moderation_logs;
CREATE POLICY "Users can view their own moderation logs" ON moderation_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all moderation logs" ON moderation_logs;
CREATE POLICY "Admins can view all moderation logs" ON moderation_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = TRUE OR role = 'admin')
    )
  );

-- Reports: Users can create reports and view their own
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all reports" ON reports;
CREATE POLICY "Admins can manage all reports" ON reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = TRUE OR role = 'admin')
    )
  );

-- User reputation: Users can view their own, admins can view all
DROP POLICY IF EXISTS "Users can view their own reputation" ON user_reputation;
CREATE POLICY "Users can view their own reputation" ON user_reputation
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Public can view basic reputation" ON user_reputation;
CREATE POLICY "Public can view basic reputation" ON user_reputation
  FOR SELECT USING (TRUE); -- Allow public read for trust indicators

DROP POLICY IF EXISTS "Admins can manage reputation" ON user_reputation;
CREATE POLICY "Admins can manage reputation" ON user_reputation
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = TRUE OR role = 'admin')
    )
  );

-- Keyword blacklist: Admins only
DROP POLICY IF EXISTS "Admins can manage keyword blacklist" ON keyword_blacklist;
CREATE POLICY "Admins can manage keyword blacklist" ON keyword_blacklist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = TRUE OR role = 'admin')
    )
  );

-- Moderation categories: Public read, admin write
DROP POLICY IF EXISTS "Public can view moderation categories" ON moderation_categories;
CREATE POLICY "Public can view moderation categories" ON moderation_categories
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage moderation categories" ON moderation_categories;
CREATE POLICY "Admins can manage moderation categories" ON moderation_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_admin = TRUE OR role = 'admin')
    )
  );

-- Create functions for moderation workflow
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reputation when moderation action is taken
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE user_reputation 
    SET 
      reputation_score = GREATEST(0, reputation_score - 10),
      flagged_listings = flagged_listings + 1,
      last_violation_at = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reputation_on_moderation ON moderation_logs;
CREATE TRIGGER update_reputation_on_moderation
  AFTER UPDATE ON moderation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

-- Function to check if user should get stricter moderation
CREATE OR REPLACE FUNCTION should_apply_strict_moderation(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_rep user_reputation%ROWTYPE;
BEGIN
  SELECT * INTO user_rep FROM user_reputation WHERE user_id = user_uuid;
  
  -- Apply strict moderation if:
  -- 1. New user (trust_level = 1)
  -- 2. Low reputation score (< 50)
  -- 3. High ratio of flagged listings (> 20%)
  -- 4. Recent violations (within 30 days)
  
  IF user_rep IS NULL OR 
     user_rep.trust_level = 1 OR 
     user_rep.reputation_score < 50 OR
     (user_rep.total_listings > 0 AND (user_rep.flagged_listings::FLOAT / user_rep.total_listings) > 0.2) OR
     (user_rep.last_violation_at IS NOT NULL AND user_rep.last_violation_at > NOW() - INTERVAL '30 days')
  THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get moderation threshold based on user reputation
CREATE OR REPLACE FUNCTION get_moderation_threshold(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  user_rep user_reputation%ROWTYPE;
BEGIN
  SELECT * INTO user_rep FROM user_reputation WHERE user_id = user_uuid;
  
  -- Return stricter threshold for risky users
  IF should_apply_strict_moderation(user_uuid) THEN
    RETURN 0.3; -- 30% confidence threshold
  ELSE
    RETURN 0.7; -- 70% confidence threshold for trusted users
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Initialize reputation for existing users (if profiles table exists)
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
END $$;

-- Add comments
COMMENT ON TABLE moderation_logs IS 'Stores all moderation actions and AI responses for auditing';
COMMENT ON TABLE reports IS 'Community reports of inappropriate content';
COMMENT ON TABLE user_reputation IS 'User trust scores and moderation history';
COMMENT ON TABLE keyword_blacklist IS 'Banned keywords and phrases for content filtering';
COMMENT ON TABLE moderation_categories IS 'Categories of content violations';
