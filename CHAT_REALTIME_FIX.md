# Chat Real-Time Subscription Fix

## Problem
Messages were not appearing in real-time in the chat detail screen. Users had to navigate away and back to see new messages.

## Root Cause
The `useRealtime` hook had a critical dependency management issue:

1. **Unstable Dependencies**: The `setupChannel` function was included in the `useEffect` cleanup dependencies
2. **Recreation Loop**: `setupChannel` depended on `reconnectChannel`, which depended on `table` and `filter`
3. **Premature Cleanup**: When dependencies changed, the effect would clean up the channel and try to recreate it, but the check `if (channelRef.current)` would prevent re-subscription
4. **Missing Logs**: There was no visibility into what was happening with the subscriptions

## Solution Applied

### 1. Stabilized Functions Using Refs
- Moved `table` and `filter` values to refs (`tableRef`, `filterRef`)
- Made `setupChannel` and `reconnectChannel` stable functions with minimal dependencies
- Functions now read current values from refs instead of capturing them in closures

### 2. Fixed useEffect Dependencies
```typescript
// Before:
}, [table, filter, setupChannel]);  // setupChannel was causing re-runs

// After:
}, [table, filter]);  // Only re-run when table/filter actually change
```

### 3. Added Comprehensive Logging
All subscription events now log:
- ✅ Channel creation
- ✅ Subscription status (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED)
- ✅ Message/event reception
- ✅ Reconnection attempts
- ✅ Cleanup operations

## How to Test

### 1. Check Console Logs
When you open a chat, you should see:
```
🔗 Setting up chat real-time for conversation: <id>
🔗 Initializing realtime for table: messages
🔗 Creating new channel: realtime-messages-<timestamp>-<id> with filter: conversation_id=eq.<id>
✅ Successfully subscribed to messages changes
```

### 2. Send a Message from Another Device/User
- Open the chat on Device A
- Send a message from Device B (or another user)
- The message should appear immediately on Device A without any manual refresh
- You should see in console:
```
🔗 messages event received: INSERT {payload}
🔗 Real-time message insert received: {message}
🔗 Fetched complete message data: {complete data}
```

### 3. Test Reconnection
- Put app in background
- Wait 30 seconds
- Bring app back to foreground
- You should see:
```
🔗 App became active, checking channel state for messages
🔗 Current channel state: joined
```

## Files Modified
- `hooks/useRealtime.ts` - Fixed subscription lifecycle management

## Benefits
1. ✅ **Real-time updates** - Messages appear instantly
2. ✅ **Stable subscriptions** - No premature cleanup
3. ✅ **Better debugging** - Comprehensive logging
4. ✅ **Reconnection handling** - Auto-reconnects on app resume
5. ✅ **Performance** - Avoids unnecessary re-subscriptions

