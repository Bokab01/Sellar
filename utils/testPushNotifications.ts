import { notificationService } from '@/lib/notificationService';
import { pushNotificationService } from '@/lib/pushNotificationService';
import { dbHelpers } from '@/lib/supabase';

/**
 * Test script for push notification system
 * Run this to verify that push notifications are working correctly
 */

export interface TestResult {
  test: string;
  success: boolean;
  message: string;
  error?: string;
}

export class PushNotificationTester {
  private results: TestResult[] = [];

  /**
   * Run all push notification tests
   */
  async runAllTests(userId: string): Promise<TestResult[]> {
    this.results = [];

    console.log('🧪 Starting Push Notification Tests...');

    // Test 1: Device Token Registration
    await this.testDeviceTokenRegistration(userId);

    // Test 2: Notification Preferences
    await this.testNotificationPreferences(userId);

    // Test 3: Local Notification
    await this.testLocalNotification();

    // Test 4: Database Notification Creation
    await this.testDatabaseNotificationCreation(userId);

    // Test 5: Push Notification Service
    await this.testPushNotificationService([userId]);

    // Test 6: Notification Service Integration
    await this.testNotificationServiceIntegration(userId);

    // Test 7: Queue Processing
    await this.testQueueProcessing([userId]);

    console.log('✅ Push Notification Tests Complete');
    this.printResults();

    return this.results;
  }

  /**
   * Test device token registration
   */
  private async testDeviceTokenRegistration(userId: string): Promise<void> {
    try {
      const token = await pushNotificationService.getPushToken();
      
      if (token) {
        const { error } = await dbHelpers.registerDeviceToken({
          user_id: userId,
          token,
          platform: 'test',
          device_name: 'Test Device',
          device_model: 'Test Model',
          app_version: '1.0.0',
        });

        if (error) {
          this.addResult('Device Token Registration', false, 'Failed to register token', error.message);
        } else {
          this.addResult('Device Token Registration', true, 'Token registered successfully');
        }
      } else {
        this.addResult('Device Token Registration', false, 'Failed to get push token');
      }
    } catch (error) {
      this.addResult('Device Token Registration', false, 'Test failed', error.message);
    }
  }

  /**
   * Test notification preferences
   */
  private async testNotificationPreferences(userId: string): Promise<void> {
    try {
      // Get preferences
      const { data: preferences, error: getError } = await dbHelpers.getNotificationPreferences(userId);
      
      if (getError) {
        this.addResult('Notification Preferences - Get', false, 'Failed to get preferences', getError.message);
        return;
      }

      this.addResult('Notification Preferences - Get', true, 'Preferences retrieved successfully');

      // Update preferences
      const { error: updateError } = await dbHelpers.updateNotificationPreferences(userId, {
        push_enabled: true,
        messages_enabled: true,
        offers_enabled: true,
      });

      if (updateError) {
        this.addResult('Notification Preferences - Update', false, 'Failed to update preferences', updateError.message);
      } else {
        this.addResult('Notification Preferences - Update', true, 'Preferences updated successfully');
      }
    } catch (error) {
      this.addResult('Notification Preferences', false, 'Test failed', error.message);
    }
  }

  /**
   * Test local notification
   */
  private async testLocalNotification(): Promise<void> {
    try {
      const notificationId = await pushNotificationService.scheduleLocalNotification({
        type: 'test',
        title: 'Test Local Notification',
        body: 'This is a test local notification',
        data: { test: true },
      });

      if (notificationId) {
        this.addResult('Local Notification', true, 'Local notification scheduled successfully');
        
        // Cancel the test notification
        await pushNotificationService.cancelNotification(notificationId);
      } else {
        this.addResult('Local Notification', false, 'Failed to schedule local notification');
      }
    } catch (error) {
      this.addResult('Local Notification', false, 'Test failed', error.message);
    }
  }

  /**
   * Test database notification creation
   */
  private async testDatabaseNotificationCreation(userId: string): Promise<void> {
    try {
      const { data, error } = await dbHelpers.createNotification({
        user_id: userId,
        type: 'test',
        title: 'Test Database Notification',
        body: 'This is a test database notification',
        data: { test: true },
      });

      if (error) {
        this.addResult('Database Notification Creation', false, 'Failed to create notification', error.message);
      } else {
        this.addResult('Database Notification Creation', true, 'Notification created successfully');
      }
    } catch (error) {
      this.addResult('Database Notification Creation', false, 'Test failed', error.message);
    }
  }

  /**
   * Test push notification service
   */
  private async testPushNotificationService(userIds: string[]): Promise<void> {
    try {
      await pushNotificationService.sendPushNotification(userIds, {
        type: 'test',
        title: 'Test Push Notification',
        body: 'This is a test push notification from the service',
        data: { test: true },
      });

      this.addResult('Push Notification Service', true, 'Push notification sent successfully');
    } catch (error) {
      this.addResult('Push Notification Service', false, 'Test failed', error.message);
    }
  }

  /**
   * Test notification service integration
   */
  private async testNotificationServiceIntegration(userId: string): Promise<void> {
    try {
      // Test message notification
      await notificationService.sendMessageNotification(
        userId,
        'Test User',
        'This is a test message',
        'test-conversation-id'
      );

      // Test offer notification
      await notificationService.sendOfferNotification(userId, 'new', {
        buyerName: 'Test Buyer',
        listingTitle: 'Test Item',
        amount: 100,
        currency: 'GHS',
        offerId: 'test-offer-id',
      });

      // Test system notification
      await notificationService.sendSystemNotification(
        [userId],
        'Test System Notification',
        'This is a test system notification'
      );

      this.addResult('Notification Service Integration', true, 'All notification types sent successfully');
    } catch (error) {
      this.addResult('Notification Service Integration', false, 'Test failed', error.message);
    }
  }

  /**
   * Test queue processing
   */
  private async testQueueProcessing(userIds: string[]): Promise<void> {
    try {
      const { data, error } = await dbHelpers.queuePushNotification(
        userIds,
        'Test Queued Notification',
        'This is a test queued notification',
        'test',
        { test: true }
      );

      if (error) {
        this.addResult('Queue Processing', false, 'Failed to queue notification', error.message);
      } else {
        this.addResult('Queue Processing', true, 'Notification queued successfully');
      }
    } catch (error) {
      this.addResult('Queue Processing', false, 'Test failed', error.message);
    }
  }

  /**
   * Add test result
   */
  private addResult(test: string, success: boolean, message: string, error?: string): void {
    this.results.push({ test, success, message, error });
    
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} ${test}: ${message}`);
    
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log('\n📊 Test Results Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.test}: ${r.message}`);
          if (r.error) {
            console.log(`     Error: ${r.error}`);
          }
        });
    }
  }

  /**
   * Test specific notification type
   */
  async testSpecificNotification(
    userId: string,
    type: 'message' | 'offer' | 'community' | 'system'
  ): Promise<void> {
    console.log(`🧪 Testing ${type} notification...`);

    try {
      switch (type) {
        case 'message':
          await notificationService.sendMessageNotification(
            userId,
            'Test Sender',
            'Hello! This is a test message notification.',
            'test-conversation-123'
          );
          break;

        case 'offer':
          await notificationService.sendOfferNotification(userId, 'new', {
            buyerName: 'John Doe',
            listingTitle: 'iPhone 13 Pro',
            amount: 2500,
            currency: 'GHS',
            offerId: 'test-offer-123',
            listingId: 'test-listing-123',
          });
          break;

        case 'community':
          await notificationService.sendCommunityNotification(userId, 'like', {
            actorName: 'Jane Smith',
            postTitle: 'My awesome post about selling tips',
            postId: 'test-post-123',
          });
          break;

        case 'system':
          await notificationService.sendSystemNotification(
            [userId],
            'Welcome to Sellar! 🎉',
            'Thank you for joining our marketplace community. Start exploring amazing deals!'
          );
          break;
      }

      console.log(`✅ ${type} notification sent successfully`);
    } catch (error) {
      console.error(`❌ Failed to send ${type} notification:`, error);
    }
  }
}

// Export singleton instance
export const pushNotificationTester = new PushNotificationTester();
