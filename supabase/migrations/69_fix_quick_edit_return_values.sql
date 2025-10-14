-- =============================================
-- FIX: Update quick_edit_listing to return trigger-updated values
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
    WHERE id = p_listing_id;
    
    -- Fetch the updated listing AFTER the trigger has run
    SELECT jsonb_build_object(
        'id', id,
        'title', title,
        'price', price,
        'previous_price', previous_price,
        'description', description,
        'price_changed_at', price_changed_at,
        'updated_at', updated_at
    ) INTO v_result
    FROM listings
    WHERE id = p_listing_id;
    
    RETURN QUERY SELECT 
        true,
        'Listing updated successfully'::TEXT,
        v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Quick edit function updated to return trigger-set values!';
END $$;

