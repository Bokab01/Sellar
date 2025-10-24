# Notification System Fixes

## Issues Fixed

### 1. ✅ Duplicate Notifications
**Problem**: Notifications were being sent twice for the same event.
**Solution**: The duplicate trigger issue was already addressed in migration 46. Ensured all triggers are created only once.

### 2. ✅ Generic "Someone sent you a message" Text
**Problem**: Notification showed "Someone" instead of the actual user's name (e.g., "John Doe").
**Root Cause**: The triggers were using `username` field which doesn't exist in the profiles table. The correct fields are `first_name` and `last_name`.
**Solution**: 
- Updated all notification trigger functions to use `first_name` and `last_name`
- Built proper full names with fallback to "Someone" only if both fields are null
- Updated notification data to include individual name fields
- Improved notification titles (e.g., "New Message from John Doe 💬")

### 3. ✅ Notifications Don't Appear in Real-Time on Notification Screen
**Problem**: When viewing the notifications screen, new notifications didn't appear until navigating away and back.
**Solution**: 
- Added real-time subscription to `useNotificationStore`
- Listens for INSERT, UPDATE, and DELETE events on the `notifications` table
- Automatically updates the UI when new notifications arrive
- Properly manages subscription lifecycle (subscribe on mount, unsubscribe on cleanup)

### 4. ✅ Prevent Notifications During Active Chat
**Problem**: Users receive notifications for messages in conversations they're currently viewing.
**Solution**:
- Added `active_conversation_id` column to `device_tokens` table
- Mobile app sets this when viewing a chat, clears it when leaving
- Notification trigger checks if user is viewing the conversation before creating notification
- If viewing, notification is skipped

## Files Changed

### Database Migrations

1. **`supabase/migrations/fix_active_conversation_notifications.sql`**
   - Adds `active_conversation_id` column to `device_tokens`
   - Updates message notification trigger to respect active conversation

2. **`supabase/migrations/fix_notification_issues.sql`**
   - Fixes all notification triggers to use `first_name` and `last_name`
   - Updates message, comment, follow, and like notifications
   - Ensures no duplicate triggers

### Mobile App

1. **`store/useNotificationStore.ts`**
   - Added real-time subscription methods
   - `subscribeToNotifications(userId)` - Sets up real-time listener
   - `unsubscribeFromNotifications()` - Cleans up subscription
   - Automatically updates state when notifications arrive

2. **`app/notifications.tsx`**
   - Added `useAuthStore` import
   - Calls `subscribeToNotifications()` on mount
   - Calls `unsubscribeFromNotifications()` on unmount
   - Real-time updates now work seamlessly

3. **`app/chat-detail/[id].tsx`**
   - Sets `active_conversation_id` when viewing a chat
   - Clears it when leaving the chat
   - Prevents unnecessary notifications

## How to Deploy

### Step 1: Run Database Migrations

Option A - Using Supabase CLI:
```bash
# Run both migrations
supabase db push
```

Option B - Manual SQL Execution:
1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `fix_active_conversation_notifications.sql`
3. Click "Run"
4. Copy and paste the contents of `fix_notification_issues.sql`
5. Click "Run"

### Step 2: Test the Fixes

#### Test Fix #1 & #2: Proper Names in Notifications
1. Have another user send you a message
2. Check the notification - should show their full name (e.g., "New Message from John Doe 💬")
3. Verify no duplicate notifications appear

#### Test Fix #3: Real-Time Notification Screen
1. Open the notifications screen on your device
2. Have another user send you a message (or like a post, etc.)
3. The notification should appear instantly without refreshing

#### Test Fix #4: No Notifications During Active Chat
1. Open a chat conversation with another user
2. Look for log: `🔕 Set active conversation to prevent notifications`
3. Have them send you a message
4. You should NOT receive a notification
5. Navigate back to inbox
6. Look for log: `🔔 Cleared active conversation, notifications enabled`
7. Have them send another message
8. You SHOULD receive a notification this time

## Technical Details

### Active Conversation Tracking
- When you open a chat: `setActiveConversation(conversationId)`
- When you leave: `clearActiveConversation()`
- Database trigger checks: `device_tokens.active_conversation_id`
- Skips notification if match found

### Real-Time Subscription
- Channel: `notifications-{userId}`
- Events: INSERT, UPDATE, DELETE
- Filter: `user_id=eq.{userId}`
- Updates Zustand store instantly

### Name Formatting
```sql
-- Old (broken):
SELECT username FROM profiles WHERE id = user_id

-- New (works):
SELECT first_name, last_name FROM profiles WHERE id = user_id
full_name := TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
```

## Logs to Watch For

### Successful Active Conversation Setup:
```
🔕 Set active conversation to prevent notifications: [conversation-id]
```

### Successful Notification Clear:
```
🔔 Cleared active conversation, notifications enabled
```

### Real-Time Subscription:
```
🔔 [Store] Setting up real-time subscription for notifications, user: [user-id]
🔔 [Store] Notification subscription status: SUBSCRIBED
```

### New Notification Received:
```
🔔 [Store] Real-time notification received: [notification-data]
🔔 [Store] Updated notifications count: X Unread: Y
```

## Migration Order

These migrations build on existing migrations:
- `46_remove_duplicate_notification_triggers.sql` (already exists)
- `fix_active_conversation_notifications.sql` (NEW)
- `fix_notification_issues.sql` (NEW)

Make sure migration 46 has already been applied before running the new ones.

## Rollback Plan

If something goes wrong:

```sql
-- Rollback active conversation tracking
ALTER TABLE device_tokens DROP COLUMN IF EXISTS active_conversation_id;

-- Restore old message notification function (from migration 46)
-- See migration 46 for the previous version
```

## Notes

- All changes are backward compatible
- Existing notifications remain unchanged
- Real-time subscription automatically reconnects on app resume
- Active conversation tracking works across app restarts
- No breaking changes to API or data structure

---

**Status**: ✅ Ready to Deploy
**Priority**: High (improves user experience significantly)
**Risk Level**: Low (no breaking changes, graceful fallbacks)

