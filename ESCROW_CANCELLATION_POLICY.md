# 🔄 Escrow System: Cancellation Policy & Implementation ✅

**STATUS**: ✅ **FULLY IMPLEMENTED** - Mutual Cancellation Only

---

## 📋 Cancellation Scenarios

### 1. **Buyer Cancels (Before Meetup)**
**Scenario**: Buyer changes mind and wants to cancel commitment.

**Policy Options**:

#### Option A: **No Refund (Strict)**
- ✅ **Pros**: 
  - Enforces commitment
  - Deters tire-kickers
  - Compensates seller for time wasted
- ❌ **Cons**: 
  - May anger buyers
  - Could lead to disputes
  - Discourages deposit usage

#### Option B: **Partial Refund (₵10 kept as cancellation fee)**
- ✅ **Pros**: 
  - Fair compromise
  - Still compensates seller
  - More buyer-friendly
- ❌ **Cons**: 
  - More complex to implement
  - Requires Paystack refund integration

#### Option C: **Full Refund if Cancelled Early (within 6 hours)**
- ✅ **Pros**: 
  - Allows for mistakes/second thoughts
  - Very buyer-friendly
  - Still penalizes late cancellations
- ❌ **Cons**: 
  - Could be abused
  - Seller already blocked out time

#### **RECOMMENDED: Option B - Partial Refund**
**Logic**:
- If buyer cancels **within 6 hours**: Full refund (₵20)
- If buyer cancels **after 6 hours**: ₵10 refund, ₵10 to seller
- After 24 hours: No cancellation allowed (use normal flow)

---

### 2. **Seller Cancels (Listing No Longer Available)**
**Scenario**: Item is sold elsewhere, damaged, or seller changes mind.

**Policy**: **Full Refund to Buyer (₵20)**

**Logic**:
- Not buyer's fault
- Seller should bear the cost
- Maintains trust in platform
- Seller pays Paystack fees

**Additional**:
- Mark seller reliability (cancellation count)
- After 3 seller cancellations → temporary deposit privilege suspension

---

### 3. **Mutual Agreement to Cancel**
**Scenario**: Both parties agree to cancel (price negotiation failed, logistics issues, etc.)

**Policy**: **Full Refund to Buyer (₵20)**

**Logic**:
- Fair outcome when both agree
- Maintains good relationship
- No penalty for either party

**Implementation**:
- Both must confirm cancellation
- Create "Cancel by Agreement" button in deposit detail

---

### 4. **Item Already Sold (by Seller)**
**Scenario**: Seller sold to someone else without updating listing.

**Policy**: **Full Refund to Buyer (₵20) + Warning to Seller**

**Logic**:
- Seller's responsibility to update listing
- Buyer shouldn't be penalized
- Track seller behavior
- After 3 violations → temporary suspension from deposit system

---

### 5. **Force Majeure / Emergency**
**Scenario**: Genuine emergency (hospital, accident, family emergency).

**Policy**: **Manual Review by Admin**

**Logic**:
- Case-by-case basis
- Require proof (optional)
- Full refund if verified
- Don't penalize genuine emergencies

---

## 🔧 Technical Implementation

### 1. Update Database Schema

```sql
-- Add cancellation fields to listing_deposits table
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS cancellation_type VARCHAR(50); 
-- 'buyer_early', 'buyer_late', 'seller', 'mutual', 'admin'

-- Update status constraint to include 'cancelled'
ALTER TABLE listing_deposits DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE listing_deposits ADD CONSTRAINT valid_status 
  CHECK (status IN ('pending', 'paid', 'released', 'refunded', 'expired', 'claimed', 'cancelled'));

-- Add seller cancellation tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deposit_seller_cancellation_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deposit_seller_suspended_until TIMESTAMP;
```

### 2. New RPC Functions

#### A. Buyer Cancellation
```sql
CREATE OR REPLACE FUNCTION cancel_deposit_buyer(
  p_deposit_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
  v_hours_since_payment INTEGER;
  v_refund_amount DECIMAL(10,2);
  v_seller_amount DECIMAL(10,2);
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = p_deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not eligible for cancellation';
  END IF;

  -- Check authorization
  IF v_deposit.buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate hours since payment
  v_hours_since_payment := EXTRACT(EPOCH FROM (NOW() - v_deposit.updated_at)) / 3600;

  -- No cancellation after 24 hours
  IF v_hours_since_payment > 24 THEN
    RAISE EXCEPTION 'Cannot cancel after 24 hours. Please contact the seller directly.';
  END IF;

  -- Calculate refund based on time
  IF v_hours_since_payment <= 6 THEN
    -- Full refund within 6 hours
    v_refund_amount := 20.00;
    v_seller_amount := 0.00;
  ELSE
    -- Partial refund after 6 hours
    v_refund_amount := 10.00;
    v_seller_amount := 10.00;
  END IF;

  -- Update deposit
  UPDATE listing_deposits
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    cancellation_reason = p_reason,
    cancellation_type = CASE 
      WHEN v_hours_since_payment <= 6 THEN 'buyer_early'
      ELSE 'buyer_late'
    END,
    updated_at = NOW()
  WHERE id = p_deposit_id;

  -- Notify seller
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.seller_id,
    'deposit_cancelled',
    'Deposit Cancelled',
    CASE 
      WHEN v_seller_amount > 0 
      THEN 'The buyer cancelled. You receive ₵' || v_seller_amount || ' cancellation fee.'
      ELSE 'The buyer cancelled their commitment early.'
    END,
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id,
      'seller_amount', v_seller_amount,
      'refund_amount', v_refund_amount
    )
  );

  -- Notify buyer
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.buyer_id,
    'deposit_cancelled',
    'Cancellation Confirmed',
    CASE 
      WHEN v_refund_amount = 20.00 
      THEN 'Your deposit has been fully refunded (₵20).'
      ELSE 'Partial refund: ₵' || v_refund_amount || '. ₵' || v_seller_amount || ' kept as cancellation fee.'
    END,
    json_build_object(
      'deposit_id', v_deposit.id,
      'refund_amount', v_refund_amount
    )
  );

  RETURN json_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'seller_amount', v_seller_amount,
    'message', CASE 
      WHEN v_refund_amount = 20.00 
      THEN 'Full refund: ₵20'
      ELSE 'Partial refund: ₵' || v_refund_amount || '. ₵' || v_seller_amount || ' kept as cancellation fee.'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### B. Seller Cancellation
```sql
CREATE OR REPLACE FUNCTION cancel_deposit_seller(
  p_deposit_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = p_deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not eligible for cancellation';
  END IF;

  -- Check authorization
  IF v_deposit.seller_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update deposit
  UPDATE listing_deposits
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    cancellation_reason = p_reason,
    cancellation_type = 'seller',
    updated_at = NOW()
  WHERE id = p_deposit_id;

  -- Update seller cancellation count
  UPDATE profiles
  SET 
    deposit_seller_cancellation_count = deposit_seller_cancellation_count + 1,
    -- Suspend after 3 cancellations
    deposit_seller_suspended_until = CASE
      WHEN deposit_seller_cancellation_count + 1 >= 3
      THEN NOW() + INTERVAL '30 days'
      ELSE deposit_seller_suspended_until
    END
  WHERE id = v_deposit.seller_id;

  -- Notify buyer (full refund)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.buyer_id,
    'deposit_refunded',
    'Deposit Refunded - Seller Cancelled',
    'The seller cancelled. Your full ₵20 deposit has been refunded.',
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id,
      'refund_amount', 20.00
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Deposit cancelled. Buyer will receive full refund (₵20).'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### C. Mutual Cancellation
```sql
CREATE TABLE IF NOT EXISTS deposit_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_id UUID NOT NULL REFERENCES listing_deposits(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  confirmed_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);

CREATE OR REPLACE FUNCTION request_mutual_cancellation(
  p_deposit_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
  v_request_id UUID;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = p_deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not eligible for cancellation';
  END IF;

  -- Check authorization (buyer or seller)
  IF v_deposit.buyer_id != auth.uid() AND v_deposit.seller_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check if request already exists
  IF EXISTS (
    SELECT 1 FROM deposit_cancellation_requests
    WHERE deposit_id = p_deposit_id
      AND confirmed_by IS NULL
  ) THEN
    RAISE EXCEPTION 'Cancellation request already pending';
  END IF;

  -- Create request
  INSERT INTO deposit_cancellation_requests (
    deposit_id,
    requested_by,
    reason
  ) VALUES (
    p_deposit_id,
    auth.uid(),
    p_reason
  )
  RETURNING id INTO v_request_id;

  -- Notify other party
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    CASE 
      WHEN auth.uid() = v_deposit.buyer_id THEN v_deposit.seller_id
      ELSE v_deposit.buyer_id
    END,
    'cancellation_request',
    'Cancellation Request',
    CASE 
      WHEN auth.uid() = v_deposit.buyer_id 
      THEN 'The buyer has requested to cancel the deposit.'
      ELSE 'The seller has requested to cancel the deposit.'
    END,
    json_build_object(
      'deposit_id', v_deposit.id,
      'request_id', v_request_id,
      'listing_id', v_deposit.listing_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Cancellation request sent. Waiting for other party to confirm.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION confirm_mutual_cancellation(
  p_request_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_deposit RECORD;
BEGIN
  -- Get request
  SELECT * INTO v_request
  FROM deposit_cancellation_requests
  WHERE id = p_request_id
    AND confirmed_by IS NULL;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Cancellation request not found or already processed';
  END IF;

  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = v_request.deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not in valid status';
  END IF;

  -- Check authorization (must be the other party)
  IF auth.uid() = v_request.requested_by THEN
    RAISE EXCEPTION 'Cannot confirm your own cancellation request';
  END IF;

  IF v_deposit.buyer_id != auth.uid() AND v_deposit.seller_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Confirm request
  UPDATE deposit_cancellation_requests
  SET 
    confirmed_by = auth.uid(),
    confirmed_at = NOW()
  WHERE id = p_request_id;

  -- Cancel deposit
  UPDATE listing_deposits
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    cancellation_type = 'mutual',
    cancellation_reason = v_request.reason,
    updated_at = NOW()
  WHERE id = v_request.deposit_id;

  -- Notify both parties (full refund to buyer)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  SELECT 
    unnest(ARRAY[v_deposit.buyer_id, v_deposit.seller_id]),
    'deposit_cancelled',
    'Mutual Cancellation Confirmed',
    CASE 
      WHEN unnest(ARRAY[v_deposit.buyer_id, v_deposit.seller_id]) = v_deposit.buyer_id
      THEN 'Both parties agreed to cancel. Full refund: ₵20.'
      ELSE 'Both parties agreed to cancel the deposit.'
    END,
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id
    );

  RETURN json_build_object(
    'success', true,
    'message', 'Cancellation confirmed. Buyer will receive full refund (₵20).'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎨 UI Updates Needed

### 1. Deposit Confirmation Screen (`app/deposit-confirmation/[id].tsx`)

Add cancellation buttons:

#### For Buyers (status = 'paid'):
```typescript
{canCancelAsBuyer && (
  <Button
    variant="outline"
    onPress={() => setShowCancelModal(true)}
    fullWidth
    style={{ 
      borderColor: theme.colors.warning,
      marginTop: theme.spacing.sm,
    }}
    leftIcon={<XCircle size={20} color={theme.colors.warning} />}
  >
    Cancel Commitment
  </Button>
)}
```

#### For Sellers (status = 'paid'):
```typescript
{canCancelAsSeller && (
  <Button
    variant="outline"
    onPress={() => setShowSellerCancelModal(true)}
    fullWidth
    style={{ 
      borderColor: theme.colors.error,
      marginTop: theme.spacing.sm,
    }}
    leftIcon={<XCircle size={20} color={theme.colors.error} />}
  >
    Cancel & Refund Buyer
  </Button>
)}
```

#### Mutual Cancellation Section:
```typescript
<View style={{
  backgroundColor: theme.colors.surfaceVariant,
  padding: theme.spacing.md,
  borderRadius: theme.borderRadius.md,
  marginTop: theme.spacing.lg,
}}>
  <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
    Need to Cancel?
  </Text>
  <Text variant="bodySmall" style={{ marginBottom: theme.spacing.md, lineHeight: 20 }}>
    Both parties must agree to cancel. This will result in a full refund to the buyer.
  </Text>
  <Button
    variant="outline"
    onPress={() => setShowMutualCancelModal(true)}
    fullWidth
    leftIcon={<Users size={20} color={theme.colors.primary} />}
  >
    Request Mutual Cancellation
  </Button>
</View>
```

### 2. Cancellation Modals

#### Buyer Cancellation Modal:
- Show time-based refund calculation
- "Within 6 hours: Full refund (₵20)"
- "After 6 hours: ₵10 refund, ₵10 to seller"
- Reason input (optional)
- Confirm button

#### Seller Cancellation Modal:
- Warning about full refund to buyer
- Warning about cancellation count
- Reason input (required)
- Confirm button

#### Mutual Cancellation Modal:
- Explain both parties must agree
- Reason input
- Send Request button

---

## 📊 Updated Status Mapping

| Status | Meaning | Can Cancel |
|--------|---------|------------|
| `pending` | Payment not made | System only |
| `paid` | Active commitment | ✅ Buyer (6h full, 24h partial), ✅ Seller (full refund), ✅ Mutual |
| `cancelled` | Cancelled by party | None (final) |
| `released` | Meetup confirmed | None (final) |
| `claimed` | No-show claimed | None (final) |
| `refunded` | Auto-refunded | None (final) |
| `expired` | Payment expired | None (final) |

---

## 💰 Refund Processing

### Paystack Refund Integration:
```typescript
// Call Paystack refund API
const refundDeposit = async (reference: string, amount: number) => {
  const response = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transaction: reference,
      amount: amount * 100, // In pesewas
    }),
  });
  
  return response.json();
};
```

---

## ✅ Recommended Implementation

### **Cancellation Policy Summary**:

1. **Buyer Cancels**:
   - Within 6 hours: Full refund (₵20)
   - 6-24 hours: ₵10 refund, ₵10 to seller
   - After 24 hours: No cancellation (contact seller)

2. **Seller Cancels**:
   - Full refund to buyer (₵20)
   - Track seller cancellations
   - Suspend after 3 cancellations

3. **Mutual Cancellation**:
   - Both agree: Full refund (₵20)
   - Request → Confirm flow

4. **Auto-Refund**:
   - After 3 days: Full refund (₵20)

**This is fair, balanced, and protects both parties!** 🎯

Should we implement this cancellation system?

