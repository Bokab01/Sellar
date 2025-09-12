# Transaction-Based Review System

This document outlines the refined review system designed specifically for in-person transactions in the Sellar mobile app.

## Overview

The transaction-based review system ensures authentic reviews by tying them to real meetups and transactions. This prevents fake reviews and builds genuine trust in the community.

## Key Features

### 🔐 **Transaction Verification**
- Reviews must be linked to actual transaction records
- Multiple verification levels: unconfirmed, single-confirmed, mutual-confirmed
- QR codes for meetup verification (optional)

### 🛡️ **Trust & Safety**
- Trust scores based on verification signals
- Abuse prevention and reporting system
- Weighted display of verified vs unverified reviews

### 📊 **Enhanced Metrics**
- Separate ratings for confirmed vs all reviews
- Transaction success tracking
- Verification badges and trust indicators

## System Components

### 1. Transaction Creation Flow

#### **Mark as Completed Button**
- Appears in chat conversations
- Creates transaction record linking buyer, seller, and listing
- Captures agreed price, meetup details, and notes

#### **Transaction Confirmation**
- Both parties can confirm the meetup happened
- Creates verification levels:
  - `unconfirmed`: No confirmations
  - `single_confirmed`: One party confirmed
  - `mutual_confirmed`: Both parties confirmed

### 2. Review Creation

#### **Transaction-Based Review Form**
- Requires existing transaction ID
- Shows transaction verification status
- Provides context about the meetup
- Validates reviewer participated in transaction

#### **Review Types**
- `buyer_to_seller`: Buyer reviewing seller
- `seller_to_buyer`: Seller reviewing buyer
- One review per transaction per participant

### 3. Review Display

#### **Enhanced Review Cards**
- Verification status badges
- Trust score indicators
- Transaction value context
- Helpful/unhelpful voting

#### **Verification Levels**
- **Verified Transaction** (Green): Both parties confirmed
- **Partially Verified** (Yellow): One party confirmed  
- **Unverified** (Gray): No confirmations

### 4. Trust Metrics

#### **Trust Score Calculation (0-100)**
- Phone verification: +20 points
- Email verification: +10 points
- ID verification: +30 points
- Successful transactions: +2 each (max 20)
- Reviews given: +1 each (max 10)
- Account age: +1 per 30 days (max 10)

#### **Trust Levels**
- **80-100**: Highly Trusted
- **60-79**: Trusted
- **40-59**: Developing Trust
- **0-39**: New User

### 5. Abuse Prevention

#### **Review Requirements**
- Must have participated in actual transaction
- Transaction record must exist
- One review per transaction per user
- Minimum comment length (10 characters)

#### **Reporting System**
- Flag inappropriate reviews
- Multiple report categories
- Moderation workflow
- False report penalties

## Database Schema

### Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    buyer_id UUID REFERENCES profiles(id),
    seller_id UUID REFERENCES profiles(id),
    listing_id UUID REFERENCES listings(id),
    conversation_id UUID REFERENCES conversations(id),
    
    status TEXT DEFAULT 'pending',
    confirmed_by UUID[],
    agreed_price DECIMAL(12,2),
    
    buyer_confirmed_at TIMESTAMPTZ,
    seller_confirmed_at TIMESTAMPTZ,
    
    verification_code TEXT,
    meetup_location TEXT,
    meetup_time TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enhanced Reviews Table
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY,
    reviewer_id UUID REFERENCES profiles(id),
    reviewed_user_id UUID REFERENCES profiles(id),
    transaction_id UUID REFERENCES transactions(id), -- REQUIRED
    listing_id UUID REFERENCES listings(id),
    
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT CHECK (LENGTH(comment) >= 10),
    review_type TEXT CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer')),
    
    is_transaction_confirmed BOOLEAN DEFAULT false,
    verification_level TEXT DEFAULT 'unconfirmed',
    reviewer_verification_score INTEGER DEFAULT 0,
    transaction_value DECIMAL(12,2),
    
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(transaction_id, reviewer_id)
);
```

### User Verification Signals
```sql
CREATE TABLE user_verification_signals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    id_document_verified BOOLEAN DEFAULT false,
    
    successful_transactions INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 0,
    account_age_days INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## UI/UX Implementation

### Profile Display

#### **Trust Metrics Section**
```typescript
<TrustMetricsDisplay 
  metrics={userTrustMetrics}
  variant="full"
  showDetails={true}
/>
```

#### **Review Summary**
- Total reviews vs confirmed reviews
- Separate ratings for all vs verified reviews
- Trust score and verification badges

### Chat Integration

#### **Transaction Completion**
```typescript
<TransactionCompletionButton
  conversationId={conversationId}
  otherUser={otherUser}
  listing={listing}
  onTransactionCreated={handleTransactionCreated}
/>
```

#### **Review Prompt**
- Appears after transaction confirmation
- Links directly to transaction-based review form
- Shows verification status

### Review Display

#### **Enhanced Review Cards**
```typescript
<EnhancedReviewCard
  review={review}
  showTransactionDetails={true}
  onHelpfulVote={handleHelpfulVote}
  onReport={handleReport}
/>
```

#### **Verification Indicators**
- Green dot for verified transactions
- Verification level badges
- Trust score indicators
- Transaction value context

## Review Triggers & Confirmation Logic

### Lightweight Option (Current Implementation)
1. **Chat-based completion**: "Mark as Completed" button in chat
2. **One-sided confirmation**: Either party can create transaction
3. **Optional mutual confirmation**: Both parties can confirm for full verification
4. **Review eligibility**: Can review after transaction creation

### Stricter Option (Future Enhancement)
1. **QR code check-in**: Generate unique codes for meetups
2. **Location verification**: GPS-based meetup confirmation
3. **Time-based windows**: Reviews only allowed within 48 hours
4. **Mutual requirement**: Both parties must confirm before reviews

### Confirmation States

#### ✅ **Confirmed Transactions**
- Both parties confirmed meetup
- Reviews marked as "Verified Transaction"
- Higher weight in rating calculations
- Prominent display in profile

#### ⚠️ **Unconfirmed Transactions**
- Only one or no confirmations
- Reviews marked as "Partially Verified" or "Unverified"
- Lower weight in calculations
- Clearly labeled in display

## Abuse Prevention Rules

### Review Validation
1. **Transaction requirement**: Must link to valid transaction
2. **Participation check**: Reviewer must be buyer or seller
3. **Uniqueness**: One review per transaction per user
4. **Content moderation**: Minimum length, appropriate language

### Trust Signals
1. **Verification levels**: Phone, email, ID verification
2. **Activity patterns**: Regular transactions, consistent behavior
3. **Community feedback**: Helpful votes, report history
4. **Account age**: Longer accounts have higher trust

### Reporting & Moderation
1. **Multiple report categories**: Spam, fake, inappropriate, harassment
2. **Automated flagging**: Suspicious patterns, duplicate content
3. **Human review**: Moderation team for complex cases
4. **Penalties**: Account restrictions for violations

## Implementation Benefits

### For Users
- **Authentic reviews**: Only from real transactions
- **Trust indicators**: Clear verification signals
- **Fair representation**: Weighted by transaction confirmation
- **Abuse protection**: Robust reporting and moderation

### For Platform
- **Quality control**: Higher review authenticity
- **Trust building**: Verified transaction history
- **Fraud prevention**: Harder to fake reviews
- **Community health**: Self-regulating ecosystem

## Usage Examples

### Creating a Transaction
```typescript
// In chat screen
const handleMarkCompleted = () => {
  setShowCompletionModal(true);
};

// Transaction completion modal
<TransactionCompletionModal
  visible={showCompletionModal}
  onClose={() => setShowCompletionModal(false)}
  conversationId={conversationId}
  otherUser={otherUser}
  listing={listing}
  onTransactionCreated={handleTransactionCreated}
/>
```

### Writing a Review
```typescript
// After transaction confirmation
<TransactionBasedReviewForm
  visible={showReviewForm}
  onClose={() => setShowReviewForm(false)}
  transactionId={transactionId}
  reviewedUserId={otherUserId}
  reviewedUserName={otherUserName}
  onSuccess={handleReviewSuccess}
/>
```

### Displaying Reviews
```typescript
// Enhanced review display
<EnhancedReviewCard
  review={review}
  showTransactionDetails={true}
  onHelpfulVote={handleHelpfulVote}
  onReport={handleReport}
  onRespond={handleRespond}
/>
```

### Profile Trust Metrics
```typescript
// Full trust display
<TrustMetricsDisplay
  metrics={userTrustMetrics}
  variant="full"
  showDetails={true}
/>

// Compact indicator
<TrustIndicator
  trustScore={trustScore}
  verifiedReviews={verifiedReviews}
/>
```

## Migration Strategy

### Phase 1: Foundation
1. Deploy database schema
2. Create transaction tracking
3. Update review requirements

### Phase 2: UI Integration
1. Add completion buttons to chats
2. Update review forms
3. Enhance review display

### Phase 3: Trust Metrics
1. Implement verification signals
2. Add trust score calculations
3. Update profile displays

### Phase 4: Advanced Features
1. QR code verification
2. Location-based confirmation
3. Advanced abuse prevention

## Future Enhancements

### Advanced Verification
- **GPS-based meetup confirmation**
- **Photo verification of meetups**
- **Time-stamped check-ins**
- **Biometric verification**

### Smart Matching
- **Trust-based recommendations**
- **Verification level filtering**
- **Transaction history matching**
- **Risk assessment scoring**

### Analytics & Insights
- **Trust trend analysis**
- **Transaction success rates**
- **Review authenticity metrics**
- **Community health scores**

This transaction-based review system creates a trustworthy environment for in-person trades while maintaining simplicity and user-friendliness.
