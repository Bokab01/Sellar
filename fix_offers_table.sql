-- =============================================
-- FIX: Offers table structure and RLS policies
-- =============================================

-- Ensure offers table exists with correct structure
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Offer Details
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Amount
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn', 'countered')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Counter Offer
    parent_offer_id UUID REFERENCES offers(id),
    
    -- Response
    response_message TEXT,
    responded_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offers table
DROP POLICY IF EXISTS "Users can view offers they are involved in" ON offers;
CREATE POLICY "Users can view offers they are involved in" ON offers
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id
    );

DROP POLICY IF EXISTS "Buyers can create offers" ON offers;
CREATE POLICY "Buyers can create offers" ON offers
    FOR INSERT WITH CHECK (
        auth.uid() = buyer_id AND
        auth.uid() != seller_id
    );

DROP POLICY IF EXISTS "Sellers can update their offers" ON offers;
CREATE POLICY "Sellers can update their offers" ON offers
    FOR UPDATE USING (
        auth.uid() = seller_id
    );

DROP POLICY IF EXISTS "Buyers can update their own offers" ON offers;
CREATE POLICY "Buyers can update their own offers" ON offers
    FOR UPDATE USING (
        auth.uid() = buyer_id
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_conversation_id ON offers(conversation_id);

-- Success message
SELECT 'Offers table structure and RLS policies fixed successfully!' as status;
