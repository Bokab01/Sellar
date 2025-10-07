-- Migration: Partial Quantity Reservation System
-- Allows listings with quantity > 1 to have partial reservations
-- Multiple buyers can reserve different quantities simultaneously

-- =============================================
-- ADD QUANTITY TRACKING TO LISTINGS
-- =============================================

-- Add quantity_reserved field to track reserved items
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS quantity_reserved INTEGER DEFAULT 0 CHECK (quantity_reserved >= 0);

-- Add constraint to ensure reserved quantity doesn't exceed total quantity
ALTER TABLE listings
ADD CONSTRAINT quantity_reserved_check CHECK (quantity_reserved <= quantity);

COMMENT ON COLUMN listings.quantity_reserved IS 'Number of items currently reserved in pending transactions';

-- =============================================
-- CREATE PENDING TRANSACTIONS TABLE
-- =============================================

-- Table to track individual reservations for multi-quantity listings
CREATE TABLE IF NOT EXISTS pending_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Quantity and pricing
  quantity_reserved INTEGER NOT NULL CHECK (quantity_reserved > 0),
  agreed_price DECIMAL(12,2) NOT NULL CHECK (agreed_price >= 0),
  currency VARCHAR(3) DEFAULT 'GHS',
  
  -- Reservation timing
  reserved_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Confirmation tracking (same as meetup_transactions)
  buyer_confirmed_at TIMESTAMP WITH TIME ZONE,
  seller_confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  
  -- Link to final transaction (if completed)
  meetup_transaction_id UUID REFERENCES meetup_transactions(id) ON DELETE SET NULL,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_transactions_listing ON pending_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_buyer ON pending_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_seller ON pending_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_conversation ON pending_transactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_reserved_until ON pending_transactions(reserved_until) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_transactions_status ON pending_transactions(status);

-- Comments
COMMENT ON TABLE pending_transactions IS 'Tracks individual quantity reservations for listings, allowing multiple simultaneous reservations';
COMMENT ON COLUMN pending_transactions.quantity_reserved IS 'Number of items reserved in this specific transaction';
COMMENT ON COLUMN pending_transactions.reserved_until IS 'When this reservation expires (typically 48 hours)';

-- =============================================
-- UPDATE AUTO-RECOVERY FUNCTION
-- =============================================

-- Drop old function first (return type changed)
DROP FUNCTION IF EXISTS auto_recover_expired_reservations();

-- Enhanced function to handle both full listing reservations and partial quantity reservations
CREATE OR REPLACE FUNCTION auto_recover_expired_reservations()
RETURNS TABLE(recovered_count INTEGER, restored_quantity INTEGER) AS $$
DECLARE
  recovered_listings INTEGER := 0;
  total_restored_quantity INTEGER := 0;
  full_listing_count INTEGER := 0;
  v_pending_tx RECORD;
BEGIN
  
  -- =============================================
  -- PART 1: Recover expired pending transactions (partial reservations)
  -- =============================================
  
  FOR v_pending_tx IN
    SELECT 
      pt.id,
      pt.listing_id,
      pt.quantity_reserved,
      l.title as listing_title
    FROM pending_transactions pt
    JOIN listings l ON l.id = pt.listing_id
    WHERE 
      pt.status = 'pending'
      AND pt.reserved_until < NOW()
      AND pt.buyer_confirmed_at IS NULL
      AND pt.seller_confirmed_at IS NULL
  LOOP
    -- Mark pending transaction as expired
    UPDATE pending_transactions
    SET 
      status = 'expired',
      updated_at = NOW()
    WHERE id = v_pending_tx.id;
    
    -- Restore quantity to listing
    UPDATE listings
    SET 
      quantity_reserved = GREATEST(0, quantity_reserved - v_pending_tx.quantity_reserved),
      updated_at = NOW()
    WHERE id = v_pending_tx.listing_id;
    
    total_restored_quantity := total_restored_quantity + v_pending_tx.quantity_reserved;
    recovered_listings := recovered_listings + 1;
    
    RAISE NOTICE 'Expired pending transaction: % (listing: %, restored quantity: %)', 
      v_pending_tx.id, v_pending_tx.listing_title, v_pending_tx.quantity_reserved;
  END LOOP;
  
  -- =============================================
  -- PART 2: Recover old-style full listing reservations (backward compatibility)
  -- =============================================
  
  -- Only recover listings that:
  -- 1. Are in 'reserved' status
  -- 2. Have expired reservation time
  -- 3. Don't have a mutually confirmed transaction
  UPDATE listings l
  SET 
    status = 'active',
    reserved_until = NULL,
    reserved_for = NULL,
    updated_at = NOW()
  WHERE 
    l.status = 'reserved'
    AND l.reserved_until < NOW()
    AND NOT EXISTS (
      SELECT 1 
      FROM meetup_transactions mt
      WHERE mt.listing_id = l.id
        AND mt.buyer_confirmed_at IS NOT NULL
        AND mt.seller_confirmed_at IS NOT NULL
    );
  
  -- Count recovered full reservations
  GET DIAGNOSTICS full_listing_count = ROW_COUNT;
  recovered_listings := recovered_listings + full_listing_count;
  
  RAISE NOTICE 'Auto-recovery complete: % transactions recovered, % quantity restored', 
    recovered_listings, total_restored_quantity;
  
  RETURN QUERY SELECT recovered_listings, total_restored_quantity;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_recover_expired_reservations() IS 'Recovers both partial quantity reservations and full listing reservations when they expire';

-- =============================================
-- CREATE HELPER FUNCTIONS
-- =============================================

-- Function to check if listing has available quantity
CREATE OR REPLACE FUNCTION get_available_quantity(p_listing_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_quantity INTEGER;
  v_quantity_reserved INTEGER;
BEGIN
  SELECT quantity, quantity_reserved
  INTO v_quantity, v_quantity_reserved
  FROM listings
  WHERE id = p_listing_id;
  
  RETURN COALESCE(v_quantity, 0) - COALESCE(v_quantity_reserved, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_quantity(UUID) IS 'Returns the available (unreserved) quantity for a listing';

-- Function to create a pending transaction and reserve quantity
CREATE OR REPLACE FUNCTION create_pending_transaction(
  p_listing_id UUID,
  p_conversation_id UUID,
  p_buyer_id UUID,
  p_quantity INTEGER,
  p_agreed_price DECIMAL,
  p_hours_until_expiry INTEGER DEFAULT 48
)
RETURNS UUID AS $$
DECLARE
  v_seller_id UUID;
  v_available_quantity INTEGER;
  v_pending_tx_id UUID;
BEGIN
  -- Get seller ID and check available quantity
  SELECT 
    user_id,
    quantity - COALESCE(quantity_reserved, 0)
  INTO v_seller_id, v_available_quantity
  FROM listings
  WHERE id = p_listing_id;
  
  -- Validate quantity is available
  IF v_available_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity available. Available: %, Requested: %', 
      v_available_quantity, p_quantity;
  END IF;
  
  -- Create pending transaction
  INSERT INTO pending_transactions (
    listing_id,
    conversation_id,
    buyer_id,
    seller_id,
    quantity_reserved,
    agreed_price,
    reserved_until,
    status
  ) VALUES (
    p_listing_id,
    p_conversation_id,
    p_buyer_id,
    v_seller_id,
    p_quantity,
    p_agreed_price,
    NOW() + (p_hours_until_expiry || ' hours')::INTERVAL,
    'pending'
  )
  RETURNING id INTO v_pending_tx_id;
  
  -- Update listing's reserved quantity
  UPDATE listings
  SET 
    quantity_reserved = quantity_reserved + p_quantity,
    updated_at = NOW()
  WHERE id = p_listing_id;
  
  RAISE NOTICE 'Created pending transaction: % (quantity: %, expires: %)', 
    v_pending_tx_id, p_quantity, NOW() + (p_hours_until_expiry || ' hours')::INTERVAL;
  
  RETURN v_pending_tx_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_pending_transaction IS 'Creates a pending transaction and reserves the specified quantity';

-- Function to confirm a pending transaction
CREATE OR REPLACE FUNCTION confirm_pending_transaction(
  p_pending_tx_id UUID,
  p_user_id UUID,
  p_role VARCHAR -- 'buyer' or 'seller'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_tx RECORD;
  v_both_confirmed BOOLEAN;
BEGIN
  -- Get pending transaction details
  SELECT * INTO v_pending_tx
  FROM pending_transactions
  WHERE id = p_pending_tx_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending transaction not found: %', p_pending_tx_id;
  END IF;
  
  -- Update confirmation timestamp
  IF p_role = 'buyer' THEN
    UPDATE pending_transactions
    SET 
      buyer_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_pending_tx_id;
  ELSIF p_role = 'seller' THEN
    UPDATE pending_transactions
    SET 
      seller_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_pending_tx_id;
  END IF;
  
  -- Check if both parties have confirmed
  SELECT 
    buyer_confirmed_at IS NOT NULL AND seller_confirmed_at IS NOT NULL
  INTO v_both_confirmed
  FROM pending_transactions
  WHERE id = p_pending_tx_id;
  
  -- If both confirmed, finalize the transaction
  IF v_both_confirmed THEN
    -- Mark pending transaction as confirmed
    UPDATE pending_transactions
    SET 
      status = 'confirmed',
      updated_at = NOW()
    WHERE id = p_pending_tx_id;
    
    -- Reduce listing quantity permanently
    UPDATE listings
    SET 
      quantity = quantity - v_pending_tx.quantity_reserved,
      quantity_reserved = quantity_reserved - v_pending_tx.quantity_reserved,
      updated_at = NOW()
    WHERE id = v_pending_tx.listing_id;
    
    -- If quantity reaches 0, mark as sold
    UPDATE listings
    SET 
      status = 'sold',
      reserved_until = NULL,
      reserved_for = NULL
    WHERE id = v_pending_tx.listing_id
      AND quantity = 0;
    
    RAISE NOTICE 'Pending transaction confirmed: % (quantity finalized: %)', 
      p_pending_tx_id, v_pending_tx.quantity_reserved;
  END IF;
  
  RETURN v_both_confirmed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_pending_transaction IS 'Confirms a pending transaction and finalizes quantity reduction when both parties confirm';

-- =============================================
-- UPDATE NOTIFICATION FUNCTION
-- =============================================

-- Enhanced notification function to handle pending transactions
CREATE OR REPLACE FUNCTION notify_expired_reservations()
RETURNS void AS $$
DECLARE
  v_listing RECORD;
  v_pending_tx RECORD;
BEGIN
  -- =============================================
  -- PART 1: Notify about expiring pending transactions
  -- =============================================
  
  FOR v_pending_tx IN
    SELECT 
      pt.id,
      pt.listing_id,
      pt.buyer_id,
      pt.seller_id,
      pt.quantity_reserved,
      pt.reserved_until,
      l.title as listing_title
    FROM pending_transactions pt
    JOIN listings l ON l.id = pt.listing_id
    WHERE 
      pt.status = 'pending'
      AND pt.reserved_until BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
      AND NOT EXISTS (
        SELECT 1 
        FROM notifications n
        WHERE n.user_id IN (pt.buyer_id, pt.seller_id)
          AND n.type = 'reservation_expiring'
          AND n.data->>'pending_transaction_id' = pt.id::text
          AND n.created_at > NOW() - INTERVAL '2 hours'
      )
  LOOP
    -- Notify seller
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      data,
      created_at
    ) VALUES (
      v_pending_tx.seller_id,
      'reservation_expiring',
      'Reservation Expiring Soon',
      'Your listing "' || v_pending_tx.listing_title || '" has a reservation for ' || v_pending_tx.quantity_reserved || ' item(s) expiring in less than 1 hour.',
      jsonb_build_object(
        'listing_id', v_pending_tx.listing_id,
        'pending_transaction_id', v_pending_tx.id,
        'listing_title', v_pending_tx.listing_title,
        'quantity', v_pending_tx.quantity_reserved,
        'reserved_until', v_pending_tx.reserved_until,
        'role', 'seller'
      ),
      NOW()
    );

    -- Notify buyer
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      data,
      created_at
    ) VALUES (
      v_pending_tx.buyer_id,
      'reservation_expiring',
      'Complete Your Purchase',
      'Your reservation for ' || v_pending_tx.quantity_reserved || ' item(s) of "' || v_pending_tx.listing_title || '" expires in less than 1 hour.',
      jsonb_build_object(
        'listing_id', v_pending_tx.listing_id,
        'pending_transaction_id', v_pending_tx.id,
        'listing_title', v_pending_tx.listing_title,
        'quantity', v_pending_tx.quantity_reserved,
        'reserved_until', v_pending_tx.reserved_until,
        'role', 'buyer'
      ),
      NOW()
    );

    RAISE NOTICE 'Sent expiry notifications for pending transaction: % (listing: %)', 
      v_pending_tx.id, v_pending_tx.listing_title;
  END LOOP;
  
  -- =============================================
  -- PART 2: Notify about expiring full listing reservations (backward compatibility)
  -- =============================================
  
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
    -- Notify seller
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

    -- Notify buyer (if exists)
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

    RAISE NOTICE 'Sent expiry notifications for listing: % (expires: %)', 
      v_listing.title, v_listing.reserved_until;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_expired_reservations() IS 'Sends notifications for both pending transactions and full listing reservations expiring soon';

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending transactions (as buyer or seller)
CREATE POLICY pending_transactions_select_own ON pending_transactions
  FOR SELECT
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id
  );

-- Allow inserts from authenticated users (the function runs with the user's permissions)
CREATE POLICY pending_transactions_insert_own ON pending_transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id
  );

-- Users can update their own confirmations
CREATE POLICY pending_transactions_update_own ON pending_transactions
  FOR UPDATE
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id
  );

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
  -- Check if columns were added
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' 
    AND column_name = 'quantity_reserved'
  ) THEN
    RAISE NOTICE '✅ quantity_reserved column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add quantity_reserved column';
  END IF;

  -- Check if table was created
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'pending_transactions'
  ) THEN
    RAISE NOTICE '✅ pending_transactions table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create pending_transactions table';
  END IF;

  -- Check if functions were created
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname IN ('get_available_quantity', 'create_pending_transaction', 'confirm_pending_transaction')
  ) THEN
    RAISE NOTICE '✅ Helper functions created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create helper functions';
  END IF;

  RAISE NOTICE '✅ Partial quantity reservation system migration completed successfully';
END $$;
