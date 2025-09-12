# Professional Callback Request System

A comprehensive callback request feature that allows buyers to request callbacks from sellers when they have phone numbers in their profiles. The system includes professional notifications, request management, and seller dashboard integration.

## 🎯 **Features**

### **For Buyers**
- **Smart Request Button**: Only shows when seller has phone number
- **Professional Form**: Detailed callback preferences and requirements
- **Request Tracking**: Status updates and notifications
- **Preference Settings**: Time preferences, priority levels, custom messages

### **For Sellers**
- **Dashboard Integration**: Callback requests in seller dashboard
- **Request Management**: Acknowledge, complete, or cancel requests
- **Priority System**: Visual indicators for urgent/high priority requests
- **Direct Calling**: One-tap calling with automatic status updates
- **Analytics**: Request stats and response rates

### **System Features**
- **Duplicate Prevention**: One request per listing per day
- **Auto-Expiry**: Requests expire after 7 days
- **Notification System**: Real-time notifications for all status changes
- **Trust Integration**: Works with existing trust and verification systems

## 🗄️ **Database Schema**

### **callback_requests**
```sql
CREATE TABLE callback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES profiles(id),
    seller_id UUID NOT NULL REFERENCES profiles(id),
    listing_id UUID NOT NULL REFERENCES listings(id),
    
    -- Request details
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'acknowledged', 'completed', 'cancelled', 'expired'
    )),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Contact information
    requester_phone TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    preferred_time TEXT,
    preferred_days TEXT[],
    
    -- Message and context
    message TEXT,
    callback_reason TEXT CHECK (callback_reason IN (
        'general_inquiry', 'price_negotiation', 'product_details', 
        'availability_check', 'meetup_arrangement', 'other'
    )),
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Constraints
    CHECK (requester_id != seller_id),
    UNIQUE(requester_id, listing_id, requested_at::date)
);
```

### **callback_request_notifications**
```sql
CREATE TABLE callback_request_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    callback_request_id UUID NOT NULL REFERENCES callback_requests(id),
    recipient_id UUID NOT NULL REFERENCES profiles(id),
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'new_request', 'request_acknowledged', 'request_completed', 
        'request_cancelled', 'request_reminder', 'request_expired'
    )),
    
    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Status and delivery
    status TEXT DEFAULT 'pending',
    push_sent BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);
```

## 🔧 **Database Functions**

### **create_callback_request**
Creates a new callback request with validation and notifications.

```sql
SELECT create_callback_request(
    p_requester_id := 'user-uuid',
    p_seller_id := 'seller-uuid',
    p_listing_id := 'listing-uuid',
    p_requester_phone := '+1234567890',
    p_requester_name := 'John Doe',
    p_message := 'Interested in this item',
    p_callback_reason := 'general_inquiry',
    p_preferred_time := 'evening',
    p_preferred_days := ARRAY['Monday', 'Tuesday'],
    p_priority := 'normal'
);
```

### **update_callback_request_status**
Updates request status and sends notifications.

```sql
SELECT update_callback_request_status(
    p_request_id := 'request-uuid',
    p_new_status := 'acknowledged',
    p_user_id := 'seller-uuid'
);
```

### **get_seller_callback_requests**
Retrieves callback requests for a seller with filtering.

```sql
SELECT get_seller_callback_requests(
    p_seller_id := 'seller-uuid',
    p_status := 'pending',
    p_limit := 20,
    p_offset := 0
);
```

### **get_callback_request_stats**
Returns comprehensive statistics for both seller and requester perspectives.

```sql
SELECT get_callback_request_stats('user-uuid');
```

## 🎨 **Components**

### **CallbackRequestButton**
Professional button component for listing detail screens.

```typescript
<CallbackRequestButton
  listingId="listing-uuid"
  sellerId="seller-uuid"
  sellerName="John Seller"
  sellerPhone="+1234567890"
  listingTitle="iPhone 13 Pro"
  variant="outline"
  size="md"
/>
```

**Features:**
- Smart visibility (only shows when seller has phone)
- Eligibility checking (prevents duplicate requests)
- Professional modal form with preferences
- Real-time status updates
- Toast notifications

### **CallbackRequestCard**
Management card for seller dashboard.

```typescript
<CallbackRequestCard
  request={callbackRequest}
  onStatusUpdate={() => refresh()}
/>
```

**Features:**
- Priority visual indicators
- One-tap calling functionality
- Status management buttons
- Request details display
- Expiry warnings

## 🔗 **Hooks**

### **useCreateCallbackRequest**
```typescript
const { createCallbackRequest, loading, error } = useCreateCallbackRequest();

await createCallbackRequest({
  seller_id: 'seller-uuid',
  listing_id: 'listing-uuid',
  requester_phone: '+1234567890',
  requester_name: 'John Doe',
  message: 'Interested in this item',
  callback_reason: 'general_inquiry',
  preferred_time: 'evening',
  preferred_days: ['Monday', 'Tuesday'],
  priority: 'normal'
});
```

### **useSellerCallbackRequests**
```typescript
const { 
  requests, 
  loading, 
  error, 
  hasMore, 
  refresh, 
  loadMore 
} = useSellerCallbackRequests({
  status: 'pending',
  limit: 20,
  offset: 0
});
```

### **useCanRequestCallback**
```typescript
const { 
  canRequest, 
  loading, 
  error, 
  existingRequest 
} = useCanRequestCallback(listingId, sellerId);
```

### **useCallbackRequestStats**
```typescript
const { stats, loading, error, refresh } = useCallbackRequestStats();

// stats.as_seller: { total_received, pending, acknowledged, completed, response_rate }
// stats.as_requester: { total_sent, pending_sent, completed_sent, success_rate }
```

## 🚀 **Integration Guide**

### **1. Run Database Migration**
```sql
-- Run this migration:
New_migration/20_callback_requests.sql
```

### **2. Add to Listing Detail Screen**
```typescript
import { CallbackRequestButton } from '@/components';

// In your listing detail screen:
{!isOwnListing && listing.profiles?.phone && (
  <CallbackRequestButton
    listingId={listingId}
    sellerId={listing.user_id}
    sellerName={`${listing.profiles.first_name} ${listing.profiles.last_name}`.trim()}
    sellerPhone={listing.profiles.phone}
    listingTitle={listing.title}
    variant="outline"
    size="md"
  />
)}
```

### **3. Add to Seller Dashboard**
```typescript
import { useSellerCallbackRequests } from '@/hooks/useCallbackRequests';
import { CallbackRequestCard } from '@/components';

const { requests, loading, refresh } = useSellerCallbackRequests({ 
  status: 'pending', 
  limit: 5 
});

{requests.map(request => (
  <CallbackRequestCard
    key={request.id}
    request={request}
    onStatusUpdate={refresh}
  />
))}
```

## 📊 **Analytics & Monitoring**

### **Key Metrics**
- **Request Volume**: Total callback requests per day/week/month
- **Response Rate**: % of requests acknowledged by sellers
- **Completion Rate**: % of acknowledged requests marked complete
- **Priority Distribution**: Breakdown by priority levels
- **Time to Response**: Average time from request to acknowledgment

### **Database Queries**
```sql
-- Daily request volume
SELECT DATE(requested_at) as date, COUNT(*) as requests
FROM callback_requests
WHERE requested_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(requested_at)
ORDER BY date DESC;

-- Seller response rates
SELECT 
  seller_id,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status IN ('acknowledged', 'completed')) as responded,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('acknowledged', 'completed'))::DECIMAL / COUNT(*) * 100, 
    1
  ) as response_rate
FROM callback_requests
GROUP BY seller_id
HAVING COUNT(*) >= 5
ORDER BY response_rate DESC;

-- Priority distribution
SELECT 
  priority,
  COUNT(*) as count,
  ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 1) as percentage
FROM callback_requests
WHERE requested_at >= NOW() - INTERVAL '7 days'
GROUP BY priority
ORDER BY count DESC;
```

## 🛡️ **Security & Abuse Prevention**

### **Request Limits**
- **Daily Limit**: One request per listing per user per day
- **Auto-Expiry**: Requests expire after 7 days
- **Rate Limiting**: Prevent spam requests from same user

### **Validation**
- **Phone Number**: Required and validated format
- **User Authentication**: Must be logged in to create requests
- **Seller Verification**: Only sellers with phone numbers can receive requests
- **Self-Request Prevention**: Users cannot request callbacks from themselves

### **Monitoring**
- **Suspicious Patterns**: Multiple requests from same IP/device
- **Fake Requests**: Requests with invalid phone numbers
- **Spam Detection**: Identical messages across multiple requests

## 🔔 **Notification System**

### **Notification Types**
- **new_request**: Seller receives new callback request
- **request_acknowledged**: Buyer notified seller acknowledged
- **request_completed**: Buyer notified callback completed
- **request_cancelled**: Buyer notified request cancelled
- **request_reminder**: Reminder for pending requests
- **request_expired**: Notification when request expires

### **Delivery Channels**
- **Push Notifications**: Real-time mobile notifications
- **Email**: Professional email notifications
- **SMS**: Optional SMS for urgent requests
- **In-App**: Dashboard notifications and badges

## 🎯 **Best Practices**

### **For Sellers**
1. **Respond Quickly**: Acknowledge requests within 24 hours
2. **Professional Communication**: Use clear, friendly language
3. **Honor Preferences**: Respect buyer's preferred call times
4. **Follow Up**: Mark requests complete after successful calls
5. **Manage Expectations**: Set clear availability in profile

### **For Buyers**
1. **Be Specific**: Provide clear reason for callback
2. **Realistic Timing**: Set reasonable time preferences
3. **Professional Message**: Write clear, respectful messages
4. **Priority Appropriately**: Use urgent/high priority sparingly
5. **Update Contact Info**: Keep phone number current

### **System Administration**
1. **Monitor Response Rates**: Track seller performance
2. **Clean Up Expired**: Regular cleanup of old requests
3. **Analyze Patterns**: Identify popular callback times/reasons
4. **Prevent Abuse**: Monitor for spam or fake requests
5. **User Education**: Provide guidelines for effective use

## 🚀 **Future Enhancements**

### **Planned Features**
- **Scheduled Callbacks**: Allow sellers to schedule specific callback times
- **Video Calls**: Integration with video calling platforms
- **Callback Templates**: Pre-written messages for common scenarios
- **Smart Matching**: AI-powered optimal callback time suggestions
- **Integration APIs**: Connect with external CRM systems

### **Advanced Analytics**
- **Conversion Tracking**: Track callbacks that lead to sales
- **Geographic Analysis**: Callback patterns by location
- **Seasonal Trends**: Identify peak callback periods
- **Success Prediction**: ML models for callback success rates

This professional callback request system enhances buyer-seller communication while maintaining trust and preventing abuse. It's designed to integrate seamlessly with your existing Sellar marketplace infrastructure! 🌟
