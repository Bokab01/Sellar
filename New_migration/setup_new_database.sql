-- =============================================
-- SELLAR MOBILE APP - COMPLETE DATABASE SETUP
-- This script runs all migrations in the correct order
-- =============================================

-- Run this script in your new Supabase project's SQL Editor

\echo 'Starting Sellar Mobile App database setup...'

-- Migration 01: Extensions and Core Setup
\i 01_extensions_and_core.sql

-- Migration 02: Profiles and Authentication
\i 02_profiles_and_auth.sql

-- Migration 03: Categories and Listings
\i 03_categories_and_listings.sql

-- Migration 04: Messaging and Chat
\i 04_messaging_and_chat.sql

-- Migration 05: Monetization System
\i 05_monetization_system.sql

-- Migration 06: Social Features
\i 06_social_features.sql

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

-- Migration 12: RLS Policies
\i 12_rls_policies.sql

-- Migration 13: Functions and Triggers
\i 13_functions_and_triggers.sql

-- Migration 14: Performance Optimizations
\i 14_indexes_and_performance.sql

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default categories with FIXED UUIDs (matching frontend expectations)
INSERT INTO categories (id, name, slug, description, icon, is_active, is_featured, sort_order) VALUES
('00000000-0000-4000-8000-000000000000', 'Other', 'other', 'Miscellaneous items and general category', 'more-horizontal', true, false, 15),
('00000000-0000-4000-8000-000000000001', 'Electronics & Technology', 'electronics', 'Phones, laptops, gadgets and electronic devices', 'smartphone', true, true, 1),
('00000000-0000-4000-8000-000000000002', 'Fashion', 'fashion', 'Clothing, shoes, accessories and beauty products', 'shirt', true, true, 2),
('00000000-0000-4000-8000-000000000003', 'Vehicles', 'vehicles', 'Cars, motorcycles, bicycles and vehicle parts', 'car', true, true, 3),
('00000000-0000-4000-8000-000000000004', 'Home & Garden', 'home-garden', 'Furniture, appliances, home decor and garden items', 'home', true, true, 4),
('00000000-0000-4000-8000-000000000005', 'Sports & Fitness', 'sports-fitness', 'Sports equipment, musical instruments and hobby items', 'dumbbell', true, true, 5),
('00000000-0000-4000-8000-000000000006', 'Books & Media', 'books-media', 'Books, educational materials and courses', 'book', true, false, 6),
('00000000-0000-4000-8000-000000000007', 'Services', 'services', 'Professional services and skill-based offerings', 'briefcase', true, true, 7),
('00000000-0000-4000-8000-000000000008', 'Baby & Kids', 'baby-kids', 'Baby products, toys and children items', 'baby', true, false, 8),
('00000000-0000-4000-8000-000000000009', 'Beauty & Health', 'beauty-health', 'Health products, fitness equipment and wellness items', 'heart', true, false, 9),
('00000000-0000-4000-8000-000000000010', 'Food & Beverages', 'food-beverages', 'Food items, beverages and kitchen supplies', 'utensils', true, false, 10)
ON CONFLICT (id) DO NOTHING;

-- Note: The frontend uses a comprehensive category hierarchy defined in constants/categories.ts
-- This includes 15 main categories with 3+ levels of subcategories (e.g., Electronics > Phones & Tablets > Smartphones)
-- The frontend maps these string IDs to the fixed UUIDs above for database storage
-- For a complete category setup, you would need to insert all subcategories from the frontend constants
-- The current setup provides the main categories that the frontend expects to find

-- Note: Business plans are now inserted in migration 17_business_plans.sql
-- This ensures proper order and avoids conflicts

-- =============================================
-- FINAL SETUP VERIFICATION
-- =============================================

-- Verify all tables exist
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'profiles', 'user_settings', 'security_events', 'profile_activity_log',
        'categories', 'category_attributes', 'listings', 'listing_views', 'favorites', 'listing_inquiries',
        'conversations', 'messages', 'message_reactions', 'offers', 'blocked_users',
        'user_credits', 'credit_transactions', 'credit_purchases', 'paystack_transactions',
        'subscription_plans', 'user_subscriptions', 'feature_purchases', 'plan_entitlements',
        'reviews', 'review_helpful_votes', 'follows', 'posts', 'post_likes', 'comments', 'comment_likes', 'shares', 'post_bookmarks',
        'support_tickets', 'support_ticket_messages', 'kb_articles', 'kb_article_feedback', 'faq_categories', 'faq_items',
        'community_rewards', 'user_achievements', 'user_reward_history', 'reward_triggers',
        'moderation_categories', 'moderation_logs', 'reports', 'user_reputation', 'keyword_blacklist',
        'user_verification', 'verification_documents', 'verification_templates', 'verification_history',
        'device_tokens', 'notifications', 'notification_preferences',
        'search_analytics', 'search_suggestions', 'user_activity_log', 'popular_searches',
        'storage_usage'
    ];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY expected_tables LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name;
        
        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All % tables created successfully!', array_length(expected_tables, 1);
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
    
    RAISE NOTICE 'RLS enabled on % tables', rls_count;
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
    
    RAISE NOTICE '% custom functions created', function_count;
END $$;

-- Final success message
SELECT 
    'Database setup completed successfully!' as status,
    NOW() as completed_at,
    current_database() as database_name,
    current_user as setup_user;
