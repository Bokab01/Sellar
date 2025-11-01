-- =====================================================
-- PREVENT LISTING DELETION WITH ACTIVE DEPOSITS
-- =====================================================
-- 
-- Problem: ON DELETE CASCADE on listing_deposits deletes all
-- deposit records when listing is deleted, causing:
-- - Loss of transaction history
-- - Users lose proof of payment
-- - Money trail disappears
--
-- Solution: 
-- 1. Change listing_id to nullable and use ON DELETE SET NULL
-- 2. Store listing snapshot data in deposits
-- 3. Add trigger to prevent deletion of listings with active deposits
-- =====================================================

-- Step 1: Make listing_id nullable and change constraint
-- First, drop the existing foreign key constraint
ALTER TABLE listing_deposits 
DROP CONSTRAINT IF EXISTS listing_deposits_listing_id_fkey;

-- Make listing_id nullable (allows keeping deposit records even if listing deleted)
ALTER TABLE listing_deposits 
ALTER COLUMN listing_id DROP NOT NULL;

-- Add new foreign key with SET NULL on delete
ALTER TABLE listing_deposits 
ADD CONSTRAINT listing_deposits_listing_id_fkey 
FOREIGN KEY (listing_id) 
REFERENCES listings(id) 
ON DELETE SET NULL;

-- Step 2: Add listing snapshot columns to preserve important data
-- These columns preserve the listing state at the time of deposit creation
-- They are NOT updated if seller edits the listing (preserves original agreement)
ALTER TABLE listing_deposits 
ADD COLUMN IF NOT EXISTS listing_title TEXT,
ADD COLUMN IF NOT EXISTS listing_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS listing_images JSONB,
ADD COLUMN IF NOT EXISTS listing_snapshot_at TIMESTAMP DEFAULT NOW();

-- Step 3: Create trigger to populate snapshot data on insert
-- This captures the listing state at deposit creation time
-- The snapshot is INTENTIONALLY not updated if seller edits listing later
-- This preserves the original agreement terms for dispute resolution
CREATE OR REPLACE FUNCTION capture_listing_snapshot_on_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
BEGIN
  -- Get listing details and store snapshot
  IF NEW.listing_id IS NOT NULL THEN
    SELECT title, price, images
    INTO v_listing
    FROM listings
    WHERE id = NEW.listing_id;
    
    IF FOUND THEN
      NEW.listing_title := v_listing.title;
      NEW.listing_price := v_listing.price;
      NEW.listing_images := v_listing.images;
      NEW.listing_snapshot_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_capture_listing_snapshot ON listing_deposits;
CREATE TRIGGER trigger_capture_listing_snapshot
  BEFORE INSERT ON listing_deposits
  FOR EACH ROW
  EXECUTE FUNCTION capture_listing_snapshot_on_deposit();

-- Step 4: Create function to prevent deletion of listings with active deposits
CREATE OR REPLACE FUNCTION prevent_listing_deletion_with_active_deposits()
RETURNS TRIGGER AS $$
DECLARE
  v_active_deposit_count INTEGER;
BEGIN
  -- Check if listing has any active deposits (paid, not yet completed)
  SELECT COUNT(*) INTO v_active_deposit_count
  FROM listing_deposits
  WHERE listing_id = OLD.id
    AND status IN ('paid', 'confirmed'); -- Not pending, released, refunded, expired
  
  IF v_active_deposit_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete listing with % active deposit(s). Please wait for all deposits to be completed, refunded, or expired.', v_active_deposit_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_listing_deletion ON listings;
CREATE TRIGGER trigger_prevent_listing_deletion
  BEFORE DELETE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_listing_deletion_with_active_deposits();

-- Step 5: Backfill snapshot data for existing deposits
UPDATE listing_deposits ld
SET 
  listing_title = l.title,
  listing_price = l.price,
  listing_images = l.images
FROM listings l
WHERE ld.listing_id = l.id
  AND ld.listing_title IS NULL;

-- Step 6: Update My Orders queries to use snapshot data
-- Note: This requires app code changes to use listing_title, listing_price, listing_images
-- when listing_id IS NULL (listing was deleted)

-- Grant permissions
GRANT EXECUTE ON FUNCTION capture_listing_snapshot_on_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION prevent_listing_deletion_with_active_deposits TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Listing deletion protection enabled!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  1. listing_id now nullable with ON DELETE SET NULL';
  RAISE NOTICE '  2. Added listing snapshot columns (title, price, images, snapshot_at)';
  RAISE NOTICE '  3. Auto-capture snapshot on deposit creation';
  RAISE NOTICE '  4. Prevent deletion of listings with active deposits';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  - Users keep deposit records even if listing deleted';
  RAISE NOTICE '  - Sellers cannot delete listings with active paid deposits';
  RAISE NOTICE '  - Complete transaction history preserved';
  RAISE NOTICE '  - Snapshot preserves original agreement (NOT updated on edits)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ Important Behavior:';
  RAISE NOTICE '  - Snapshot is captured ONCE at deposit creation';
  RAISE NOTICE '  - If seller edits listing later, snapshot is NOT updated';
  RAISE NOTICE '  - This preserves original terms for dispute resolution';
  RAISE NOTICE '  - Buyers see the listing as it was when they paid';
END $$;

