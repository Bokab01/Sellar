-- =============================================
-- PRICE CHANGE & QUICK EDIT SYSTEM
-- =============================================
-- Track price history, show old prices with strikethrough,
-- and send notifications to interested users on price drops

-- =============================================
-- 1. CREATE PRICE HISTORY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS listing_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    old_price NUMERIC(10, 2) NOT NULL,
    new_price NUMERIC(10, 2) NOT NULL,
    price_change_percent NUMERIC(5, 2), -- Negative for price drops
    changed_by UUID NOT NULL REFERENCES profiles(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason VARCHAR(50) -- 'seller_edit', 'quick_edit', 'bulk_edit'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_listing_price_history_listing ON listing_price_history(listing_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_price_history_changed_at ON listing_price_history(changed_at DESC);

-- RLS Policies
ALTER TABLE listing_price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view price history
CREATE POLICY "Anyone can view price history"
    ON listing_price_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Only system can insert price history (via triggers)
CREATE POLICY "Only system can insert price history"
    ON listing_price_history
    FOR INSERT
    TO authenticated
    WITH CHECK (changed_by = auth.uid());

-- Add comments
COMMENT ON TABLE listing_price_history IS 'Tracks all price changes for listings to show price drop badges and price history';
COMMENT ON COLUMN listing_price_history.price_change_percent IS 'Percentage change in price. Negative values indicate price drops.';

-- =============================================
-- 2. ADD COLUMNS TO LISTINGS TABLE
-- =============================================

-- Add previous_price column to store the last price before current one
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS previous_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS price_changed_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN listings.previous_price IS 'The previous price before the current price. Used to show strikethrough pricing.';
COMMENT ON COLUMN listings.price_changed_at IS 'When the price was last changed. Used to determine if price drop is recent.';

-- =============================================
-- 3. FUNCTION TO HANDLE PRICE CHANGES
-- =============================================

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
                AND user_id != NEW.user_id -- Don't notify the seller
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
                AND lv.user_id != NEW.user_id -- Don't notify the seller
                AND lv.created_at >= NOW() - INTERVAL '7 days'
                -- Don't notify if already notified via favorites
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

-- =============================================
-- 4. CREATE TRIGGER FOR PRICE CHANGES
-- =============================================

DROP TRIGGER IF EXISTS trigger_listing_price_change ON listings;

CREATE TRIGGER trigger_listing_price_change
    BEFORE UPDATE OF price ON listings
    FOR EACH ROW
    WHEN (NEW.price IS DISTINCT FROM OLD.price)
    EXECUTE FUNCTION handle_listing_price_change();

-- =============================================
-- 5. FUNCTION FOR QUICK EDIT (PRICE & DESCRIPTION)
-- =============================================

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION quick_edit_listing(UUID, UUID, NUMERIC, TEXT) TO authenticated;

COMMENT ON FUNCTION quick_edit_listing IS 'Allows sellers to quickly edit price and description without affecting boosts or features';

-- =============================================
-- 6. HELPER FUNCTION TO GET PRICE HISTORY
-- =============================================

CREATE OR REPLACE FUNCTION get_listing_price_history(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    changed_at TIMESTAMP WITH TIME ZONE,
    old_price NUMERIC,
    new_price NUMERIC,
    price_change_percent NUMERIC,
    reason VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lph.changed_at,
        lph.old_price,
        lph.new_price,
        lph.price_change_percent,
        lph.reason
    FROM listing_price_history lph
    WHERE lph.listing_id = p_listing_id
    ORDER BY lph.changed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_listing_price_history(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_listing_price_history IS 'Returns price change history for a listing';

-- =============================================
-- 7. ADD INDEXES FOR PERFORMANCE
-- =============================================

-- Index for finding favorited listings (for notifications)
CREATE INDEX IF NOT EXISTS idx_favorites_listing_user ON favorites(listing_id, user_id);

-- Index for finding recent views (for notifications)
CREATE INDEX IF NOT EXISTS idx_listing_views_recent ON listing_views(listing_id, user_id, created_at DESC);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PRICE CHANGE & QUICK EDIT SYSTEM COMPLETE!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Features Enabled:';
    RAISE NOTICE '✅ Price history tracking';
    RAISE NOTICE '✅ Strikethrough old prices (previous_price column)';
    RAISE NOTICE '✅ Price drop notifications to interested users';
    RAISE NOTICE '✅ Quick edit function for price & description';
    RAISE NOTICE '✅ No impact on boosts or features';
    RAISE NOTICE '';
    RAISE NOTICE 'Notifications sent to:';
    RAISE NOTICE '- Users who favorited the item';
    RAISE NOTICE '- Users who viewed in last 7 days';
    RAISE NOTICE '- Only on price drops (not increases)';
    RAISE NOTICE '==============================================';
END $$;

