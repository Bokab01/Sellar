import { supabase } from './supabase';

export interface CreateNotificationParams {
  userId: string;
  type: 'message' | 'offer' | 'like' | 'comment' | 'follow' | 'review' | 'listing' | 'system' | 'payment' | 'promotion' | 'reminder';
  title: string;
  body: string;
  data?: any;
}

export class NotificationHelpers {
  /**
   * Create a notification for a user
   */
  static async createNotification(params: CreateNotificationParams) {
    try {
      const { data, error } = await supabase.rpc('create_notification', {
        target_user_id: params.userId,
        notification_type: params.type,
        notification_title: params.title,
        notification_body: params.body,
        notification_data: params.data || {}
      });

      if (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true, notificationId: data };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: 'Failed to create notification' };
    }
  }

  /**
   * Create a test notification for the current user
   */
  static async createTestNotification(userId: string) {
    return this.createNotification({
      userId,
      type: 'system',
      title: 'Test Notification',
      body: 'This is a test notification to verify the system is working.',
      data: { test: true, timestamp: new Date().toISOString() }
    });
  }

  /**
   * Create a welcome notification for new users
   */
  static async createWelcomeNotification(userId: string, username: string) {
    return this.createNotification({
      userId,
      type: 'system',
      title: 'Welcome to Sellar!',
      body: `Welcome ${username}! Start by creating your first listing or exploring the community.`,
      data: { 
        welcome: true, 
        action: 'get_started',
        username 
      }
    });
  }

  /**
   * Create a follow notification
   */
  static async createFollowNotification(followedUserId: string, followerId: string, followerUsername: string) {
    return this.createNotification({
      userId: followedUserId,
      type: 'follow',
      title: 'New Follower',
      body: `${followerUsername} started following you`,
      data: {
        follower_id: followerId,
        follower_username: followerUsername,
        followed_at: new Date().toISOString()
      }
    });
  }

  /**
   * Create a like notification
   */
  static async createLikeNotification(postOwnerId: string, likerId: string, likerUsername: string, postId: string, postContent: string) {
    return this.createNotification({
      userId: postOwnerId,
      type: 'like',
      title: 'Post Liked',
      body: `${likerUsername} liked your post`,
      data: {
        liker_id: likerId,
        liker_username: likerUsername,
        post_id: postId,
        post_content: postContent.substring(0, 100),
        liked_at: new Date().toISOString()
      }
    });
  }

  /**
   * Create a comment notification
   */
  static async createCommentNotification(postOwnerId: string, commenterId: string, commenterUsername: string, postId: string, commentContent: string) {
    return this.createNotification({
      userId: postOwnerId,
      type: 'comment',
      title: 'New Comment',
      body: `${commenterUsername} commented on your post`,
      data: {
        commenter_id: commenterId,
        commenter_username: commenterUsername,
        post_id: postId,
        comment_content: commentContent.substring(0, 100),
        commented_at: new Date().toISOString()
      }
    });
  }

  /**
   * Create a message notification
   */
  static async createMessageNotification(recipientId: string, senderId: string, senderUsername: string, conversationId: string, messageContent: string) {
    return this.createNotification({
      userId: recipientId,
      type: 'message',
      title: 'New Message',
      body: `${senderUsername} sent you a message`,
      data: {
        sender_id: senderId,
        sender_username: senderUsername,
        conversation_id: conversationId,
        message_content: messageContent.substring(0, 100),
        sent_at: new Date().toISOString()
      }
    });
  }

  /**
   * Create a listing notification
   */
  static async createListingNotification(sellerId: string, listingId: string, listingTitle: string, action: 'created' | 'updated' | 'sold') {
    const titles = {
      created: 'Listing Created Successfully! 🎉',
      updated: 'Listing Updated ✏️',
      sold: 'Item Sold! 💰'
    };
    
    const bodies = {
      created: `Your listing "${listingTitle}" has been created and is now live!`,
      updated: `Your listing "${listingTitle}" has been updated successfully.`,
      sold: `Congratulations! Your listing "${listingTitle}" has been sold!`
    };

    return this.createNotification({
      userId: sellerId,
      type: 'listing',
      title: titles[action],
      body: bodies[action],
      data: {
        listing_id: listingId,
        listing_title: listingTitle,
        action,
        created_at: new Date().toISOString()
      }
    });
  }
}
