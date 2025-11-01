# 📦 Listing Reservation System with Sellar Secure

## Overview
The reservation system allows sellers to list items in bulk (with quantity) and buyers to reserve one or more units using the Sellar Secure deposit system.

---

## 🎯 Key Features

### For Sellers:
- ✅ **Bulk Listings**: List items with quantity (e.g., "10 iPhone 13 phones")
- ✅ **Automatic Tracking**: System automatically tracks reserved vs available units
- ✅ **Multiple Buyers**: Different buyers can reserve units from the same listing
- ✅ **Protected Income**: Each unit requires a ₵20 deposit

### For Buyers:
- ✅ **Multi-Unit Purchase**: Reserve 1, 2, 3+ units in a single deposit
- ✅ **Fair Pricing**: ₵20 per unit (2 units = ₵40, 3 units = ₵60, etc.)
- ✅ **Availability Check**: See real-time available quantity before reserving
- ✅ **3-Day Window**: Meet seller and confirm within 3 days

---

## 📊 Database Schema

### Listings Table (Updated)
```sql
listings:
  - quantity: INTEGER DEFAULT 1           -- Total units available
  - reserved_quantity: INTEGER DEFAULT 0  -- Units currently reserved
  - available_quantity: COMPUTED          -- quantity - reserved_quantity
  - requires_deposit: BOOLEAN             -- Pro sellers only
```

### Listing Deposits Table (Updated)
```sql
listing_deposits:
  - reserved_quantity: INTEGER DEFAULT 1  -- How many units buyer is reserving
  - amount: DECIMAL(10,2)                 -- ₵20 × reserved_quantity
  - status: ENUM                          -- pending, paid, released, etc.
```

---

## 🔄 Reservation Flow

### Step 1: Seller Creates Bulk Listing
```
Seller lists: "iPhone 13 - 128GB"
Quantity: 10
Requires Deposit: ✓ (Pro sellers only)
```

**Result:**
- `quantity = 10`
- `reserved_quantity = 0`
- `available_quantity = 10`

---

### Step 2: Buyer A Reserves 2 Units
```
Buyer A clicks "Secure This Item"
Selects: 2 units
Deposit: ₵40 (₵20 × 2)
Pays via Paystack
```

**What Happens:**
1. `initialize_deposit(listing_id, buyer_id, reserved_quantity: 2)` called
2. System checks: `available_quantity >= 2` ✓
3. Deposit created with `status: 'pending'`
4. After payment: `status → 'paid'`
5. Trigger fires: `reserved_quantity = 0 + 2 = 2`

**New State:**
- `quantity = 10`
- `reserved_quantity = 2`
- `available_quantity = 8`

---

### Step 3: Buyer B Reserves 3 Units
```
Buyer B sees: "8 units available"
Selects: 3 units
Deposit: ₵60 (₵20 × 3)
```

**New State:**
- `quantity = 10`
- `reserved_quantity = 5` (2 + 3)
- `available_quantity = 5`

---

### Step 4A: Transaction Complete (Buyer A)
```
Buyer A meets seller, confirms transaction
Status: paid → released
```

**What Happens:**
1. Buyer A confirms transaction via app
2. `status → 'released'`
3. ₵40 released to seller
4. Trigger fires: Units stay reserved (transaction completed)
5. Seller marks 2 units as sold

**State Remains:**
- `reserved_quantity = 5` (stays same, transaction completed)

---

### Step 4B: Transaction Expired (Buyer B)
```
Buyer B doesn't show up within 3 days
Status: paid → expired → refunded
```

**What Happens:**
1. Cron job detects expired deposit
2. `status → 'expired'`
3. ₵60 auto-refunded to Buyer B
4. Trigger fires: `reserved_quantity = 5 - 3 = 2`
5. 3 units released back to available

**New State:**
- `quantity = 10`
- `reserved_quantity = 2`
- `available_quantity = 8`

---

## 🛡️ Protection Mechanisms

### 1. Over-Reservation Prevention
```sql
-- Buyer tries to reserve 6 units when only 5 available
ERROR: "Only 5 unit(s) available. You requested 6."
```

### 2. Duplicate Deposit Prevention
```sql
-- Buyer tries to pay 2nd deposit for same listing
ERROR: "You already have an active deposit for this listing"
```

### 3. Deposit Limit Enforcement
```sql
-- Buyer tries to make 4th active deposit
ERROR: "You have reached the maximum of 3 active deposit commitments"
```

### 4. Pro Seller Validation
```sql
-- Non-Pro seller tries to enable deposits
ERROR: "Only Sellar Pro members can require deposits"
```

---

## 💰 Pricing Examples

| Units Reserved | Deposit Amount | Paystack Amount |
|---------------|----------------|-----------------|
| 1 unit        | ₵20            | 2,000 pesewas   |
| 2 units       | ₵40            | 4,000 pesewas   |
| 3 units       | ₵60            | 6,000 pesewas   |
| 5 units       | ₵100           | 10,000 pesewas  |
| 10 units      | ₵200           | 20,000 pesewas  |

---

## 🔧 API Functions

### `initialize_deposit()`
```sql
initialize_deposit(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_reserved_quantity INTEGER DEFAULT 1,
  p_conversation_id UUID DEFAULT NULL
)
```

**Returns:**
```json
{
  "deposit_id": "uuid",
  "reference": "DEP-ABC123",
  "amount": 4000,  // pesewas (₵40 for 2 units)
  "reserved_quantity": 2,
  "unit_price": 2000,
  "available_quantity": 8
}
```

### `get_listing_availability()`
```sql
get_listing_availability(p_listing_id UUID)
```

**Returns:**
```json
{
  "listing_id": "uuid",
  "title": "iPhone 13 - 128GB",
  "total_quantity": 10,
  "reserved_quantity": 2,
  "available_quantity": 8,
  "requires_deposit": true,
  "is_available": true
}
```

---

## 📱 UI Implementation Guide

### Listing Detail Screen

#### Show Quantity Info
```tsx
{listing.quantity > 1 && (
  <View>
    <Text>Available: {listing.available_quantity} of {listing.quantity}</Text>
    {listing.available_quantity < listing.quantity && (
      <Text color="warning">
        {listing.reserved_quantity} unit(s) currently reserved
      </Text>
    )}
  </View>
)}
```

#### Quantity Selector (When Deposit Required)
```tsx
<DepositCommitmentModal>
  {listing.available_quantity > 1 && (
    <QuantitySelector
      max={Math.min(listing.available_quantity, 10)}
      value={selectedQuantity}
      onChange={setSelectedQuantity}
    />
  )}
  
  <Text>
    Deposit Amount: GH₵{(selectedQuantity * 20).toFixed(2)}
  </Text>
  
  <Button onPress={handlePayDeposit}>
    Pay GH₵{(selectedQuantity * 20).toFixed(2)} Deposit
  </Button>
</DepositCommitmentModal>
```

### My Orders Screen

#### Show Reserved Quantity
```tsx
<OrderCard>
  <Text>{order.listing.title}</Text>
  <Badge>
    {order.reserved_quantity} unit{order.reserved_quantity > 1 ? 's' : ''}
  </Badge>
  <Text>Deposit: GH₵{order.amount.toFixed(2)}</Text>
</OrderCard>
```

---

## 🎬 Real-World Scenarios

### Scenario 1: Electronics Dealer
```
Seller: Lists 20 "Samsung Galaxy A54"
Buyer 1: Reserves 1 (₵20)
Buyer 2: Reserves 3 (₵60)
Buyer 3: Reserves 2 (₵40)

Status: 6 reserved, 14 available
```

### Scenario 2: Clothing Vendor
```
Seller: Lists 50 "Nike Air Max Size 42"
Buyer 1: Reserves 5 (₵100) - for resale
Buyer 2: Reserves 2 (₵40)
Buyer 1: Cancels - 5 units released

Status: 2 reserved, 48 available
```

### Scenario 3: Auto Parts Dealer
```
Seller: Lists 100 "Toyota Corolla Brake Pads"
Multiple Buyers: Reserve 1-3 units each
System: Tracks all reservations
Auto-releases: Units from expired deposits

Status: Updates real-time
```

---

## ⚠️ Important Notes

### For Sellers:
1. **Quantity Updates**: Can increase quantity anytime (e.g., 10 → 15)
2. **Cannot Decrease**: Below `reserved_quantity` (would break commitments)
3. **Track Sales**: Mark units as sold when transactions complete
4. **Pro Only**: Must maintain Sellar Pro subscription for deposits

### For Buyers:
1. **Deposit Per Unit**: ₵20 × quantity you reserve
2. **3-Day Window**: Confirm within 3 days or auto-refund
3. **One Deposit Per Listing**: Can't make multiple deposits for same listing
4. **Max 3 Active**: Total active deposits across all listings

### System:
1. **Auto-Cleanup**: Pending deposits deleted after 24 hours
2. **Auto-Refund**: Expired deposits refunded after 3 days
3. **Real-Time**: Availability updates instantly
4. **Cron Jobs**: Hourly cleanup + 2-hour reminders

---

## 🚀 Next Steps

1. **Deploy Migration**: Run `supabase db push`
2. **Update UI**: Add quantity selector to deposit modal
3. **Update Mobile**: Pass `reserved_quantity` parameter
4. **Update Web**: Same quantity selector
5. **Test**: Create bulk listing and test reservations
6. **Monitor**: Check cron jobs are running

---

## 📞 Support

For issues or questions:
- Check `listing_deposits` table for deposit status
- Use `get_listing_availability()` to debug quantity issues
- Monitor `reserved_quantity` field in listings table
- Check triggers are firing correctly

