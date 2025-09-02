import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { pushNotificationService } from '@/lib/pushNotificationService';
import { useAuthStore } from '@/store/useAuthStore';
import { dbHelpers } from '@/lib/supabase';

export interface NotificationPreferences {
  push_enabled: boolean;
  messages_enabled: boolean;
  offers_enabled: boolean;
  community_enabled: boolean;
  system_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_start_time: string;
  quiet_end_time: string;
  instant_notifications: boolean;
  daily_digest: boolean;
  weekly_summary: boolean;
}

export function usePushNotifications() {
  const { user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const appStateListener = useRef<any>();

  /**
   * Initialize push notifications when user logs in
   */
  useEffect(() => {
    if (user && !isInitialized) {
      initializePushNotifications();
    } else if (!user && isInitialized) {
      cleanup();
    }
  }, [user, isInitialized]);

  /**
   * Set up app state listener to handle background/foreground transitions
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user && isInitialized) {
        // App came to foreground, update badge count
        updateBadgeCount();
      }
    };

    appStateListener.current = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (appStateListener.current) {
        appStateListener.current.remove();
      }
    };
  }, [user, isInitialized]);

  /**
   * Initialize push notification system
   */
  const initializePushNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Initialize push notification service
      const success = await pushNotificationService.initialize(user.id);
      
      if (success) {
        const token = await pushNotificationService.getPushToken();
        setPushToken(token);
        setHasPermission(true);
        setIsInitialized(true);

        // Load user preferences
        await loadNotificationPreferences();

        // Set up notification listeners
        setupNotificationListeners();

        // Update badge count
        await updateBadgeCount();

        console.log('Push notifications initialized successfully');
      } else {
        setHasPermission(false);
        setError('Failed to initialize push notifications');
      }
    } catch (err) {
      console.error('Error initializing push notifications:', err);
      setError('Failed to initialize push notifications');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Set up notification event listeners
   */
  const setupNotificationListeners = () => {
    // Handle notifications received while app is in foreground
    notificationListener.current = pushNotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
        // You can show a custom in-app notification here if needed
      }
    );

    // Handle notification responses (user tapped notification)
    responseListener.current = pushNotificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        handleNotificationResponse(response);
      }
    );
  };

  /**
   * Handle notification tap/response
   */
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    if (!data) return;

    // Navigate based on notification type and data
    switch (data.type) {
      case 'message':
        if (data.conversation_id) {
          router.push(`/(tabs)/inbox/${data.conversation_id}`);
        } else {
          router.push('/(tabs)/inbox');
        }
        break;
      
      case 'offer':
      case 'offer_accepted':
      case 'offer_rejected':
      case 'offer_countered':
        if (data.listing_id) {
          router.push(`/(tabs)/home/${data.listing_id}`);
        } else if (data.conversation_id) {
          router.push(`/(tabs)/inbox/${data.conversation_id}`);
        }
        break;
      
      case 'like':
      case 'comment':
        if (data.post_id) {
          router.push(`/(tabs)/community/${data.post_id}`);
        } else {
          router.push('/(tabs)/community');
        }
        break;
      
      case 'follow':
        if (data.user_id) {
          router.push(`/(tabs)/profile/${data.user_id}`);
        }
        break;
      
      case 'listing':
        if (data.listing_id) {
          router.push(`/(tabs)/home/${data.listing_id}`);
        }
        break;
      
      case 'system':
      case 'feature_expired':
        router.push('/(tabs)/notifications');
        break;
      
      default:
        router.push('/(tabs)/notifications');
        break;
    }
  };

  /**
   * Load user notification preferences
   */
  const loadNotificationPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await dbHelpers.getNotificationPreferences(user.id);
      
      if (error) {
        console.error('Failed to load notification preferences:', error);
      } else {
        setPreferences(data);
      }
    } catch (err) {
      console.error('Error loading notification preferences:', err);
    }
  };

  /**
   * Update notification preferences
   */
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;

    try {
      const { data, error } = await dbHelpers.updateNotificationPreferences(
        user.id,
        newPreferences
      );
      
      if (error) {
        console.error('Failed to update notification preferences:', error);
        return false;
      } else {
        setPreferences(data);
        return true;
      }
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      return false;
    }
  };

  /**
   * Update app badge count based on unread notifications
   */
  const updateBadgeCount = async () => {
    if (!user) return;

    try {
      const { data: notifications } = await dbHelpers.getNotifications(user.id, 100);
      const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
      
      await pushNotificationService.setBadgeCount(unreadCount);
    } catch (err) {
      console.error('Error updating badge count:', err);
    }
  };

  /**
   * Request notification permissions
   */
  const requestPermissions = async () => {
    try {
      const hasPermission = await pushNotificationService.requestPermissions();
      setHasPermission(hasPermission);
      
      if (hasPermission && user) {
        await initializePushNotifications();
      }
      
      return hasPermission;
    } catch (err) {
      console.error('Error requesting permissions:', err);
      return false;
    }
  };

  /**
   * Send a test notification
   */
  const sendTestNotification = async () => {
    if (!user) return;

    try {
      await pushNotificationService.scheduleLocalNotification({
        type: 'test',
        title: 'Test Notification',
        body: 'This is a test notification from Sellar!',
        data: { type: 'test' },
      });
    } catch (err) {
      console.error('Error sending test notification:', err);
    }
  };

  /**
   * Clear all notifications
   */
  const clearAllNotifications = async () => {
    try {
      await pushNotificationService.clearAllNotifications();
      await pushNotificationService.setBadgeCount(0);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  /**
   * Cleanup when user logs out
   */
  const cleanup = async () => {
    try {
      // Remove listeners
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }

      // Unregister token
      await pushNotificationService.unregisterToken();

      // Clear state
      setIsInitialized(false);
      setHasPermission(false);
      setPushToken(null);
      setPreferences(null);
      setError(null);
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  };

  return {
    // State
    isInitialized,
    hasPermission,
    pushToken,
    preferences,
    loading,
    error,

    // Actions
    requestPermissions,
    updatePreferences,
    sendTestNotification,
    clearAllNotifications,
    updateBadgeCount,
    loadNotificationPreferences,
  };
}
