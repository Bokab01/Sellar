import { supabase } from './supabase';

export interface OfferAnalytics {
  totalOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
  expiredOffers: number;
  counterOffers: number;
  acceptanceRate: number;
  averageOfferAmount: number;
  averageNegotiationTime: number; // in hours
  topOfferCategories: Array<{ category: string; count: number; avgAmount: number }>;
  monthlyTrends: Array<{ month: string; offers: number; accepted: number; avgAmount: number }>;
}

export interface UserOfferStats {
  userId: string;
  userType: 'buyer' | 'seller';
  totalOffers: number;
  successfulOffers: number;
  averageOfferAmount: number;
  averageResponseTime: number; // in hours
  preferredCategories: string[];
  negotiationStyle: 'aggressive' | 'moderate' | 'conservative';
  bestOfferAcceptanceRate: number;
}

export interface OfferInsight {
  type: 'success_factor' | 'improvement_tip' | 'market_trend' | 'pricing_suggestion';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

export interface OfferHistoryItem {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  offerAmount: number;
  status: string;
  createdAt: string;
  respondedAt?: string;
  expiresAt: string;
  otherParty: {
    name: string;
    avatar?: string;
    rating?: number;
  };
  negotiationChain?: OfferHistoryItem[];
  responseTime?: number; // in hours
}

class OfferAnalyticsService {
  /**
   * Get comprehensive offer analytics for admin dashboard
   */
  async getOfferAnalytics(
    startDate?: string,
    endDate?: string,
    categoryId?: string
  ): Promise<OfferAnalytics> {
    try {
      const now = new Date();
      const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
      const defaultEndDate = endDate || now.toISOString();

      // Base query
      let query = supabase
        .from('offers')
        .select(`
          *,
          listings!inner(category_id, categories!inner(name))
        `)
        .gte('created_at', defaultStartDate)
        .lte('created_at', defaultEndDate);

      if (categoryId) {
        query = query.eq('listings.category_id', categoryId);
      }

      const { data: offers } = await query as { data: any[] | null };

      if (!offers || offers.length === 0) {
        return this.getEmptyAnalytics();
      }

      // Calculate basic metrics
      const totalOffers = offers.length;
      const acceptedOffers = offers.filter(o => o.status === 'accepted').length;
      const rejectedOffers = offers.filter(o => o.status === 'rejected').length;
      const expiredOffers = offers.filter(o => o.status === 'expired').length;
      const counterOffers = offers.filter(o => o.parent_offer_id !== null).length;

      const acceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;
      const averageOfferAmount = offers.reduce((sum, o) => sum + o.amount, 0) / totalOffers;

      // Calculate average negotiation time
      const respondedOffers = offers.filter(o => o.responded_at);
      const averageNegotiationTime = respondedOffers.length > 0
        ? respondedOffers.reduce((sum, o) => {
            const created = new Date(o.created_at);
            const responded = new Date(o.responded_at!);
            return sum + (responded.getTime() - created.getTime()) / (1000 * 60 * 60);
          }, 0) / respondedOffers.length
        : 0;

      // Top categories
      const categoryStats = offers.reduce((acc, offer) => {
        const category = offer.listings.categories.name;
        if (!acc[category]) {
          acc[category] = { count: 0, totalAmount: 0 };
        }
        acc[category].count++;
        acc[category].totalAmount += offer.amount;
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number }>);

      const topOfferCategories = Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category,
          count: stats.count,
          avgAmount: stats.totalAmount / stats.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Monthly trends
      const monthlyData = offers.reduce((acc, offer) => {
        const month = new Date(offer.created_at).toISOString().substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { offers: 0, accepted: 0, totalAmount: 0 };
        }
        acc[month].offers++;
        acc[month].totalAmount += offer.amount;
        if (offer.status === 'accepted') {
          acc[month].accepted++;
        }
        return acc;
      }, {} as Record<string, { offers: number; accepted: number; totalAmount: number }>);

      const monthlyTrends = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          offers: data.offers,
          accepted: data.accepted,
          avgAmount: data.totalAmount / data.offers,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        totalOffers,
        acceptedOffers,
        rejectedOffers,
        expiredOffers,
        counterOffers,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        averageOfferAmount: Math.round(averageOfferAmount * 100) / 100,
        averageNegotiationTime: Math.round(averageNegotiationTime * 100) / 100,
        topOfferCategories,
        monthlyTrends,
      };
    } catch (error) {
      console.error('Get offer analytics error:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get user-specific offer statistics
   */
  async getUserOfferStats(userId: string, userType: 'buyer' | 'seller'): Promise<UserOfferStats> {
    try {
      const column = userType === 'buyer' ? 'buyer_id' : 'seller_id';
      
      const { data: offers } = await supabase
        .from('offers')
        .select(`
          *,
          listings!inner(category_id, categories!inner(name))
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false }) as { data: any[] | null };

      if (!offers || offers.length === 0) {
        return this.getEmptyUserStats(userId, userType);
      }

      const totalOffers = offers.length;
      const successfulOffers = offers.filter(o => o.status === 'accepted').length;
      const averageOfferAmount = offers.reduce((sum, o) => sum + o.amount, 0) / totalOffers;

      // Calculate average response time (for sellers)
      const respondedOffers = offers.filter(o => o.responded_at);
      const averageResponseTime = respondedOffers.length > 0
        ? respondedOffers.reduce((sum, o) => {
            const created = new Date(o.created_at);
            const responded = new Date(o.responded_at!);
            return sum + (responded.getTime() - created.getTime()) / (1000 * 60 * 60);
          }, 0) / respondedOffers.length
        : 0;

      // Preferred categories
      const categoryCount = offers.reduce((acc, offer) => {
        const category = offer.listings.categories.name;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const preferredCategories = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      // Determine negotiation style based on offer patterns
      const listingPrices = await this.getListingPricesForOffers(offers.map(o => o.listing_id));
      const offerRatios = offers
        .filter(o => listingPrices[o.listing_id])
        .map(o => o.amount / listingPrices[o.listing_id]);

      const avgOfferRatio = offerRatios.reduce((sum, ratio) => sum + ratio, 0) / offerRatios.length;
      
      let negotiationStyle: 'aggressive' | 'moderate' | 'conservative';
      if (avgOfferRatio < 0.7) {
        negotiationStyle = 'aggressive';
      } else if (avgOfferRatio < 0.85) {
        negotiationStyle = 'moderate';
      } else {
        negotiationStyle = 'conservative';
      }

      const bestOfferAcceptanceRate = totalOffers > 0 ? (successfulOffers / totalOffers) * 100 : 0;

      return {
        userId,
        userType,
        totalOffers,
        successfulOffers,
        averageOfferAmount: Math.round(averageOfferAmount * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        preferredCategories,
        negotiationStyle,
        bestOfferAcceptanceRate: Math.round(bestOfferAcceptanceRate * 100) / 100,
      };
    } catch (error) {
      console.error('Get user offer stats error:', error);
      return this.getEmptyUserStats(userId, userType);
    }
  }

  /**
   * Generate personalized offer insights for users
   */
  async generateOfferInsights(userId: string, userType: 'buyer' | 'seller'): Promise<OfferInsight[]> {
    try {
      const stats = await this.getUserOfferStats(userId, userType);
      const insights: OfferInsight[] = [];

      if (userType === 'buyer') {
        // Buyer insights
        if (stats.bestOfferAcceptanceRate < 20) {
          insights.push({
            type: 'improvement_tip',
            title: 'Improve Your Offer Success Rate',
            description: `Your offers are accepted ${stats.bestOfferAcceptanceRate.toFixed(1)}% of the time. Try offering closer to the asking price or include a personal message explaining your interest.`,
            actionable: true,
            priority: 'high',
            metadata: { current_rate: stats.bestOfferAcceptanceRate },
          });
        }

        if (stats.negotiationStyle === 'aggressive') {
          insights.push({
            type: 'improvement_tip',
            title: 'Consider More Reasonable Offers',
            description: 'Your offers tend to be significantly below asking prices. While this can save money, it may reduce your success rate. Try offering 75-85% of the asking price for better results.',
            actionable: true,
            priority: 'medium',
          });
        }

        if (stats.totalOffers > 10 && stats.successfulOffers === 0) {
          insights.push({
            type: 'improvement_tip',
            title: 'Offer Strategy Needs Adjustment',
            description: 'None of your recent offers have been accepted. Consider researching market prices, adding personal messages, or responding faster to counter-offers.',
            actionable: true,
            priority: 'high',
          });
        }
      } else {
        // Seller insights
        if (stats.averageResponseTime > 24) {
          insights.push({
            type: 'improvement_tip',
            title: 'Respond to Offers Faster',
            description: `You take an average of ${stats.averageResponseTime.toFixed(1)} hours to respond to offers. Faster responses (within 6-12 hours) can improve your sales success.`,
            actionable: true,
            priority: 'high',
            metadata: { current_response_time: stats.averageResponseTime },
          });
        }

        if (stats.bestOfferAcceptanceRate > 80) {
          insights.push({
            type: 'success_factor',
            title: 'Excellent Offer Management',
            description: `You accept ${stats.bestOfferAcceptanceRate.toFixed(1)}% of offers you receive. This suggests good pricing and negotiation skills.`,
            actionable: false,
            priority: 'low',
          });
        }

        if (stats.totalOffers > 5 && stats.bestOfferAcceptanceRate < 10) {
          insights.push({
            type: 'pricing_suggestion',
            title: 'Consider Adjusting Your Prices',
            description: 'You receive offers but rarely accept them. Your items might be priced above market value. Consider researching similar listings or reducing prices by 10-15%.',
            actionable: true,
            priority: 'medium',
          });
        }
      }

      // Market trend insights
      const marketAnalytics = await this.getOfferAnalytics();
      if (marketAnalytics.acceptanceRate > 0) {
        const userRate = stats.bestOfferAcceptanceRate;
        const marketRate = marketAnalytics.acceptanceRate;

        if (userRate > marketRate * 1.2) {
          insights.push({
            type: 'success_factor',
            title: 'Above Average Performance',
            description: `Your offer ${userType === 'buyer' ? 'success' : 'acceptance'} rate (${userRate.toFixed(1)}%) is above the market average (${marketRate.toFixed(1)}%). Keep up the great work!`,
            actionable: false,
            priority: 'low',
          });
        } else if (userRate < marketRate * 0.8) {
          insights.push({
            type: 'market_trend',
            title: 'Below Market Average',
            description: `Your ${userType === 'buyer' ? 'success' : 'acceptance'} rate (${userRate.toFixed(1)}%) is below the market average (${marketRate.toFixed(1)}%). Consider adjusting your strategy.`,
            actionable: true,
            priority: 'medium',
          });
        }
      }

      return insights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('Generate offer insights error:', error);
      return [];
    }
  }

  /**
   * Get comprehensive offer history for a user
   */
  async getOfferHistory(
    userId: string,
    userType: 'buyer' | 'seller',
    limit: number = 50,
    offset: number = 0
  ): Promise<OfferHistoryItem[]> {
    try {
      const column = userType === 'buyer' ? 'buyer_id' : 'seller_id';
      const otherColumn = userType === 'buyer' ? 'seller_id' : 'buyer_id';

      const { data: offers } = await supabase
        .from('offers')
        .select(`
          *,
          listings!inner(id, title, price),
          profiles!${otherColumn}(first_name, last_name, avatar_url)
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1) as { data: any[] | null };

      if (!offers) return [];

      const historyItems: OfferHistoryItem[] = [];

      for (const offer of offers) {
        // Calculate response time if applicable
        let responseTime: number | undefined;
        if (offer.responded_at) {
          const created = new Date(offer.created_at);
          const responded = new Date(offer.responded_at);
          responseTime = (responded.getTime() - created.getTime()) / (1000 * 60 * 60);
        }

        // Get negotiation chain if this is part of a chain
        let negotiationChain: OfferHistoryItem[] | undefined;
        if (offer.parent_offer_id || await this.hasChildOffers(offer.id)) {
          negotiationChain = await this.getOfferChain(offer.id);
        }

        historyItems.push({
          id: offer.id,
          listingId: offer.listing_id,
          listingTitle: offer.listings.title,
          listingPrice: offer.listings.price,
          offerAmount: offer.amount,
          status: offer.status,
          createdAt: offer.created_at,
          respondedAt: offer.responded_at,
          expiresAt: offer.expires_at,
          otherParty: {
            name: `${offer.profiles.first_name} ${offer.profiles.last_name}`,
            avatar: offer.profiles.avatar_url,
          },
          negotiationChain,
          responseTime,
        });
      }

      return historyItems;
    } catch (error) {
      console.error('Get offer history error:', error);
      return [];
    }
  }

  /**
   * Get offer chain for negotiation history
   */
  private async getOfferChain(offerId: string): Promise<OfferHistoryItem[]> {
    try {
      // Find root offer
      const { data: offer } = await supabase
        .from('offers')
        .select('parent_offer_id')
        .eq('id', offerId)
        .single();

      const rootOfferId = offer?.parent_offer_id || offerId;

      // Get all offers in chain
      const { data: chainOffers } = await supabase
        .from('offers')
        .select(`
          *,
          listings!inner(title, price),
          profiles!buyer_id(first_name, last_name, avatar_url)
        `)
        .or(`id.eq.${rootOfferId},parent_offer_id.eq.${rootOfferId}`)
        .order('created_at', { ascending: true }) as { data: any[] | null };

      return (chainOffers || []).map(offer => ({
        id: offer.id,
        listingId: offer.listing_id,
        listingTitle: offer.listings.title,
        listingPrice: offer.listings.price,
        offerAmount: offer.amount,
        status: offer.status,
        createdAt: offer.created_at,
        respondedAt: offer.responded_at,
        expiresAt: offer.expires_at,
        otherParty: {
          name: `${offer.profiles.first_name} ${offer.profiles.last_name}`,
          avatar: offer.profiles.avatar_url,
        },
      }));
    } catch (error) {
      console.error('Get offer chain error:', error);
      return [];
    }
  }

  /**
   * Check if offer has child offers (counter-offers)
   */
  private async hasChildOffers(offerId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('id')
        .eq('parent_offer_id', offerId)
        .limit(1);

      return !error && (data?.length || 0) > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get listing prices for offer ratio calculations
   */
  private async getListingPricesForOffers(listingIds: string[]): Promise<Record<string, number>> {
    try {
      const { data: listings } = await supabase
        .from('listings')
        .select('id, price')
        .in('id', listingIds) as { data: any[] | null };

      return (listings || []).reduce((acc, listing) => {
        acc[listing.id] = listing.price;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      return {};
    }
  }

  /**
   * Get empty analytics structure
   */
  private getEmptyAnalytics(): OfferAnalytics {
    return {
      totalOffers: 0,
      acceptedOffers: 0,
      rejectedOffers: 0,
      expiredOffers: 0,
      counterOffers: 0,
      acceptanceRate: 0,
      averageOfferAmount: 0,
      averageNegotiationTime: 0,
      topOfferCategories: [],
      monthlyTrends: [],
    };
  }

  /**
   * Get empty user stats structure
   */
  private getEmptyUserStats(userId: string, userType: 'buyer' | 'seller'): UserOfferStats {
    return {
      userId,
      userType,
      totalOffers: 0,
      successfulOffers: 0,
      averageOfferAmount: 0,
      averageResponseTime: 0,
      preferredCategories: [],
      negotiationStyle: 'moderate',
      bestOfferAcceptanceRate: 0,
    };
  }
}

export const offerAnalyticsService = new OfferAnalyticsService();

// Helper functions for UI components
export async function getOfferAnalyticsData(
  startDate?: string,
  endDate?: string,
  categoryId?: string
): Promise<OfferAnalytics> {
  return await offerAnalyticsService.getOfferAnalytics(startDate, endDate, categoryId);
}

export async function getUserOfferStatistics(
  userId: string,
  userType: 'buyer' | 'seller'
): Promise<UserOfferStats> {
  return await offerAnalyticsService.getUserOfferStats(userId, userType);
}

export async function getPersonalizedOfferInsights(
  userId: string,
  userType: 'buyer' | 'seller'
): Promise<OfferInsight[]> {
  return await offerAnalyticsService.generateOfferInsights(userId, userType);
}

export async function getUserOfferHistory(
  userId: string,
  userType: 'buyer' | 'seller',
  limit?: number,
  offset?: number
): Promise<OfferHistoryItem[]> {
  return await offerAnalyticsService.getOfferHistory(userId, userType, limit, offset);
}
