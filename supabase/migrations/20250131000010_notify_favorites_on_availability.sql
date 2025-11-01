-- =====================================================
-- NOTIFY FAVORITES WHEN LISTING BECOMES AVAILABLE AGAIN
-- =====================================================
-- Scenarios covered:
-- 1. Deposit expires/refunded/cancelled → Units released
-- 2. Seller relists a sold item → Back in market
-- 3. Seller increases quantity → More units available
-- 4. Listing status changes from reserved → active
-- =====================================================

-- 1. Function to notify all users who favorited a listing
CREATE OR REPLACE FUNCTION notify_favorites_listing_available(
  p_listing_id UUID,
  p_reason TEXT DEFAULT 'available'
)
RETURNS INTEGER AS $$
DECLARE
  v_listing RECORD;
  v_notification_count INTEGER := 0;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM listings
  WHERE id = p_listing_id;

  IF v_listing IS NULL THEN
    RETURN 0;
  END IF;

  -- Build notification message based on reason
  CASE p_reason
    WHEN 'relisted' THEN
      v_title := '🔄 Item Relisted!';
      v_message := v_listing.title || ' is back in the marketplace!';
    WHEN 'quantity_increased' THEN
      v_title := '📦 More Units Available!';
      v_message := 'More units of ' || v_listing.title || ' are now available!';
    WHEN 'reservation_expired' THEN
      v_title := '✅ Back in Stock!';
      v_message := v_listing.title || ' is available again. A reservation expired.';
    WHEN 'reservation_cancelled' THEN
      v_title := '✅ Back in Stock!';
      v_message := v_listing.title || ' is available again. A reservation was cancelled.';
    ELSE
      v_title := '✅ Available Again!';
      v_message := v_listing.title || ' is now available!';
  END CASE;

  -- Send notifications to all users who favorited this listing (except the seller)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  SELECT 
    f.user_id,
    'listing_available',
    v_title,
    v_message,
    json_build_object(
      'listing_id', p_listing_id,
      'listing_title', v_listing.title,
      'listing_image', v_listing.images[1],
      'listing_price', v_listing.price,
      'reason', p_reason,
      'available_quantity', v_listing.quantity - COALESCE(v_listing.reserved_quantity, 0)
    )
  FROM favorites f
  WHERE f.listing_id = p_listing_id
    AND f.user_id != v_listing.user_id  -- Don't notify the seller
    -- Only notify if they haven't been notified in the last 24 hours about this listing
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = f.user_id
        AND n.type = 'listing_available'
        AND n.data->>'listing_id' = p_listing_id::TEXT
        AND n.created_at > NOW() - INTERVAL '24 hours'
    );

  GET DIAGNOSTICS v_notification_count = ROW_COUNT;

  RETURN v_notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION notify_favorites_listing_available TO authenticated;

-- 2. Trigger: Notify when listing status changes from sold/reserved → active
CREATE OR REPLACE FUNCTION trigger_notify_on_status_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Case 1: Relisted (sold → active)
  IF OLD.status = 'sold' AND NEW.status = 'active' THEN
    PERFORM notify_favorites_listing_available(NEW.id, 'relisted');
    RAISE NOTICE 'Notified % favorites: Listing % relisted', 
      notify_favorites_listing_available(NEW.id, 'relisted'), NEW.id;
  END IF;

  -- Case 2: Reservation released (reserved → active)
  IF OLD.status = 'reserved' AND NEW.status = 'active' THEN
    -- Check if units are now available (for bulk items)
    IF NEW.quantity > 1 THEN
      DECLARE
        v_newly_available INTEGER;
      BEGIN
        v_newly_available := (NEW.quantity - COALESCE(NEW.reserved_quantity, 0)) - 
                            (OLD.quantity - COALESCE(OLD.reserved_quantity, 0));
        
        IF v_newly_available > 0 THEN
          PERFORM notify_favorites_listing_available(NEW.id, 'reservation_expired');
        END IF;
      END;
    ELSE
      -- Single item became available
      PERFORM notify_favorites_listing_available(NEW.id, 'reservation_expired');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_status_active ON listings;
CREATE TRIGGER trigger_notify_on_status_active
  AFTER UPDATE ON listings
  FOR EACH ROW
  WHEN ((OLD.status = 'sold' AND NEW.status = 'active') OR 
        (OLD.status = 'reserved' AND NEW.status = 'active'))
  EXECUTE FUNCTION trigger_notify_on_status_active();

-- 3. Trigger: Notify when quantity is increased (more units available)
CREATE OR REPLACE FUNCTION trigger_notify_on_quantity_increase()
RETURNS TRIGGER AS $$
DECLARE
  v_old_available INTEGER;
  v_new_available INTEGER;
BEGIN
  -- Only for bulk items (quantity > 1)
  IF NEW.quantity > 1 AND NEW.status = 'active' THEN
    v_old_available := OLD.quantity - COALESCE(OLD.reserved_quantity, 0);
    v_new_available := NEW.quantity - COALESCE(NEW.reserved_quantity, 0);

    -- If available quantity increased
    IF v_new_available > v_old_available THEN
      PERFORM notify_favorites_listing_available(NEW.id, 'quantity_increased');
      RAISE NOTICE 'Notified % favorites: Quantity increased for listing %', 
        notify_favorites_listing_available(NEW.id, 'quantity_increased'), NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_quantity_increase ON listings;
CREATE TRIGGER trigger_notify_on_quantity_increase
  AFTER UPDATE ON listings
  FOR EACH ROW
  WHEN (NEW.quantity > OLD.quantity AND NEW.status = 'active')
  EXECUTE FUNCTION trigger_notify_on_quantity_increase();

-- 4. Update the restore_listing_on_deposit_complete to use notification reason
-- (Already exists, but let's add proper notification reason)
CREATE OR REPLACE FUNCTION restore_listing_on_deposit_complete_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_completed_units INTEGER;
  v_remaining_units INTEGER;
  v_remaining_reserved INTEGER;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM listings
  WHERE id = OLD.listing_id;

  -- CASE 1: Deposit RELEASED (transaction completed successfully)
  IF NEW.status = 'released' AND OLD.status = 'paid' THEN
    -- Calculate remaining units after this transaction
    -- Count how many units have been successfully sold (released deposits)
    SELECT COALESCE(SUM(reserved_quantity), 0) INTO v_completed_units
    FROM listing_deposits
    WHERE listing_id = OLD.listing_id
      AND status = 'released';

    -- Calculate remaining available units
    v_remaining_units := v_listing.quantity - v_completed_units;

    -- Check if ALL units are now sold
    IF v_remaining_units = 0 THEN
      -- Mark listing as SOLD (all units gone)
      UPDATE listings
      SET 
        status = 'sold',
        sold_at = NOW(),
        reserved_until = NULL,
        updated_at = NOW()
      WHERE id = OLD.listing_id;

      -- Send "all sold out" notification to seller
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        OLD.seller_id,
        'listing_sold_out',
        '🎉 All Units Sold!',
        'Congratulations! All ' || v_listing.quantity || ' units have been sold!',
        json_build_object(
          'listing_id', OLD.listing_id,
          'total_quantity', v_listing.quantity,
          'deposit_id', OLD.id
        )
      );
    ELSE
      -- Partial sale: Some units sold, some still available/reserved
      -- Check if there are still active reservations (paid deposits)
      SELECT COALESCE(SUM(reserved_quantity), 0) INTO v_remaining_reserved
      FROM listing_deposits
      WHERE listing_id = OLD.listing_id
        AND status = 'paid';

      IF v_remaining_reserved = 0 THEN
        -- No more reservations, listing back to active with reduced quantity
        UPDATE listings
        SET 
          status = 'active',
          reserved_until = NULL,
          updated_at = NOW()
        WHERE id = OLD.listing_id;
      END IF;
      -- If v_remaining_reserved > 0, listing stays as 'reserved'

      -- Send "partial sale" notification to seller
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        OLD.seller_id,
        'listing_partial_sale',
        '💰 ' || OLD.reserved_quantity || ' Unit(s) Sold!',
        v_remaining_units || ' units remaining from your listing.',
        json_build_object(
          'listing_id', OLD.listing_id,
          'sold_quantity', OLD.reserved_quantity,
          'remaining_quantity', v_remaining_units,
          'buyer_id', OLD.buyer_id,
          'deposit_id', OLD.id
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- CASE 2: Deposit REFUNDED, EXPIRED, or CANCELLED (failed transaction)
  IF NEW.status IN ('refunded', 'expired', 'cancelled') AND OLD.status = 'paid' THEN
    -- Check remaining reserved quantity for this listing
    SELECT COALESCE(SUM(reserved_quantity), 0) INTO v_remaining_reserved
    FROM listing_deposits
    WHERE listing_id = OLD.listing_id
      AND status = 'paid'
      AND id != OLD.id;

    -- If no more active reservations, restore listing to active
    IF v_remaining_reserved = 0 THEN
      UPDATE listings
      SET 
        status = 'active',
        reserved_until = NULL,
        updated_at = NOW()
      WHERE id = OLD.listing_id
        AND status = 'reserved';  -- Only if currently reserved

      -- Notify seller that listing is back in market
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        OLD.seller_id,
        'listing_available_again',
        'Listing Back in Market',
        'A deposit was ' || NEW.status || '. Your listing is now available for other buyers.',
        json_build_object(
          'listing_id', OLD.listing_id,
          'deposit_status', NEW.status
        )
      );

      -- 🆕 Notify favorites that listing is available again
      PERFORM notify_favorites_listing_available(
        OLD.listing_id, 
        CASE 
          WHEN NEW.status = 'expired' THEN 'reservation_expired'
          WHEN NEW.status = 'cancelled' THEN 'reservation_cancelled'
          ELSE 'available'
        END
      );
    END IF;

    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the old trigger with the new function
DROP TRIGGER IF EXISTS trigger_restore_listing_on_deposit_complete ON listing_deposits;
CREATE TRIGGER trigger_restore_listing_on_deposit_complete
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  WHEN (NEW.status IN ('released', 'refunded', 'expired', 'cancelled') AND OLD.status = 'paid')
  EXECUTE FUNCTION restore_listing_on_deposit_complete_v2();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Favorites notification system implemented!';
  RAISE NOTICE '';
  RAISE NOTICE '=== NOTIFICATION SCENARIOS ===';
  RAISE NOTICE '1. Deposit expires/refunded/cancelled → "✅ Back in Stock!" to favorites';
  RAISE NOTICE '2. Seller relists sold item → "🔄 Item Relisted!" to favorites';
  RAISE NOTICE '3. Seller increases quantity → "📦 More Units Available!" to favorites';
  RAISE NOTICE '4. Listing changes reserved → active → Notified';
  RAISE NOTICE '';
  RAISE NOTICE '=== FEATURES ===';
  RAISE NOTICE '✓ 24-hour notification cooldown (no spam)';
  RAISE NOTICE '✓ Seller not notified (only favorited users)';
  RAISE NOTICE '✓ Different messages for different reasons';
  RAISE NOTICE '✓ Automatic via triggers';
END $$;

