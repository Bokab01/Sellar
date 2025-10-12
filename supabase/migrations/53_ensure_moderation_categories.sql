-- =============================================
-- ENSURE MODERATION CATEGORIES EXIST
-- =============================================
-- This migration ensures that all moderation categories are present
-- in case they were missing or not properly seeded

-- Insert or update moderation categories
INSERT INTO moderation_categories (name, display_name, description, priority, auto_action, is_active) VALUES
('spam', 'Spam', 'Repetitive, unwanted, or promotional content', 'high', 'hide', true),
('harassment', 'Harassment', 'Bullying, threats, or abusive behavior', 'urgent', 'suspend', true),
('inappropriate', 'Inappropriate Content', 'Offensive, explicit, or inappropriate material', 'high', 'hide', true),
('fraud', 'Fraud/Scam', 'Deceptive practices, fake listings, or scams', 'urgent', 'ban', true),
('copyright', 'Copyright Violation', 'Unauthorized use of copyrighted material', 'medium', 'hide', true),
('violence', 'Violence/Threats', 'Content promoting violence or making threats', 'urgent', 'ban', true),
('hate_speech', 'Hate Speech', 'Content promoting hatred or discrimination', 'urgent', 'ban', true),
('fake_listing', 'Fake Listing', 'Misleading or fraudulent product listings', 'high', 'hide', true),
('price_manipulation', 'Price Manipulation', 'Artificially inflated or misleading prices', 'medium', 'hide', true),
('other', 'Other', 'Other violations not covered above', 'low', 'none', true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    auto_action = EXCLUDED.auto_action,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify categories exist
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM moderation_categories WHERE is_active = true;
    
    IF category_count >= 10 THEN
        RAISE NOTICE 'Moderation categories verified: % active categories found', category_count;
    ELSE
        RAISE WARNING 'Expected at least 10 moderation categories, found only %', category_count;
    END IF;
END $$;

-- Add index for faster category lookups by name
CREATE INDEX IF NOT EXISTS idx_moderation_categories_name_active 
ON moderation_categories(name) WHERE is_active = true;

-- Add comment
COMMENT ON TABLE moderation_categories IS 'Categories for content moderation and reporting system. All 10 standard categories are always maintained.';

SELECT 'Moderation categories ensured successfully' as status;

