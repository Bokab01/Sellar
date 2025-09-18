-- Test review creation with minimal columns
-- This will help identify which column is causing the issue

-- First, let's see what a minimal review insert looks like
INSERT INTO reviews (
    reviewer_id,
    reviewed_user_id,
    listing_id,
    rating,
    comment
) VALUES (
    '00000000-0000-4000-8000-000000000001', -- Replace with actual user ID
    '00000000-0000-4000-8000-000000000002', -- Replace with actual reviewed user ID
    '00000000-0000-4000-8000-000000000003', -- Replace with actual listing ID
    5,
    'Test review comment'
);

-- If this works, then the issue is with the new columns
-- If this fails, then there's a more fundamental issue
