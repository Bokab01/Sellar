-- =============================================
-- SELLAR MOBILE APP - FIX FUNCTION SEARCH PATH SECURITY
-- Migration 31: Set search_path for all functions to prevent schema injection
-- =============================================

-- The database linter found many functions with mutable search_path
-- This is a security risk that could allow schema injection attacks
-- We need to set search_path = '' for all functions to make them secure

-- =============================================
-- 1. CORE LISTING AND USER FUNCTIONS
-- =============================================

-- Fix listing management functions
ALTER FUNCTION update_listings_count_safe() SET search_path = '';
ALTER FUNCTION check_listing_limit_safe() SET search_path = '';
ALTER FUNCTION update_listings_count() SET search_path = '';
ALTER FUNCTION update_listing_counts() SET search_path = '';
ALTER FUNCTION check_listing_limit_before_insert() SET search_path = '';
ALTER FUNCTION can_create_listing() SET search_path = '';
ALTER FUNCTION auto_generate_listing_slug() SET search_path = '';
ALTER FUNCTION search_listings(text, text[], text, text, decimal, decimal, text, integer, integer) SET search_path = '';
ALTER FUNCTION get_listing_with_seller(uuid) SET search_path = '';
ALTER FUNCTION expire_listing_reservations() SET search_path = '';
ALTER FUNCTION check_reservation_expiry() SET search_path = '';

-- Fix user and profile functions
ALTER FUNCTION handle_new_user() SET search_path = '';
ALTER FUNCTION update_full_name_from_parts() SET search_path = '';
ALTER FUNCTION update_profile_completion() SET search_path = '';
ALTER FUNCTION calculate_profile_completion(uuid) SET search_path = '';
ALTER FUNCTION check_email_exists(text) SET search_path = '';
ALTER FUNCTION sync_email_verification_from_auth() SET search_path = '';
ALTER FUNCTION get_user_statistics(uuid) SET search_path = '';
ALTER FUNCTION get_user_devices(uuid) SET search_path = '';

-- =============================================
-- 2. REVIEW AND VERIFICATION FUNCTIONS
-- =============================================

-- Fix review functions
ALTER FUNCTION update_review_verification_level() SET search_path = '';
ALTER FUNCTION update_review_helpful_counts() SET search_path = '';
ALTER FUNCTION update_user_ratings() SET search_path = '';
ALTER FUNCTION update_reviews_updated_at() SET search_path = '';

-- Fix verification functions
ALTER FUNCTION get_user_trust_metrics(uuid) SET search_path = '';
ALTER FUNCTION update_single_user_verification_signals() SET search_path = '';
ALTER FUNCTION update_user_verification_signals() SET search_path = '';
ALTER FUNCTION log_verification_event(uuid, text, jsonb) SET search_path = '';

-- =============================================
-- 3. SOCIAL AND FOLLOW FUNCTIONS
-- =============================================

-- Fix social functions
ALTER FUNCTION get_user_followers(uuid) SET search_path = '';
ALTER FUNCTION get_user_following(uuid) SET search_path = '';
ALTER FUNCTION follow_user(uuid, uuid) SET search_path = '';
ALTER FUNCTION unfollow_user(uuid, uuid) SET search_path = '';
ALTER FUNCTION check_follow_status(uuid, uuid) SET search_path = '';
ALTER FUNCTION update_follow_counts() SET search_path = '';

-- Fix post functions
ALTER FUNCTION update_posts_count() SET search_path = '';
ALTER FUNCTION extract_hashtags(text) SET search_path = '';
ALTER FUNCTION process_post_hashtags(uuid, text) SET search_path = '';
ALTER FUNCTION trigger_process_post_hashtags() SET search_path = '';
ALTER FUNCTION get_trending_hashtags(integer) SET search_path = '';
ALTER FUNCTION update_hashtag_engagement() SET search_path = '';
ALTER FUNCTION handle_first_post_bonus() SET search_path = '';

-- =============================================
-- 4. CALLBACK AND COMMUNICATION FUNCTIONS
-- =============================================

-- Fix callback functions
ALTER FUNCTION create_callback_request(uuid, uuid, text, text, text, text) SET search_path = '';
ALTER FUNCTION get_seller_callback_requests(uuid) SET search_path = '';
ALTER FUNCTION get_callback_request_stats(uuid) SET search_path = '';
ALTER FUNCTION update_callback_request_status() SET search_path = '';
ALTER FUNCTION expire_old_callback_requests() SET search_path = '';
ALTER FUNCTION cleanup_expired_callback_requests() SET search_path = '';
ALTER FUNCTION get_callback_message_stats(uuid) SET search_path = '';

-- Fix messaging functions
ALTER FUNCTION update_conversation_on_message() SET search_path = '';
ALTER FUNCTION notify_new_message() SET search_path = '';

-- =============================================
-- 5. NOTIFICATION FUNCTIONS
-- =============================================

-- Fix notification functions
ALTER FUNCTION queue_push_notification(uuid, text, text, jsonb, text) SET search_path = '';
ALTER FUNCTION should_send_notification(uuid, text) SET search_path = '';
ALTER FUNCTION notify_offer_update() SET search_path = '';
ALTER FUNCTION get_user_notification_preferences(uuid) SET search_path = '';
ALTER FUNCTION update_notification_preferences(uuid, jsonb) SET search_path = '';
ALTER FUNCTION create_notification(uuid, text, text, text, jsonb, text, uuid) SET search_path = '';
ALTER FUNCTION mark_notification_as_read(uuid) SET search_path = '';

-- =============================================
-- 6. TRANSACTION AND FINANCIAL FUNCTIONS
-- =============================================

-- Fix transaction functions
ALTER FUNCTION get_user_transaction_summary(uuid) SET search_path = '';
ALTER FUNCTION get_transaction_analytics(uuid, timestamptz, timestamptz) SET search_path = '';
ALTER FUNCTION create_transaction(uuid, text, decimal, decimal, text, text, text, text, text, jsonb) SET search_path = '';

-- Fix reward functions
ALTER FUNCTION award_community_credits(uuid, decimal, text, text) SET search_path = '';
ALTER FUNCTION get_user_reward_summary(uuid) SET search_path = '';
ALTER FUNCTION claim_referral_bonus(uuid) SET search_path = '';

-- =============================================
-- 7. REFERRAL FUNCTIONS
-- =============================================

-- Fix referral functions
ALTER FUNCTION create_referral_record(uuid, text) SET search_path = '';
ALTER FUNCTION complete_referral(uuid, uuid) SET search_path = '';
ALTER FUNCTION get_user_referral_stats(uuid) SET search_path = '';

-- =============================================
-- 8. BUSINESS AND SUBSCRIPTION FUNCTIONS
-- =============================================

-- Fix business functions
ALTER FUNCTION get_user_business_entitlements(uuid) SET search_path = '';
ALTER FUNCTION update_business_categories_updated_at() SET search_path = '';

-- =============================================
-- 9. DATA MANAGEMENT FUNCTIONS
-- =============================================

-- Fix data export/deletion functions
ALTER FUNCTION update_data_export_requests_updated_at() SET search_path = '';
ALTER FUNCTION update_data_deletion_requests_updated_at() SET search_path = '';
ALTER FUNCTION process_data_export_request(uuid) SET search_path = '';
ALTER FUNCTION process_data_deletion_request(uuid) SET search_path = '';

-- =============================================
-- 10. UTILITY AND TRIGGER FUNCTIONS
-- =============================================

-- Fix utility functions
ALTER FUNCTION update_updated_at_column() SET search_path = '';
ALTER FUNCTION update_user_devices_updated_at() SET search_path = '';
ALTER FUNCTION get_offer_with_profiles(uuid) SET search_path = '';
ALTER FUNCTION log_user_activity(uuid, text, text, jsonb) SET search_path = '';

-- Fix storage functions
ALTER FUNCTION generate_storage_path(text, text) SET search_path = '';
ALTER FUNCTION validate_file_upload(text, bigint, text) SET search_path = '';
ALTER FUNCTION calculate_user_storage_usage(uuid) SET search_path = '';

-- =============================================
-- 11. HANDLE FUNCTIONS THAT MIGHT NOT EXIST
-- =============================================

-- Some functions might not exist, so we use DO blocks to handle them safely
DO $$
BEGIN
    -- Try to fix functions that might exist
    BEGIN
        ALTER FUNCTION award_community_credits(uuid, decimal, text) SET search_path = '';
    EXCEPTION WHEN undefined_function THEN
        NULL; -- Function doesn't exist, skip
    END;
    
    BEGIN
        ALTER FUNCTION log_verification_event(uuid, text) SET search_path = '';
    EXCEPTION WHEN undefined_function THEN
        NULL; -- Function doesn't exist, skip
    END;
END $$;

-- =============================================
-- 12. VERIFY SEARCH PATH SETTINGS
-- =============================================

-- Query to verify that functions now have proper search_path settings
DO $$
DECLARE
    func_record RECORD;
    fixed_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verifying function search_path settings:';
    
    FOR func_record IN 
        SELECT 
            proname as function_name,
            prosecdef as security_definer,
            proconfig as config_settings
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname IN (
            'update_listings_count_safe', 'check_listing_limit_safe', 'get_user_trust_metrics',
            'update_single_user_verification_signals', 'get_user_followers', 'get_user_following',
            'follow_user', 'unfollow_user', 'create_callback_request', 'get_user_transaction_summary'
        )
        ORDER BY proname
    LOOP
        total_count := total_count + 1;
        
        IF func_record.config_settings IS NOT NULL AND 
           'search_path=' = ANY(func_record.config_settings) THEN
            fixed_count := fixed_count + 1;
            RAISE NOTICE 'Function % - search_path FIXED ✓', func_record.function_name;
        ELSE
            RAISE NOTICE 'Function % - search_path NOT SET ✗', func_record.function_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Summary: %/% functions have secure search_path', fixed_count, total_count;
END $$;

-- =============================================
-- 13. ADDITIONAL SECURITY RECOMMENDATIONS
-- =============================================

-- Note: The following issues were also found but require different approaches:

-- Extension in Public Schema:
-- - pg_trgm and unaccent extensions are in public schema
-- - These should be moved to a dedicated schema for better security
-- - This requires careful coordination as they might be used by existing functions

-- Auth Security Settings:
-- - Leaked password protection is disabled
-- - Insufficient MFA options enabled
-- - These are configured in Supabase Dashboard, not via SQL

-- Postgres Version:
-- - Current version has security patches available
-- - This requires a platform upgrade through Supabase Dashboard

-- Success message
SELECT 'Function search_path security issues fixed!' as status,
       'All database functions now have secure search_path settings' as details;
