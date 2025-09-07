import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase client without complex typing
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Type-safe database operations
export const db = {
  // Profiles
  profiles: {
    insert: (data: any) => supabase.from('profiles').insert(data),
    update: (data: any, id: string) => supabase.from('profiles').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('profiles').select(columns),
    delete: (id: string) => supabase.from('profiles').delete().eq('id', id),
  },
  
  // Listings
  listings: {
    insert: (data: any) => supabase.from('listings').insert(data),
    update: (data: any, id: string) => supabase.from('listings').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('listings').select(columns),
    delete: (id: string) => supabase.from('listings').delete().eq('id', id),
  },
  
  // Messages
  messages: {
    insert: (data: any) => supabase.from('messages').insert(data),
    update: (data: any, id: string) => supabase.from('messages').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('messages').select(columns),
    delete: (id: string) => supabase.from('messages').delete().eq('id', id),
  },
  
  // Posts
  posts: {
    insert: (data: any) => supabase.from('posts').insert(data),
    update: (data: any, id: string) => supabase.from('posts').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('posts').select(columns),
    delete: (id: string) => supabase.from('posts').delete().eq('id', id),
  },
  
  // Comments
  comments: {
    insert: (data: any) => supabase.from('comments').insert(data),
    update: (data: any, id: string) => supabase.from('comments').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('comments').select(columns),
    delete: (id: string) => supabase.from('comments').delete().eq('id', id),
  },
  
  // Likes
  likes: {
    insert: (data: any) => supabase.from('likes').insert(data),
    update: (data: any, id: string) => supabase.from('likes').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('likes').select(columns),
    delete: (id: string) => supabase.from('likes').delete().eq('id', id),
  },
  
  // Follows
  follows: {
    insert: (data: any) => supabase.from('follows').insert(data),
    update: (data: any, id: string) => supabase.from('follows').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('follows').select(columns),
    delete: (id: string) => supabase.from('follows').delete().eq('id', id),
  },
  
  // Reports
  reports: {
    insert: (data: any) => supabase.from('reports').insert(data),
    update: (data: any, id: string) => supabase.from('reports').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('reports').select(columns),
    delete: (id: string) => supabase.from('reports').delete().eq('id', id),
  },
  
  // Callback requests
  callback_requests: {
    insert: (data: any) => supabase.from('callback_requests').insert(data),
    update: (data: any, id: string) => supabase.from('callback_requests').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('callback_requests').select(columns),
    delete: (id: string) => supabase.from('callback_requests').delete().eq('id', id),
  },
  
  // Offers
  offers: {
    insert: (data: any) => supabase.from('offers').insert(data),
    update: (data: any, id: string) => supabase.from('offers').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('offers').select(columns),
    delete: (id: string) => supabase.from('offers').delete().eq('id', id),
  },
  
  // Notifications
  notifications: {
    insert: (data: any) => supabase.from('notifications').insert(data),
    update: (data: any, id?: string) => {
      const query = supabase.from('notifications').update(data);
      return id ? query.eq('id', id) : query;
    },
    select: (columns = '*') => supabase.from('notifications').select(columns),
    delete: (id: string) => supabase.from('notifications').delete().eq('id', id),
  },
  
  // Device tokens
  device_tokens: {
    insert: (data: any) => supabase.from('device_tokens').insert(data),
    update: (data: any, id?: string) => {
      const query = supabase.from('device_tokens').update(data);
      return id ? query.eq('id', id) : query;
    },
    select: (columns = '*') => supabase.from('device_tokens').select(columns),
    delete: (id: string) => supabase.from('device_tokens').delete().eq('id', id),
    upsert: (data: any, options?: any) => supabase.from('device_tokens').upsert(data, options),
  },
  
  // Transactions
  transactions: {
    insert: (data: any) => supabase.from('transactions').insert(data),
    update: (data: any, id: string) => supabase.from('transactions').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('transactions').select(columns),
    delete: (id: string) => supabase.from('transactions').delete().eq('id', id),
  },
  
  // User verification
  user_verification: {
    insert: (data: any) => supabase.from('user_verification').insert(data),
    update: (data: any, id: string) => supabase.from('user_verification').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('user_verification').select(columns),
    delete: (id: string) => supabase.from('user_verification').delete().eq('id', id),
  },
  
  // User settings
  user_settings: {
    insert: (data: any) => supabase.from('user_settings').insert(data),
    update: (data: any, id: string) => supabase.from('user_settings').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('user_settings').select(columns),
    delete: (id: string) => supabase.from('user_settings').delete().eq('id', id),
  },
  
  // User subscriptions
  user_subscriptions: {
    insert: (data: any) => supabase.from('user_subscriptions').insert(data),
    update: (data: any, id: string) => supabase.from('user_subscriptions').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('user_subscriptions').select(columns),
    delete: (id: string) => supabase.from('user_subscriptions').delete().eq('id', id),
  },
  
  // Transaction categories
  transaction_categories: {
    insert: (data: any) => supabase.from('transaction_categories').insert(data),
    update: (data: any, id: string) => supabase.from('transaction_categories').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('transaction_categories').select(columns),
    delete: (id: string) => supabase.from('transaction_categories').delete().eq('id', id),
  },
  
  // Transaction receipts
  transaction_receipts: {
    insert: (data: any) => supabase.from('transaction_receipts').insert(data),
    update: (data: any, id: string) => supabase.from('transaction_receipts').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('transaction_receipts').select(columns),
    delete: (id: string) => supabase.from('transaction_receipts').delete().eq('id', id),
  },
  
  // Transaction notifications
  transaction_notifications: {
    insert: (data: any) => supabase.from('transaction_notifications').insert(data),
    update: (data: any, id: string) => supabase.from('transaction_notifications').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('transaction_notifications').select(columns),
    delete: (id: string) => supabase.from('transaction_notifications').delete().eq('id', id),
  },
  
  // Security Events
  security_events: {
    insert: (data: any) => supabase.from('security_events').insert(data),
    update: (data: any, id: string) => supabase.from('security_events').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('security_events').select(columns),
    delete: (id: string) => supabase.from('security_events').delete().eq('id', id),
  },
  
  // Credit packages
  credit_packages: {
    insert: (data: any) => supabase.from('credit_packages').insert(data),
    update: (data: any, id: string) => supabase.from('credit_packages').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('credit_packages').select(columns),
    delete: (id: string) => supabase.from('credit_packages').delete().eq('id', id),
  },
  
  // Credit purchases
  credit_purchases: {
    insert: (data: any) => supabase.from('credit_purchases').insert(data),
    update: (data: any, id: string) => supabase.from('credit_purchases').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('credit_purchases').select(columns),
    delete: (id: string) => supabase.from('credit_purchases').delete().eq('id', id),
  },
  
  // Categories
  categories: {
    insert: (data: any) => supabase.from('categories').insert(data),
    update: (data: any, id: string) => supabase.from('categories').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('categories').select(columns),
    delete: (id: string) => supabase.from('categories').delete().eq('id', id),
  },
  
  // Conversations
  conversations: {
    insert: (data: any) => supabase.from('conversations').insert(data),
    update: (data: any, id: string) => supabase.from('conversations').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('conversations').select(columns),
    delete: (id: string) => supabase.from('conversations').delete().eq('id', id),
  },
  
  // Reviews
  reviews: {
    insert: (data: any) => supabase.from('reviews').insert(data),
    update: (data: any, id: string) => supabase.from('reviews').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('reviews').select(columns),
    delete: (id: string) => supabase.from('reviews').delete().eq('id', id),
  },
  
  // Favorites
  favorites: {
    insert: (data: any) => supabase.from('favorites').insert(data),
    update: (data: any, id: string) => supabase.from('favorites').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('favorites').select(columns),
    delete: (id: string) => supabase.from('favorites').delete().eq('id', id),
  },
  
  // Listing views
  listing_views: {
    insert: (data: any) => supabase.from('listing_views').insert(data),
    update: (data: any, id: string) => supabase.from('listing_views').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('listing_views').select(columns),
    delete: (id: string) => supabase.from('listing_views').delete().eq('id', id),
  },
  
  // Blocked users
  blocked_users: {
    insert: (data: any) => supabase.from('blocked_users').insert(data),
    update: (data: any, id: string) => supabase.from('blocked_users').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('blocked_users').select(columns),
    delete: (id: string) => supabase.from('blocked_users').delete().eq('id', id),
  },
  
  // Shares
  shares: {
    insert: (data: any) => supabase.from('shares').insert(data),
    update: (data: any, id: string) => supabase.from('shares').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('shares').select(columns),
    delete: (id: string) => supabase.from('shares').delete().eq('id', id),
  },
  
  // Push notification queue
  push_notification_queue: {
    insert: (data: any) => supabase.from('push_notification_queue').insert(data),
    update: (data: any, id: string) => supabase.from('push_notification_queue').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('push_notification_queue').select(columns),
    delete: (id: string) => supabase.from('push_notification_queue').delete().eq('id', id),
  },
  
  // Notification preferences
  notification_preferences: {
    insert: (data: any) => supabase.from('notification_preferences').insert(data),
    update: (data: any, id: string) => supabase.from('notification_preferences').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('notification_preferences').select(columns),
    delete: (id: string) => supabase.from('notification_preferences').delete().eq('id', id),
  },
  
  // App settings
  app_settings: {
    insert: (data: any) => supabase.from('app_settings').insert(data),
    update: (data: any, id: string) => supabase.from('app_settings').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('app_settings').select(columns),
    delete: (id: string) => supabase.from('app_settings').delete().eq('id', id),
  },
  
  // User credits
  user_credits: {
    insert: (data: any) => supabase.from('user_credits').insert(data),
    update: (data: any, id: string) => supabase.from('user_credits').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('user_credits').select(columns),
    delete: (id: string) => supabase.from('user_credits').delete().eq('id', id),
  },
  
  // Credit transactions
  credit_transactions: {
    insert: (data: any) => supabase.from('credit_transactions').insert(data),
    update: (data: any, id: string) => supabase.from('credit_transactions').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('credit_transactions').select(columns),
    delete: (id: string) => supabase.from('credit_transactions').delete().eq('id', id),
  },
  
  // Subscription plans
  subscription_plans: {
    insert: (data: any) => supabase.from('subscription_plans').insert(data),
    update: (data: any, id: string) => supabase.from('subscription_plans').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('subscription_plans').select(columns),
    delete: (id: string) => supabase.from('subscription_plans').delete().eq('id', id),
  },
  
  // Community rewards
  community_rewards: {
    insert: (data: any) => supabase.from('community_rewards').insert(data),
    update: (data: any, id: string) => supabase.from('community_rewards').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('community_rewards').select(columns),
    delete: (id: string) => supabase.from('community_rewards').delete().eq('id', id),
  },
  
  // User achievements
  user_achievements: {
    insert: (data: any) => supabase.from('user_achievements').insert(data),
    update: (data: any, id: string) => supabase.from('user_achievements').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('user_achievements').select(columns),
    delete: (id: string) => supabase.from('user_achievements').delete().eq('id', id),
  },
  
  // Paystack transactions
  paystack_transactions: {
    insert: (data: any) => supabase.from('paystack_transactions').insert(data),
    update: (data: any, id: string) => supabase.from('paystack_transactions').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('paystack_transactions').select(columns),
    delete: (id: string) => supabase.from('paystack_transactions').delete().eq('id', id),
  },
  
  // Search analytics
  search_analytics: {
    insert: (data: any) => supabase.from('search_analytics').insert(data),
    update: (data: any, id: string) => supabase.from('search_analytics').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('search_analytics').select(columns),
    delete: (id: string) => supabase.from('search_analytics').delete().eq('id', id),
  },
  
  // Subscription change log
  subscription_change_log: {
    insert: (data: any) => supabase.from('subscription_change_log').insert(data),
    update: (data: any, id: string) => supabase.from('subscription_change_log').update(data).eq('id', id),
    select: (columns = '*') => supabase.from('subscription_change_log').select(columns),
    delete: (id: string) => supabase.from('subscription_change_log').delete().eq('id', id),
  },
};

// RPC functions with proper typing
export const rpc = {
  queue_push_notification: (params: any) => supabase.rpc('queue_push_notification', params),
  get_user_notification_preferences: (params: any) => supabase.rpc('get_user_notification_preferences', params),
  update_notification_preferences: (params: any) => supabase.rpc('update_notification_preferences', params),
  claim_referral_bonus: (params: any) => supabase.rpc('claim_referral_bonus', params),
  get_user_followers: (params: any) => supabase.rpc('get_user_followers', params),
  get_user_following: (params: any) => supabase.rpc('get_user_following', params),
  follow_user: (params: any) => supabase.rpc('follow_user', params),
  unfollow_user: (params: any) => supabase.rpc('unfollow_user', params),
  spend_user_credits: (params: any) => supabase.rpc('spend_user_credits', params),
  purchase_feature: (params: any) => supabase.rpc('purchase_feature', params),
  get_user_entitlements: (params: any) => supabase.rpc('get_user_entitlements', params),
  get_user_reward_summary: (params: any) => supabase.rpc('get_user_reward_summary', params),
  claim_anniversary_bonus: (params: any) => supabase.rpc('claim_anniversary_bonus', params),
  add_user_credits: (params: any) => supabase.rpc('add_user_credits', params),
};