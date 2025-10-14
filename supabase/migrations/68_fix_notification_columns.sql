-- =============================================
-- FIX: Remove related_type and related_id from notification inserts
-- =============================================
-- The notifications table doesn't have these columns

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
                    data
                ) VALUES (
                    interested_user.user_id,
                    'price_drop',
                    '💰 Price Drop Alert!',
                    'Great news! The price of "' || NEW.title || '" dropped from GHS ' || 
                    ROUND(OLD.price, 2)::TEXT || ' to GHS ' || ROUND(NEW.price, 2)::TEXT || 
                    ' (' || ABS(price_change_percent)::TEXT || '% off)!',
                    jsonb_build_object(
                        'listing_id', NEW.id,
                        'listing_title', NEW.title,
                        'old_price', OLD.price,
                        'new_price', NEW.price,
                        'discount_percent', ABS(price_change_percent),
                        'listing_image', COALESCE(NEW.images->0->>'url', ''),
                        'seller_id', NEW.user_id
                    )
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
                    data
                ) VALUES (
                    interested_user.user_id,
                    'price_drop',
                    '💰 Price Drop on Item You Viewed!',
                    'The price of "' || NEW.title || '" you viewed recently dropped from GHS ' || 
                    ROUND(OLD.price, 2)::TEXT || ' to GHS ' || ROUND(NEW.price, 2)::TEXT || '!',
                    jsonb_build_object(
                        'listing_id', NEW.id,
                        'listing_title', NEW.title,
                        'old_price', OLD.price,
                        'new_price', NEW.price,
                        'discount_percent', ABS(price_change_percent),
                        'listing_image', COALESCE(NEW.images->0->>'url', ''),
                        'seller_id', NEW.user_id
                    )
                );
                notification_count := notification_count + 1;
            END LOOP;
            
            RAISE NOTICE 'Price drop: Sent % notifications for listing %', notification_count, NEW.id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Notification columns fixed! Removed related_type and related_id references.';
END $$;

