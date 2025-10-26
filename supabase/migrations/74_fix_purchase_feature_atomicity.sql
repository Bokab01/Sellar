-- Make purchase_feature atomic and validate listing_id for listing-scoped features.

CREATE OR REPLACE FUNCTION purchase_feature(
    p_user_id UUID,
    p_feature_key VARCHAR(100),
    p_credits INTEGER,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error TEXT) AS $$
DECLARE
    result_success BOOLEAN;
    result_balance INTEGER;
    result_error TEXT;
    p_listing_id UUID;
BEGIN
    -- Extract listing_id from metadata if provided
    p_listing_id := NULLIF((p_metadata->>'listing_id'), '')::UUID;

    -- Validate listing_id for listing-scoped features
    IF p_feature_key IN (
        'pulse_boost_24h','mega_pulse_7d','category_spotlight_3d','listing_highlight','urgent_badge','ad_refresh'
    ) AND p_listing_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::INTEGER, 'Missing listing_id for feature';
        RETURN;
    END IF;

    BEGIN
        -- Deduct credits
        SELECT * INTO result_success, result_balance, result_error
        FROM spend_user_credits(
            p_user_id, 
            p_credits, 
            'Feature purchase: ' || p_feature_key,
            p_listing_id,
            'feature_purchase'
        );

        IF NOT result_success THEN
            RETURN QUERY SELECT false, result_balance, COALESCE(result_error, 'Credit deduction failed');
            RETURN;
        END IF;

        -- Create feature purchase record
        INSERT INTO feature_purchases (
            user_id, listing_id, feature_key, feature_name,
            credits_spent, status, activated_at, expires_at, metadata
        ) VALUES (
            p_user_id,
            p_listing_id,
            p_feature_key,
            CASE 
                WHEN p_feature_key = 'pulse_boost_24h' THEN 'Pulse Boost'
                WHEN p_feature_key = 'mega_pulse_7d' THEN 'Mega Pulse'
                WHEN p_feature_key = 'category_spotlight_3d' THEN 'Category Spotlight'
                WHEN p_feature_key = 'listing_highlight' THEN 'Listing Highlight'
                WHEN p_feature_key = 'urgent_badge' THEN 'Urgent Badge'
                WHEN p_feature_key = 'ad_refresh' THEN 'Ad Refresh'
                ELSE p_feature_key
            END,
            p_credits,
            'active',
            NOW(),
            CASE 
                WHEN p_feature_key = 'pulse_boost_24h' THEN NOW() + INTERVAL '24 hours'
                WHEN p_feature_key = 'mega_pulse_7d' THEN NOW() + INTERVAL '7 days'
                WHEN p_feature_key = 'category_spotlight_3d' THEN NOW() + INTERVAL '3 days'
                WHEN p_feature_key = 'listing_highlight' THEN NOW() + INTERVAL '7 days'
                WHEN p_feature_key = 'urgent_badge' THEN NOW() + INTERVAL '3 days'
                WHEN p_feature_key = 'ad_refresh' THEN NULL
                ELSE NOW() + INTERVAL '30 days'
            END,
            p_metadata
        );

        -- Apply effect; if it fails, raise to trigger exception block
        PERFORM apply_feature_effect(p_user_id, p_feature_key, p_listing_id, p_metadata);

        RETURN QUERY SELECT true, result_balance, NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
        -- Compensate the spend by returning credits
        UPDATE user_credits
        SET 
            balance = balance + p_credits,
            updated_at = NOW(),
            lifetime_spent = GREATEST(lifetime_spent - p_credits, 0)
        WHERE user_id = p_user_id;

        INSERT INTO credit_transactions (
            user_id, type, amount, balance_before, balance_after, reference_id, reference_type, metadata
        )
        SELECT 
            p_user_id, 'refunded', p_credits,
            (balance - p_credits), balance,
            p_listing_id, 'feature_purchase_refund', jsonb_build_object('feature_key', p_feature_key, 'reason', SQLERRM)
        FROM user_credits WHERE user_id = p_user_id;

        RETURN QUERY SELECT false, (SELECT balance FROM user_credits WHERE user_id = p_user_id), 'Feature application failed and was refunded';
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


