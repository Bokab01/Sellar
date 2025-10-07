# Partial Quantity Reservation System - Implementation Guide

## Overview

The Partial Quantity Reservation System allows listings with `quantity > 1` to accept multiple offers simultaneously. Each buyer can reserve a specific quantity, and the listing remains active until all items are sold.

---

## 🎯 How It Works

### **Single Quantity Listings (quantity = 1)**
- Uses the **old full reservation method**
- Listing status → `'reserved'`
- Entire listing is blocked
- Auto-recovers if deal falls through

### **Multi-Quantity Listings (quantity > 1)**
- Uses the **new partial reservation method**
- Listing status remains `'active'`
- Only reserved quantity is blocked
- Other buyers can still purchase remaining items
- Multiple simultaneous reservations possible

---

## 📊 Database Schema

### **New Fields in `listings` Table:**
```sql
quantity_reserved INTEGER DEFAULT 0  -- Number of items currently reserved
```

**Constraint:** `quantity_reserved <= quantity`

### **New Table: `pending_transactions`**
```sql
CREATE TABLE pending_transactions (
  id UUID PRIMARY KEY,
  listing_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  
  quantity_reserved INTEGER NOT NULL,  -- How many items in this reservation
  agreed_price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS',
  
  reserved_until TIMESTAMP,  -- Expiry time (48 hours)
  status VARCHAR(20),  -- 'pending', 'confirmed', 'expired', 'cancelled'
  
  buyer_confirmed_at TIMESTAMP,
  seller_confirmed_at TIMESTAMP,
  
  meetup_transaction_id UUID,  -- Link to final transaction
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔄 Flow Diagrams

### **Offer Acceptance Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ Seller Accepts Offer                                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Check Listing Quantity│
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌────────────────────┐
│ quantity = 1  │      │ quantity > 1       │
│ OR            │      │ AND                │
│ buying all    │      │ buying partial     │
└───────┬───────┘      └────────┬───────────┘
        │                       │
        ▼                       ▼
┌───────────────────┐   ┌──────────────────────────┐
│ FULL RESERVATION  │   │ PARTIAL RESERVATION      │
│                   │   │                          │
│ • status='reserved'│   │ • status='active'        │
│ • reserved_until  │   │ • quantity_reserved += N │
│ • reserved_for    │   │ • Create pending_tx      │
└───────────────────┘   └──────────────────────────┘
```

### **Transaction Confirmation Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ Both Parties Confirm Transaction                            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ Check for pending_tx      │
        └───────────┬───────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────────┐   ┌──────────────────────────┐
│ Pending TX Found  │   │ No Pending TX            │
│ (Partial Qty)     │   │ (Full Listing)           │
└───────┬───────────┘   └────────┬─────────────────┘
        │                        │
        ▼                        ▼
┌───────────────────────┐ ┌─────────────────────────┐
│ confirm_pending_tx()  │ │ Mark listing as 'sold'  │
│                       │ │                         │
│ • quantity -= N       │ │ • status = 'sold'       │
│ • quantity_reserved-=N│ │ • reserved_until = NULL │
│ • pending_tx='confirmed'│ │ • reserved_for = NULL   │
│                       │ │                         │
│ IF quantity = 0:      │ └─────────────────────────┘
│   status = 'sold'     │
└───────────────────────┘
```

### **Auto-Recovery Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ Cron Job Runs (Every Hour)                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ Find Expired Reservations │
        └───────────┬───────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────────────┐ ┌──────────────────────────┐
│ Expired Pending TXs   │ │ Expired Full Listings    │
│ (reserved_until<NOW)  │ │ (status='reserved')      │
└───────┬───────────────┘ └────────┬─────────────────┘
        │                          │
        ▼                          ▼
┌───────────────────────┐ ┌──────────────────────────┐
│ FOR EACH:             │ │ FOR EACH:                │
│ • status='expired'    │ │ • status='active'        │
│ • quantity_reserved-=N│ │ • reserved_until=NULL    │
│                       │ │ • reserved_for=NULL      │
└───────────────────────┘ └──────────────────────────┘
```

---

## 🛠️ Database Functions

### **1. `get_available_quantity(listing_id)`**
Returns the number of items available for purchase.

```sql
SELECT get_available_quantity('listing-uuid');
-- Returns: quantity - quantity_reserved
```

### **2. `create_pending_transaction(...)`**
Creates a pending transaction and reserves quantity.

```sql
SELECT create_pending_transaction(
  p_listing_id := 'listing-uuid',
  p_conversation_id := 'conversation-uuid',
  p_buyer_id := 'buyer-uuid',
  p_quantity := 2,
  p_agreed_price := 150.00,
  p_hours_until_expiry := 48
);
-- Returns: pending_transaction_id
```

**What it does:**
1. Checks if enough quantity is available
2. Creates `pending_transactions` record
3. Updates `listings.quantity_reserved += quantity`
4. Returns the new pending transaction ID

### **3. `confirm_pending_transaction(...)`**
Confirms a pending transaction (buyer or seller confirmation).

```sql
SELECT confirm_pending_transaction(
  p_pending_tx_id := 'pending-tx-uuid',
  p_user_id := 'user-uuid',
  p_role := 'buyer'  -- or 'seller'
);
-- Returns: true if both parties confirmed, false if waiting for other party
```

**What it does:**
1. Updates `buyer_confirmed_at` or `seller_confirmed_at`
2. If both confirmed:
   - Marks pending_tx as `'confirmed'`
   - Reduces `listings.quantity` permanently
   - Reduces `listings.quantity_reserved`
   - If `quantity` reaches 0, marks listing as `'sold'`

### **4. `auto_recover_expired_reservations()`**
Recovers expired reservations (both partial and full).

```sql
SELECT auto_recover_expired_reservations();
-- Returns: (recovered_count, restored_quantity)
```

**What it does:**
1. Finds expired `pending_transactions` (status='pending', reserved_until<NOW)
2. Marks them as `'expired'`
3. Restores `quantity_reserved` to the listing
4. Also handles old-style full listing reservations (backward compatible)

---

## 📱 Mobile App Integration

### **Offer Acceptance (`app/(tabs)/inbox/[id].tsx`)**

```typescript
const handleOfferAcceptance = async (offerId: string, acceptedOffer: any) => {
  // Get listing details
  const { data: listing } = await supabase
    .from('listings')
    .select('quantity, quantity_reserved')
    .eq('id', conversation.listing_id)
    .single();

  const quantityToPurchase = acceptedOffer.quantity || 1;
  const availableQuantity = listing.quantity - (listing.quantity_reserved || 0);

  // Check availability
  if (availableQuantity < quantityToPurchase) {
    showErrorToast(`Only ${availableQuantity} item(s) available`);
    return;
  }

  // Decide strategy
  if (listing.quantity === 1 || quantityToPurchase === listing.quantity) {
    // FULL RESERVATION (old method)
    await supabase
      .from('listings')
      .update({ 
        status: 'reserved',
        reserved_until: new Date(Date.now() + 48*60*60*1000).toISOString(),
        reserved_for: acceptedOffer.buyer_id
      })
      .eq('id', conversation.listing_id);
  } else {
    // PARTIAL RESERVATION (new method)
    await supabase.rpc('create_pending_transaction', {
      p_listing_id: conversation.listing_id,
      p_conversation_id: conversationId,
      p_buyer_id: acceptedOffer.buyer_id,
      p_quantity: quantityToPurchase,
      p_agreed_price: acceptedOffer.amount,
      p_hours_until_expiry: 48
    });
  }
};
```

### **Transaction Confirmation (`TransactionCompletionModal.tsx`)**

```typescript
const handleConfirmMeetup = async () => {
  // Update meetup_transactions confirmation
  await supabase
    .from('meetup_transactions')
    .update({ [confirmationField]: new Date().toISOString() })
    .eq('id', createdTransactionId);

  // Check for pending transaction
  const { data: pendingTxs } = await supabase
    .from('pending_transactions')
    .select('id, quantity_reserved')
    .eq('conversation_id', conversationId)
    .eq('status', 'pending')
    .limit(1);

  if (pendingTxs && pendingTxs.length > 0) {
    // PARTIAL QUANTITY - Confirm pending transaction
    await supabase.rpc('confirm_pending_transaction', {
      p_pending_tx_id: pendingTxs[0].id,
      p_user_id: user.id,
      p_role: role
    });
  } else {
    // FULL LISTING - Mark as sold
    await supabase
      .from('listings')
      .update({ status: 'sold', reserved_until: null, reserved_for: null })
      .eq('id', listing.id);
  }
};
```

---

## 🎨 UI Updates Needed

### **1. Listing Detail Screen**
Show available quantity:

```typescript
// In listing detail screen
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Package size={16} color={theme.colors.text.secondary} />
  <Text variant="body" color="secondary">
    {listing.quantity - (listing.quantity_reserved || 0)} available
    {listing.quantity_reserved > 0 && ` (${listing.quantity_reserved} reserved)`}
  </Text>
</View>
```

### **2. Product Cards**
Show quantity badge for multi-quantity listings:

```typescript
{listing.quantity > 1 && (
  <Badge 
    text={`${listing.quantity - (listing.quantity_reserved || 0)} available`}
    variant="info"
    size="sm"
  />
)}
```

### **3. My Listings Screen**
Show reserved quantity:

```typescript
<Text variant="caption" color="secondary">
  {listing.quantity} total
  {listing.quantity_reserved > 0 && ` • ${listing.quantity_reserved} reserved`}
  {listing.quantity - listing.quantity_reserved} available
</Text>
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Single Quantity Listing**
1. Create listing with quantity = 1
2. Make offer
3. Accept offer
4. ✅ Listing status should be 'reserved'
5. ✅ No pending_transaction created
6. Confirm transaction
7. ✅ Listing status should be 'sold'

### **Scenario 2: Multi-Quantity Listing - Partial Purchase**
1. Create listing with quantity = 5
2. Buyer A makes offer for 2 items
3. Accept offer
4. ✅ Listing status should remain 'active'
5. ✅ quantity_reserved should be 2
6. ✅ pending_transaction created with quantity_reserved = 2
7. Buyer B makes offer for 2 items
8. Accept offer
9. ✅ quantity_reserved should be 4
10. ✅ Second pending_transaction created
11. Buyer A confirms transaction
12. ✅ Listing quantity should reduce to 3
13. ✅ quantity_reserved should reduce to 2
14. ✅ Listing still 'active'
15. Buyer B confirms transaction
16. ✅ Listing quantity should reduce to 1
17. ✅ quantity_reserved should be 0
18. ✅ Listing still 'active' with 1 item available

### **Scenario 3: Multi-Quantity Listing - Buy All**
1. Create listing with quantity = 3
2. Make offer for all 3 items
3. Accept offer
4. ✅ Should use full reservation method (backward compatible)
5. ✅ Listing status should be 'reserved'
6. Confirm transaction
7. ✅ Listing status should be 'sold'

### **Scenario 4: Expired Reservation**
1. Create listing with quantity = 5
2. Make offer for 2 items
3. Accept offer
4. ✅ quantity_reserved = 2
5. Manually set `reserved_until` to past time
6. Run cron job (or wait 48 hours)
7. ✅ pending_transaction status should be 'expired'
8. ✅ quantity_reserved should be 0
9. ✅ Listing should be 'active' with 5 available

### **Scenario 5: Insufficient Quantity**
1. Create listing with quantity = 3
2. Buyer A reserves 2 items
3. ✅ quantity_reserved = 2, available = 1
4. Buyer B tries to reserve 2 items
5. ✅ Should show error: "Only 1 item(s) available"
6. ✅ Offer should not be accepted

---

## 📊 Monitoring Queries

### **Check Active Reservations:**
```sql
SELECT 
  l.id,
  l.title,
  l.quantity,
  l.quantity_reserved,
  l.quantity - l.quantity_reserved as available,
  COUNT(pt.id) as active_reservations
FROM listings l
LEFT JOIN pending_transactions pt ON pt.listing_id = l.id AND pt.status = 'pending'
WHERE l.quantity > 1
GROUP BY l.id
ORDER BY l.quantity_reserved DESC;
```

### **Check Pending Transactions:**
```sql
SELECT 
  pt.id,
  l.title,
  pt.quantity_reserved,
  pt.agreed_price,
  pt.reserved_until,
  EXTRACT(EPOCH FROM (pt.reserved_until - NOW()))/3600 as hours_remaining,
  pt.buyer_confirmed_at IS NOT NULL as buyer_confirmed,
  pt.seller_confirmed_at IS NOT NULL as seller_confirmed
FROM pending_transactions pt
JOIN listings l ON l.id = pt.listing_id
WHERE pt.status = 'pending'
ORDER BY pt.reserved_until;
```

### **Check Recovery Statistics:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'confirmed') as completed,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  SUM(quantity_reserved) FILTER (WHERE status = 'confirmed') as total_quantity_sold,
  SUM(quantity_reserved) FILTER (WHERE status = 'expired') as total_quantity_recovered
FROM pending_transactions;
```

---

## 🚀 Deployment Checklist

- [ ] Run migration `30_partial_quantity_reservation.sql`
- [ ] Update mobile app offer acceptance logic
- [ ] Update transaction confirmation logic
- [ ] Add quantity display to listing detail screen
- [ ] Add quantity badges to product cards
- [ ] Add quantity info to my listings screen
- [ ] Test single quantity listings (backward compatibility)
- [ ] Test multi-quantity partial purchases
- [ ] Test multi-quantity buy-all
- [ ] Test expired reservation recovery
- [ ] Test insufficient quantity error
- [ ] Monitor cron job logs
- [ ] Monitor pending_transactions table

---

## 📚 Related Documentation

- `docs/RESERVED_STATUS_SYSTEM.md` - Original reservation system
- `docs/CRON_JOB_SETUP_GUIDE.md` - Cron job setup
- `RESERVATION_SYSTEM_COMPLETE.md` - System overview
- `supabase/migrations/28_reserved_status_system.sql` - Full reservation migration
- `supabase/migrations/30_partial_quantity_reservation.sql` - Partial reservation migration

---

**Status: Implementation In Progress**
**Migration Ready: ✅**
**Mobile App Updates: ✅**
**UI Updates: ⏳ Pending**
**Testing: ⏳ Pending**

Last Updated: October 5, 2025
