-- Update business plan name from "Sellar Business" to "Sellar Pro"
-- =============================================

-- Update the subscription plan name
UPDATE subscription_plans 
SET name = 'Sellar Pro'
WHERE name = 'Sellar Business';

-- Update any existing user subscriptions that reference the old name
-- (This is handled automatically since we're updating the plan name, not the ID)

-- Verify the update
SELECT id, name, description, price_ghs, billing_cycle, is_active 
FROM subscription_plans 
WHERE name = 'Sellar Pro';
