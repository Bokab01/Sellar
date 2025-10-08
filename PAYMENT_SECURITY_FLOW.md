# Payment Security Flow Diagram

## 🔐 Secure Payment Flow (With All Protections)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INITIATES PAYMENT                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  1. Mobile App → paystack-initialize Edge Function                       │
│     • Creates paystack_transactions record                               │
│     • Stores: package_id, amount, user_id                               │
│     • Gets authorization_url from Paystack                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  2. User Completes Payment on Paystack                                  │
│     • Enters card details                                               │
│     • Paystack processes payment                                        │
│     • Redirects to callback URL                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │   3a. WEBHOOK PATH        │   │   3b. MANUAL PATH         │
    │   (Preferred, automatic)   │   │   (Fallback, user-click)  │
    └───────────────────────────┘   └───────────────────────────┘
                    │                               │
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │  paystack-webhook         │   │  paystack-verify          │
    │  Edge Function            │   │  Edge Function            │
    └───────────────────────────┘   └───────────────────────────┘
                    │                               │
                    │                               │
                    │  ┌─────────────────────────┐ │
                    └─►│  🛡️ SECURITY CHECKS     │◄┘
                       │                         │
                       │  ✓ User authenticated   │
                       │  ✓ Transaction exists   │
                       │  ✓ Not already processed│
                       │  ✓ Rate limit check     │◄── NEW!
                       │  ✓ Fraud history check  │◄── NEW!
                       │  ✓ Amount validation    │◄── NEW!
                       └─────────────────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      │                           │
                      ▼ PASS                      ▼ FAIL
        ┌─────────────────────────┐   ┌─────────────────────────┐
        │  4. PROCESS PAYMENT     │   │  4. REJECT & FLAG       │
        │                         │   │                         │
        │  • Add credits          │   │  • Mark as fraud        │
        │  • Log transaction      │   │  • Log reason           │
        │  • Update balance       │   │  • Notify user          │
        │  • Send notification    │   │  • Return error         │
        └─────────────────────────┘   └─────────────────────────┘
                      │                           │
                      ▼                           ▼
        ┌─────────────────────────┐   ┌─────────────────────────┐
        │  5. SUCCESS ✅          │   │  5. BLOCKED ❌          │
        │                         │   │                         │
        │  • Credits in account   │   │  • No credits added     │
        │  • Toast notification   │   │  • Error message shown  │
        │  • Navigate back        │   │  • Support notified     │
        └─────────────────────────┘   └─────────────────────────┘
```

---

## 🔒 Security Check Details

### **1. Rate Limit Check** (NEW!)

```
┌─────────────────────────────────────────────────────────┐
│  CHECK: Too many attempts?                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Rule 1: >5 verification attempts in 5 minutes?         │
│          → BLOCK: "Too many attempts"                   │
│                                                         │
│  Rule 2: >10 failed payments in 1 hour?                │
│          → BLOCK: "Suspicious activity"                 │
│                                                         │
│  Rule 3: Any fraud detected in 24 hours?               │
│          → BLOCK: "Account flagged"                     │
│                                                         │
│  ✅ Pass: Continue to amount validation                 │
│  ❌ Fail: Return HTTP 429 (Too Many Requests)           │
└─────────────────────────────────────────────────────────┘
```

---

### **2. Amount Validation** (NEW!)

```
┌─────────────────────────────────────────────────────────┐
│  CHECK: Payment amount matches package?                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Step 1: Get package from transaction.purchase_id       │
│          e.g., "starter" = 50 credits                   │
│                                                         │
│  Step 2: Calculate expected amount                      │
│          e.g., starter = GHS 15 = 1500 pesewas         │
│                                                         │
│  Step 3: Get actual amount from Paystack               │
│          e.g., paystackData.amount = 1500 pesewas      │
│                                                         │
│  Step 4: Compare                                        │
│          if (actual !== expected) {                     │
│            🚨 FRAUD ALERT!                              │
│            Mark transaction as fraud                    │
│            Log: expected vs actual                      │
│            Return error                                 │
│          }                                              │
│                                                         │
│  ✅ Pass: Amounts match → process payment               │
│  ❌ Fail: Amount mismatch → flag as fraud               │
└─────────────────────────────────────────────────────────┘
```

---

### **3. Idempotency Check** (Existing)

```
┌─────────────────────────────────────────────────────────┐
│  CHECK: Already processed?                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  if (transaction.webhook_processed === true) {          │
│    return "Payment already verified"                    │
│  }                                                      │
│                                                         │
│  ✅ Pass: Not processed → continue                      │
│  ✅ Already done: Return cached result (safe)           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Fraud Detection Flow

```
┌─────────────────────────────────────────────────────────┐
│                   FRAUD DETECTED!                       │
└─────────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
  ┌──────────────┐ ┌──────────┐ ┌──────────────┐
  │  Update DB   │ │  Log     │ │  Notify User │
  │              │ │  Details │ │              │
  │ • fraud_     │ │          │ │ • Create     │
  │   detected   │ │ • Amount │ │   notif.     │
  │   = TRUE     │ │   diff   │ │ • "Contact   │
  │              │ │ • Package│ │   support"   │
  │ • fraud_     │ │   ID     │ │              │
  │   reason =   │ │ • User   │ │ • Reference  │
  │   "Amount    │ │   ID     │ │   number     │
  │   mismatch"  │ │ • Time   │ │              │
  │              │ │   stamp  │ │              │
  │ • status =   │ │          │ │              │
  │   'failed'   │ │          │ │              │
  └──────────────┘ └──────────┘ └──────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
          ┌──────────────────────────────┐
          │  Admin Dashboard Alert       │
          │  (Future Enhancement)        │
          │                              │
          │  🚨 Fraud Alert              │
          │  User: user@example.com      │
          │  Amount: GHS 5 vs GHS 15     │
          │  Time: 2025-10-08 14:30      │
          │  Action: Review               │
          └──────────────────────────────┘
```

---

## ⏱️ Transaction Lifecycle with Timeout

```
┌─────────────────────────────────────────────────────────┐
│                   TRANSACTION CREATED                    │
│                   status: 'pending'                      │
│                   created_at: NOW()                      │
└─────────────────────────────────────────────────────────┘
                         │
                         │
                         ▼
            ┌────────────────────────┐
            │  User has 1 hour to    │
            │  complete payment      │
            └────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    ⏰ <1 hour      ⏰ >1 hour     Payment done
          │              │              │
          ▼              ▼              ▼
  ┌──────────────┐ ┌──────────┐ ┌──────────────┐
  │  WAIT        │ │  EXPIRE  │ │  VERIFY      │
  │              │ │          │ │              │
  │  Transaction │ │ Cron job │ │ Webhook or   │
  │  stays       │ │ runs:    │ │ Manual       │
  │  pending     │ │          │ │ verification │
  │              │ │ UPDATE   │ │              │
  │              │ │ status = │ │ Process      │
  │              │ │ 'expired'│ │ payment      │
  └──────────────┘ └──────────┘ └──────────────┘
                         │              │
                         ▼              ▼
                   ┌──────────┐   ┌──────────┐
                   │ CLEANUP  │   │ SUCCESS  │
                   │          │   │          │
                   │ • DB     │   │ • Credits│
                   │   clean  │   │   added  │
                   │ • No     │   │ • User   │
                   │   credits│   │   happy  │
                   └──────────┘   └──────────┘
```

---

## 📊 Database State Tracking

```
paystack_transactions table:

┌─────────────┬──────────┬───────────┬──────────────┬──────────┐
│  reference  │  status  │ fraud_    │ verification │ webhook_ │
│             │          │ detected  │ _attempts    │ processed│
├─────────────┼──────────┼───────────┼──────────────┼──────────┤
│ sellar_001  │ success  │   false   │      1       │   true   │ ✅
│ sellar_002  │ failed   │   true    │      3       │   false  │ ❌ FRAUD
│ sellar_003  │ expired  │   false   │      0       │   false  │ ⏰
│ sellar_004  │ pending  │   false   │      2       │   false  │ ⏳
│ sellar_005  │ success  │   false   │      1       │   true   │ ✅
└─────────────┴──────────┴───────────┴──────────────┴──────────┘

Legend:
✅ = Successful, credits added
❌ = Fraud detected, blocked
⏰ = Expired, auto-cleaned
⏳ = Pending, awaiting verification
```

---

## 🎯 Attack Prevention Matrix

```
┌────────────────────────┬──────────────────┬───────────────────┐
│  Attack Type           │  Prevention      │  Detection        │
├────────────────────────┼──────────────────┼───────────────────┤
│  Amount Manipulation   │  ✅ Validate     │  ✅ Log & flag    │
│                        │     server-side  │                   │
├────────────────────────┼──────────────────┼───────────────────┤
│  Verification Spam     │  ✅ Rate limit   │  ✅ Track attempts│
│                        │     5/5min       │                   │
├────────────────────────┼──────────────────┼───────────────────┤
│  Replay Attack         │  ✅ Idempotency  │  ✅ Already       │
│                        │     check        │     processed flag│
├────────────────────────┼──────────────────┼───────────────────┤
│  Fake Transaction      │  ✅ RLS policies │  ✅ Service role  │
│  Injection             │                  │     only          │
├────────────────────────┼──────────────────┼───────────────────┤
│  Stale Transaction     │  ✅ 1-hour       │  ✅ Expire status │
│  Accumulation          │     timeout      │                   │
├────────────────────────┼──────────────────┼───────────────────┤
│  Duplicate Credit      │  ✅ webhook_     │  ✅ Transaction   │
│  Addition              │     processed    │     log           │
│                        │     flag         │                   │
└────────────────────────┴──────────────────┴───────────────────┘
```

---

## 💡 Security Layers

```
        ┌────────────────────────────────────────┐
        │  Layer 7: Monitoring & Alerts          │ 📊
        │  • Security metrics dashboard          │
        │  • Fraud detection reports             │
        └────────────────────────────────────────┘
                         │
        ┌────────────────────────────────────────┐
        │  Layer 6: Audit Trail                  │ 📝
        │  • All transactions logged             │
        │  • Verification attempts tracked       │
        └────────────────────────────────────────┘
                         │
        ┌────────────────────────────────────────┐
        │  Layer 5: Timeout & Cleanup            │ ⏰
        │  • 1-hour transaction expiration       │
        │  • Automatic cleanup via cron          │
        └────────────────────────────────────────┘
                         │
        ┌────────────────────────────────────────┐
        │  Layer 4: Fraud Detection              │ 🚨
        │  • Amount validation                   │
        │  • Pattern detection                   │
        └────────────────────────────────────────┘
                         │
        ┌────────────────────────────────────────┐
        │  Layer 3: Rate Limiting                │ ⚡
        │  • 5 attempts / 5 minutes              │
        │  • Fraud history check                 │
        └────────────────────────────────────────┘
                         │
        ┌────────────────────────────────────────┐
        │  Layer 2: Idempotency                  │ 🔄
        │  • Duplicate prevention                │
        │  • Webhook processed flag              │
        └────────────────────────────────────────┘
                         │
        ┌────────────────────────────────────────┐
        │  Layer 1: Authentication & Authorization│ 🔐
        │  • JWT token validation                │
        │  • Row Level Security (RLS)            │
        └────────────────────────────────────────┘
                         │
                ┌────────────────┐
                │  💰 PAYMENT    │
                └────────────────┘
```

---

## ✅ Complete Protection

Your payment system now has **7 layers of security**:

1. ✅ **Authentication** - Only authorized users
2. ✅ **Idempotency** - No duplicate processing
3. ✅ **Rate Limiting** - No spam attacks
4. ✅ **Fraud Detection** - Amount validation
5. ✅ **Timeout** - No stale transactions
6. ✅ **Audit Trail** - Complete logging
7. ✅ **Monitoring** - Real-time metrics

Every transaction must pass through all 7 layers! 🛡️

