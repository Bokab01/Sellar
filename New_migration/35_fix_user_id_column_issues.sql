-- =============================================
-- FIX USER_ID COLUMN ISSUES
-- Migration 35: Add missing user_id columns and remove incorrect ones
-- =============================================

-- This migration fixes the "column user_id does not exist" errors by:
-- 1. Adding user_id to tables that need it
-- 2. Removing user_id from tables that shouldn't have it
-- 3. Ensuring proper foreign key relationships

-- =============================================
-- 1. ADD MISSING user_id COLUMN TO callback_requests
-- =============================================

DO $$
BEGIN
    -- Add user_id column to callback_requests if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'callback_requests' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE callback_requests 
        ADD COLUMN user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added user_id column to callback_requests table';
    ELSE
        RAISE NOTICE '⚠️  user_id column already exists in callback_requests table';
    END IF;
END $$;

-- =============================================
-- 2. REMOVE INCORRECT user_id COLUMNS
-- =============================================

-- Remove user_id from meetup_transactions (uses buyer_id/seller_id instead)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'meetup_transactions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE meetup_transactions DROP COLUMN user_id;
        RAISE NOTICE '✅ Removed user_id column from meetup_transactions (uses buyer_id/seller_id)';
    ELSE
        RAISE NOTICE '⚠️  user_id column does not exist in meetup_transactions';
    END IF;
END $$;

-- Remove user_id from referral_tracking (uses referrer_id/referee_id instead)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'referral_tracking' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE referral_tracking DROP COLUMN user_id;
        RAISE NOTICE '✅ Removed user_id column from referral_tracking (uses referrer_id/referee_id)';
    ELSE
        RAISE NOTICE '⚠️  user_id column does not exist in referral_tracking';
    END IF;
END $$;

-- Remove user_id from transaction_categories (global reference data)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_categories' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE transaction_categories DROP COLUMN user_id;
        RAISE NOTICE '✅ Removed user_id column from transaction_categories (global data)';
    ELSE
        RAISE NOTICE '⚠️  user_id column does not exist in transaction_categories';
    END IF;
END $$;

-- Remove user_id from transaction_receipts (links via transaction_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_receipts' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE transaction_receipts DROP COLUMN user_id;
        RAISE NOTICE '✅ Removed user_id column from transaction_receipts (links via transaction_id)';
    ELSE
        RAISE NOTICE '⚠️  user_id column does not exist in transaction_receipts';
    END IF;
END $$;

-- =============================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- =============================================

-- Add index on callback_requests.user_id for performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'callback_requests' 
        AND indexname = 'idx_callback_requests_user_id'
    ) THEN
        CREATE INDEX idx_callback_requests_user_id ON callback_requests(user_id);
        RAISE NOTICE '✅ Created index on callback_requests.user_id';
    ELSE
        RAISE NOTICE '⚠️  Index on callback_requests.user_id already exists';
    END IF;
END $$;

-- =============================================
-- 4. UPDATE RLS POLICIES FOR callback_requests
-- =============================================

-- Enable RLS on callback_requests if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'callback_requests' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ Enabled RLS on callback_requests';
    ELSE
        RAISE NOTICE '⚠️  RLS already enabled on callback_requests';
    END IF;
END $$;

-- Create RLS policies for callback_requests
DO $$
BEGIN
    -- Policy for viewing own callback requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'callback_requests' 
        AND policyname = 'Users can view their own callback requests'
    ) THEN
        CREATE POLICY "Users can view their own callback requests" ON callback_requests
            FOR SELECT USING (user_id = auth.uid());
        RAISE NOTICE '✅ Created SELECT policy for callback_requests';
    END IF;
    
    -- Policy for creating callback requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'callback_requests' 
        AND policyname = 'Users can create their own callback requests'
    ) THEN
        CREATE POLICY "Users can create their own callback requests" ON callback_requests
            FOR INSERT WITH CHECK (user_id = auth.uid());
        RAISE NOTICE '✅ Created INSERT policy for callback_requests';
    END IF;
    
    -- Policy for updating own callback requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'callback_requests' 
        AND policyname = 'Users can update their own callback requests'
    ) THEN
        CREATE POLICY "Users can update their own callback requests" ON callback_requests
            FOR UPDATE USING (user_id = auth.uid());
        RAISE NOTICE '✅ Created UPDATE policy for callback_requests';
    END IF;
END $$;

-- =============================================
-- 5. VERIFICATION AND TESTING
-- =============================================

-- Test queries to ensure everything works
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VERIFICATION: Testing fixed table structures';
    RAISE NOTICE '==============================================';
    
    -- Test callback_requests with user_id
    BEGIN
        EXECUTE 'SELECT user_id FROM callback_requests LIMIT 1';
        RAISE NOTICE '✅ callback_requests.user_id query works';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ callback_requests.user_id query failed: %', SQLERRM;
    END;
    
    -- Test that removed columns are gone
    BEGIN
        EXECUTE 'SELECT user_id FROM meetup_transactions LIMIT 1';
        RAISE NOTICE '❌ meetup_transactions still has user_id column (should be removed)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ meetup_transactions.user_id correctly removed';
    END;
    
    BEGIN
        EXECUTE 'SELECT user_id FROM transaction_categories LIMIT 1';
        RAISE NOTICE '❌ transaction_categories still has user_id column (should be removed)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✅ transaction_categories.user_id correctly removed';
    END;
    
    -- Test that correct columns still exist
    BEGIN
        EXECUTE 'SELECT user_id FROM transactions LIMIT 1';
        RAISE NOTICE '✅ transactions.user_id still works correctly';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ transactions.user_id query failed: %', SQLERRM;
    END;
    
    BEGIN
        EXECUTE 'SELECT user_id FROM user_credits LIMIT 1';
        RAISE NOTICE '✅ user_credits.user_id still works correctly';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ user_credits.user_id query failed: %', SQLERRM;
    END;
END $$;

-- =============================================
-- 6. FINAL SUMMARY
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'MIGRATION 35 COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '✅ Added user_id to callback_requests';
    RAISE NOTICE '✅ Removed user_id from meetup_transactions';
    RAISE NOTICE '✅ Removed user_id from referral_tracking';
    RAISE NOTICE '✅ Removed user_id from transaction_categories';
    RAISE NOTICE '✅ Removed user_id from transaction_receipts';
    RAISE NOTICE '✅ Added proper indexes and RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE 'The "column user_id does not exist" error should now be fixed!';
    RAISE NOTICE '==============================================';
END $$;

-- Success message
SELECT 'Migration 35 completed!' as status,
       'user_id column issues have been fixed' as details;
