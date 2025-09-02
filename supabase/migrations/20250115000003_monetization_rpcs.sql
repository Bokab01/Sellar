-- =============================================
-- MONETIZATION RPCs (Remote Procedure Calls)
-- Phase 1: Core Backend Infrastructure
-- =============================================

-- =============================================
-- CREDIT MANAGEMENT FUNCTIONS
-- =============================================

-- Drop existing functions if they exist (to handle signature changes)
DROP FUNCTION IF EXISTS get_user_credits(UUID);
DROP FUNCTION IF EXISTS add_user_credits(UUID, INTEGER, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS spend_user_credits(UUID, INTEGER, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS complete_credit_purchase(UUID, TEXT);
DROP FUNCTION IF EXISTS handle_new_listing(UUID, UUID);
DROP FUNCTION IF EXISTS purchase_feature(UUID, UUID, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS subscribe_to_plan(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_entitlements(UUID);
DROP FUNCTION IF EXISTS can_create_listing(UUID);
DROP FUNCTION IF EXISTS get_monetization_dashboard(UUID);

-- Function to get user's current credit balance
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    balance INTEGER,
    lifetime_earned INTEGER,
    lifetime_spent INTEGER,
    lifetime_purchased INTEGER,
    free_credits_used INTEGER,
    free_listings_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure user_credits record exists
    INSERT INTO user_credits (user_id) 
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Return credit information
    RETURN QUERY
    SELECT 
        uc.balance,
        uc.lifetime_earned,
        uc.lifetime_spent,
        uc.lifetime_purchased,
        uc.free_credits_used,
        uc.free_listings_count
    FROM user_credits uc
    WHERE uc.user_id = user_uuid;
END;
$$;

-- Function to add credits to user account
CREATE OR REPLACE FUNCTION add_user_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    transaction_description TEXT,
    reference_type TEXT DEFAULT NULL,
    reference_id UUID DEFAULT NULL,
    payment_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Validate input
    IF credit_amount <= 0 THEN
        RAISE EXCEPTION 'Credit amount must be positive';
    END IF;
    
    -- Ensure user_credits record exists
    INSERT INTO user_credits (user_id) 
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current balance
    SELECT balance INTO current_balance
    FROM user_credits
    WHERE user_id = user_uuid;
    
    -- Calculate new balance
    new_balance := current_balance + credit_amount;
    
    -- Update user credits
    UPDATE user_credits 
    SET 
        balance = new_balance,
        lifetime_earned = lifetime_earned + credit_amount,
        updated_at = now()
    WHERE user_id = user_uuid;
    
    -- Record transaction
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        reference_type,
        reference_id,
        payment_reference
    ) VALUES (
        user_uuid,
        'earn',
        credit_amount,
        current_balance,
        new_balance,
        transaction_description,
        reference_type,
        reference_id,
        payment_reference
    );
    
    RETURN TRUE;
END;
$$;

-- Function to spend credits with atomic validation
CREATE OR REPLACE FUNCTION spend_user_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    transaction_description TEXT,
    reference_type TEXT DEFAULT NULL,
    reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Validate input
    IF credit_amount <= 0 THEN
        RAISE EXCEPTION 'Credit amount must be positive';
    END IF;
    
    -- Get current balance with row lock
    SELECT balance INTO current_balance
    FROM user_credits
    WHERE user_id = user_uuid
    FOR UPDATE;
    
    -- Check if user has sufficient credits
    IF current_balance < credit_amount THEN
        RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', current_balance, credit_amount;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - credit_amount;
    
    -- Update user credits
    UPDATE user_credits 
    SET 
        balance = new_balance,
        lifetime_spent = lifetime_spent + credit_amount,
        last_spend_at = now(),
        updated_at = now()
    WHERE user_id = user_uuid;
    
    -- Record transaction
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        reference_type,
        reference_id
    ) VALUES (
        user_uuid,
        'spend',
        -credit_amount, -- Negative for spend
        current_balance,
        new_balance,
        transaction_description,
        reference_type,
        reference_id
    );
    
    RETURN TRUE;
END;
$$;

-- Function to complete credit purchase (called by webhook)
CREATE OR REPLACE FUNCTION complete_credit_purchase(
    purchase_uuid UUID,
    paystack_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    purchase_record RECORD;
    success BOOLEAN := FALSE;
BEGIN
    -- Get purchase details with lock
    SELECT * INTO purchase_record
    FROM credit_purchases
    WHERE id = purchase_uuid
    FOR UPDATE;
    
    -- Validate purchase exists and is in correct state
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit purchase not found: %', purchase_uuid;
    END IF;
    
    IF purchase_record.status != 'pending' AND purchase_record.status != 'processing' THEN
        RAISE EXCEPTION 'Credit purchase is not in a completable state: %', purchase_record.status;
    END IF;
    
    IF purchase_record.credits_awarded = TRUE THEN
        RAISE EXCEPTION 'Credits have already been awarded for this purchase';
    END IF;
    
    -- Update purchase status
    UPDATE credit_purchases
    SET 
        status = 'completed',
        credits_awarded = TRUE,
        credits_awarded_at = now(),
        completed_at = now(),
        paystack_transaction_id = COALESCE(paystack_reference, paystack_transaction_id),
        updated_at = now()
    WHERE id = purchase_uuid;
    
    -- Add credits to user account
    SELECT add_user_credits(
        purchase_record.user_id,
        purchase_record.credits_amount,
        'Credit package purchase: ' || purchase_record.package_name,
        'credit_package',
        purchase_uuid,
        purchase_record.payment_reference
    ) INTO success;
    
    RETURN success;
END;
$$;

-- Function to handle new listing creation (implements 5-free rule)
CREATE OR REPLACE FUNCTION handle_new_listing(
    user_uuid UUID,
    listing_uuid UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_credits_record RECORD;
    listing_cost INTEGER := 5; -- Cost in credits for paid listings
    is_free BOOLEAN := FALSE;
    result JSONB;
BEGIN
    -- Ensure user_credits record exists
    INSERT INTO user_credits (user_id) 
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get user's credit information
    SELECT * INTO user_credits_record
    FROM user_credits
    WHERE user_id = user_uuid;
    
    -- Check if this listing should be free (first 5 listings)
    IF user_credits_record.free_listings_count < 5 THEN
        is_free := TRUE;
        
        -- Update free listings count
        UPDATE user_credits
        SET free_listings_count = free_listings_count + 1,
            updated_at = now()
        WHERE user_id = user_uuid;
        
        -- Record free transaction
        INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            description,
            reference_type,
            reference_id
        ) VALUES (
            user_uuid,
            'bonus',
            0,
            user_credits_record.balance,
            user_credits_record.balance,
            'Free listing (5-free promotion)',
            'listing',
            listing_uuid
        );
        
        result := jsonb_build_object(
            'success', true,
            'is_free', true,
            'credits_charged', 0,
            'remaining_free_listings', 5 - (user_credits_record.free_listings_count + 1),
            'message', 'Listing created for free!'
        );
    ELSE
        -- Check if user has sufficient credits
        IF user_credits_record.balance < listing_cost THEN
            result := jsonb_build_object(
                'success', false,
                'is_free', false,
                'credits_required', listing_cost,
                'current_balance', user_credits_record.balance,
                'message', 'Insufficient credits to create listing'
            );
        ELSE
            -- Charge credits for listing
            PERFORM spend_user_credits(
                user_uuid,
                listing_cost,
                'Listing creation fee',
                'listing',
                listing_uuid
            );
            
            result := jsonb_build_object(
                'success', true,
                'is_free', false,
                'credits_charged', listing_cost,
                'remaining_balance', user_credits_record.balance - listing_cost,
                'message', 'Listing created successfully!'
            );
        END IF;
    END IF;
    
    RETURN result;
END;
$$;

-- Function to purchase a feature
CREATE OR REPLACE FUNCTION purchase_feature(
    user_uuid UUID,
    listing_uuid UUID,
    feature_type TEXT,
    feature_name TEXT,
    credits_cost INTEGER,
    duration_hours INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    feature_id UUID;
    expires_at TIMESTAMPTZ;
    result JSONB;
BEGIN
    -- Validate feature type
    IF feature_type NOT IN (
        'pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 
        'ad_refresh', 'auto_refresh_30d', 'priority_support_7d',
        'featured_listing_7d', 'homepage_banner_24h', 'social_media_boost'
    ) THEN
        RAISE EXCEPTION 'Invalid feature type: %', feature_type;
    END IF;
    
    -- Get current balance
    SELECT balance INTO current_balance
    FROM user_credits
    WHERE user_id = user_uuid;
    
    -- Check sufficient credits
    IF current_balance < credits_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_credits',
            'required', credits_cost,
            'available', current_balance,
            'message', 'Insufficient credits to purchase this feature'
        );
    END IF;
    
    -- Calculate expiry time
    IF duration_hours IS NOT NULL THEN
        expires_at := now() + (duration_hours || ' hours')::INTERVAL;
    END IF;
    
    -- Spend credits
    PERFORM spend_user_credits(
        user_uuid,
        credits_cost,
        'Feature purchase: ' || feature_name,
        'feature',
        listing_uuid
    );
    
    -- Create feature purchase record
    INSERT INTO feature_purchases (
        user_id,
        listing_id,
        feature_type,
        feature_name,
        credits_cost,
        duration_hours,
        expires_at
    ) VALUES (
        user_uuid,
        listing_uuid,
        feature_type,
        feature_name,
        credits_cost,
        duration_hours,
        expires_at
    ) RETURNING id INTO feature_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'feature_id', feature_id,
        'expires_at', expires_at,
        'credits_charged', credits_cost,
        'remaining_balance', current_balance - credits_cost,
        'message', 'Feature purchased successfully!'
    );
END;
$$;

-- Function to subscribe to a plan
CREATE OR REPLACE FUNCTION subscribe_to_plan(
    user_uuid UUID,
    plan_name TEXT,
    subscription_type TEXT, -- 'monthly' or 'yearly'
    payment_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    plan_record RECORD;
    subscription_id UUID;
    period_start TIMESTAMPTZ := now();
    period_end TIMESTAMPTZ;
    result JSONB;
BEGIN
    -- Get plan details
    SELECT * INTO plan_record
    FROM subscription_plans
    WHERE subscription_plans.plan_name = subscribe_to_plan.plan_name
    AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription plan not found or inactive: %', plan_name;
    END IF;
    
    -- Calculate period end
    IF subscription_type = 'monthly' THEN
        period_end := period_start + INTERVAL '1 month';
    ELSIF subscription_type = 'yearly' THEN
        period_end := period_start + INTERVAL '1 year';
    ELSE
        RAISE EXCEPTION 'Invalid subscription type: %', subscription_type;
    END IF;
    
    -- Cancel any existing active subscription
    UPDATE user_subscriptions
    SET 
        status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Upgraded to new plan',
        updated_at = now()
    WHERE user_id = user_uuid
    AND status = 'active';
    
    -- Create new subscription
    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        subscription_type,
        current_period_start,
        current_period_end,
        payment_reference
    ) VALUES (
        user_uuid,
        plan_record.id,
        subscription_type,
        period_start,
        period_end,
        payment_reference
    ) RETURNING id INTO subscription_id;
    
    -- Award monthly credits if applicable
    IF plan_record.credit_allowance > 0 THEN
        PERFORM add_user_credits(
            user_uuid,
            plan_record.credit_allowance,
            'Monthly credit allowance: ' || plan_record.display_name,
            'subscription',
            subscription_id
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', subscription_id,
        'plan_name', plan_record.display_name,
        'period_start', period_start,
        'period_end', period_end,
        'credits_awarded', plan_record.credit_allowance,
        'message', 'Successfully subscribed to ' || plan_record.display_name
    );
END;
$$;

-- Function to get user's entitlements
CREATE OR REPLACE FUNCTION get_user_entitlements(user_uuid UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    subscription_record RECORD;
    entitlements JSONB := '{}'::jsonb;
    entitlement RECORD;
BEGIN
    -- Get active subscription
    SELECT us.*, sp.plan_name, sp.display_name, sp.features
    INTO subscription_record
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    AND us.status = 'active'
    AND us.current_period_end > now();
    
    -- If no active subscription, return basic entitlements
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'plan', 'free',
            'entitlements', jsonb_build_object(
                'max_listings', 5,
                'basic_support', true,
                'monthly_credits', 0
            )
        );
    END IF;
    
    -- Build entitlements from plan_entitlements table
    FOR entitlement IN
        SELECT pe.feature_key, pe.feature_value, pe.feature_type
        FROM plan_entitlements pe
        WHERE pe.plan_id = subscription_record.plan_id
        AND pe.is_active = TRUE
    LOOP
        -- Convert feature value based on type
        CASE entitlement.feature_type
            WHEN 'boolean' THEN
                entitlements := entitlements || jsonb_build_object(
                    entitlement.feature_key, 
                    entitlement.feature_value::boolean
                );
            WHEN 'number' THEN
                entitlements := entitlements || jsonb_build_object(
                    entitlement.feature_key, 
                    entitlement.feature_value::integer
                );
            ELSE
                entitlements := entitlements || jsonb_build_object(
                    entitlement.feature_key, 
                    entitlement.feature_value
                );
        END CASE;
    END LOOP;
    
    RETURN jsonb_build_object(
        'plan', subscription_record.plan_name,
        'plan_display_name', subscription_record.display_name,
        'subscription_type', subscription_record.subscription_type,
        'period_end', subscription_record.current_period_end,
        'entitlements', entitlements
    );
END;
$$;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to check if user can create listing
CREATE OR REPLACE FUNCTION can_create_listing(user_uuid UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credits_info RECORD;
    entitlements JSONB;
    current_listings INTEGER;
    max_listings TEXT;
    result JSONB;
BEGIN
    -- Get user's credit information
    SELECT * INTO credits_info
    FROM get_user_credits(user_uuid);
    
    -- Get user's entitlements
    SELECT get_user_entitlements(user_uuid) INTO entitlements;
    
    -- Get current active listings count
    SELECT COUNT(*) INTO current_listings
    FROM listings
    WHERE user_id = user_uuid
    AND status = 'active';
    
    -- Extract max_listings from entitlements
    max_listings := entitlements->'entitlements'->>'max_listings';
    
    -- Check listing limits
    IF max_listings != 'unlimited' AND current_listings >= max_listings::integer THEN
        RETURN jsonb_build_object(
            'can_create', false,
            'reason', 'listing_limit_reached',
            'current_listings', current_listings,
            'max_listings', max_listings,
            'message', 'You have reached your listing limit. Upgrade your plan for more listings.'
        );
    END IF;
    
    -- Check if user has free listings remaining
    IF credits_info.free_listings_count < 5 THEN
        RETURN jsonb_build_object(
            'can_create', true,
            'is_free', true,
            'free_listings_remaining', 5 - credits_info.free_listings_count,
            'message', 'You can create this listing for free!'
        );
    END IF;
    
    -- Check if user has sufficient credits
    IF credits_info.balance < 5 THEN
        RETURN jsonb_build_object(
            'can_create', false,
            'reason', 'insufficient_credits',
            'required_credits', 5,
            'current_balance', credits_info.balance,
            'message', 'You need 5 credits to create a listing. Purchase credits to continue.'
        );
    END IF;
    
    -- User can create listing with credits
    RETURN jsonb_build_object(
        'can_create', true,
        'is_free', false,
        'credits_required', 5,
        'current_balance', credits_info.balance,
        'message', 'Ready to create listing for 5 credits.'
    );
END;
$$;

-- Function to get user's monetization dashboard data
CREATE OR REPLACE FUNCTION get_monetization_dashboard(user_uuid UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credits_info RECORD;
    entitlements JSONB;
    recent_transactions JSONB;
    active_features JSONB;
    result JSONB;
BEGIN
    -- Get credit information
    SELECT * INTO credits_info FROM get_user_credits(user_uuid);
    
    -- Get entitlements
    SELECT get_user_entitlements(user_uuid) INTO entitlements;
    
    -- Get recent transactions (last 10)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', transaction_type,
            'amount', amount,
            'description', description,
            'created_at', created_at
        ) ORDER BY created_at DESC
    ) INTO recent_transactions
    FROM (
        SELECT * FROM credit_transactions
        WHERE user_id = user_uuid
        ORDER BY created_at DESC
        LIMIT 10
    ) t;
    
    -- Get active features
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'feature_type', feature_type,
            'feature_name', feature_name,
            'expires_at', expires_at,
            'listing_id', listing_id
        )
    ) INTO active_features
    FROM feature_purchases
    WHERE user_id = user_uuid
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());
    
    RETURN jsonb_build_object(
        'credits', jsonb_build_object(
            'balance', credits_info.balance,
            'lifetime_earned', credits_info.lifetime_earned,
            'lifetime_spent', credits_info.lifetime_spent,
            'free_listings_remaining', GREATEST(0, 5 - credits_info.free_listings_count)
        ),
        'subscription', entitlements,
        'recent_transactions', COALESCE(recent_transactions, '[]'::jsonb),
        'active_features', COALESCE(active_features, '[]'::jsonb)
    );
END;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits(UUID, INTEGER, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION spend_user_credits(UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_credit_purchase(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_listing(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_feature(UUID, UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION subscribe_to_plan(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_entitlements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_listing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monetization_dashboard(UUID) TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Monetization RPCs migration completed successfully' as status;
