-- =============================================
-- SELLAR MOBILE APP - FIX FUNCTION SEARCH PATH SECURITY (SAFE VERSION)
-- Migration 31b: Set search_path for existing functions only
-- =============================================

-- This version safely handles functions that might not exist
-- Each function is wrapped in a DO block with exception handling

-- =============================================
-- 1. CORE LISTING AND USER FUNCTIONS
-- =============================================

-- Fix listing management functions (with safe handling)
DO $$
BEGIN
    BEGIN ALTER FUNCTION update_listings_count_safe() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION check_listing_limit_safe() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_listings_count() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_listing_counts() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION check_listing_limit_before_insert() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION can_create_listing() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION auto_generate_listing_slug() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_listing_with_seller(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION expire_listing_reservations() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION check_reservation_expiry() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- Fix user and profile functions
DO $$
BEGIN
    BEGIN ALTER FUNCTION handle_new_user() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_full_name_from_parts() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_profile_completion() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION calculate_profile_completion(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION check_email_exists(text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION sync_email_verification_from_auth() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_user_statistics(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_user_devices(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 2. REVIEW AND VERIFICATION FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION update_review_verification_level() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_review_helpful_counts() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_user_ratings() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_reviews_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_user_trust_metrics(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_single_user_verification_signals() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_user_verification_signals() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION log_verification_event(uuid, text, jsonb) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION log_verification_event(uuid, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 3. SOCIAL AND FOLLOW FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION get_user_followers(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_user_following(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION follow_user(uuid, uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION unfollow_user(uuid, uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION check_follow_status(uuid, uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_follow_counts() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_posts_count() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION extract_hashtags(text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION process_post_hashtags(uuid, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION trigger_process_post_hashtags() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_trending_hashtags(integer) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_hashtag_engagement() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION handle_first_post_bonus() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 4. CALLBACK AND COMMUNICATION FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION create_callback_request(uuid, uuid, text, text, text, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_seller_callback_requests(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_callback_request_stats(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_callback_request_status() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION expire_old_callback_requests() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION cleanup_expired_callback_requests() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_callback_message_stats(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_conversation_on_message() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION notify_new_message() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 5. NOTIFICATION FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION queue_push_notification(uuid, text, text, jsonb, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION should_send_notification(uuid, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION notify_offer_update() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_user_notification_preferences(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_notification_preferences(uuid, jsonb) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION create_notification(uuid, text, text, text, jsonb, text, uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION mark_notification_as_read(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 6. TRANSACTION AND FINANCIAL FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION get_user_transaction_summary(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_transaction_analytics(uuid, timestamptz, timestamptz) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION create_transaction(uuid, text, decimal, decimal, text, text, text, text, text, jsonb) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION award_community_credits(uuid, decimal, text, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION award_community_credits(uuid, decimal, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_user_reward_summary(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION claim_referral_bonus(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 7. REFERRAL FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION create_referral_record(uuid, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION complete_referral(uuid, uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_user_referral_stats(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 8. BUSINESS AND SUBSCRIPTION FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION get_user_business_entitlements(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_business_categories_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 9. DATA MANAGEMENT FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION update_data_export_requests_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_data_deletion_requests_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION process_data_export_request(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION process_data_deletion_request(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 10. UTILITY AND TRIGGER FUNCTIONS
-- =============================================

DO $$
BEGIN
    BEGIN ALTER FUNCTION update_updated_at_column() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION update_user_devices_updated_at() SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION get_offer_with_profiles(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION log_user_activity(uuid, text, text, jsonb) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION generate_storage_path(text, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION validate_file_upload(text, bigint, text) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
    BEGIN ALTER FUNCTION calculate_user_storage_usage(uuid) SET search_path = ''; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- =============================================
-- 11. HANDLE SEARCH_LISTINGS FUNCTION SPECIALLY
-- =============================================

-- The search_listings function might have different parameter signatures
DO $$
BEGIN
    -- Try different possible signatures for search_listings
    BEGIN 
        ALTER FUNCTION search_listings(text, text[], text, text, decimal, decimal, text, integer, integer) SET search_path = 'public, extensions';
        RAISE NOTICE 'Fixed search_listings with 9 parameters';
    EXCEPTION WHEN undefined_function THEN
        BEGIN
            ALTER FUNCTION search_listings(text) SET search_path = 'public, extensions';
            RAISE NOTICE 'Fixed search_listings with 1 parameter';
        EXCEPTION WHEN undefined_function THEN
            BEGIN
                ALTER FUNCTION search_listings() SET search_path = 'public, extensions';
                RAISE NOTICE 'Fixed search_listings with no parameters';
            EXCEPTION WHEN undefined_function THEN
                RAISE NOTICE 'search_listings function not found with any signature';
            END;
        END;
    END;
END $$;

-- =============================================
-- 12. VERIFY AND REPORT RESULTS
-- =============================================

-- Count how many functions were actually fixed
DO $$
DECLARE
    func_record RECORD;
    fixed_count INTEGER := 0;
    total_count INTEGER := 0;
    function_names TEXT[] := ARRAY[
        'update_listings_count_safe', 'check_listing_limit_safe', 'get_user_trust_metrics',
        'update_single_user_verification_signals', 'get_user_followers', 'get_user_following',
        'follow_user', 'unfollow_user', 'get_user_transaction_summary', 'get_transaction_analytics',
        'create_notification', 'mark_notification_as_read', 'handle_new_user', 'update_follow_counts'
    ];
    func_name TEXT;
BEGIN
    RAISE NOTICE 'Verifying function search_path settings:';
    RAISE NOTICE '==========================================';
    
    FOREACH func_name IN ARRAY function_names
    LOOP
        SELECT 
            proname as function_name,
            proconfig as config_settings
        INTO func_record
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = func_name
        LIMIT 1;
        
        IF FOUND THEN
            total_count := total_count + 1;
            
            IF func_record.config_settings IS NOT NULL AND 
               ('search_path=' = ANY(func_record.config_settings) OR 
                'search_path=public, extensions' = ANY(func_record.config_settings)) THEN
                fixed_count := fixed_count + 1;
                RAISE NOTICE 'Function % - search_path FIXED ✓', func_name;
            ELSE
                RAISE NOTICE 'Function % - search_path NOT SET ✗', func_name;
            END IF;
        ELSE
            RAISE NOTICE 'Function % - NOT FOUND (skipped)', func_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Summary: %/% existing functions have secure search_path', fixed_count, total_count;
    
    IF fixed_count > 0 THEN
        RAISE NOTICE 'SUCCESS: % functions secured against schema injection!', fixed_count;
    ELSE
        RAISE NOTICE 'WARNING: No functions were found to fix. Check function names.';
    END IF;
END $$;

-- Success message
SELECT 'Function search_path security migration completed!' as status,
       'Only existing functions were modified - no errors for missing functions' as details;
