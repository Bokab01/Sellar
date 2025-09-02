import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for common database operations
export const dbHelpers = {
  // Profile operations
  async createProfile(userId: string, userData: {
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone || null,
        location: userData.location || 'Accra, Greater Accra',
      })
      .select()
      .single();
    
    return { data, error };
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { data, error };
  },

  async updateProfile(userId: string, updates: Database['public']['Tables']['profiles']['Update']) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
  },

  // Listings operations
  async getListings(filters?: {
    category?: string;
    location?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: string[];
    search?: string;
    limit?: number;
    offset?: number;
    userId?: string;
  }) {
    // First, try the joined query
    let query = supabase
      .from('listings')
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          avatar_url,
          rating,
          is_verified
        ),
        categories (
          name,
          icon
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters?.priceMin !== undefined) {
      query = query.gte('price', filters.priceMin);
    }

    if (filters?.priceMax !== undefined) {
      query = query.lte('price', filters.priceMax);
    }

    if (filters?.condition && filters.condition.length > 0) {
      query = query.in('condition', filters.condition);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;
    
    // If the joined query fails due to schema cache issues, fall back to separate queries
    if (error && error.message.includes('schema cache')) {
      console.log('🔄 Falling back to separate queries due to schema cache issue');
      
      // Get listings without joins
      let fallbackQuery = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Apply the same filters
      if (filters?.category) {
        fallbackQuery = fallbackQuery.eq('category_id', filters.category);
      }
      if (filters?.location) {
        fallbackQuery = fallbackQuery.ilike('location', `%${filters.location}%`);
      }
      if (filters?.priceMin !== undefined) {
        fallbackQuery = fallbackQuery.gte('price', filters.priceMin);
      }
      if (filters?.priceMax !== undefined) {
        fallbackQuery = fallbackQuery.lte('price', filters.priceMax);
      }
      if (filters?.condition && filters.condition.length > 0) {
        fallbackQuery = fallbackQuery.in('condition', filters.condition);
      }
      if (filters?.search) {
        fallbackQuery = fallbackQuery.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.userId) {
        fallbackQuery = fallbackQuery.eq('user_id', filters.userId);
      }
      if (filters?.limit) {
        fallbackQuery = fallbackQuery.limit(filters.limit);
      }
      if (filters?.offset) {
        fallbackQuery = fallbackQuery.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data: listingsData, error: listingsError } = await fallbackQuery;
      
      if (listingsError) {
        return { data: null, error: listingsError };
      }

      if (!listingsData || listingsData.length === 0) {
        return { data: [], error: null };
      }

      // Get unique user IDs and category IDs
      const userIds = [...new Set(listingsData.map(listing => listing.user_id))];
      const categoryIds = [...new Set(listingsData.map(listing => listing.category_id))];

      // Fetch profiles and categories separately
      const [profilesResult, categoriesResult] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, avatar_url, rating, is_verified').in('id', userIds),
        supabase.from('categories').select('id, name, icon').in('id', categoryIds)
      ]);

      // Create lookup maps
      const profilesMap = new Map();
      if (profilesResult.data) {
        profilesResult.data.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const categoriesMap = new Map();
      if (categoriesResult.data) {
        categoriesResult.data.forEach(category => {
          categoriesMap.set(category.id, category);
        });
      }

      // Combine the data
      const combinedData = listingsData.map(listing => ({
        ...listing,
        profiles: profilesMap.get(listing.user_id) || null,
        categories: categoriesMap.get(listing.category_id) || null
      }));

      return { data: combinedData, error: null };
    }
    
    return { data, error };
  },

  async createListing(listing: Database['public']['Tables']['listings']['Insert']) {
    const { data, error } = await supabase
      .from('listings')
      .insert(listing)
      .select()
      .single();
    
    return { data, error };
  },

  // Chat operations
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1_profile:participant_1 (
          id,
          first_name,
          last_name,
          avatar_url,
          is_online,
          last_seen
        ),
        participant_2_profile:participant_2 (
          id,
          first_name,
          last_name,
          avatar_url,
          is_online,
          last_seen
        ),
        listings (
          id,
          title,
          price,
          images
        ),
        messages (
          content,
          message_type,
          created_at
        )
      `)
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    return { data, error };
  },

  async getMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        offers (
          id,
          amount,
          currency,
          status,
          expires_at
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    return { data, error };
  },

  async sendMessage(message: Database['public']['Tables']['messages']['Insert']) {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();
    
    return { data, error };
  },

  // Categories
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    return { data, error };
  },

  // Community operations
  async getPosts(filters?: {
    userId?: string;
    following?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          avatar_url,
          rating,
          is_verified
        ),
        listings:listing_id (
          id,
          title,
          price,
          images
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async createPost(post: Database['public']['Tables']['posts']['Insert']) {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select()
      .single();
    
    return { data, error };
  },

  // Comments operations
  async getComments(postId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    return { data, error };
  },

  async createComment(comment: Database['public']['Tables']['comments']['Insert']) {
    const { data, error } = await supabase
      .from('comments')
      .insert(comment)
      .select()
      .single();
    
    return { data, error };
  },

  // Likes operations
  async toggleLike(userId: string, postId?: string, commentId?: string) {
    try {
      // Check if already liked
      let query = supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId);

      if (postId) {
        query = query.eq('post_id', postId);
      } else if (commentId) {
        query = query.eq('comment_id', commentId);
      }

      const { data: existingLike } = await query.single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);
        
        return { data: { action: 'unliked' }, error };
      } else {
        // Like
        const { data, error } = await supabase
          .from('likes')
          .insert({
            user_id: userId,
            post_id: postId || null,
            comment_id: commentId || null,
          })
          .select()
          .single();
        
        return { data: { action: 'liked', ...data }, error };
      }
    } catch (error) {
      return { data: null, error };
    }
  },

  // Follow operations
  async toggleFollow(followerId: string, followingId: string) {
    try {
      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      if (existingFollow) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('id', existingFollow.id);
        
        return { data: { action: 'unfollowed' }, error };
      } else {
        // Follow
        const { data, error } = await supabase
          .from('follows')
          .insert({
            follower_id: followerId,
            following_id: followingId,
          })
          .select()
          .single();
        
        return { data: { action: 'followed', ...data }, error };
      }
    } catch (error) {
      return { data: null, error };
    }
  },

  // Reports operations
  async createReport(report: Database['public']['Tables']['reports']['Insert']) {
    const { data, error } = await supabase
      .from('reports')
      .insert(report)
      .select()
      .single();
    
    return { data, error };
  },

  // Callback requests
  async createCallbackRequest(request: {
    listing_id: string;
    requester_id: string;
    seller_id: string;
    phone_number: string;
    preferred_time?: string;
    message?: string;
  }) {
    const { data, error } = await supabase
      .from('callback_requests')
      .insert(request)
      .select()
      .single();
    
    return { data, error };
  },

  async getCallbackRequests(userId: string, listingId?: string) {
    let query = supabase
      .from('callback_requests')
      .select(`
        *,
        requester:requester_id (
          first_name,
          last_name,
          avatar_url
        ),
        listings (
          title
        )
      `)
      .or(`requester_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (listingId) {
      query = query.eq('listing_id', listingId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async updateCallbackStatus(callbackId: string, status: string) {
    const { data, error } = await supabase
      .from('callback_requests')
      .update({ status })
      .eq('id', callbackId)
      .select()
      .single();
    
    return { data, error };
  },

  // Offers operations
  async createOffer(offer: Database['public']['Tables']['offers']['Insert']) {
    const { data, error } = await supabase
      .from('offers')
      .insert(offer)
      .select()
      .single();
    
    return { data, error };
  },

  async updateOfferStatus(offerId: string, status: string) {
    const { data, error } = await supabase
      .from('offers')
      .update({ status })
      .eq('id', offerId)
      .select()
      .single();
    
    return { data, error };
  },

  async getOffersByListing(listingId: string, userId?: string) {
    let query = supabase
      .from('offers')
      .select(`
        *,
        buyer:buyer_id (
          id,
          first_name,
          last_name,
          avatar_url,
          rating
        ),
        seller:seller_id (
          id,
          first_name,
          last_name,
          avatar_url,
          rating
        ),
        messages (
          id,
          content,
          created_at
        )
      `)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Notification operations
  async createNotification(notification: Database['public']['Tables']['notifications']['Insert']) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    
    return { data, error };
  },

  async getNotifications(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  },

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();
    
    return { data, error };
  },

  async markAllNotificationsAsRead(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    return { data, error };
  },

  // Wallet and transaction operations
  async getTransactions(userId: string, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        related_listing:related_listing_id (
          title,
          images
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error };
  },

  async createTransaction(transaction: Database['public']['Tables']['transactions']['Insert']) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    
    return { data, error };
  },

  // User verification operations
  async submitVerification(verification: Database['public']['Tables']['user_verification']['Insert']) {
    const { data, error } = await supabase
      .from('user_verification')
      .insert(verification)
      .select()
      .single();
    
    return { data, error };
  },

  async getVerificationStatus(userId: string) {
    const { data, error } = await supabase
      .from('user_verification')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return { data, error };
  },

  // App settings operations
  async getAppSettings() {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('is_public', true);

    return { data, error };
  },

  // User settings operations
  async getUserSettings(userId: string) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    return { data, error };
  },

  async updateUserSettings(userId: string, updates: Database['public']['Tables']['user_settings']['Update']) {
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    return { data, error };
  },

};