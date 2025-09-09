import { pushNotificationService } from './pushNotificationService';
import { dbHelpers, supabase } from './supabase';
import { Database } from './database.types';

export interface NotificationPayload {
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}

export interface NotificationRecipient {
  userId: string;
  preferences?: any;
}

class NotificationService {
  /**
   * Create and send a notification to specific users
   */
  async createAndSendNotification(
    recipients: string[],
    payload: NotificationPayload,
    options?: {
      saveToDatabase?: boolean;
      sendPush?: boolean;
      scheduledFor?: string;
    }
  ): Promise<void> {
    const {
      saveToDatabase = true,
      sendPush = true,
      scheduledFor,
    } = options || {};

    try {
      // Save notifications to database
      if (saveToDatabase) {
        const notifications = recipients.map(userId => ({
          user_id: userId,
          title: payload.title,
          body: payload.body,
          type: payload.type,
          data: payload.data || {},
          created_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) {
          console.error('Failed to save notifications to database:', error);
        }
      }

      // Send push notifications
      if (sendPush) {
        await this.sendPushNotifications(recipients, payload, scheduledFor);
      }
    } catch (error) {
      console.error('Error creating and sending notification:', error);
    }
  }

  /**
   * Send push notifications to users
   */
  private async sendPushNotifications(
    userIds: string[],
    payload: NotificationPayload,
    scheduledFor?: string
  ): Promise<void> {
    try {
      // Filter users based on their notification preferences
      const eligibleUsers = await this.filterUsersByPreferences(userIds, payload.type);
      
      if (eligibleUsers.length === 0) {
        console.log('No eligible users for push notification');
        return;
      }

      // Queue push notification for processing
      try {
        await dbHelpers.queuePushNotification(
          eligibleUsers,
          payload.title,
          payload.body,
          payload.type,
          payload.data,
          scheduledFor
        );
      } catch (queueError) {
        console.error('Failed to queue push notification, sending directly:', queueError);
        // If queuing fails, send directly as fallback
        await pushNotificationService.sendPushNotification(eligibleUsers, {
          title: payload.title,
          body: payload.body,
          type: payload.type,
          data: payload.data,
        });
      }

      // Send immediately if not scheduled
      if (!scheduledFor) {
        await pushNotificationService.sendPushNotification(eligibleUsers, {
          title: payload.title,
          body: payload.body,
          type: payload.type,
          data: payload.data,
        });
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  /**
   * Filter users based on their notification preferences
   */
  private async filterUsersByPreferences(
    userIds: string[],
    notificationType: string
  ): Promise<string[]> {
    try {
      const eligibleUsers: string[] = [];

      for (const userId of userIds) {
        try {
          const { data: preferences, error } = await dbHelpers.getNotificationPreferences(userId);
          
          if (error) {
            console.warn(`Failed to get preferences for user ${userId}:`, error);
            // If we can't get preferences, assume user wants notifications (safer default)
            eligibleUsers.push(userId);
            continue;
          }
          
          if (this.shouldSendNotification(preferences, notificationType)) {
            eligibleUsers.push(userId);
          }
        } catch (userError) {
          console.warn(`Error checking preferences for user ${userId}:`, userError);
          // If we can't check preferences for this user, include them (safer default)
          eligibleUsers.push(userId);
        }
      }

      return eligibleUsers;
    } catch (error) {
      console.error('Error filtering users by preferences:', error);
      return userIds; // Return all users if filtering fails
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(preferences: any, notificationType: string): boolean {
    if (!preferences || !preferences.push_enabled) {
      return false;
    }

    // Check category-specific preferences
    switch (notificationType) {
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
        return preferences.system_enabled;
      
      default:
        return true;
    }
  }

  /**
   * Send new message notification
   */
  async sendMessageNotification(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> {
    await this.createAndSendNotification(
      [recipientId],
      {
        title: `New message from ${senderName}`,
        body: messagePreview,
        type: 'message',
        data: {
          conversation_id: conversationId,
          sender_name: senderName,
        },
      }
    );
  }

  /**
   * Send offer notification
   */
  async sendOfferNotification(
    recipientId: string,
    offerType: 'new' | 'accepted' | 'rejected' | 'countered',
    data: {
      buyerName?: string;
      sellerName?: string;
      listingTitle: string;
      amount: number;
      currency: string;
      offerId: string;
      listingId?: string;
      conversationId?: string;
      rejectionReason?: string;
    }
  ): Promise<void> {
    let title: string;
    let body: string;
    let type: string;

    switch (offerType) {
      case 'new':
        title = 'New Offer Received! 💰';
        body = `${data.buyerName} offered ${data.currency} ${data.amount.toLocaleString()} for "${data.listingTitle}"`;
        type = 'offer';
        break;
      
      case 'accepted':
        title = 'Offer Accepted! 🎉';
        body = `Your offer of ${data.currency} ${data.amount.toLocaleString()} for "${data.listingTitle}" has been accepted!`;
        type = 'offer_accepted';
        break;
      
      case 'rejected':
        title = 'Offer Declined';
        body = `Your offer of ${data.currency} ${data.amount.toLocaleString()} for "${data.listingTitle}" was declined${data.rejectionReason ? `: ${data.rejectionReason}` : '.'}`;
        type = 'offer_rejected';
        break;
      
      case 'countered':
        title = 'Counter Offer Received 💰';
        body = `Counter offer: ${data.currency} ${data.amount.toLocaleString()} for "${data.listingTitle}"`;
        type = 'offer_countered';
        break;
    }

    await this.createAndSendNotification(
      [recipientId],
      {
        title,
        body,
        type,
        data: {
          offer_id: data.offerId,
          listing_id: data.listingId,
          conversation_id: data.conversationId,
          listing_title: data.listingTitle,
          amount: data.amount,
          currency: data.currency,
        },
      }
    );
  }

  /**
   * Send community notification (like, comment, follow)
   */
  async sendCommunityNotification(
    recipientId: string,
    type: 'like' | 'comment' | 'follow',
    data: {
      actorName: string;
      postTitle?: string;
      commentText?: string;
      postId?: string;
      userId?: string;
    }
  ): Promise<void> {
    let title: string;
    let body: string;

    switch (type) {
      case 'like':
        title = 'Post Liked! ❤️';
        body = `${data.actorName} liked your post${data.postTitle ? `: "${data.postTitle}"` : ''}`;
        break;
      
      case 'comment':
        title = 'New Comment 💬';
        body = `${data.actorName} commented on your post${data.commentText ? `: "${data.commentText}"` : ''}`;
        break;
      
      case 'follow':
        title = 'New Follower! 👥';
        body = `${data.actorName} started following you`;
        break;
    }

    await this.createAndSendNotification(
      [recipientId],
      {
        title,
        body,
        type,
        data: {
          actor_name: data.actorName,
          post_id: data.postId,
          user_id: data.userId,
          post_title: data.postTitle,
          comment_text: data.commentText,
        },
      }
    );
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(
    recipientIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.createAndSendNotification(
      recipientIds,
      {
        title,
        body,
        type: 'system',
        data,
      }
    );
  }

  /**
   * Send feature expiry notification
   */
  async sendFeatureExpiryNotification(
    recipientId: string,
    featureNames: string[],
    expiryDate: string
  ): Promise<void> {
    const featureList = featureNames.join(', ');
    const isPlural = featureNames.length > 1;

    await this.createAndSendNotification(
      [recipientId],
      {
        title: `Feature${isPlural ? 's' : ''} Expired`,
        body: `Your ${featureList} feature${isPlural ? 's have' : ' has'} expired. Renew to continue enjoying premium benefits!`,
        type: 'feature_expired',
        data: {
          feature_names: featureNames,
          expiry_date: expiryDate,
        },
      }
    );
  }

  /**
   * Send listing notification (sold, expired, etc.)
   */
  async sendListingNotification(
    recipientId: string,
    type: 'sold' | 'expired' | 'approved' | 'rejected',
    listingTitle: string,
    listingId: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    let title: string;
    let body: string;

    switch (type) {
      case 'sold':
        title = 'Item Sold! 💰';
        body = `Congratulations! Your item "${listingTitle}" has been sold`;
        break;
      
      case 'expired':
        title = 'Listing Expired';
        body = `Your listing "${listingTitle}" has expired. Renew to keep it active`;
        break;
      
      case 'approved':
        title = 'Listing Approved ✅';
        body = `Your listing "${listingTitle}" has been approved and is now live`;
        break;
      
      case 'rejected':
        title = 'Listing Rejected';
        body = `Your listing "${listingTitle}" was rejected. Please review and resubmit`;
        break;
    }

    await this.createAndSendNotification(
      [recipientId],
      {
        title,
        body,
        type: 'listing',
        data: {
          listing_id: listingId,
          listing_title: listingTitle,
          listing_status: type,
          ...additionalData,
        },
      }
    );
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    recipientId: string,
    type: 'success' | 'failed' | 'refund',
    amount: number,
    currency: string,
    description: string,
    transactionId?: string
  ): Promise<void> {
    let title: string;
    let body: string;

    switch (type) {
      case 'success':
        title = 'Payment Successful ✅';
        body = `Payment of ${currency} ${amount.toLocaleString()} for ${description} was successful`;
        break;
      
      case 'failed':
        title = 'Payment Failed ❌';
        body = `Payment of ${currency} ${amount.toLocaleString()} for ${description} failed. Please try again`;
        break;
      
      case 'refund':
        title = 'Refund Processed 💰';
        body = `Refund of ${currency} ${amount.toLocaleString()} for ${description} has been processed`;
        break;
    }

    await this.createAndSendNotification(
      [recipientId],
      {
        title,
        body,
        type: 'payment',
        data: {
          payment_type: type,
          amount,
          currency,
          description,
          transaction_id: transactionId,
        },
      }
    );
  }
}

export const notificationService = new NotificationService();
