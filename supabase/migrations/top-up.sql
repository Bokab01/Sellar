-- Award credits to a specific user
SELECT award_community_reward(
    'USER_UUID_HERE'::uuid,           -- Replace with actual user UUID
    'admin_bonus',                     -- Reward type
    100,                              -- Number of credits to add
    'Admin credit bonus',             -- Description
    '{"reason": "Manual admin award", "admin_id": "admin_uuid"}'::jsonb  -- Optional metadata
);

-- Replace 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' with the actual user UUID
SELECT award_community_reward(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'admin_bonus',
    500,
    'Welcome bonus - 500 credits',
    '{"source": "admin_panel", "date": "2024-01-15"}'::jsonb
);