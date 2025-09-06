-- =============================================
-- FIX EMAIL VERIFICATION CONFIGURATION
-- This script helps configure email verification properly
-- =============================================

-- Check current auth configuration
SELECT 
    'Current Auth Configuration' as section,
    'Check your Supabase dashboard for these settings:' as instruction;

-- The main issue is usually in the Supabase dashboard configuration
-- You need to set the correct redirect URLs in:
-- Authentication > URL Configuration > Redirect URLs

-- For development, add these URLs to your Supabase project:
-- exp://localhost:8081/--/(auth)/email-confirmation
-- exp://127.0.0.1:8081/--/(auth)/email-confirmation
-- http://localhost:8081/(auth)/email-confirmation
-- https://your-app-domain.com/(auth)/email-confirmation

-- Also check that email templates are configured correctly
-- Authentication > Email Templates > Confirm signup

SELECT 'Email verification configuration requires Supabase dashboard changes' as note;
SELECT 'Please check the instructions below' as action_required;
