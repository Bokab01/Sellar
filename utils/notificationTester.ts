import { notificationService } from '@/lib/notificationService';
import { pushNotificationService } from '@/lib/pushNotificationService';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Utility for testing notification functionality
 */
export class NotificationTester {
  /**
   * Test basic push notification setup
   */
  static async testPushNotificationSetup(): Promise<boolean> {
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        console.error('❌ No authenticated user for notification test');
        return false;
      }

      console.log('🧪 Testing push notification setup...');
      
      // Initialize push notifications
      const initialized = await pushNotificationService.initialize(user.id);
      
      if (!initialized) {
        console.error('❌ Failed to initialize push notifications');
        return false;
      }

      console.log('✅ Push notification setup successful');
      return true;
    } catch (error) {
      console.error('❌ Push notification setup failed:', error);
      return false;
    }
  }

  /**
   * Test sending a simple notification
   */
  static async testSendNotification(): Promise<boolean> {
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        console.error('❌ No authenticated user for notification test');
        return false;
      }

      console.log('🧪 Testing notification sending...');

      await notificationService.sendSystemNotification(
        [user.id],
        'Test Notification 🧪',
        'This is a test notification to verify the system is working correctly.',
        {
          test: true,
          timestamp: new Date().toISOString(),
        }
      );

      console.log('✅ Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      return false;
    }
  }

  /**
   * Test message notification
   */
  static async testMessageNotification(recipientId: string): Promise<boolean> {
    try {
      console.log('🧪 Testing message notification...');

      await notificationService.sendMessageNotification(
        recipientId,
        'Test User',
        'This is a test message notification',
        'test-conversation-id'
      );

      console.log('✅ Message notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send message notification:', error);
      return false;
    }
  }

  /**
   * Test offer notification
   */
  static async testOfferNotification(recipientId: string): Promise<boolean> {
    try {
      console.log('🧪 Testing offer notification...');

      await notificationService.sendOfferNotification(
        recipientId,
        'new',
        {
          buyerName: 'Test Buyer',
          listingTitle: 'Test Item',
          amount: 100,
          currency: 'GHS',
          offerId: 'test-offer-id',
          listingId: 'test-listing-id',
        }
      );

      console.log('✅ Offer notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send offer notification:', error);
      return false;
    }
  }

  /**
   * Run comprehensive notification system test
   */
  static async runFullTest(): Promise<{
    setup: boolean;
    send: boolean;
    message: boolean;
    offer: boolean;
    overall: boolean;
  }> {
    console.log('🧪 Starting comprehensive notification system test...');

    const results = {
      setup: false,
      send: false,
      message: false,
      offer: false,
      overall: false,
    };

    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        console.error('❌ No authenticated user for comprehensive test');
        return results;
      }

      // Test 1: Setup
      results.setup = await this.testPushNotificationSetup();
      
      // Test 2: Basic sending
      results.send = await this.testSendNotification();
      
      // Test 3: Message notification
      results.message = await this.testMessageNotification(user.id);
      
      // Test 4: Offer notification
      results.offer = await this.testOfferNotification(user.id);

      // Overall result
      results.overall = results.setup && results.send && results.message && results.offer;

      console.log('🧪 Notification system test results:', results);

      if (results.overall) {
        console.log('✅ All notification tests passed!');
      } else {
        console.log('❌ Some notification tests failed. Check individual results.');
      }

      return results;
    } catch (error) {
      console.error('❌ Comprehensive notification test failed:', error);
      return results;
    }
  }

  /**
   * Test notification preferences
   */
  static async testNotificationPreferences(): Promise<boolean> {
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        console.error('❌ No authenticated user for preferences test');
        return false;
      }

      console.log('🧪 Testing notification preferences...');

      // This will test if the RPC functions work
      const { dbHelpers } = await import('@/lib/supabase');
      
      // Try to get preferences
      const { data: preferences, error: getError } = await dbHelpers.getNotificationPreferences(user.id);
      
      if (getError) {
        console.error('❌ Failed to get notification preferences:', getError);
        return false;
      }

      console.log('✅ Retrieved notification preferences:', preferences);

      // Try to update preferences
      const testPreferences = {
        push_enabled: true,
        messages_push: true,
        offers_push: true,
        system_push: true,
      };

      const { data: updated, error: updateError } = await dbHelpers.updateNotificationPreferences(
        user.id,
        testPreferences
      );

      if (updateError) {
        console.error('❌ Failed to update notification preferences:', updateError);
        return false;
      }

      console.log('✅ Updated notification preferences:', updated);
      return true;
    } catch (error) {
      console.error('❌ Notification preferences test failed:', error);
      return false;
    }
  }
}

/**
 * Quick test function for development
 */
export const testNotifications = async () => {
  return await NotificationTester.runFullTest();
};

/**
 * Test just the setup
 */
export const testNotificationSetup = async () => {
  return await NotificationTester.testPushNotificationSetup();
};

/**
 * Test preferences system
 */
export const testNotificationPreferences = async () => {
  return await NotificationTester.testNotificationPreferences();
};
