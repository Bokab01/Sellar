# 🎯 Automatic Referral System Test Plan

## **Complete Referral Flow Test**

### **How Users Get Credits for Referrals - AUTOMATIC SYSTEM**

#### **Prerequisites:**
1. Database schema updated with `referral_code` and `referred_by` fields
2. Automatic trigger `auto_process_referral` is active
3. Functions `get_user_by_referral_code` and `process_signup_referral` are deployed

---

## **🔄 Complete Referral Flow:**

### **Step 1: User A Generates Referral Code**
- **User A** opens app → Invite screen
- **Referral Code Generated**: Last 8 characters of User A's ID (uppercase)
- **Example**: If User A's ID is `abc123def456`, code = `DEF456`
- **Invite Link**: `https://sellar.gh/join?ref=DEF456`

### **Step 2: User A Shares Referral**
- **Share Methods**:
  - Copy referral code: `DEF456`
  - Share invite link via WhatsApp/Social media
  - Send pre-written message with both code and link

### **Step 3: User B Clicks Referral Link**
- **URL**: `https://sellar.gh/join?ref=DEF456`
- **App Processing**: 
  - URL parameter `?ref=DEF456` is detected
  - Referral code auto-fills in signup form
  - User B can see the code and modify if needed

### **Step 4: User B Signs Up**
- **Signup Form**: Includes referral code field (pre-filled)
- **User B** completes signup with referral code `DEF456`
- **Database Action**: Profile created with `referral_code = 'DEF456'`

### **Step 5: AUTOMATIC PROCESSING** ⚡
- **Trigger Fires**: `auto_process_referral` trigger executes
- **Lookup**: `get_user_by_referral_code('DEF456')` finds User A
- **Validation**: Checks User A ≠ User B, no existing referrer
- **Credit Award**: `claim_referral_bonus()` executes automatically
- **Result**: 
  - ✅ User A gets +50 credits
  - ✅ User B gets +50 credits  
  - ✅ User B's profile updated: `referred_by = User A's ID`
  - ✅ Credit transactions logged for both users

---

## **🧪 Test Scenarios:**

### **✅ Success Scenario:**
```sql
-- Test: Valid referral code signup
INSERT INTO profiles (id, email, first_name, last_name, referral_code)
VALUES ('new-user-id', 'newuser@test.com', 'Jane', 'Doe', 'ABC12345');

-- Expected Results:
-- 1. User lookup successful
-- 2. 50 credits added to referrer
-- 3. 50 credits added to referee  
-- 4. Profile updated with referred_by
-- 5. Transactions logged
```

### **❌ Error Scenarios:**

#### **1. Invalid Referral Code:**
```sql
-- Test: Non-existent referral code
INSERT INTO profiles (id, email, first_name, last_name, referral_code)
VALUES ('new-user-id', 'test@test.com', 'John', 'Doe', 'INVALID1');

-- Expected: No credits awarded, referral_code cleared
```

#### **2. Self-Referral:**
```sql
-- Test: User tries to refer themselves
-- Expected: "Cannot refer yourself" error
```

#### **3. Already Referred User:**
```sql
-- Test: User already has a referrer
-- Expected: "User already has a referrer" error
```

#### **4. Duplicate Referral Bonus:**
```sql
-- Test: Same referral pair tries to claim bonus twice
-- Expected: "Referral bonus already claimed" error
```

---

## **📊 Verification Queries:**

### **Check Referral Processing:**
```sql
-- Verify user was referred correctly
SELECT 
    p.email,
    p.referral_code,
    p.referred_by,
    r.first_name || ' ' || r.last_name as referrer_name
FROM profiles p
LEFT JOIN profiles r ON p.referred_by = r.id
WHERE p.email = 'newuser@test.com';
```

### **Check Credit Awards:**
```sql
-- Verify both users got credits
SELECT 
    ct.user_id,
    p.first_name || ' ' || p.last_name as name,
    ct.type,
    ct.amount,
    ct.reference_type,
    ct.created_at
FROM credit_transactions ct
JOIN profiles p ON ct.user_id = p.id
WHERE ct.reference_type = 'referral_bonus'
ORDER BY ct.created_at DESC;
```

### **Check Referral Stats:**
```sql
-- Test the referral stats function
SELECT get_referral_stats('referrer-user-id');

-- Expected output:
{
  "totalReferrals": 1,
  "successfulReferrals": 1, 
  "pendingReferrals": 0,
  "totalEarned": 50,
  "recentReferrals": [...]
}
```

---

## **🎯 Key Improvements Made:**

### **Before (Manual System):**
❌ Manual `claimReferralBonus()` call required  
❌ Referrer needed to know referee's exact user ID  
❌ No automatic processing during signup  
❌ No URL parameter handling  
❌ No referral code validation  

### **After (Automatic System):**
✅ **Fully Automatic**: Credits awarded immediately after signup  
✅ **URL Processing**: `?ref=CODE` auto-fills signup form  
✅ **Code Validation**: Invalid codes handled gracefully  
✅ **Duplicate Prevention**: Multiple safeguards against abuse  
✅ **Real-time Stats**: Live referral statistics in invite screen  
✅ **Complete Tracking**: Full referral chain stored in database  

---

## **🚀 User Experience:**

### **For Referrer (User A):**
1. Open app → Invite screen
2. Copy code or share link  
3. **Automatic notification when someone signs up with their code**
4. Credits appear in balance immediately
5. See real-time referral stats

### **For Referee (User B):**
1. Click referral link
2. Signup form pre-filled with referral code
3. Complete signup normally
4. **Welcome bonus of 50 credits automatically added**
5. Can see who referred them in profile

---

## **✅ Success Criteria:**

- ✅ **Referral codes generated automatically**
- ✅ **URL parameters processed correctly**  
- ✅ **Credits awarded automatically after signup**
- ✅ **No manual intervention required**
- ✅ **Duplicate prevention works**
- ✅ **Real-time statistics accurate**
- ✅ **Error handling graceful**

**Result: Users now get credits for referrals AUTOMATICALLY! 🎉**
