import { useState, useEffect, useRef, useCallback } from 'react';
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

// Type-safe notification data interfaces
export interface BaseNotificationData {
  type: string;
  timestamp?: number;
}

export interface MessageNotificationData extends BaseNotificationData {
  type: 'message';
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
}

export interface OfferNotificationData extends BaseNotificationData {
  type: 'offer' | 'offer_accepted' | 'offer_rejected' | 'offer_countered';
  listing_id?: string;
  conversation_id?: string;
  offer_id: string;
  amount?: number;
}

export interface CommunityNotificationData extends BaseNotificationData {
  type: 'like' | 'comment' | 'follow';
  post_id?: string;
  user_id?: string;
  comment_id?: string;
}

export interface SystemNotificationData extends BaseNotificationData {
  type: 'system' | 'feature_expired' | 'listing';
  listing_id?: string;
  feature_type?: string;
}

export type NotificationData = 
  | MessageNotificationData 
  | OfferNotificationData 
  | CommunityNotificationData 
  | SystemNotificationData;

export function usePushNotifications() {
  const { user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false); // Prevent double initialization
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3); // Maximum retry attempts

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const appStateListener = useRef<any>(null);
  const tokenRefreshListener = useRef<Notifications.Subscription | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if current time is within quiet hours
   */
  const isInQuietHours = useCallback(() => {
    if (!preferences?.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quiet_start_time.split(':').map(Number);
    const [endHour, endMin] = preferences.quiet_end_time.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    return currentTime >= startTime && currentTime <= endTime;
  }, [preferences]);

  /**
   * Validate notification data type safety
   */
  const validateNotificationData = (data: any): data is NotificationData => {
    return data && typeof data.type === 'string';
  };

  /**
   * Initialize push notifications when user logs in - with double initialization prevention
   */
  useEffect(() => {
    if (user && !isInitialized && !isInitializing && retryCount < maxRetries) {
      initializePushNotifications();
    } else if (!user && (isInitialized || isInitializing)) {
      cleanup();
    }
  }, [user, isInitialized, isInitializing, retryCount, maxRetries]);

  /**
   * Set up app state listener to handle background/foreground transitions
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user && isInitialized) {
        // App came to foreground, update badge count and check for token refresh
        updateBadgeCount();
        checkTokenRefresh();
      } else if (nextAppState === 'background') {
        // App went to background, handle any cleanup if needed
        console.log('App went to background');
      }
    };

    // Clean up existing listener before adding new one
    if (appStateListener.current) {
      appStateListener.current.remove();
    }

    appStateListener.current = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (appStateListener.current) {
        appStateListener.current.remove();
        appStateListener.current = null;
      }
    };
  }, [user, isInitialized]);

  /**
   * Initialize push notification system with improved error handling and double initialization prevention
   */
  const initializePushNotifications = async () => {
    if (!user || isInitializing || isInitialized || retryCount >= maxRetries) {
      console.log('Skipping initialization:', { 
        user: !!user, 
        isInitializing, 
        isInitialized, 
        retryCount, 
        maxRetries 
      });
      return;
    }

    try {
      setIsInitializing(true);
      setLoading(true);
      setError(null);

      // Set timeout to prevent hanging initialization
      initializationTimeoutRef.current = setTimeout(() => {
        console.warn('Push notification initialization timeout');
        setError('Initialization timeout');
        setIsInitializing(false);
        setLoading(false);
        setRetryCount(prev => prev + 1);
      }, 30000) as any; // 30 second timeout

      console.log(`Initializing push notifications for user: ${user.id} (attempt ${retryCount + 1}/${maxRetries})`);

      // Initialize push notification service
      const success = await pushNotificationService.initialize(user.id);
      
      if (success) {
        const token = await pushNotificationService.getPushToken();
        setPushToken(token);
        setHasPermission(true);

        // Load user preferences first
        await loadNotificationPreferences();

        // Set up notification listeners
        setupNotificationListeners();

        // Set up token refresh listener
        setupTokenRefreshListener();

        // Update badge count
        await updateBadgeCount();

        setIsInitialized(true);
        setRetryCount(0); // Reset retry count on success
        console.log('Push notifications initialized successfully');
      } else {
        setHasPermission(false);
        setError('Failed to initialize push notifications - permission denied');
        setRetryCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error initializing push notifications:', err);
      setError(`Failed to initialize push notifications: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setRetryCount(prev => prev + 1);
      
      // If we've exceeded max retries, disable push notifications temporarily
      if (retryCount + 1 >= maxRetries) {
        console.warn('Push notification initialization failed after maximum retries. Disabling push notifications temporarily.');
        setError('Push notifications disabled due to repeated failures. Please restart the app to try again.');
      }
    } finally {
      // Clear timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      
      setIsInitializing(false);
      setLoading(false);
    }
  };

  /**
   * Set up notification event listeners with improved error handling
   */
  const setupNotificationListeners = () => {
    try {
      // Clean up existing listeners
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }

      // Handle notifications received while app is in foreground
      notificationListener.current = pushNotificationService.addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received in foreground:', notification);
          
          // Check quiet hours before showing in-app notification
          if (isInQuietHours()) {
            console.log('Notification received during quiet hours, suppressing display');
            return;
          }

          // Handle foreground notification display based on preferences
          handleForegroundNotification(notification);
        }
      );

      // Handle notification responses (user tapped notification)
      responseListener.current = pushNotificationService.addNotificationResponseReceivedListener(
        (response) => {
          console.log('Notification response:', response);
          try {
            handleNotificationResponse(response);
          } catch (error) {
            console.error('Error handling notification response:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up notification listeners:', error);
    }
  };

  /**
   * Set up token refresh listener
   */
  const setupTokenRefreshListener = () => {
    try {
      if (tokenRefreshListener.current) {
        tokenRefreshListener.current.remove();
      }

      // Listen for token refresh events
      tokenRefreshListener.current = Notifications.addPushTokenListener(async (tokenData) => {
        console.log('Push token refreshed:', tokenData.data);
        
        if (tokenData.data !== pushToken) {
          setPushToken(tokenData.data);
          
          // Update token on server
          if (user) {
            try {
              // Note: This would need to be implemented in pushNotificationService
              // await pushNotificationService.updatePushToken(user.id, tokenData.data);
              console.log('Push token updated locally, server update needed');
            } catch (error) {
              console.error('Failed to update push token on server:', error);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error setting up token refresh listener:', error);
    }
  };

  /**
   * Handle foreground notifications with quiet hours and preferences
   */
  const handleForegroundNotification = (notification: Notifications.Notification) => {
    const data = notification.request.content.data;
    
    if (!validateNotificationData(data)) {
      console.warn('Invalid notification data received');
      return;
    }

    // Check if this type of notification is enabled
    if (!isNotificationTypeEnabled(data.type)) {
      console.log(`Notification type ${data.type} is disabled in preferences`);
      return;
    }

    // Show custom in-app notification or use system notification
    // This could be expanded to show custom UI components
    console.log('Showing foreground notification:', notification.request.content.title);
  };

  /**
   * Check if notification type is enabled in user preferences
   */
  const isNotificationTypeEnabled = (type: string): boolean => {
    if (!preferences) return true; // Default to enabled if no preferences

    switch (type) {
      case 'message':
        return preferences.messages_enabled;
      case 'offer':
      case 'offer_accepted':
      case 'offer_rejected':
      case 'offer_countered':
        return preferences.offers_enabled;
      case 'like':
      case 'comment':
      case 'follow':
        return preferences.community_enabled;
      case 'system':
      case 'feature_expired':
      case 'listing':
        return preferences.system_enabled;
      default:
        return true;
    }
  };

  /**
   * Check for token refresh
   */
  const checkTokenRefresh = async () => {
    if (!user) return;

    try {
      const currentToken = await pushNotificationService.getPushToken();
      if (currentToken && currentToken !== pushToken) {
        console.log('Token refresh detected');
        setPushToken(currentToken);
        // Note: This would need to be implemented in pushNotificationService
        // await pushNotificationService.updatePushToken(user.id, currentToken);
      }
    } catch (error) {
      console.error('Error checking token refresh:', error);
    }
  };

  /**
   * Handle notification tap/response with type safety
   */
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    if (!validateNotificationData(data)) {
      console.warn('Invalid notification data in response');
      router.push('/notifications');
      return;
    }

    console.log('Handling notification response for type:', data.type);

    try {
      // Navigate based on notification type and data with type safety
      switch (data.type) {
        case 'message': {
          const messageData = data as MessageNotificationData;
          if (messageData.conversation_id) {
            router.push(`/chat-detail/${messageData.conversation_id}` as any);
          } else {
            router.push('/(tabs)/inbox');
          }
          break;
        }
        
        case 'offer':
        case 'offer_accepted':
        case 'offer_rejected':
        case 'offer_countered': {
          const offerData = data as OfferNotificationData;
          if (offerData.listing_id) {
            router.push(`/(tabs)/home/${offerData.listing_id}` as any);
          } else if (offerData.conversation_id) {
            router.push(`/chat-detail/${offerData.conversation_id}` as any);
          } else {
            router.push('/(tabs)/inbox');
          }
          break;
        }
        
        case 'like':
        case 'comment': {
          const communityData = data as CommunityNotificationData;
          if (communityData.post_id) {
            router.push(`/(tabs)/community/${communityData.post_id}` as any);
          } else {
            router.push('/(tabs)/community');
          }
          break;
        }
        
        case 'follow': {
          const followData = data as CommunityNotificationData;
          if (followData.user_id) {
            router.push(`/profile/${followData.user_id}` as any);
          } else {
            router.push('/(tabs)/community');
          }
          break;
        }
        
        case 'listing': {
          const listingData = data as SystemNotificationData;
          if (listingData.listing_id) {
            router.push(`/(tabs)/home/${listingData.listing_id}` as any);
          } else {
            router.push('/(tabs)/home');
          }
          break;
        }
        
        case 'system':
        case 'feature_expired':
          router.push('/notifications');
          break;
        
        default:
          console.warn('Unknown notification type:', (data as any).type);
          router.push('/notifications');
          break;
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
      router.push('/notifications');
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
      // Use consistent property name for read status
      const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;
      
      await pushNotificationService.setBadgeCount(unreadCount);
      console.log(`Badge count updated: ${unreadCount}`);
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
   * Comprehensive cleanup when user logs out
   */
  const cleanup = async () => {
    try {
      console.log('Cleaning up push notifications...');

      // Clear initialization timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }

      // Remove all listeners
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
      if (tokenRefreshListener.current) {
        tokenRefreshListener.current.remove();
        tokenRefreshListener.current = null;
      }
      if (appStateListener.current) {
        appStateListener.current.remove();
        appStateListener.current = null;
      }

      // Unregister token from server
      if (user && pushToken) {
        await pushNotificationService.unregisterToken();
      }

      // Clear badge count
      await pushNotificationService.setBadgeCount(0);

      // Clear all state
      setIsInitialized(false);
      setIsInitializing(false);
      setHasPermission(false);
      setPushToken(null);
      setPreferences(null);
      setError(null);
      setLoading(false);
      setRetryCount(0); // Reset retry count on cleanup

      console.log('Push notifications cleanup completed');
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  };

  return {
    // State
    isInitialized,
    isInitializing,
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
    checkTokenRefresh,
    
    // Utility functions
    isInQuietHours,
    isNotificationTypeEnabled,
    
    // Manual controls
    initializePushNotifications,
    cleanup,
  };
}
