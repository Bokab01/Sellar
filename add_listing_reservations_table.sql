-- Add listing_reservations table for offer system
CREATE TABLE IF NOT EXISTS listing_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    -- Reservation Details
    reserved_amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'cancelled')),
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES profiles(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_listing_reservations_listing_id ON listing_reservations(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reservations_buyer_id ON listing_reservations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_listing_reservations_offer_id ON listing_reservations(offer_id);
CREATE INDEX IF NOT EXISTS idx_listing_reservations_status ON listing_reservations(status);
CREATE INDEX IF NOT EXISTS idx_listing_reservations_expires_at ON listing_reservations(expires_at);

-- Add RLS policies
ALTER TABLE listing_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reservations for their listings or their own reservations
CREATE POLICY "Users can view their own reservations" ON listing_reservations
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (
            SELECT user_id FROM listings WHERE id = listing_id
        )
    );

-- Policy: Users can create reservations (handled by system)
CREATE POLICY "System can create reservations" ON listing_reservations
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own reservations
CREATE POLICY "Users can update their own reservations" ON listing_reservations
    FOR UPDATE USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (
            SELECT user_id FROM listings WHERE id = listing_id
        )
    );

-- Policy: Users can delete their own reservations
CREATE POLICY "Users can delete their own reservations" ON listing_reservations
    FOR DELETE USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (
            SELECT user_id FROM listings WHERE id = listing_id
        )
    );

-- Add function to automatically expire reservations
CREATE OR REPLACE FUNCTION expire_listing_reservations()
RETURNS void AS $$
BEGIN
    UPDATE listing_reservations 
    SET status = 'expired'
    WHERE status = 'active' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically expire reservations
CREATE OR REPLACE FUNCTION check_reservation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if reservation is expired
    IF NEW.expires_at < NOW() AND NEW.status = 'active' THEN
        NEW.status := 'expired';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_reservation_expiry
    BEFORE INSERT OR UPDATE ON listing_reservations
    FOR EACH ROW
    EXECUTE FUNCTION check_reservation_expiry();
