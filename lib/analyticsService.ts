import { useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface AnalyticsData {
  // Overview metrics
  totalListings: number;
  activeListings: number;
  totalViews: number;
  totalMessages: number;
  totalOffers: number;
  totalReviews: number;
  averageRating: number;
  
  // Time-based metrics
  viewsThisWeek: number;
  viewsLastWeek: number;
  messagesThisWeek: number;
  messagesLastWeek: number;
  
  // Performance metrics
  conversionRate: number; // messages/views
  responseRate: number; // responded messages/total messages
  
  // Listing performance
  topPerformingListings: Array<{
    id: string;
    title: string;
    views: number;
    messages: number;
    offers: number;
  }>;
  
  // Engagement trends (last 7 days)
  dailyViews: Array<{
    date: string;
    views: number;
    messages: number;
  }>;
  
  // Category performance
  categoryPerformance: Array<{
    category: string;
    listings: number;
    views: number;
    messages: number;
  }>;
}

export interface QuickStats {
  profileViews: number;
  totalMessages: number;
  totalReviews: number;
  averageRating: number;
}

class AnalyticsService {
  /**
   * Get comprehensive analytics data for business users
   */
  async getBusinessAnalytics(userId: string): Promise<AnalyticsData> {
    try {
      // Get all analytics data in parallel
      const [
        listingsData,
        viewsData,
        messagesData,
        offersData,
        reviewsData,
        trendsData,
        categoryData
      ] = await Promise.all([
        this.getListingsAnalytics(userId),
        this.getViewsAnalytics(userId),
        this.getMessagesAnalytics(userId),
        this.getOffersAnalytics(userId),
        this.getReviewsAnalytics(userId),
        this.getTrendsAnalytics(userId),
        this.getCategoryAnalytics(userId)
      ]);

      return {
        // Overview metrics
        totalListings: listingsData.total,
        activeListings: listingsData.active,
        totalViews: viewsData.total,
        totalMessages: messagesData.total,
        totalOffers: offersData.total,
        totalReviews: reviewsData.total,
        averageRating: reviewsData.averageRating,
        
        // Time-based metrics
        viewsThisWeek: viewsData.thisWeek,
        viewsLastWeek: viewsData.lastWeek,
        messagesThisWeek: messagesData.thisWeek,
        messagesLastWeek: messagesData.lastWeek,
        
        // Performance metrics
        conversionRate: viewsData.total > 0 ? (messagesData.total / viewsData.total) * 100 : 0,
        responseRate: messagesData.total > 0 ? (messagesData.responded / messagesData.total) * 100 : 0,
        
        // Detailed data
        topPerformingListings: listingsData.topPerforming,
        dailyViews: trendsData,
        categoryPerformance: categoryData,
      };
    } catch (error) {
      console.error('Error fetching business analytics:', error);
      throw error;
    }
  }

  /**
   * Get quick stats for dashboard overview
   */
  async getQuickStats(userId: string): Promise<QuickStats> {
    try {
      const [profileViews, messages, reviews] = await Promise.all([
        this.getProfileViews(userId),
        this.getTotalMessages(userId),
        this.getReviewsAnalytics(userId)
      ]);

      return {
        profileViews: profileViews,
        totalMessages: messages,
        totalReviews: reviews.total,
        averageRating: reviews.averageRating,
      };
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      return {
        profileViews: 0,
        totalMessages: 0,
        totalReviews: 0,
        averageRating: 0,
      };
    }
  }

  private async getListingsAnalytics(userId: string) {
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        status,
        created_at,
        listing_views (count),
        conversations (count),
        offers (count)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const total = listings?.length || 0;
    const active = listings?.filter(l => l.status === 'active').length || 0;
    
    // Get top performing listings
    const topPerforming = listings
      ?.map(listing => ({
        id: listing.id,
        title: listing.title,
        views: listing.listing_views?.[0]?.count || 0,
        messages: listing.conversations?.[0]?.count || 0,
        offers: listing.offers?.[0]?.count || 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5) || [];

    return { total, active, topPerforming };
  }

  private async getViewsAnalytics(userId: string) {
    // Get user's listing IDs first
    const { data: userListings, error: listingsError } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', userId);

    if (listingsError) throw listingsError;

    const listingIds = userListings?.map(l => l.id) || [];

    // Get total views for user's listings
    const { data: totalViews, error: totalError } = await supabase
      .from('listing_views')
      .select('id', { count: 'exact' })
      .in('listing_id', listingIds);

    if (totalError) throw totalError;

    // Get views this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const { data: thisWeekViews, error: weekError } = await supabase
      .from('listing_views')
      .select('id', { count: 'exact' })
      .in('listing_id', listingIds)
      .gte('created_at', oneWeekAgo.toISOString());

    if (weekError) throw weekError;

    // Get views last week
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const { data: lastWeekViews, error: lastWeekError } = await supabase
      .from('listing_views')
      .select('id', { count: 'exact' })
      .in('listing_id', listingIds)
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', oneWeekAgo.toISOString());

    if (lastWeekError) throw lastWeekError;

    return {
      total: totalViews?.length || 0,
      thisWeek: thisWeekViews?.length || 0,
      lastWeek: lastWeekViews?.length || 0,
    };
  }

  private async getMessagesAnalytics(userId: string) {
    // Get total messages for user's listings
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        created_at,
        sender_id,
        conversation:conversations!inner(
          listing:listings!inner(user_id)
        )
      `)
      .eq('conversation.listing.user_id', userId);

    if (error) throw error;

    const total = messages?.length || 0;
    
    // Calculate this week vs last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeek = messages?.filter(m => 
      new Date(m.created_at) >= oneWeekAgo
    ).length || 0;
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const lastWeek = messages?.filter(m => {
      const date = new Date(m.created_at);
      return date >= twoWeeksAgo && date < oneWeekAgo;
    }).length || 0;

    // Calculate response rate (simplified - messages from seller)
    const responded = messages?.filter(m => m.sender_id === userId).length || 0;

    return { total, thisWeek, lastWeek, responded };
  }

  private async getOffersAnalytics(userId: string) {
    // Get user's listing IDs first
    const { data: userListings, error: listingsError } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', userId);

    if (listingsError) throw listingsError;

    const listingIds = userListings?.map(l => l.id) || [];

    const { data: offers, error } = await supabase
      .from('offers')
      .select('id', { count: 'exact' })
      .in('listing_id', listingIds);

    if (error) throw error;

    return { total: offers?.length || 0 };
  }

  private async getReviewsAnalytics(userId: string) {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewed_user_id', userId);

    if (error) throw error;

    const total = reviews?.length || 0;
    const averageRating = total > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total 
      : 0;

    return { total, averageRating };
  }

  private async getTrendsAnalytics(userId: string) {
    // Get user's listing IDs first
    const { data: userListings, error: listingsError } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', userId);

    if (listingsError) throw listingsError;

    const listingIds = userListings?.map(l => l.id) || [];

    // Get daily views for the last 7 days
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data: views, error: viewsError } = await supabase
        .from('listing_views')
        .select('id', { count: 'exact' })
        .in('listing_id', listingIds)
        .gte('created_at', `${dateStr}T00:00:00.000Z`)
        .lt('created_at', `${dateStr}T23:59:59.999Z`);

      // Get conversation IDs for user's listings
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('id')
        .in('listing_id', listingIds);

      if (conversationsError) throw conversationsError;

      const conversationIds = conversations?.map(c => c.id) || [];

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .in('conversation_id', conversationIds)
        .gte('created_at', `${dateStr}T00:00:00.000Z`)
        .lt('created_at', `${dateStr}T23:59:59.999Z`);

      trends.push({
        date: dateStr,
        views: views?.length || 0,
        messages: messages?.length || 0,
      });
    }

    return trends;
  }

  private async getCategoryAnalytics(userId: string) {
    const { data: categoryData, error } = await supabase
      .from('listings')
      .select(`
        category:categories(name),
        listing_views(count),
        conversations(count)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Group by category
    const categoryMap = new Map();
    categoryData?.forEach(listing => {
      const categoryName = (listing.category as any)?.name || 'Uncategorized';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          category: categoryName,
          listings: 0,
          views: 0,
          messages: 0,
        });
      }
      
      const category = categoryMap.get(categoryName);
      category.listings += 1;
      category.views += listing.listing_views?.[0]?.count || 0;
      category.messages += listing.conversations?.[0]?.count || 0;
    });

    return Array.from(categoryMap.values());
  }

  private async getProfileViews(userId: string): Promise<number> {
    // This would need a profile_views table or similar
    // For now, return 0 as placeholder
    return 0;
  }

  private async getTotalMessages(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .in('conversation_id', []); // TODO: Fix nested query

    if (error) {
      console.error('Error fetching total messages:', error);
      return 0;
    }

    return data?.length || 0;
  }
}

export const analyticsService = new AnalyticsService();

// Helper hook for using analytics in components
export function useAnalytics(userId?: string) {
  const { user } = useAuthStore();
  const actualUserId = userId || user?.id;

  const getBusinessAnalytics = useCallback(async () => {
    if (!actualUserId) throw new Error('User ID required');
    return await analyticsService.getBusinessAnalytics(actualUserId);
  }, [actualUserId]);

  const getQuickStats = useCallback(async () => {
    if (!actualUserId) throw new Error('User ID required');
    return await analyticsService.getQuickStats(actualUserId);
  }, [actualUserId]);

  return useMemo(() => ({
    getBusinessAnalytics,
    getQuickStats,
  }), [getBusinessAnalytics, getQuickStats]);
}
