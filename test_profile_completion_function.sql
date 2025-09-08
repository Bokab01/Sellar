-- =============================================
-- TEST: Profile Completion Function
-- =============================================

-- Test the calculate_profile_completion function
-- Replace 'your-user-id-here' with an actual user ID from your profiles table

-- First, let's see what users exist
SELECT id, full_name, email FROM profiles LIMIT 5;

-- Test the function with a specific user (replace with actual user ID)
-- SELECT calculate_profile_completion('your-user-id-here');

-- Test with a user that has some profile data
-- This will help us see if the function is working correctly
SELECT 
    p.id,
    p.full_name,
    p.bio,
    p.avatar_url,
    p.phone,
    p.location,
    p.is_business,
    p.business_name,
    p.business_description,
    p.business_category_id,
    p.email_verified,
    p.phone_verified,
    calculate_profile_completion(p.id) as completion_data
FROM profiles p 
WHERE p.full_name IS NOT NULL 
LIMIT 3;

-- If you want to test with a specific user, uncomment and modify this:
-- SELECT calculate_profile_completion('replace-with-actual-user-id');
