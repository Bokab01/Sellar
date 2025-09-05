// Re-export the type-safe client
export { supabase, db, rpc } from './supabase-client';

// Import for use in this file
import { db, rpc } from './supabase-client';

// Helper functions for common database operations
export const dbHelpers = {
  // Profile operations
  async createProfile(userId: string, userData: {
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
  }) {
    const { data, error } = await db.profiles.insert({
      id: userId,
      first_name: userData.firstName,
      last_name: userData.lastName,
      full_name: `${userData.firstName} ${userData.lastName}`.trim(),
      phone: userData.phone || null,
      location: userData.location || 'Accra, Greater Accra',
      bio: null,
      is_verified: false,
      is_business: false,
    }).select().single();
    
    return { data, error };
  },

  async getProfile(userId: string) {
    const { data, error } = await db.profiles.select('*').eq('id', userId).single();
    return { data, error };
  },

  async updateProfile(userId: string, updates: any) {
    const { data, error } = await db.profiles.update(updates, userId).select().single();
    return { data, error };
  },

  // Listing operations
  async getListingsWithDetails(filters: any = {}) {
    const { data: listingsData, error } = await db.listings
      .select(`
        *,
        profiles!listings_user_id_fkey(*),
        categories!listings_category_id_fkey(*)
      `)
      .match(filters);

    if (error) return { data: null, error };

    // Get unique user and category IDs
    const userIds = [...new Set(listingsData?.map((listing: any) => listing.user_id) || [])];
    const categoryIds = [...new Set(listingsData?.map((listing: any) => listing.category_id) || [])];

    // Fetch profiles and categories
    const { data: profiles } = await db.profiles.select('*').in('id', userIds);
    const { data: categories } = await db.categories.select('*').in('id', categoryIds);

    // Create lookup maps
    const profilesMap = new Map();
    profiles?.forEach((profile: any) => {
      profilesMap.set(profile.id, profile);
    });

    const categoriesMap = new Map();
    categories?.forEach((category: any) => {
      categoriesMap.set(category.id, category);
    });

    // Combine data
    const enrichedListings = listingsData?.map((listing: any) => ({
      ...listing,
      profiles: profilesMap.get(listing.user_id) || null,
      categories: categoriesMap.get(listing.category_id) || null
    }));

    return { data: enrichedListings, error: null };
  },

  async createListing(listing: any) {
    const { data, error } = await db.listings.insert(listing).select().single();
    return { data, error };
  },

  async updateListing(listingId: string, updates: any) {
    const { data, error } = await db.listings.update(updates, listingId).select().single();
    return { data, error };
  },

  async deleteListing(listingId: string) {
    const { error } = await db.listings.delete(listingId);
    return { error };
  },

  // Message operations
  async createMessage(message: any) {
    const { data, error } = await db.messages.insert(message).select().single();
    return { data, error };
  },

  async getMessages(conversationId: string, limit = 50, offset = 0) {
    const { data, error } = await db.messages
      .select(`
        *,
        profiles!messages_sender_id_fkey(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error };
  },

  async updateMessage(messageId: string, updates: any) {
    const { data, error } = await db.messages.update(updates, messageId).select().single();
    return { data, error };
  },

  // Post operations
  async createPost(post: any) {
    const { data, error } = await db.posts.insert(post).select().single();
    return { data, error };
  },

  async getPosts(options: any = {}) {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    let query = db.posts
      .select(`
        *,
        profiles!posts_user_id_fkey(*),
        listings!posts_listing_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.following) {
      // Add following filter logic if needed
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    return { data, error };
  },

  async updatePost(postId: string, updates: any) {
    const { data, error } = await db.posts.update(updates, postId).select().single();
    return { data, error };
  },

  async deletePost(postId: string) {
    const { error } = await db.posts.delete(postId);
    return { error };
  },

  // Comment operations
  async createComment(comment: any) {
    const { data, error } = await db.comments.insert(comment).select().single();
    return { data, error };
  },

  async getComments(postId: string, limit = 50, offset = 0) {
    const { data, error } = await db.comments
      .select(`
        *,
        profiles!comments_user_id_fkey(*)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error };
  },

  async updateComment(commentId: string, updates: any) {
    const { data, error } = await db.comments.update(updates, commentId).select().single();
    return { data, error };
  },

  async deleteComment(commentId: string) {
    const { error } = await db.comments.delete(commentId);
    return { error };
  },

  // Like operations
  async toggleLike(userId: string, postId?: string, commentId?: string) {
    // Check if like already exists
    const { data: existingLike } = await db.likes
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId || null)
      .eq('comment_id', commentId || null)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await db.likes.delete((existingLike as any).id);
      return { data: { action: 'unliked' }, error };
    } else {
      // Like
      const { data, error } = await db.likes.insert({
        user_id: userId,
        post_id: postId || null,
        comment_id: commentId || null,
      }).select().single();

      return { data: { action: 'liked', ...data }, error };
    }
  },

  // Follow operations
  async toggleFollow(followerId: string, followingId: string) {
    // Check if follow already exists
    const { data: existingFollow } = await db.follows
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existingFollow) {
      // Unfollow
      const { error } = await db.follows.delete((existingFollow as any).id);
      return { data: { action: 'unfollowed' }, error };
    } else {
      // Follow
      const { data, error } = await db.follows.insert({
        follower_id: followerId,
        following_id: followingId,
      }).select().single();

      return { data: { action: 'followed', ...data }, error };
    }
  },

  // Report operations
  async createReport(report: any) {
    const { data, error } = await db.reports.insert(report).select().single();
    return { data, error };
  },

  // Callback request operations
  async createCallbackRequest(request: any) {
    const { data, error } = await db.callback_requests.insert(request).select().single();
    return { data, error };
  },

  async updateCallbackRequest(requestId: string, status: string) {
    const { data, error } = await db.callback_requests.update({ status }, requestId).select().single();
    return { data, error };
  },

  // Offer operations
  async createOffer(offer: any) {
    const { data, error } = await db.offers.insert(offer).select().single();
    return { data, error };
  },

  async updateOffer(offerId: string, status: string) {
    const { data, error } = await db.offers.update({ status }, offerId).select().single();
    return { data, error };
  },

  // Notification operations
  async createNotification(notification: any) {
    const { data, error } = await db.notifications.insert(notification).select().single();
    return { data, error };
  },

  async getNotifications(userId: string, limit = 20, offset = 0) {
    const { data, error } = await db.notifications
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error };
  },

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await db.notifications.update({ is_read: true }, notificationId).select().single();
    return { data, error };
  },

  async markAllNotificationsAsRead(userId: string) {
    const { error } = await db.notifications.update({ is_read: true }).eq('user_id', userId);
    return { error };
  },

  // Device token operations
  async upsertDeviceToken(tokenData: any) {
    const { data, error } = await db.device_tokens.upsert(tokenData, {
      onConflict: 'user_id,platform',
      ignoreDuplicates: false,
    }).select().single();

    return { data, error };
  },

  async deactivateDeviceToken(userId: string, platform: string) {
    const { error } = await db.device_tokens.update({ is_active: false }).eq('user_id', userId).eq('platform', platform);
    return { error };
  },

  // Transaction operations
  async createTransaction(transaction: any) {
    const { data, error } = await db.transactions.insert(transaction).select().single();
    return { data, error };
  },

  async getTransactions(userId: string, limit = 20, offset = 0) {
    const { data, error } = await db.transactions
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error };
  },

  // Verification operations
  async createVerification(verification: any) {
    const { data, error } = await db.user_verification.insert(verification).select().single();
    return { data, error };
  },

  async getVerifications(userId: string) {
    const { data, error } = await db.user_verification
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async updateVerification(verificationId: string, updates: any) {
    const { data, error } = await db.user_verification.update(updates, verificationId).select().single();
    return { data, error };
  },

  // User settings operations
  async updateUserSettings(userId: string, updates: any) {
    const { data, error } = await db.user_settings.update(updates, userId).select().single();
    return { data, error };
  },

  async getUserSettings(userId: string) {
    const { data, error } = await db.user_settings.select('*').eq('user_id', userId).single();
    return { data, error };
  },

  // RPC function wrappers
  async queuePushNotification(
    userIds: string[],
    title: string,
    body: string,
    notificationType: string,
    notificationData?: any,
    scheduledFor?: string
  ) {
    return await rpc.queue_push_notification({
      p_user_ids: userIds,
      p_title: title,
      p_body: body,
      p_notification_type: notificationType,
      p_data: notificationData || {},
      p_scheduled_for: scheduledFor || new Date().toISOString(),
    });
  },

  async getNotificationPreferences(userId: string) {
    return await rpc.get_user_notification_preferences({ p_user_id: userId });
  },

  async updateNotificationPreferences(userId: string, preferences: any) {
    return await rpc.update_notification_preferences({ p_user_id: userId, p_preferences: preferences });
  },

  async claimReferralBonus(referrerId: string, refereeId: string, referralCode: string) {
    return await rpc.claim_referral_bonus({
      p_referrer_id: referrerId,
      p_referee_id: refereeId,
      p_referral_code: referralCode,
    });
  },

  async getUserFollowers(targetUserId: string, pageLimit = 20, pageOffset = 0) {
    return await rpc.get_user_followers({
      target_user_id: targetUserId,
      page_limit: pageLimit,
      page_offset: pageOffset,
    });
  },

  async getUserFollowing(targetUserId: string, pageLimit = 20, pageOffset = 0) {
    return await rpc.get_user_following({
      target_user_id: targetUserId,
      page_limit: pageLimit,
      page_offset: pageOffset,
    });
  },

  async followUser(followerId: string, followingId: string) {
    return await rpc.follow_user({
      follower_id: followerId,
      following_id: followingId,
    });
  },

  async unfollowUser(followerId: string, followingId: string) {
    return await rpc.unfollow_user({
      follower_id: followerId,
      following_id: followingId,
    });
  },

  async spendUserCredits(userId: string, amount: number, reason: string, referenceId?: string, referenceType?: string) {
    return await rpc.spend_user_credits({
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_reference_id: referenceId,
      p_reference_type: referenceType,
    });
  },

  async purchaseFeature(userId: string, featureKey: string, credits: number, metadata?: any) {
    return await rpc.purchase_feature({
      p_user_id: userId,
      p_feature_key: featureKey,
      p_credits: credits,
      p_metadata: metadata || {},
    });
  },

  async getUserEntitlements(userId: string) {
    return await rpc.get_user_entitlements({ p_user_id: userId });
  },

  async getUserRewardSummary(userId: string) {
    return await rpc.get_user_reward_summary({ p_user_id: userId });
  },

  async claimAnniversaryBonus(userId: string) {
    return await rpc.claim_anniversary_bonus({ p_user_id: userId });
  },

  // Chat operations
  async getConversations(userId: string) {
    const { data, error } = await db.conversations
      .select(`
        *,
        participants!conversations_participants_participant_id_fkey(*),
        messages!conversations_messages_conversation_id_fkey(*)
      `)
      .eq('participants.participant_id', userId);
    return { data, error };
  },

  async sendMessage(messageData: any) {
    const { data, error } = await db.messages.insert(messageData).select().single();
    return { data, error };
  },

  // Listing operations
  async getListings(options: any) {
    const { data, error } = await db.listings
      .select(`
        *,
        profiles!listings_user_id_fkey(*),
        categories!listings_category_id_fkey(*)
      `)
      .limit(options.limit || 20);
    return { data, error };
  },


  // Device token operations
  async registerDeviceToken(tokenData: any) {
    const { data, error } = await db.device_tokens.insert(tokenData).select().single();
    return { data, error };
  },

  // Offer operations
  async updateOfferStatus(offerId: string, status: string) {
    const { data, error } = await db.offers.update({ status }, offerId).select().single();
    return { data, error };
  },
};