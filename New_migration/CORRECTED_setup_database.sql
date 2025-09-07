-- =============================================
-- SELLAR MOBILE APP - CORRECTED DATABASE SETUP
-- This script applies CRITICAL FIXES to match the app exactly
-- =============================================

-- Run this script in your new Supabase project's SQL Editor

\echo 'Starting CORRECTED Sellar Mobile App database setup...'

-- Migration 01: Extensions and Core Setup (unchanged)
\i 01_extensions_and_core.sql

-- CRITICAL FIX 02: Profiles corrected to match app exactly
\i CRITICAL_FIXES_02_profiles_corrected.sql

-- CRITICAL FIX 03: Listings, conversations, messages corrected
\i CRITICAL_FIXES_03_listings_corrected.sql

-- Migration 04: Messaging (skip - already in CRITICAL_FIXES_03)
-- \i 04_messaging_and_chat.sql

-- Migration 05: Monetization System
\i 05_monetization_system.sql

-- CRITICAL FIX 05: Missing tables referenced by app
\i CRITICAL_FIXES_05_missing_tables.sql

-- Migration 06: Social Features (skip - already in CRITICAL_FIXES_03)
-- \i 06_social_features.sql

-- Migration 07: Moderation System
\i 07_moderation_system.sql

-- Migration 08: Verification System
\i 08_verification_system.sql

-- Migration 09: Notifications System
\i 09_notifications_system.sql

-- Migration 10: Analytics and Search
\i 10_analytics_and_search.sql

-- Migration 11: Storage Policies
\i 11_storage_policies.sql

-- CRITICAL FIX 12: RLS Policies corrected for exact table matches
\i CRITICAL_FIXES_12_rls_corrected.sql

-- CRITICAL FIX 13: Functions and triggers corrected
\i CRITICAL_FIXES_13_functions_corrected.sql

-- Migration 14: Performance Optimizations
\i 14_indexes_and_performance.sql

-- =============================================
-- CRITICAL FIXES VERIFICATION
-- =============================================

-- Verify profiles table has correct structure
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    expected_columns TEXT[] := ARRAY[
        'first_name', 'last_name', 'full_name', 'username', 'email', 'phone', 
        'avatar_url', 'bio', 'location', 'rating', 'total_sales', 'total_reviews',
        'credit_balance', 'is_verified', 'is_online', 'last_seen', 'response_time',
        'professional_title', 'years_of_experience', 'preferred_contact_method',
        'response_time_expectation', 'phone_visibility', 'email_visibility',
        'show_online_status', 'show_last_seen', 'is_business', 'business_name',
        'business_type', 'business_description', 'business_phone', 'business_email',
        'business_website', 'display_business_name', 'business_name_priority',
        'account_type', 'verification_status'
    ];
    col TEXT;
    col_count INTEGER;
BEGIN
    FOREACH col IN ARRAY expected_columns LOOP
        SELECT COUNT(*) INTO col_count
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = col;
        
        IF col_count = 0 THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Missing profiles columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ Profiles table has all required columns!';
    END IF;
END $$;

-- Verify conversations table has correct field names
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'participant_1';
    
    IF col_count = 0 THEN
        RAISE EXCEPTION 'CRITICAL: Conversations table missing participant_1 field (app expects this, not participant_1_id)';
    ELSE
        RAISE NOTICE '✅ Conversations table has correct participant field names!';
    END IF;
END $$;

-- Verify listings table has correct field names
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    expected_columns TEXT[] := ARRAY[
        'views_count', 'favorites_count', 'quantity', 'accept_offers', 'boost_until'
    ];
    col TEXT;
    col_count INTEGER;
BEGIN
    FOREACH col IN ARRAY expected_columns LOOP
        SELECT COUNT(*) INTO col_count
        FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = col;
        
        IF col_count = 0 THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Missing listings columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ Listings table has all required columns!';
    END IF;
END $$;

-- Verify messages table has correct field names
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    expected_columns TEXT[] := ARRAY['images', 'offer_data', 'reply_to'];
    col TEXT;
    col_count INTEGER;
BEGIN
    FOREACH col IN ARRAY expected_columns LOOP
        SELECT COUNT(*) INTO col_count
        FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = col;
        
        IF col_count = 0 THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Missing messages columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ Messages table has all required columns!';
    END IF;
END $$;

-- Verify reviews table has correct field names
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'reviewed_id';
    
    IF col_count = 0 THEN
        RAISE EXCEPTION 'CRITICAL: Reviews table missing reviewed_id field (app expects this, not reviewed_user_id)';
    ELSE
        RAISE NOTICE '✅ Reviews table has correct field names!';
    END IF;
END $$;

-- Verify missing tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    expected_tables TEXT[] := ARRAY[
        'offers', 'likes', 'callback_requests', 'transaction_receipts',
        'transaction_notifications', 'credit_packages'
    ];
    tbl TEXT;
    tbl_count INTEGER;
BEGIN
    FOREACH tbl IN ARRAY expected_tables LOOP
        SELECT COUNT(*) INTO tbl_count
        FROM information_schema.tables 
        WHERE table_name = tbl;
        
        IF tbl_count = 0 THEN
            missing_tables := array_append(missing_tables, tbl);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All required tables exist!';
    END IF;
END $$;

-- =============================================
-- INITIAL DATA SETUP (CORRECTED)
-- =============================================

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, is_active, is_featured, sort_order) VALUES
('Electronics', 'electronics', 'Phones, laptops, gadgets and electronic devices', '📱', true, true, 1),
('Fashion & Beauty', 'fashion-beauty', 'Clothing, shoes, accessories and beauty products', '👗', true, true, 2),
('Home & Garden', 'home-garden', 'Furniture, appliances, home decor and garden items', '🏠', true, true, 3),
('Vehicles', 'vehicles', 'Cars, motorcycles, bicycles and vehicle parts', '🚗', true, true, 4),
('Sports & Hobbies', 'sports-hobbies', 'Sports equipment, musical instruments and hobby items', '⚽', true, true, 5),
('Books & Education', 'books-education', 'Books, educational materials and courses', '📚', true, false, 6),
('Health & Wellness', 'health-wellness', 'Health products, fitness equipment and wellness items', '💊', true, false, 7),
('Baby & Kids', 'baby-kids', 'Baby products, toys and children items', '👶', true, false, 8),
('Food & Beverages', 'food-beverages', 'Food items, beverages and kitchen supplies', '🍕', true, false, 9),
('Services', 'services', 'Professional services and skill-based offerings', '🔧', true, true, 10)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for Electronics
INSERT INTO categories (name, slug, description, parent_id, level, sort_order) 
SELECT 
    'Mobile Phones', 'mobile-phones', 'Smartphones and mobile devices', 
    id, 1, 1
FROM categories WHERE slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, description, parent_id, level, sort_order) 
SELECT 
    'Laptops & Computers', 'laptops-computers', 'Laptops, desktops and computer accessories', 
    id, 1, 2
FROM categories WHERE slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, billing_period, features, credits_included, listings_limit, is_popular) VALUES
('Basic', 'Perfect for casual sellers', 0.00, 'monthly', 
 '["Up to 5 active listings", "Basic support", "Standard visibility"]', 
 10, 5, false),
('Pro', 'Great for regular sellers', 29.99, 'monthly', 
 '["Up to 50 active listings", "Priority support", "Featured listings", "Analytics dashboard"]', 
 100, 50, true),
('Business', 'Perfect for businesses', 99.99, 'monthly', 
 '["Unlimited listings", "Premium support", "Advanced analytics", "Business verification", "Custom branding"]', 
 500, NULL, false)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- FINAL VERIFICATION
-- =============================================

-- Count all tables
DO $$
DECLARE
    table_count INTEGER;
    expected_count INTEGER := 45; -- Expected number of tables
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public';
    
    IF table_count < expected_count THEN
        RAISE WARNING 'Only % tables created, expected at least %', table_count, expected_count;
    ELSE
        RAISE NOTICE '✅ Created % tables successfully!', table_count;
    END IF;
END $$;

-- Verify RLS is enabled
DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public' 
    AND c.relrowsecurity = true;
    
    RAISE NOTICE '✅ RLS enabled on % tables', rls_count;
END $$;

-- Verify functions exist
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION';
    
    RAISE NOTICE '✅ % custom functions created', function_count;
END $$;

-- Final success message
SELECT 
    '🎉 CORRECTED DATABASE SETUP COMPLETED SUCCESSFULLY!' as status,
    'All critical mismatches have been fixed!' as message,
    NOW() as completed_at,
    current_database() as database_name,
    current_user as setup_user;
