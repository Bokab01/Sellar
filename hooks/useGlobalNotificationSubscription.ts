import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';

/**
 * Global hook to set up real-time notification subscriptions
 * This ensures the notification counter updates in real-time across the app
 * Similar to usePresence() for online/offline status
 */
export function useGlobalNotificationSubscription() {
  const { user } = useAuthStore();
  const { subscribeToNotifications, unsubscribeFromNotifications } = useNotificationStore();

  useEffect(() => {
    if (user?.id) {
      subscribeToNotifications(user.id);
    } else {
      unsubscribeFromNotifications();
    }

    // Cleanup on unmount or when user changes
    return () => {
      unsubscribeFromNotifications();
    };
  }, [user?.id, subscribeToNotifications, unsubscribeFromNotifications]);
}

