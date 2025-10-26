import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  token: string;
  type: 'expo' | 'apns' | 'fcm';
}

export interface NotificationData {
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

class PushNotificationService {
  private pushToken: string | null = null;
  private userId: string | null = null;

  /**
   * Initialize push notifications for the current user
   */
  async initialize(userId: string): Promise<boolean> {
    try {
      this.userId = userId;

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Push notification permissions denied');
        return false;
      }

      // Get push token
      const token = await this.getPushToken();
      if (!token) {
        console.error('Failed to get push token');
        return false;
      }

      // Register token with backend
      await this.registerToken(token, userId);

      console.log('Push notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permissions from user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        // Create specific channels for different notification types
        await this.createNotificationChannels();
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Create Android notification channels for different types
   */
  private async createNotificationChannels(): Promise<void> {
    const channels = [
      {
        id: 'messages',
        name: 'Messages',
        description: 'New chat messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'message_sound',
      },
      {
        id: 'offers',
        name: 'Offers',
        description: 'Offer updates and notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'offer_sound',
      },
      {
        id: 'community',
        name: 'Community',
        description: 'Likes, comments, and follows',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      },
      {
        id: 'system',
        name: 'System',
        description: 'App updates and announcements',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: channel.sound,
      });
    }
  }

  /**
   * Get push token for this device
   */
  async getPushToken(): Promise<string | null> {
    try {
      if (this.pushToken) {
        return this.pushToken;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.warn('Project ID not found. Push notifications will not work in development without EAS configuration.');
        // Return a mock token for development/testing
        if (__DEV__) {
          this.pushToken = 'ExponentPushToken[development-mock-token]';
          return this.pushToken;
        }
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.pushToken = tokenData.data;
      return this.pushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      // Return a mock token for development if there's an error
      if (__DEV__) {
        console.warn('Using mock push token for development');
        this.pushToken = 'ExponentPushToken[development-mock-token]';
        return this.pushToken;
      }
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  async registerToken(token: string, userId: string): Promise<void> {
    try {
      const deviceInfo = {
        token,
        user_id: userId,
        platform: Platform.OS,
        device_name: Device.deviceName || 'Unknown Device',
        device_model: Device.modelName || 'Unknown Model',
        app_version: Constants.expoConfig?.version || '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert device token (update if exists, insert if new)
      const { error } = await supabase
        .from('device_tokens')
        .upsert(deviceInfo, {
          onConflict: 'user_id,platform,token',
        });

      if (error) {
        throw error;
      }

      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Failed to register push token:', error);
      throw error;
    }
  }

  /**
   * Send a push notification to specific users
   */
  async sendPushNotification(
    userIds: string[],
    notification: NotificationData
  ): Promise<void> {
    try {
      // Get device tokens for users
      const { data: deviceTokens, error } = await supabase
        .from('device_tokens')
        .select('token, platform')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (error || !deviceTokens?.length) {
        console.warn('No active device tokens found for users:', userIds);
        return;
      }

      // Prepare notification payload
      const messages = deviceTokens.map(device => ({
        to: device.token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: {
          ...notification.data,
          type: notification.type,
        },
        channelId: this.getChannelId(notification.type),
        priority: 'high' as const, // Ensure notifications are delivered in background
        badge: 1, // Set badge count
        _displayInForeground: true, // Show notification even when app is in foreground (iOS)
      }));

      // Send to Expo push service
      const chunks = this.chunkArray(messages, 100); // Expo recommends max 100 per request
      
      for (const chunk of chunks) {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.error('Failed to send push notification:', result);
        } else {
          console.log('Push notifications sent successfully:', result);
        }
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Get notification channel ID based on type
   */
  private getChannelId(type: string): string {
    switch (type) {
      case 'message':
        return 'messages';
      case 'offer':
      case 'offer_accepted':
      case 'offer_rejected':
      case 'offer_countered':
        return 'offers';
      case 'like':
      case 'comment':
      case 'follow':
        return 'community';
      case 'system':
      case 'feature_expired':
        return 'system';
      default:
        return 'default';
    }
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Handle notification received while app is in foreground
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Handle notification response (user tapped notification)
   */
  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get current badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    notification: NotificationData,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: 'default',
      },
      trigger: trigger || null,
    });
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Unregister device token (on logout)
   */
  async unregisterToken(): Promise<void> {
    try {
      if (!this.userId || !this.pushToken) {
        return;
      }

      const { error } = await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .eq('user_id', this.userId)
        .eq('token', this.pushToken);

      if (error) {
        console.error('Failed to unregister push token:', error);
      } else {
        console.log('Push token unregistered successfully');
      }

      this.pushToken = null;
      this.userId = null;
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
