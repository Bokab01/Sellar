-- Update Package Names: "Sellar Business" → "Sellar Pro" and "Pro" → "Plus"
-- =============================================

-- 1. Update the subscription plan name in the database
UPDATE subscription_plans 
SET name = 'Sellar Pro'
WHERE name = 'Sellar Business';

-- 2. Update the credit package name in the database
UPDATE credit_packages 
SET name = 'Plus', description = 'Plus credits, plus features, plus value'
WHERE name = 'Pro';

-- 3. Verify the subscription plan update
SELECT id, name, description, price_ghs, billing_cycle, is_active 
FROM subscription_plans 
WHERE name = 'Sellar Pro';

-- 4. Verify the credit package update
SELECT id, name, credits, price_ghs, description, is_active 
FROM credit_packages 
WHERE name = 'Plus';

-- 5. Show all subscription plans to confirm
SELECT id, name, description, price_ghs, billing_cycle, is_active 
FROM subscription_plans 
ORDER BY created_at;

-- 6. Show all credit packages to confirm
SELECT id, name, credits, price_ghs, description, is_active 
FROM credit_packages 
ORDER BY credits;
