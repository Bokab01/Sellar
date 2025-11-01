-- =====================================================
-- ESCROW SYSTEM: Email Notifications via Triggers
-- =====================================================

-- Create email queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  data JSONB NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  retries INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email_queue_sent ON email_queue(sent, created_at);

-- Helper function to queue deposit emails
CREATE OR REPLACE FUNCTION send_deposit_email(
  p_email_type TEXT,
  p_recipient_email TEXT,
  p_data JSONB
)
RETURNS VOID AS $$
BEGIN
  -- Queue the email to be sent by the edge function
  INSERT INTO email_queue (email_type, recipient_email, data)
  VALUES (p_email_type, p_recipient_email, p_data);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to queue deposit email: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for deposit payment confirmation
CREATE OR REPLACE FUNCTION notify_deposit_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_buyer RECORD;
  v_seller RECORD;
  v_buyer_email TEXT;
  v_seller_email TEXT;
BEGIN
  -- Only trigger on status change to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Get listing, buyer, and seller details
    SELECT * INTO v_listing FROM listings WHERE id = NEW.listing_id;
    SELECT * INTO v_buyer FROM profiles WHERE id = NEW.buyer_id;
    SELECT * INTO v_seller FROM profiles WHERE id = NEW.seller_id;
    
    -- Get emails
    SELECT email INTO v_buyer_email FROM auth.users WHERE id = NEW.buyer_id;
    SELECT email INTO v_seller_email FROM auth.users WHERE id = NEW.seller_id;
    
    -- Send email to buyer
    IF v_buyer_email IS NOT NULL THEN
      PERFORM send_deposit_email(
        'deposit_paid',
        v_buyer_email,
        jsonb_build_object(
          'userName', v_buyer.full_name,
          'listingTitle', v_listing.title,
          'listingImage', v_listing.images[1],
          'sellerName', v_seller.full_name,
          'depositAmount', '20',
          'expiresAt', NEW.expires_at::text,
          'timestamp', NEW.created_at::text
        )
      );
    END IF;
    
    -- Send email to seller
    IF v_seller_email IS NOT NULL THEN
      PERFORM send_deposit_email(
        'deposit_seller_notification',
        v_seller_email,
        jsonb_build_object(
          'userName', v_seller.full_name,
          'listingTitle', v_listing.title,
          'listingImage', v_listing.images[1],
          'buyerName', v_buyer.full_name,
          'depositAmount', '20',
          'expiresAt', NEW.expires_at::text,
          'timestamp', NEW.created_at::text
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for deposit confirmation (transaction complete)
CREATE OR REPLACE FUNCTION notify_deposit_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_buyer RECORD;
  v_seller RECORD;
  v_seller_email TEXT;
BEGIN
  -- Only trigger on status change to 'released'
  IF NEW.status = 'released' AND OLD.status = 'paid' THEN
    -- Get listing, buyer, and seller details
    SELECT * INTO v_listing FROM listings WHERE id = NEW.listing_id;
    SELECT * INTO v_buyer FROM profiles WHERE id = NEW.buyer_id;
    SELECT * INTO v_seller FROM profiles WHERE id = NEW.seller_id;
    
    -- Get seller email
    SELECT email INTO v_seller_email FROM auth.users WHERE id = NEW.seller_id;
    
    -- Send email to seller (deposit released)
    IF v_seller_email IS NOT NULL THEN
      PERFORM send_deposit_email(
        'deposit_confirmed',
        v_seller_email,
        jsonb_build_object(
          'userName', v_seller.full_name,
          'listingTitle', v_listing.title,
          'buyerName', v_buyer.full_name,
          'depositAmount', '20',
          'timestamp', NEW.updated_at::text
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for deposit refund
CREATE OR REPLACE FUNCTION notify_deposit_refunded()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_buyer RECORD;
  v_buyer_email TEXT;
BEGIN
  -- Only trigger on status change to 'refunded' or 'expired'
  IF (NEW.status IN ('refunded', 'expired')) AND (OLD.status = 'paid') THEN
    -- Get listing and buyer details
    SELECT * INTO v_listing FROM listings WHERE id = NEW.listing_id;
    SELECT * INTO v_buyer FROM profiles WHERE id = NEW.buyer_id;
    
    -- Get buyer email
    SELECT email INTO v_buyer_email FROM auth.users WHERE id = NEW.buyer_id;
    
    -- Send appropriate email based on status
    IF v_buyer_email IS NOT NULL THEN
      IF NEW.status = 'expired' THEN
        -- Send expired email to buyer
        PERFORM send_deposit_email(
          'deposit_refunded',
          v_buyer_email,
          jsonb_build_object(
            'userName', v_buyer.full_name,
            'listingTitle', v_listing.title,
            'depositAmount', '20',
            'timestamp', NEW.updated_at::text
          )
        );
      ELSE
        -- Send refunded email to buyer
        PERFORM send_deposit_email(
          'deposit_refunded',
          v_buyer_email,
          jsonb_build_object(
            'userName', v_buyer.full_name,
            'listingTitle', v_listing.title,
            'depositAmount', '20',
            'timestamp', NEW.updated_at::text
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for deposit expiry notification to seller
CREATE OR REPLACE FUNCTION notify_deposit_expired_seller()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_buyer RECORD;
  v_seller RECORD;
  v_seller_email TEXT;
BEGIN
  -- Only trigger on status change to 'expired'
  IF NEW.status = 'expired' AND OLD.status = 'paid' THEN
    -- Get listing, buyer, and seller details
    SELECT * INTO v_listing FROM listings WHERE id = NEW.listing_id;
    SELECT * INTO v_buyer FROM profiles WHERE id = NEW.buyer_id;
    SELECT * INTO v_seller FROM profiles WHERE id = NEW.seller_id;
    
    -- Get seller email
    SELECT email INTO v_seller_email FROM auth.users WHERE id = NEW.seller_id;
    
    -- Send expiry notification to seller
    IF v_seller_email IS NOT NULL THEN
      PERFORM send_deposit_email(
        'deposit_expired',
        v_seller_email,
        jsonb_build_object(
          'userName', v_seller.full_name,
          'listingTitle', v_listing.title,
          'buyerName', v_buyer.full_name,
          'depositAmount', '20',
          'timestamp', NEW.updated_at::text
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for mutual cancellation
CREATE OR REPLACE FUNCTION notify_deposit_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_buyer RECORD;
  v_seller RECORD;
  v_buyer_email TEXT;
  v_seller_email TEXT;
BEGIN
  -- Only trigger on status change to 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status = 'paid' THEN
    -- Get listing, buyer, and seller details
    SELECT * INTO v_listing FROM listings WHERE id = NEW.listing_id;
    SELECT * INTO v_buyer FROM profiles WHERE id = NEW.buyer_id;
    SELECT * INTO v_seller FROM profiles WHERE id = NEW.seller_id;
    
    -- Get emails
    SELECT email INTO v_buyer_email FROM auth.users WHERE id = NEW.buyer_id;
    SELECT email INTO v_seller_email FROM auth.users WHERE id = NEW.seller_id;
    
    -- Send cancellation email to buyer
    IF v_buyer_email IS NOT NULL THEN
      PERFORM send_deposit_email(
        'deposit_cancelled',
        v_buyer_email,
        jsonb_build_object(
          'userName', v_buyer.full_name,
          'listingTitle', v_listing.title,
          'depositAmount', '20',
          'cancellationReason', NEW.cancellation_reason,
          'timestamp', NEW.cancelled_at::text
        )
      );
    END IF;
    
    -- Send cancellation email to seller
    IF v_seller_email IS NOT NULL THEN
      PERFORM send_deposit_email(
        'deposit_cancelled',
        v_seller_email,
        jsonb_build_object(
          'userName', v_seller.full_name,
          'listingTitle', v_listing.title,
          'depositAmount', '20',
          'cancellationReason', NEW.cancellation_reason,
          'timestamp', NEW.cancelled_at::text
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_deposit_paid ON listing_deposits;
CREATE TRIGGER trigger_notify_deposit_paid
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
  EXECUTE FUNCTION notify_deposit_paid();

DROP TRIGGER IF EXISTS trigger_notify_deposit_confirmed ON listing_deposits;
CREATE TRIGGER trigger_notify_deposit_confirmed
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  WHEN (NEW.status = 'released' AND OLD.status = 'paid')
  EXECUTE FUNCTION notify_deposit_confirmed();

DROP TRIGGER IF EXISTS trigger_notify_deposit_refunded ON listing_deposits;
CREATE TRIGGER trigger_notify_deposit_refunded
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  WHEN ((NEW.status IN ('refunded', 'expired')) AND OLD.status = 'paid')
  EXECUTE FUNCTION notify_deposit_refunded();

DROP TRIGGER IF EXISTS trigger_notify_deposit_expired_seller ON listing_deposits;
CREATE TRIGGER trigger_notify_deposit_expired_seller
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  WHEN (NEW.status = 'expired' AND OLD.status = 'paid')
  EXECUTE FUNCTION notify_deposit_expired_seller();

DROP TRIGGER IF EXISTS trigger_notify_deposit_cancelled ON listing_deposits;
CREATE TRIGGER trigger_notify_deposit_cancelled
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status = 'paid')
  EXECUTE FUNCTION notify_deposit_cancelled();

-- Setup cron job to process email queue every 2 minutes
SELECT cron.schedule(
  'process-deposit-email-queue',
  '*/2 * * * *',  -- Every 2 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Deposit email triggers created successfully!';
  RAISE NOTICE 'Triggers will automatically send emails for:';
  RAISE NOTICE '  - Deposit paid (buyer & seller)';
  RAISE NOTICE '  - Transaction confirmed (seller)';
  RAISE NOTICE '  - Deposit refunded (buyer)';
  RAISE NOTICE '  - Deposit expired (buyer & seller)';
  RAISE NOTICE '  - Deposit cancelled (buyer & seller)';
  RAISE NOTICE '';
  RAISE NOTICE 'Email queue processor cron job scheduled (runs every 2 minutes)';
END $$;

