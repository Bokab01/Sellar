-- Cleanup Pending Paystack Transactions
-- Use this to clean up test transactions that never completed

-- ============================================
-- OPTION 1: Mark Old Pending Transactions as Failed
-- ============================================

-- This updates all pending transactions older than 1 hour to 'failed' status
UPDATE paystack_transactions
SET 
    status = 'failed',
    updated_at = NOW(),
    paystack_response = jsonb_build_object(
        'note', 'Marked as failed - transaction abandoned',
        'cleaned_up_at', NOW()
    )
WHERE 
    status = 'pending' 
    AND created_at < NOW() - INTERVAL '1 hour'
RETURNING 
    reference, 
    status, 
    created_at,
    'Updated to failed' as action;


-- ============================================
-- OPTION 2: Delete Old Pending Transactions
-- ============================================

-- Uncomment to DELETE instead of marking as failed
/*
DELETE FROM paystack_transactions
WHERE 
    status = 'pending' 
    AND created_at < NOW() - INTERVAL '1 hour'
RETURNING 
    reference, 
    created_at,
    'Deleted' as action;
*/


-- ============================================
-- OPTION 3: View All Pending Transactions
-- ============================================

SELECT 
    reference,
    status,
    amount,
    currency,
    purchase_type,
    purchase_id,
    user_id,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_old
FROM paystack_transactions
WHERE status = 'pending'
ORDER BY created_at DESC;


-- ============================================
-- OPTION 4: Mark Specific Transactions as Failed
-- ============================================

-- Uncomment and add specific references to update
/*
UPDATE paystack_transactions
SET 
    status = 'failed',
    updated_at = NOW(),
    paystack_response = jsonb_build_object(
        'note', 'Manually marked as failed - test transaction'
    )
WHERE reference IN (
    'test_1759912678186',
    'diag_1759912673721',
    'diag_1759912650226',
    'sellar_1759911944006_7rgu4cgbsow',
    'sellar_1759910958870_cvhxmh4ryu9'
)
RETURNING reference, status;
*/


-- ============================================
-- OPTION 5: Delete Specific Transactions
-- ============================================

-- Uncomment to delete the specific test transactions you showed
/*
DELETE FROM paystack_transactions
WHERE reference IN (
    'test_1759912678186',
    'diag_1759912673721',
    'diag_1759912650226',
    'sellar_1759911944006_7rgu4cgbsow',
    'sellar_1759910958870_cvhxmh4ryu9'
)
RETURNING reference, 'Deleted' as action;
*/


-- ============================================
-- OPTION 6: View Transaction Summary
-- ============================================

SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM paystack_transactions
GROUP BY status
ORDER BY status;


-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================

/*
RECOMMENDED APPROACH:

1. First, run OPTION 3 to see all pending transactions
2. Then choose:
   - OPTION 1: Mark old pending as failed (keeps history)
   - OPTION 2: Delete old pending (removes from DB)
   - OPTION 4: Mark specific ones as failed
   - OPTION 5: Delete specific ones

NOTES:
- Option 1 is safer (keeps transaction history)
- Option 2/5 permanently deletes (use for test data only)
- Transactions older than 1 hour are considered abandoned
- Successfully completed transactions are not affected
*/

