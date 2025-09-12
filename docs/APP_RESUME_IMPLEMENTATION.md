# App Resume Implementation

This document describes the implementation of proper background → foreground handling in the Sellar mobile app.

## Overview

The `useAppResume` hook provides comprehensive app lifecycle management with the following features:

- **Automatic Supabase auth session refresh** when app resumes from background
- **Realtime channel reconnection** to ensure live data updates
- **Screen-specific callbacks** with focus detection to prevent duplicate operations
- **Error handling** with automatic redirect to login on auth failures
- **Debouncing** to prevent rapid successive operations
- **Loading state management** for UI feedback

## Implementation Details

### Core Hook: `useAppResume`

Located in `hooks/useAppResume.ts`, this hook handles all background → foreground transitions.

#### Key Features:

1. **Session Management**
   - Automatically checks and refreshes Supabase auth sessions
   - Handles expired tokens and invalid refresh tokens
   - Redirects to login screen on authentication failures

2. **Realtime Reconnection**
   - Reconnects all active Supabase realtime channels
   - Handles connection failures gracefully
   - Provides status feedback for debugging

3. **Focus Detection**
   - Only executes callbacks for currently visible screens
   - Prevents duplicate API calls when multiple screens use the hook
   - Uses React Navigation's `useFocusEffect` for accurate focus tracking

4. **Error Handling**
   - Comprehensive error catching and logging
   - User-friendly error messages
   - Automatic retry mechanisms where appropriate

5. **Performance Optimization**
   - Debouncing to prevent rapid successive calls
   - Global state tracking to avoid duplicate operations
   - Memory-efficient cleanup of listeners

### Usage Example

```typescript
import { useAppResume } from '@/hooks/useAppResume';

export function MyScreen() {
  const { isRefreshing, isReconnecting, error } = useAppResume({
    onResume: async () => {
      console.log('Screen resumed, refreshing data...');
      await refreshMyData();
    },
    refreshSession: true,      // Default: true
    reconnectRealtime: true,   // Default: true
    debounceMs: 1000,         // Default: 1000
    debug: true,              // Default: false
  });

  // Your component logic...
}
```

### Options

- `onResume`: Callback function executed when app resumes (only if screen is focused)
- `refreshSession`: Whether to automatically refresh auth session (default: true)
- `reconnectRealtime`: Whether to reconnect realtime channels (default: true)
- `debounceMs`: Debounce time in milliseconds (default: 1000)
- `debug`: Enable debug logging (default: false)

### Return Values

- `isRefreshing`: Boolean indicating if session refresh is in progress
- `isReconnecting`: Boolean indicating if realtime reconnection is in progress
- `lastResumeTime`: Timestamp of last resume event
- `error`: Error message if any operation failed
- `manualRefresh`: Function to manually trigger resume handling
- `isActive`: Boolean indicating if current screen is focused
- `activeScreensCount`: Number of screens currently using the hook

## Integration

The hook has been integrated into the following screens:

### 1. Chat Screen (`app/(tabs)/inbox/[id].tsx`)
- Refreshes messages when app resumes
- Updates conversation details and user status
- Maintains real-time message synchronization

### 2. Community Screen (`app/(tabs)/community/index.tsx`)
- Refreshes community posts
- Ensures latest content is displayed
- Maintains engagement metrics

### 3. Inbox Screen (`app/(tabs)/inbox/index.tsx`)
- Refreshes conversation list
- Updates unread counts
- Maintains presence information

### 4. Home Screen (`app/(tabs)/home/index.tsx`)
- Refreshes product listings
- Updates user credit balance
- Maintains category counts and filters

## Technical Implementation

### App State Detection

Uses React Native's `AppState` API to detect transitions:

```typescript
const handleAppStateChange = (nextAppState: AppStateStatus) => {
  if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
    // App came to foreground
    handleAppResume();
  }
  appStateRef.current = nextAppState;
};
```

### Session Refresh Logic

```typescript
const refreshAuthSession = async (): Promise<boolean> => {
  // Check current session validity
  const { data: currentSession, error } = await supabase.auth.getSession();
  
  // Refresh if expires within 5 minutes
  if (timeUntilExpiry < 300) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    // Handle success/failure
  }
};
```

### Realtime Reconnection

```typescript
const reconnectRealtimeChannels = async () => {
  const channels = supabase.getChannels();
  
  const reconnectPromises = channels.map(async (channel) => {
    await channel.unsubscribe();
    await new Promise(resolve => setTimeout(resolve, 100));
    return channel.subscribe();
  });
  
  await Promise.allSettled(reconnectPromises);
};
```

### Focus Detection

```typescript
useFocusEffect(
  useCallback(() => {
    isScreenFocusedRef.current = true;
    activeScreens.add(screenId);

    return () => {
      isScreenFocusedRef.current = false;
      activeScreens.delete(screenId);
    };
  }, [])
);
```

## Benefits

1. **Improved User Experience**
   - Always shows fresh data when app resumes
   - Maintains real-time connections
   - Handles authentication seamlessly

2. **Reliability**
   - Automatic error recovery
   - Prevents stale data issues
   - Maintains app security

3. **Performance**
   - Prevents duplicate operations
   - Efficient resource usage
   - Minimal battery impact

4. **Maintainability**
   - Centralized lifecycle management
   - Consistent behavior across screens
   - Easy to extend and modify

## Testing

To test the implementation:

1. **Background/Foreground Testing**
   - Open the app and navigate to any screen
   - Put app in background (home button)
   - Wait a few seconds
   - Return to app
   - Check console logs for resume events

2. **Session Refresh Testing**
   - Manually expire session in Supabase dashboard
   - Put app in background and return
   - Verify automatic redirect to login

3. **Realtime Reconnection Testing**
   - Disconnect network while app is in background
   - Reconnect network and return to app
   - Verify real-time updates resume

4. **Focus Detection Testing**
   - Open multiple screens with the hook
   - Put app in background and return
   - Verify only focused screen's callback executes

## Future Enhancements

1. **Retry Mechanisms**
   - Implement exponential backoff for failed operations
   - Add maximum retry limits

2. **Offline Support**
   - Queue operations when offline
   - Sync when connection restored

3. **Analytics**
   - Track resume events
   - Monitor session refresh success rates

4. **Configuration**
   - Allow per-screen configuration
   - Runtime configuration updates

## Troubleshooting

### Common Issues

1. **Multiple Callbacks Executing**
   - Ensure only one screen is focused
   - Check `activeScreensCount` in hook return

2. **Session Refresh Failures**
   - Check network connectivity
   - Verify Supabase configuration
   - Check token expiration settings

3. **Realtime Not Reconnecting**
   - Verify channels are properly subscribed
   - Check Supabase realtime configuration
   - Monitor connection status

### Debug Mode

Enable debug mode to see detailed logs:

```typescript
const { } = useAppResume({
  debug: true,
  // ... other options
});
```

This will log all operations with the format:
```
[useAppResume:abc123] App state changed: background -> active
[useAppResume:abc123] Handling app resume...
[useAppResume:abc123] Refreshing auth session...
[useAppResume:abc123] Session refreshed successfully
```
