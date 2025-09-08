-- =============================================
-- FIX MISSING USER PROFILES
-- This script creates missing profiles for users who exist in auth.users
-- but don't have corresponding profiles in the profiles table
-- =============================================

-- Create missing profiles for existing auth users
INSERT INTO profiles (
    id,
    full_name,
    email,
    phone,
    location,
    is_business,
    created_at,
    updated_at
)
SELECT 
    au.id,
    COALESCE(
        NULLIF(TRIM(CONCAT(
            COALESCE(au.raw_user_meta_data->>'firstName', ''),
            ' ',
            COALESCE(au.raw_user_meta_data->>'lastName', '')
        )), ''),
        'User'
    ) as full_name,
    au.email,
    au.raw_user_meta_data->>'phone' as phone,
    COALESCE(au.raw_user_meta_data->>'location', 'Accra, Greater Accra') as location,
    COALESCE((au.raw_user_meta_data->>'is_business')::boolean, false) as is_business,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.email_confirmed_at IS NOT NULL; -- Only create profiles for confirmed users

-- Create missing user_settings for users without settings
INSERT INTO user_settings (user_id, created_at, updated_at)
SELECT 
    p.id,
    NOW(),
    NOW()
FROM profiles p
LEFT JOIN user_settings us ON p.id = us.user_id
WHERE us.user_id IS NULL;

-- Create missing user_credits for users without credits
INSERT INTO user_credits (user_id, balance, created_at, updated_at)
SELECT 
    p.id,
    0,
    NOW(),
    NOW()
FROM profiles p
LEFT JOIN user_credits uc ON p.id = uc.user_id
WHERE uc.user_id IS NULL;

-- Show summary of what was created
SELECT 
    'Profiles created' as type,
    COUNT(*) as count
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.created_at > NOW() - INTERVAL '1 minute'

UNION ALL

SELECT 
    'User settings created' as type,
    COUNT(*) as count
FROM user_settings us
WHERE us.created_at > NOW() - INTERVAL '1 minute'

UNION ALL

SELECT 
    'User credits created' as type,
    COUNT(*) as count
FROM user_credits uc
WHERE uc.created_at > NOW() - INTERVAL '1 minute';

-- Success message
SELECT 'Missing profiles fixed successfully!' as status;
