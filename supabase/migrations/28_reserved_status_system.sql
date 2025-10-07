-- Migration: Reserved Status System
-- Implements a "soft reserve" system to protect sellers from losing boosts
-- when deals fall through, while maintaining buyer commitment

-- =============================================
-- ADD RESERVATION FIELDS TO LISTINGS
-- =============================================

-- Add reservation tracking fields
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reserved_for UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reservation_count INTEGER DEFAULT 0;

-- Add index for efficient reservation queries
CREATE INDEX IF NOT EXISTS idx_listings_reserved_until ON listings(reserved_until) WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS idx_listings_reserved_for ON listings(reserved_for) WHERE reserved_for IS NOT NULL;

-- Add comments
COMMENT ON COLUMN listings.reserved_until IS 'Timestamp when the reservation expires (typically 48 hours from acceptance)';
COMMENT ON COLUMN listings.reserved_for IS 'User ID of the buyer who has reserved this listing';
COMMENT ON COLUMN listings.reservation_count IS 'Number of times this listing has been reserved (for analytics)';

-- =============================================
-- AUTO-RECOVERY FUNCTION
-- =============================================

-- Function to automatically recover expired reservations
CREATE OR REPLACE FUNCTION auto_recover_expired_reservations()
RETURNS TABLE(recovered_count INTEGER) AS $$
DECLARE
  recovered_listings INTEGER;
BEGIN
  -- Update expired reservations back to active
  -- Only if transaction was not completed by both parties
  WITH expired_reservations AS (
    UPDATE listings
    SET 
      status = 'active',
      reserved_until = NULL,
      reserved_for = NULL,
      updated_at = NOW()
    WHERE 
      status = 'reserved'
      AND reserved_until < NOW()
      AND NOT EXISTS (
        SELECT 1 
        FROM meetup_transactions mt
        WHERE mt.listing_id = listings.id
          AND mt.buyer_confirmed_at IS NOT NULL
          AND mt.seller_confirmed_at IS NOT NULL
      )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO recovered_listings
  FROM expired_reservations;

  -- Log the recovery
  RAISE NOTICE 'Auto-recovered % expired reservations', recovered_listings;

  RETURN QUERY SELECT recovered_listings;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_recover_expired_reservations() IS 'Automatically recovers listings with expired reservations back to active status';

-- =============================================
-- MANUAL CANCELLATION FUNCTION
-- =============================================

-- Function to manually cancel a reservation
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_listing_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_listing RECORD;
  v_is_seller BOOLEAN;
  v_is_buyer BOOLEAN;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM listings
  WHERE id = p_listing_id;

  -- Check if listing exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Listing not found';
    RETURN;
  END IF;

  -- Check if listing is reserved
  IF v_listing.status != 'reserved' THEN
    RETURN QUERY SELECT FALSE, 'Listing is not reserved';
    RETURN;
  END IF;

  -- Check if user is authorized (seller or buyer)
  v_is_seller := v_listing.user_id = p_user_id;
  v_is_buyer := v_listing.reserved_for = p_user_id;

  IF NOT (v_is_seller OR v_is_buyer) THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to cancel this reservation';
    RETURN;
  END IF;

  -- Cancel the reservation
  UPDATE listings
  SET 
    status = 'active',
    reserved_until = NULL,
    reserved_for = NULL,
    updated_at = NOW()
  WHERE id = p_listing_id;

  -- Log the cancellation (optional - could add to a cancellations table)
  -- For now, just return success
  
  RETURN QUERY SELECT TRUE, 'Reservation cancelled successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_reservation(UUID, UUID, TEXT) IS 'Allows seller or buyer to manually cancel a reservation';

-- =============================================
-- NOTIFICATION FUNCTION FOR EXPIRED RESERVATIONS
-- =============================================

-- Function to notify users about expired reservations
CREATE OR REPLACE FUNCTION notify_expired_reservations()
RETURNS void AS $$
DECLARE
  v_listing RECORD;
BEGIN
  -- Find listings that will expire in the next hour
  FOR v_listing IN
    SELECT 
      l.id,
      l.title,
      l.user_id as seller_id,
      l.reserved_for as buyer_id,
      l.reserved_until
    FROM listings l
    WHERE 
      l.status = 'reserved'
      AND l.reserved_until BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
      AND NOT EXISTS (
        SELECT 1 
        FROM notifications n
        WHERE n.listing_id = l.id
          AND n.type = 'reservation_expiring'
          AND n.created_at > NOW() - INTERVAL '2 hours'
      )
  LOOP
    -- Create notification for seller
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      listing_id,
      created_at
    ) VALUES (
      v_listing.seller_id,
      'reservation_expiring',
      'Reservation Expiring Soon',
      'Your listing "' || v_listing.title || '" reservation expires in less than 1 hour. Complete the transaction or it will be auto-relisted.',
      v_listing.id,
      NOW()
    );

    -- Create notification for buyer
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      listing_id,
      created_at
    ) VALUES (
      v_listing.buyer_id,
      'reservation_expiring',
      'Complete Your Purchase',
      'Your reservation for "' || v_listing.title || '" expires in less than 1 hour. Complete the transaction to secure the item.',
      v_listing.id,
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_expired_reservations() IS 'Sends notifications to users about reservations expiring soon';

-- =============================================
-- UPDATE EXISTING DATA
-- =============================================

-- Set reservation_count to 0 for existing listings
UPDATE listings
SET reservation_count = 0
WHERE reservation_count IS NULL;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify the changes
DO $$
BEGIN
  -- Check if columns were added
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' 
    AND column_name IN ('reserved_until', 'reserved_for', 'reservation_count')
  ) THEN
    RAISE NOTICE '✅ Reserved status columns added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add reserved status columns';
  END IF;

  -- Check if functions were created
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname IN ('auto_recover_expired_reservations', 'cancel_reservation', 'notify_expired_reservations')
  ) THEN
    RAISE NOTICE '✅ Reserved status functions created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create reserved status functions';
  END IF;

  RAISE NOTICE '✅ Reserved status system migration completed successfully';
END $$;
