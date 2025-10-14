-- =============================================
-- QUICK FIX: Remove metadata references from price change functions
-- =============================================
-- Run this to fix the metadata column error

-- Fix the trigger function
CREATE OR REPLACE FUNCTION handle_listing_price_change()
RETURNS TRIGGER AS $$
DECLARE
    price_change_percent NUMERIC(5, 2);
    interested_user RECORD;
    notification_count INTEGER := 0;
BEGIN
    -- Only process if price actually changed
    IF NEW.price IS DISTINCT FROM OLD.price THEN
        
        -- Calculate percentage change
        IF OLD.price > 0 THEN
            price_change_percent := ROUND(((NEW.price - OLD.price) / OLD.price * 100), 2);
        ELSE
            price_change_percent := 0;
        END IF;
        
        -- Record price history
        INSERT INTO listing_price_history (
            listing_id,
            old_price,
            new_price,
            price_change_percent,
            changed_by,
            reason
        ) VALUES (
            NEW.id,
            OLD.price,
            NEW.price,
            price_change_percent,
            NEW.user_id,
            'seller_edit'
        );
        
        -- Update listing with previous price
        NEW.previous_price := OLD.price;
        NEW.price_changed_at := NOW();
        
        -- If price dropped, notify interested users
        IF NEW.price < OLD.price THEN
            -- Notify users who favorited this listing
            FOR interested_user IN
                SELECT DISTINCT user_id
                FROM favorites
                WHERE listing_id = NEW.id
                AND user_id != NEW.user_id
            LOOP
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    body,
                    data,
                    related_type,
                    related_id
                ) VALUES (
                    interested_user.user_id,
                    'price_drop',
                    '💰 Price Drop Alert!',
                    format('Great news! The price of "%s" dropped from GHS %.2f to GHS %.2f (%.0f%% off)!',
                        NEW.title,
                        OLD.price,
                        NEW.price,
                        ABS(price_change_percent)
                    ),
                    jsonb_build_object(
                        'listing_id', NEW.id,
                        'listing_title', NEW.title,
                        'old_price', OLD.price,
                        'new_price', NEW.price,
                        'discount_percent', ABS(price_change_percent),
                        'listing_image', COALESCE(NEW.media->0->>'url', ''),
                        'seller_id', NEW.user_id
                    ),
                    'listing',
                    NEW.id
                );
                notification_count := notification_count + 1;
            END LOOP;
            
            -- Notify users who viewed this listing recently (last 7 days)
            FOR interested_user IN
                SELECT DISTINCT lv.user_id
                FROM listing_views lv
                WHERE lv.listing_id = NEW.id
                AND lv.user_id != NEW.user_id
                AND lv.created_at >= NOW() - INTERVAL '7 days'
                AND NOT EXISTS (
                    SELECT 1 FROM favorites f 
                    WHERE f.listing_id = NEW.id 
                    AND f.user_id = lv.user_id
                )
            LOOP
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    body,
                    data,
                    related_type,
                    related_id
                ) VALUES (
                    interested_user.user_id,
                    'price_drop',
                    '💰 Price Drop on Item You Viewed!',
                    format('The price of "%s" you viewed recently dropped from GHS %.2f to GHS %.2f!',
                        NEW.title,
                        OLD.price,
                        NEW.price
                    ),
                    jsonb_build_object(
                        'listing_id', NEW.id,
                        'listing_title', NEW.title,
                        'old_price', OLD.price,
                        'new_price', NEW.price,
                        'discount_percent', ABS(price_change_percent),
                        'listing_image', COALESCE(NEW.media->0->>'url', ''),
                        'seller_id', NEW.user_id
                    ),
                    'listing',
                    NEW.id
                );
                notification_count := notification_count + 1;
            END LOOP;
            
            RAISE NOTICE 'Price drop: Sent % notifications for listing %', notification_count, NEW.id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the quick edit function
CREATE OR REPLACE FUNCTION quick_edit_listing(
    p_listing_id UUID,
    p_user_id UUID,
    p_new_price NUMERIC DEFAULT NULL,
    p_new_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    updated_listing JSONB
) AS $$
DECLARE
    v_listing RECORD;
    v_result JSONB;
BEGIN
    -- Verify user owns the listing
    SELECT * INTO v_listing
    FROM listings
    WHERE id = p_listing_id
    AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Listing not found or you do not have permission'::TEXT, NULL::JSONB;
        RETURN;
    END IF;
    
    -- Validate inputs
    IF p_new_price IS NOT NULL AND p_new_price <= 0 THEN
        RETURN QUERY SELECT false, 'Price must be greater than 0'::TEXT, NULL::JSONB;
        RETURN;
    END IF;
    
    -- Update listing
    UPDATE listings
    SET 
        price = COALESCE(p_new_price, price),
        description = COALESCE(p_new_description, description),
        updated_at = NOW()
    WHERE id = p_listing_id
    RETURNING jsonb_build_object(
        'id', id,
        'title', title,
        'price', price,
        'previous_price', previous_price,
        'description', description,
        'updated_at', updated_at
    ) INTO v_result;
    
    RETURN QUERY SELECT 
        true,
        'Listing updated successfully'::TEXT,
        v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Quick edit functions fixed! Metadata references removed.';
END $$;

