-- Fix notify_expired_reservations function
-- The notifications table doesn't have a listing_id column, it uses data JSONB instead

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
        WHERE n.user_id IN (l.user_id, l.reserved_for)
          AND n.type = 'reservation_expiring'
          AND n.data->>'listing_id' = l.id::text
          AND n.created_at > NOW() - INTERVAL '2 hours'
      )
  LOOP
    -- Create notification for seller
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      data,
      created_at
    ) VALUES (
      v_listing.seller_id,
      'reservation_expiring',
      'Reservation Expiring Soon',
      'Your listing "' || v_listing.title || '" reservation expires in less than 1 hour. Complete the transaction or it will be auto-relisted.',
      jsonb_build_object(
        'listing_id', v_listing.id,
        'listing_title', v_listing.title,
        'reserved_until', v_listing.reserved_until,
        'role', 'seller'
      ),
      NOW()
    );

    -- Create notification for buyer (if buyer exists)
    IF v_listing.buyer_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        data,
        created_at
      ) VALUES (
        v_listing.buyer_id,
        'reservation_expiring',
        'Complete Your Purchase',
        'Your reservation for "' || v_listing.title || '" expires in less than 1 hour. Complete the transaction to secure the item.',
        jsonb_build_object(
          'listing_id', v_listing.id,
          'listing_title', v_listing.title,
          'reserved_until', v_listing.reserved_until,
          'role', 'buyer'
        ),
        NOW()
      );
    END IF;

    RAISE NOTICE 'Sent expiry notifications for listing: % (expires: %)', v_listing.title, v_listing.reserved_until;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_expired_reservations() IS 'Sends notifications to users about reservations expiring soon (fixed to use data JSONB column)';
