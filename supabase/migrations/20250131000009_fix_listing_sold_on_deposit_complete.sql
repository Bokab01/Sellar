-- =====================================================
-- FIX: Mark Listing as SOLD when Deposit Released
-- =====================================================
-- Currently: Deposit released → Listing back to 'active' (WRONG)
-- Should be: Deposit released → Listing marked as 'sold'
-- =====================================================

-- 1. Update the restore_listing_on_deposit_complete function to mark as SOLD instead
CREATE OR REPLACE FUNCTION restore_listing_on_deposit_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_remaining_reserved INTEGER;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM listings
  WHERE id = OLD.listing_id;

  -- CASE 1: Deposit RELEASED (transaction completed successfully)
  IF NEW.status = 'released' AND OLD.status = 'paid' THEN
    -- Calculate remaining units after this transaction
    DECLARE
      v_completed_units INTEGER;
      v_remaining_units INTEGER;
    BEGIN
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
    END;

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
    END IF;

    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger (already exists, just recreating to use updated function)
DROP TRIGGER IF EXISTS trigger_restore_listing_on_deposit_complete ON listing_deposits;
CREATE TRIGGER trigger_restore_listing_on_deposit_complete
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  WHEN (NEW.status IN ('released', 'refunded', 'expired', 'cancelled') AND OLD.status = 'paid')
  EXECUTE FUNCTION restore_listing_on_deposit_complete();

-- 2. Update confirm_meetup_buyer to handle quantity updates properly
CREATE OR REPLACE FUNCTION confirm_meetup_buyer(
  p_deposit_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
  v_listing RECORD;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = p_deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not in paid status';
  END IF;

  -- Check authorization
  IF v_deposit.buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get listing details
  SELECT * INTO v_listing
  FROM listings
  WHERE id = v_deposit.listing_id;

  -- Update deposit status to released
  UPDATE listing_deposits
  SET 
    meetup_confirmed_by_buyer_at = NOW(),
    buyer_showed_up = TRUE,
    status = 'released',
    released_at = NOW(),
    released_to = seller_id,
    updated_at = NOW()
  WHERE id = p_deposit_id;

  -- Update buyer success stats
  UPDATE profiles
  SET deposit_success_count = deposit_success_count + 1
  WHERE id = v_deposit.buyer_id;

  -- Update seller success stats
  UPDATE profiles
  SET 
    deposit_success_count = deposit_success_count + 1,
    total_sales = total_sales + 1
  WHERE id = v_deposit.seller_id;

  -- Send notification to seller (deposit released)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.seller_id,
    'deposit_released',
    '💰 Deposit Released!',
    'The buyer confirmed the transaction. ₵' || v_deposit.amount::TEXT || ' has been released to you!',
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id,
      'amount', v_deposit.amount,
      'buyer_id', v_deposit.buyer_id
    )
  );

  -- Note: The trigger 'restore_listing_on_deposit_complete' will mark listing as SOLD

  RETURN json_build_object(
    'success', true,
    'message', 'Thank you for confirming! The deposit has been released to the seller.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION confirm_meetup_buyer TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Deposit completion flow fixed (with BULK support)!';
  RAISE NOTICE '';
  RAISE NOTICE '=== SINGLE ITEM FLOW ===';
  RAISE NOTICE '  1. Deposit paid → status = reserved';
  RAISE NOTICE '  2. Buyer confirms → status = sold';
  RAISE NOTICE '  3. Buyer/seller cancels → status = active';
  RAISE NOTICE '';
  RAISE NOTICE '=== BULK ITEM FLOW (e.g., 10 iPhones) ===';
  RAISE NOTICE '  1. Buyer A reserves 2 units → status = reserved (2/10)';
  RAISE NOTICE '  2. Buyer B reserves 3 units → status = reserved (5/10)';
  RAISE NOTICE '  3. Buyer A confirms → 2 units sold, 8 remaining';
  RAISE NOTICE '     • If no other reservations: status = active (8 available)';
  RAISE NOTICE '     • If Buyer B still reserved: status = reserved (3 reserved, 5 available)';
  RAISE NOTICE '  4. Buyer B confirms → 5 units sold, 5 remaining';
  RAISE NOTICE '     • status = active (5 available for new buyers)';
  RAISE NOTICE '  5. ... repeat until all 10 sold ...';
  RAISE NOTICE '  6. Last buyer confirms → status = sold (0 remaining)';
  RAISE NOTICE '';
  RAISE NOTICE '=== KEY FEATURES ===';
  RAISE NOTICE '  ✓ Only marks as SOLD when ALL units are sold';
  RAISE NOTICE '  ✓ Partial sales keep listing ACTIVE or RESERVED';
  RAISE NOTICE '  ✓ Tracks completed vs remaining units accurately';
  RAISE NOTICE '  ✓ Seller gets notifications for each sale';
  RAISE NOTICE '  ✓ total_sales counter incremented per transaction';
END $$;

