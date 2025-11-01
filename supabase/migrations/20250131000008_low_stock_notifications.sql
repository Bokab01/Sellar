-- =====================================================
-- LOW STOCK NOTIFICATION SYSTEM
-- =====================================================
-- Notify users who favorited an item when stock is running low
-- =====================================================

-- 1. Create function to notify users about low stock
CREATE OR REPLACE FUNCTION notify_low_stock_favorites()
RETURNS TRIGGER AS $$
DECLARE
  v_old_available INTEGER;
  v_new_available INTEGER;
  v_total_quantity INTEGER;
  v_stock_percentage DECIMAL;
  v_stock_status TEXT;
  v_listing_title TEXT;
  v_listing_price DECIMAL;
BEGIN
  -- Only process when reserved_quantity changes
  IF OLD.reserved_quantity IS DISTINCT FROM NEW.reserved_quantity THEN
    
    v_total_quantity := NEW.quantity;
    v_old_available := OLD.quantity - COALESCE(OLD.reserved_quantity, 0);
    v_new_available := NEW.quantity - COALESCE(NEW.reserved_quantity, 0);
    v_stock_percentage := (v_new_available::DECIMAL / v_total_quantity) * 100;
    
    -- Get listing details
    SELECT title, price INTO v_listing_title, v_listing_price
    FROM listings
    WHERE id = NEW.id;
    
    -- Determine if we should send notifications
    v_stock_status := NULL;
    
    -- Case 1: Last unit available (was 2+, now 1)
    IF v_new_available = 1 AND v_old_available > 1 THEN
      v_stock_status := 'last_unit';
    
    -- Case 2: Low stock alert (crosses 20% threshold)
    ELSIF v_stock_percentage <= 20 AND v_stock_percentage > 0 
          AND (v_old_available::DECIMAL / v_total_quantity * 100) > 20 THEN
      v_stock_status := 'low_stock';
    
    -- Case 3: Out of stock
    ELSIF v_new_available = 0 AND v_old_available > 0 THEN
      v_stock_status := 'out_of_stock';
    END IF;
    
    -- Send notifications if status changed
    IF v_stock_status IS NOT NULL THEN
      -- Insert notifications for all users who favorited this listing
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        created_at
      )
      SELECT
        f.user_id,
        'stock_alert',
        CASE
          WHEN v_stock_status = 'last_unit' THEN '⚠️ Last Unit Available!'
          WHEN v_stock_status = 'low_stock' THEN '⚠️ Low Stock Alert'
          WHEN v_stock_status = 'out_of_stock' THEN '❌ Out of Stock'
        END,
        CASE
          WHEN v_stock_status = 'last_unit' THEN
            'Only 1 unit left of "' || v_listing_title || '"! Secure it now before it''s gone.'
          WHEN v_stock_status = 'low_stock' THEN
            'Only ' || v_new_available || ' units left of "' || v_listing_title || '"! Get yours soon.'
          WHEN v_stock_status = 'out_of_stock' THEN
            '"' || v_listing_title || '" is now out of stock. Check back later!'
        END,
        json_build_object(
          'listing_id', NEW.id,
          'stock_status', v_stock_status,
          'available_quantity', v_new_available,
          'total_quantity', v_total_quantity,
          'listing_title', v_listing_title,
          'listing_price', v_listing_price
        ),
        NOW()
      FROM favorites f
      WHERE f.listing_id = NEW.id
        AND f.user_id != NEW.user_id; -- Don't notify the seller
      
      -- Log for analytics
      RAISE NOTICE 'Stock alert sent: % for listing % (% available)', 
        v_stock_status, NEW.id, v_new_available;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger on listings table
DROP TRIGGER IF EXISTS trigger_notify_low_stock ON listings;
CREATE TRIGGER trigger_notify_low_stock
  AFTER UPDATE ON listings
  FOR EACH ROW
  WHEN (OLD.reserved_quantity IS DISTINCT FROM NEW.reserved_quantity)
  EXECUTE FUNCTION notify_low_stock_favorites();

-- 3. Function to manually check and notify for low stock items
-- Useful for bulk operations or cron jobs
CREATE OR REPLACE FUNCTION check_low_stock_items()
RETURNS JSON AS $$
DECLARE
  v_notification_count INTEGER := 0;
  v_listing RECORD;
BEGIN
  FOR v_listing IN
    SELECT 
      l.id,
      l.title,
      l.price,
      l.quantity,
      l.reserved_quantity,
      (l.quantity - COALESCE(l.reserved_quantity, 0)) as available_quantity,
      ((l.quantity - COALESCE(l.reserved_quantity, 0))::DECIMAL / l.quantity * 100) as stock_percentage
    FROM listings l
    WHERE l.quantity > 1  -- Only bulk items
      AND l.status = 'active'
      AND (l.quantity - COALESCE(l.reserved_quantity, 0)) > 0  -- Not out of stock
      AND ((l.quantity - COALESCE(l.reserved_quantity, 0))::DECIMAL / l.quantity * 100) <= 20  -- 20% or less
  LOOP
    -- Check if notification was already sent in last 24 hours
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE data->>'listing_id' = v_listing.id::TEXT
        AND type = 'stock_alert'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      -- Send notifications to favorites
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        created_at
      )
      SELECT
        f.user_id,
        'stock_alert',
        CASE
          WHEN v_listing.available_quantity = 1 THEN '⚠️ Last Unit Available!'
          ELSE '⚠️ Low Stock Alert'
        END,
        CASE
          WHEN v_listing.available_quantity = 1 THEN
            'Only 1 unit left of "' || v_listing.title || '"! Secure it now before it''s gone.'
          ELSE
            'Only ' || v_listing.available_quantity || ' units left of "' || v_listing.title || '"! Get yours soon.'
        END,
        json_build_object(
          'listing_id', v_listing.id,
          'stock_status', CASE WHEN v_listing.available_quantity = 1 THEN 'last_unit' ELSE 'low_stock' END,
          'available_quantity', v_listing.available_quantity,
          'total_quantity', v_listing.quantity,
          'listing_title', v_listing.title,
          'listing_price', v_listing.price
        ),
        NOW()
      FROM favorites f
      WHERE f.listing_id = v_listing.id;
      
      GET DIAGNOSTICS v_notification_count = ROW_COUNT;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'notifications_sent', v_notification_count,
    'message', 'Low stock check completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_low_stock_items TO service_role;

-- 4. Optional: Schedule daily low stock check (runs at 9 AM daily)
SELECT cron.schedule(
  'daily-low-stock-check',
  '0 9 * * *',  -- Every day at 9 AM
  $$
  SELECT check_low_stock_items();
  $$
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Low Stock Notification System created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Automatic notifications when stock drops below 20%%';
  RAISE NOTICE '  ✓ "Last Unit" alert when only 1 remaining';
  RAISE NOTICE '  ✓ "Out of Stock" notification';
  RAISE NOTICE '  ✓ Only notifies users who favorited the item';
  RAISE NOTICE '  ✓ Daily check at 9 AM for all low stock items';
  RAISE NOTICE '';
  RAISE NOTICE 'Notification Triggers:';
  RAISE NOTICE '  • Stock drops to 20%% or below → "Low Stock"';
  RAISE NOTICE '  • Stock drops to 1 unit → "Last Unit Available!"';
  RAISE NOTICE '  • Stock drops to 0 → "Out of Stock"';
END $$;

-- To manually trigger a check:
-- SELECT check_low_stock_items();

-- To disable the cron job:
-- SELECT cron.unschedule('daily-low-stock-check');

