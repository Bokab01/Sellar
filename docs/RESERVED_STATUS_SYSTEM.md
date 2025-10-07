# Reserved Status System - Implementation Summary

## Overview
Implemented a "soft reserve" system to protect sellers from losing boosts when deals fall through, while maintaining buyer commitment and trust.

---

## Problem Solved

**Before:**
- Offer accepted → Listing marked as "sold" immediately
- Boosts lost if deal falls through
- No way to recover listing
- Bad experience for both parties

**After:**
- Offer accepted → Listing marked as "reserved" (48 hours)
- Boosts continue running during reservation
- Auto-recovery if deal falls through
- Both parties must confirm before marking as "sold"

---

## Implementation Details

### 1. Database Changes (`28_reserved_status_system.sql`)

**New Fields:**
```sql
listings.reserved_until TIMESTAMP     -- When reservation expires
listings.reserved_for UUID            -- Buyer who reserved it
listings.reservation_count INTEGER    -- Analytics counter
```

**Functions Created:**
- `auto_recover_expired_reservations()` - Auto-reactivates expired reservations
- `cancel_reservation()` - Manual cancellation by seller or buyer
- `notify_expired_reservations()` - Sends expiry warnings

---

### 2. Status Flow

```
active → reserved (48hrs) → sold
         ↓ (timeout)
       active (auto-relist)
```

**Reservation Lifecycle:**
1. **Offer Accepted:**
   - Status: `active` → `reserved`
   - `reserved_until` = NOW() + 48 hours
   - `reserved_for` = buyer_id
   - Boosts continue ✅

2. **Transaction Completion:**
   - User A marks completed
   - User B confirms
   - Status: `reserved` → `sold`
   - Boosts stop
   - Reservation cleared

3. **Deal Falls Through:**
   - After 48 hours without confirmation
   - Status: `reserved` → `active`
   - Boosts resume
   - Seller notified

---

### 3. Code Changes

**Offer Acceptance (`app/(tabs)/inbox/[id].tsx`):**
```typescript
// OLD
listing.status = 'sold'

// NEW
listing.status = 'reserved'
listing.reserved_until = NOW() + 48 hours
listing.reserved_for = buyer_id
```

**Transaction Confirmation (`TransactionCompletionModal.tsx`):**
```typescript
// Check if both parties confirmed
if (buyer_confirmed_at && seller_confirmed_at) {
  // Only now mark as sold
  listing.status = 'sold'
  listing.reserved_until = null
  listing.reserved_for = null
}
```

---

### 4. UI Indicators

**Reserved Badge:**
- Orange/Warning color
- Shows "Reserved" or "Reserved for You"
- Displays countdown timer
- Visible on all listing cards

**Helper Functions (`utils/listingHelpers.ts`):**
```typescript
getListingStatusBadge()           // Returns appropriate badge
getReservationTimeRemaining()     // Calculates time left
isListingAvailable()              // Check if can make offers
isListingReserved()               // Check if reserved
isListingSold()                   // Check if sold
```

---

## User Experience

### For Seller:
1. ✅ Boosts keep running during reservation
2. ✅ Auto-recovery if buyer doesn't show up
3. ✅ Can manually cancel reservation
4. ✅ Notification when reservation expires soon
5. ✅ Protected from losing boost investment

### For Buyer:
1. ✅ Clear 48-hour window to complete
2. ✅ "Reserved for You" badge
3. ✅ Countdown timer shows urgency
4. ✅ Can cancel if needed
5. ✅ Builds trust with commitment

---

## Auto-Recovery System

**Cron Job (Recommended):**
```sql
-- Run every hour
SELECT auto_recover_expired_reservations();
```

**What it does:**
1. Finds listings with `status = 'reserved'` AND `reserved_until < NOW()`
2. Checks if transaction was completed (both parties confirmed)
3. If not completed: Reactivates listing
4. Clears reservation fields
5. Returns count of recovered listings

---

## Manual Cancellation

**Function:**
```sql
SELECT cancel_reservation(
  p_listing_id UUID,
  p_user_id UUID,
  p_reason TEXT
);
```

**Authorization:**
- Seller can cancel anytime
- Buyer can cancel anytime
- Returns success/error message

---

## Notifications

**Expiry Warning (1 hour before):**
- Sent to both seller and buyer
- Reminds to complete transaction
- Prevents last-minute surprises

**Auto-Recovery Notification:**
- Sent to seller when listing reactivates
- Explains why it was relisted
- Encourages better communication

---

## Benefits

### For Marketplace:
- ✅ Higher completion rates (commitment)
- ✅ Better user experience
- ✅ Protects seller investment
- ✅ Builds trust
- ✅ Reduces disputes

### For Ghana Market:
- ✅ Aligns with cash-based culture
- ✅ No payment integration needed
- ✅ Simple to understand
- ✅ Flexible for both parties
- ✅ Automatic recovery reduces friction

---

## Future Enhancements

### Phase 2 (Optional):
1. **Backup Offers:**
   - Collect interested buyers during reservation
   - Auto-notify if deal falls through

2. **Reputation System:**
   - Track completion rate
   - Badge for reliable users
   - Penalize serial flakers

3. **Flexible Timeframes:**
   - 24 hours for small items
   - 72 hours for expensive items
   - Custom duration option

4. **Deposit System (Future):**
   - Small deposit (5-10%) held in wallet
   - Released on completion
   - Reduces no-shows

---

## Migration Instructions

### 1. Run Migration:
```bash
# Apply the migration
supabase db push

# Or manually run:
psql -d your_database -f supabase/migrations/28_reserved_status_system.sql
```

### 2. Set Up Cron Job:
```sql
-- Using pg_cron extension
SELECT cron.schedule(
  'auto-recover-reservations',
  '0 * * * *',  -- Every hour
  $$SELECT auto_recover_expired_reservations()$$
);
```

### 3. Test the Flow:
1. Accept an offer
2. Verify listing shows "Reserved" badge
3. Check boosts are still active
4. Wait 48 hours (or manually update `reserved_until`)
5. Verify auto-recovery works

---

## Monitoring

**Key Metrics to Track:**
- Reservation completion rate
- Average time to completion
- Auto-recovery frequency
- Manual cancellation reasons
- Boost ROI during reservations

**Queries:**
```sql
-- Completion rate
SELECT 
  COUNT(CASE WHEN status = 'sold' THEN 1 END) * 100.0 / 
  COUNT(*) as completion_rate
FROM listings
WHERE reservation_count > 0;

-- Active reservations
SELECT COUNT(*) 
FROM listings 
WHERE status = 'reserved';

-- Expiring soon (next hour)
SELECT COUNT(*) 
FROM listings 
WHERE status = 'reserved' 
  AND reserved_until BETWEEN NOW() AND NOW() + INTERVAL '1 hour';
```

---

## Support & Troubleshooting

**Common Issues:**

1. **Reservation not expiring:**
   - Check cron job is running
   - Manually run: `SELECT auto_recover_expired_reservations()`

2. **Boosts stopped during reservation:**
   - Verify status is `reserved` not `sold`
   - Check boost logic respects `reserved` status

3. **Can't cancel reservation:**
   - Verify user is seller or buyer
   - Check listing status is `reserved`

---

## Conclusion

The Reserved Status System provides a balanced approach for Ghana's marketplace:
- **Protects sellers** from losing boost investments
- **Commits buyers** with a clear timeframe
- **Auto-recovers** when deals fall through
- **Builds trust** through transparency
- **Simple** to understand and use

This system significantly improves the user experience while maintaining the flexibility needed for a cash-based marketplace.

---

**Status:** ✅ Implemented
**Version:** 1.0
**Date:** 2025-10-05
