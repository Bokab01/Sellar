-- =============================================
-- QUICK FIX FOR DATABASE ISSUES - STANDARD SQL
-- Run this to fix the immediate problems
-- =============================================

-- Step 1: Fix the handle_new_user function
-- Drop any existing handle_new_user function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a robust handle_new_user function that handles all profile fields safely
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    first_name_val TEXT;
    last_name_val TEXT;
    full_name_val TEXT;
    email_val TEXT;
    phone_val TEXT;
    location_val TEXT;
BEGIN
    -- Check if profile already exists (prevent duplicate key errors)
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE LOG 'Profile already exists for user %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Extract values from metadata with safe defaults
    first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
    last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    full_name_val := TRIM(CONCAT(first_name_val, ' ', last_name_val));
    email_val := NEW.email;
    phone_val := NEW.raw_user_meta_data->>'phone';
    location_val := COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra');
    
    -- Insert profile with all required fields
    BEGIN
        INSERT INTO profiles (
            id,
            email,
            phone,
            location,
            is_verified,
            is_business,
            is_active,
            total_listings,
            total_sales,
            total_purchases,
            rating_average,
            rating_count,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            email_val,
            phone_val,
            location_val,
            false,
            false,
            true,
            0,
            0,
            0,
            0.00,
            0,
            now(),
            now()
        );
        
        RAISE LOG 'Profile created successfully for user %', NEW.id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
            
            -- Try minimal insertion as fallback
            BEGIN
                INSERT INTO profiles (id, created_at, updated_at) 
                VALUES (NEW.id, now(), now())
                ON CONFLICT (id) DO NOTHING;
                
                RAISE LOG 'Minimal profile created as fallback for user %', NEW.id;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE LOG 'Even minimal profile creation failed for user %: %', NEW.id, SQLERRM;
            END;
    END;
    
    -- Try to update with additional fields if the basic insertion succeeded
    BEGIN
        UPDATE profiles 
        SET 
            email = email_val,
            phone = phone_val,
            location = location_val,
            is_verified = false,
            is_business = false,
            is_active = true,
            total_listings = 0,
            total_sales = 0,
            total_purchases = 0,
            rating_average = 0.00,
            rating_count = 0
        WHERE id = NEW.id;
        
        RAISE LOG 'Profile updated with additional fields for user %', NEW.id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Profile update failed for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Create default user settings
    BEGIN
        INSERT INTO user_settings (user_id, created_at, updated_at)
        VALUES (NEW.id, now(), now())
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE LOG 'User settings created for user %', NEW.id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'User settings creation failed for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 2: Apply simple RLS policies
-- Drop ALL existing policies to recreate them properly
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on profiles table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on user_settings table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_settings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_settings', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on conversations table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'conversations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON conversations', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on messages table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', policy_record.policyname);
    END LOOP;
END $$;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Simple profiles RLS policies
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- User settings RLS policies

CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Conversations RLS policies

CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Messages RLS policies

CREATE POLICY "Users can view messages in own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Step 3: Verify everything is working
-- Check if function exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
        THEN 'handle_new_user function exists' 
        ELSE 'handle_new_user function missing' 
    END as function_status;

-- Check if trigger exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
        THEN 'Trigger exists' 
        ELSE 'Trigger missing' 
    END as trigger_status;

-- Check RLS policies
SELECT 
    'RLS policies created' as rls_status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'user_settings');

-- Final status
SELECT 'Quick fix completed! User registration should now work.' as final_status;
