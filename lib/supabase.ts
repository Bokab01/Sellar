// Re-export the type-safe client
export { supabase, db, rpc } from './supabase-client';

// Import for use in this file
import { supabase, db, rpc } from './supabase-client';

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
    
    // If profile doesn't exist, try to create it
    if (error && (error.code === 'PGRST116' || error.message.includes('0 rows'))) {
      console.log('Profile not found, attempting to create missing profile...');
      
      // Get user data from auth
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (!authError && authUser.user) {
        const firstName = authUser.user.user_metadata?.firstName || '';
        const lastName = authUser.user.user_metadata?.lastName || '';
        const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : 'User';
        
        const { data: newProfile, error: createError } = await db.profiles
          .insert({
            id: userId,
            full_name: fullName,
            email: authUser.user.email || '',
            phone: authUser.user.user_metadata?.phone || null,
            location: authUser.user.user_metadata?.location || 'Accra, Greater Accra',
            is_business: authUser.user.user_metadata?.is_business || false,
          })
          .select()
          .single();
        
        if (!createError) {
          return { data: newProfile, error: null };
        }
      }
    }
    
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
    console.log('🎯 getMessages called for conversation:', conversationId);
    const { data, error } = await db.messages
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        offers(
          *,
          buyer:buyer_id(*),
          seller:seller_id(*)
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('🎯 getMessages result:', { data: data?.length, error });
    if (data) {
      const offerMessages = data.filter((msg: any) => msg.message_type === 'offer');
      console.log('🎯 Offer messages found:', offerMessages.map((msg: any) => ({ 
        id: msg.id, 
        hasOffers: msg.offers?.length > 0, 
        offersCount: msg.offers?.length || 0 
      })));
    }

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

  async updatePost(postId: string, updates: any) {
    console.log('dbHelpers.updatePost called with:', postId, typeof postId, updates);
    
    if (!postId || postId === 'undefined' || postId === 'null') {
      console.error('Invalid postId in dbHelpers.updatePost:', postId);
      return { data: null, error: new Error('Invalid post ID') };
    }
    
    try {
      console.log('About to execute Supabase update query with postId:', postId);
      
      // Try using the direct supabase client instead of db reference
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)
        .select()
        .single();
      
      console.log('Direct supabase update query executed, result:', { data, error, postId });
      return { data, error };
    } catch (err) {
      console.error('Exception in dbHelpers.updatePost:', err);
      return { data: null, error: err };
    }
  },

  async deletePost(postId: string) {
    console.log('dbHelpers.deletePost called with:', postId, typeof postId);
    
    if (!postId || postId === 'undefined' || postId === 'null') {
      console.error('Invalid postId in dbHelpers.deletePost:', postId);
      return { data: null, error: new Error('Invalid post ID') };
    }
    
    try {
      console.log('About to execute Supabase delete query with postId:', postId);
      
      // Try using the direct supabase client instead of db reference
      const { data, error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .select()
        .single();
      
      console.log('Direct supabase query executed, result:', { data, error, postId });
      return { data, error };
    } catch (err) {
      console.error('Exception in dbHelpers.deletePost:', err);
      return { data: null, error: err };
    }
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

    if (options.postType) {
      query = query.eq('type', options.postType);
    }

    if (options.location) {
      query = query.ilike('location', `%${options.location}%`);
    }

    if (options.following) {
      // Add following filter logic if needed
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    return { data, error };
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

      // Handle duplicate key error gracefully
      if (error && error.code === '23505') {
        // Already following, return success
        return { data: { action: 'followed' }, error: null };
      }

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
    console.log('🎯 createOffer called with:', offer);
    const { data, error } = await db.offers.insert(offer).select();
    console.log('🎯 createOffer result:', { data, error });
    
    if (error) {
      return { data: null, error };
    }
    
    if (!data || data.length === 0) {
      return { data: null, error: { message: 'Failed to create offer' } };
    }
    
    return { data: data[0], error: null };
  },

  async updateOffer(offerId: string, status: string) {
    console.log('🎯 updateOffer called:', { offerId, status });
    const { data, error } = await db.offers.update({ status }, offerId).select();
    console.log('🎯 updateOffer result:', { data, error });
    
    if (error) {
      return { data: null, error };
    }
    
    if (!data || data.length === 0) {
      return { data: null, error: { message: 'Failed to update offer' } };
    }
    
    return { data: data[0], error: null };
  },

  // Notification operations
  async createNotification(notification: any) {
    const { data, error } = await db.notifications.insert(notification).select().single();
    return { data, error };
  },

  async getNotifications(userId: string, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error };
  },

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await supabase.from('notifications').update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    }).eq('id', notificationId).select().single();
    return { data, error };
  },

  async markNotificationAsUnread(notificationId: string) {
    const { data, error } = await supabase.from('notifications').update({ 
      is_read: false, 
      read_at: null 
    }).eq('id', notificationId).select().single();
    return { data, error };
  },

  async markAllNotificationsAsRead(userId: string) {
    const { error } = await supabase.from('notifications').update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    }).eq('user_id', userId);
    return { error };
  },

  async deleteNotification(notificationId: string) {
    if (!notificationId || notificationId === 'undefined') {
      console.error('🗑️ Invalid notification ID provided');
      return { error: { message: 'Invalid notification ID' } };
    }
    
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
      if (error) {
        console.error('🗑️ Error deleting notification:', error);
      }
      return { error };
    } catch (err) {
      console.error('🗑️ Exception during delete operation:', err);
      return { error: { message: 'Database operation failed' } };
    }
  },

  async deleteAllNotifications(userId: string) {
    if (!userId || userId === 'undefined') {
      console.error('🗑️ Invalid user ID provided');
      return { error: { message: 'Invalid user ID' } };
    }
    
    try {
      const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
      if (error) {
        console.error('🗑️ Error deleting all notifications:', error);
      }
      return { error };
    } catch (err) {
      console.error('🗑️ Exception during delete operation:', err);
      return { error: { message: 'Database operation failed' } };
    }
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
    try {
      // Get conversations with basic data first
      const { data: conversations, error: convError } = await db.conversations
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('❌ Error fetching conversations:', convError);
        return { data: null, error: convError };
      }

      if (!conversations || conversations.length === 0) {
        return { data: [], error: null };
      }

      // Get all participant IDs
      const participantIds = new Set<string>();
      conversations.forEach((conv: any) => {
        if (conv.participant_1) participantIds.add(conv.participant_1);
        if (conv.participant_2) participantIds.add(conv.participant_2);
      });

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await db.profiles
        .select('*')
        .in('id', Array.from(participantIds));

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        return { data: conversations, error: null }; // Return conversations without profiles
      }

      // Create profiles map
      const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      // Get all listing IDs
      const listingIds = conversations
        .map((conv: any) => conv.listing_id)
        .filter(Boolean);

      let listingsMap = new Map();
      if (listingIds.length > 0) {
        const { data: listings, error: listingsError } = await db.listings
          .select('*')
          .in('id', listingIds);

        if (!listingsError && listings) {
          listingsMap = new Map(listings.map((l: any) => [l.id, l]));
        }
      }

      // Get messages for each conversation
      const conversationIds = conversations.map((conv: any) => conv.id);
      const { data: messages, error: messagesError } = await db.messages
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError);
      }

      // Group messages by conversation
      const messagesMap = new Map();
      if (messages) {
        messages.forEach((msg: any) => {
          if (!messagesMap.has(msg.conversation_id)) {
            messagesMap.set(msg.conversation_id, []);
          }
          messagesMap.get(msg.conversation_id).push(msg);
        });
      }

      // Combine all data
      const enrichedConversations = conversations.map((conv: any) => ({
        ...conv,
        participant_1_profile: profilesMap.get(conv.participant_1) || null,
        participant_2_profile: profilesMap.get(conv.participant_2) || null,
        listing: conv.listing_id ? listingsMap.get(conv.listing_id) || null : null,
        messages: messagesMap.get(conv.id) || [],
      }));

      return { data: enrichedConversations, error: null };
    } catch (err) {
      console.error('❌ Error in getConversations:', err);
      return { data: null, error: err };
    }
  },

  async sendMessage(messageData: any) {
    const { data, error } = await db.messages.insert(messageData).select().single();
    return { data, error };
  },

  async getUnreadMessageCounts(userId: string) {
    try {
      // First get the user's conversation IDs
      const { data: conversations, error: convError } = await db.conversations
        .select('id')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

      if (convError) {
        console.error('❌ Error fetching user conversations:', convError);
        return { data: {}, error: convError };
      }

      if (!conversations || conversations.length === 0) {
        return { data: {}, error: null };
      }

      const conversationIds = conversations.map((conv: any) => conv.id);

      // Then get unread messages for those conversations (using read_at IS NULL)
      const { data, error } = await db.messages
        .select('conversation_id')
        .is('read_at', null)
        .neq('sender_id', userId)
        .in('conversation_id', conversationIds);

      if (error) {
        console.error('❌ Error fetching unread counts:', error);
        return { data: {}, error };
      }

      // Count unread messages per conversation
      const unreadCounts: Record<string, number> = {};
      data?.forEach((msg: any) => {
        unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
      });

      console.log('📊 Unread counts calculated from database:', unreadCounts);
      console.log('📊 Total unread messages found:', data?.length || 0);
      return { data: unreadCounts, error: null };
    } catch (err) {
      console.error('❌ Error in getUnreadMessageCounts:', err);
      return { data: {}, error: err };
    }
  },

  async getConversation(conversationId: string, userId: string) {
    try {
      // Get the conversation with basic data
      const { data: conversation, error: convError } = await db.conversations
        .select('*')
        .eq('id', conversationId)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .single();

      if (convError) {
        console.error('❌ Error fetching conversation:', convError);
        return { data: null, error: convError };
      }

      if (!conversation) {
        return { data: null, error: null };
      }

      // Get participant profiles
      const participantIds = [(conversation as any).participant_1, (conversation as any).participant_2].filter(Boolean);
      const { data: profiles, error: profilesError } = await db.profiles
        .select('*')
        .in('id', participantIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        return { data: conversation, error: null }; // Return conversation without profiles
      }

      // Create profiles map
      const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      // Get listing if it exists
      let listing = null;
      if ((conversation as any).listing_id) {
        const { data: listingData, error: listingError } = await db.listings
          .select('*')
          .eq('id', (conversation as any).listing_id)
          .single();

        if (!listingError && listingData) {
          listing = listingData;
        }
      }

      // Combine all data
      const enrichedConversation = {
        ...(conversation as any),
        participant_1_profile: profilesMap.get((conversation as any).participant_1) || null,
        participant_2_profile: profilesMap.get((conversation as any).participant_2) || null,
        listing: listing,
      };

      return { data: enrichedConversation, error: null };
    } catch (err) {
      console.error('❌ Error in getConversation:', err);
      return { data: null, error: err };
    }
  },

  // Listing operations
  async getListings(options: any) {
    try {
      // Use the full query with joins for all categories
      let query = db.listings
        .select(`
          *,
          profiles!listings_user_id_fkey(*),
          categories!listings_category_id_fkey(*)
        `)
        .eq('status', 'active'); // Only get active listings

      // Apply filters
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      
      if (options.category) {
        query = query.eq('category_id', options.category);
      }
      
      if (options.search) {
        // Split search terms and create OR conditions for each term
        const searchTerms = options.search.split(' ').filter((term: string) => term.trim());
        if (searchTerms.length > 0) {
          // Create OR conditions for each search term
          const searchConditions = searchTerms.map((term: string) => 
            `title.ilike.%${term}%,description.ilike.%${term}%`
          ).join(',');
          query = query.or(searchConditions);
        }
      }
      
      if (options.priceMin !== undefined && options.priceMin > 0) {
        query = query.gte('price', options.priceMin);
      }
      
      if (options.priceMax !== undefined && options.priceMax > 0) {
        query = query.lte('price', options.priceMax);
      }
      
      if (options.condition && options.condition.length > 0) {
        query = query.in('condition', options.condition);
      }
      
      if (options.location) {
        query = query.ilike('location', `%${options.location}%`);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });
      
      // Apply limit
      query = query.limit(options.limit || 20);

      const { data, error } = await query;
      
      // If the joined query fails, try a simpler query without joins
      if (error && (error.message.includes('schema cache') || error.message.includes('relationship'))) {
        
        let simpleQuery = db.listings
          .select('*')
          .eq('status', 'active');

        // Apply the same filters to the simple query
        if (options.userId) {
          simpleQuery = simpleQuery.eq('user_id', options.userId);
        }
        
        if (options.category) {
          simpleQuery = simpleQuery.eq('category_id', options.category);
        }
        
        if (options.search) {
          // Split search terms and create OR conditions for each term
          const searchTerms = options.search.split(' ').filter((term: string) => term.trim());
          if (searchTerms.length > 0) {
            // Create OR conditions for each search term
            const searchConditions = searchTerms.map((term: string) => 
              `title.ilike.%${term}%,description.ilike.%${term}%`
            ).join(',');
            simpleQuery = simpleQuery.or(searchConditions);
          }
        }
        
        if (options.priceMin !== undefined && options.priceMin > 0) {
          simpleQuery = simpleQuery.gte('price', options.priceMin);
        }
        
        if (options.priceMax !== undefined && options.priceMax > 0) {
          simpleQuery = simpleQuery.lte('price', options.priceMax);
        }
        
        if (options.condition && options.condition.length > 0) {
          simpleQuery = simpleQuery.in('condition', options.condition);
        }
        
        if (options.location) {
          simpleQuery = simpleQuery.ilike('location', `%${options.location}%`);
        }

        const { data: simpleData, error: simpleError } = await simpleQuery
          .order('created_at', { ascending: false })
          .limit(options.limit || 20);
        
        return { data: simpleData, error: simpleError };
      }
      
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },


  // Device token operations
  async registerDeviceToken(tokenData: any) {
    const { data, error } = await db.device_tokens.insert(tokenData).select().single();
    return { data, error };
  },

  // Offer operations
  async testOfferConnection() {
    console.log('🎯 Testing offer database connection...');
    const { data, error } = await db.offers.select('id').limit(1);
    console.log('🎯 Test connection result:', { data, error });
    return { data, error };
  },

  async updateOfferStatus(offerId: string, status: string) {
    console.log('🎯 updateOfferStatus called:', { offerId, status, type: typeof offerId });
    
    // First check if the offer exists with more detailed logging
    console.log('🎯 Querying offers table for ID:', offerId);
    const { data: existingOffers, error: checkError } = await db.offers
      .select('id, status, buyer_id, seller_id, created_at, updated_at')
      .eq('id', offerId);
    
    console.log('🎯 Check offer query result:', { 
      existingOffers, 
      checkError, 
      count: existingOffers?.length || 0,
      queryUsed: `SELECT * FROM offers WHERE id = '${offerId}'`
    });
    
    if (checkError) {
      console.log('🎯 Error checking offer:', { offerId, checkError });
      return { data: null, error: { message: 'Error checking offer status' } };
    }
    
    if (!existingOffers || existingOffers.length === 0) {
      console.log('🎯 Offer not found in database:', { offerId });
      
      // Let's also check all offers to see what's in the database
      const { data: allOffers, error: allError } = await db.offers
        .select('id, status, created_at')
        .limit(10);
      console.log('🎯 All offers in database:', { allOffers, allError });
      
      // Let's also try a different approach - check if the ID format is correct
      const { data: similarOffers, error: similarError } = await db.offers
        .select('id, status, created_at')
        .ilike('id', `%${offerId.slice(-8)}%`); // Check for similar IDs
      console.log('🎯 Similar offers found:', { similarOffers, similarError });
      
      return { data: null, error: { message: 'Offer not found or has been deleted' } };
    }
    
    console.log('🎯 Found existing offer:', existingOffers[0]);
    
    // Now update the offer with more detailed logging
    console.log('🎯 Attempting to update offer:', { offerId, status });
    const { data, error } = await db.offers.update({ status }, offerId).select();
    console.log('🎯 updateOfferStatus result:', { data, error });
    
    if (error) {
      console.log('🎯 Update error details:', error);
      return { data: null, error };
    }
    
    if (!data || data.length === 0) {
      console.log('🎯 No rows updated for offer:', { offerId, status });
      return { data: null, error: { message: 'Failed to update offer' } };
    }
    
    console.log('🎯 Successfully updated offer:', data[0]);
    return { data: data[0], error: null };
  },
};