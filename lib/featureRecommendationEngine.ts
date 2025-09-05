import { supabase } from './supabase';
import { FEATURE_CATALOG } from '@/constants/monetization';
import { getFeatureUsageStats, type FeatureUsageStats } from './featureExpiryService';

export interface FeatureRecommendation {
  featureKey: string;
  featureName: string;
  credits: number;
  confidence: number; // 0-1 score
  reason: string;
  category: 'boost' | 'visibility' | 'engagement' | 'analytics' | 'support';
  priority: 'high' | 'medium' | 'low';
  estimatedROI?: number;
  listingId?: string;
  listingTitle?: string;
}

export interface UserBehaviorProfile {
  userId: string;
  totalListings: number;
  activeListings: number;
  averageListingAge: number;
  mostUsedCategory: string;
  listingPerformance: 'high' | 'medium' | 'low';
  engagementLevel: 'high' | 'medium' | 'low';
  creditBalance: number;
  hasUsedFeatures: boolean;
  preferredFeatureTypes: string[];
  lastActivityDate: string;
}

class FeatureRecommendationEngine {
  /**
   * Get personalized feature recommendations for a user
   */
  async getRecommendationsForUser(userId: string, limit: number = 5): Promise<FeatureRecommendation[]> {
    try {
      // 1. Build user behavior profile
      const profile = await this.buildUserProfile(userId);
      
      // 2. Get user's feature usage history
      const usageStats = await getFeatureUsageStats(userId);
      
      // 3. Get user's listings performance
      const listingsPerformance = await this.getListingsPerformance(userId);
      
      // 4. Generate recommendations based on profile
      const recommendations = await this.generateRecommendations(profile, usageStats, listingsPerformance);
      
      // 5. Sort by confidence and priority
      const sortedRecommendations = recommendations
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return b.confidence - a.confidence;
        })
        .slice(0, limit);

      return sortedRecommendations;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations for a specific listing
   */
  async getRecommendationsForListing(listingId: string, userId: string): Promise<FeatureRecommendation[]> {
    try {
      // Get listing details
      const { data: listing, error } = await supabase
        .from('listings')
        .select(`
          *,
          categories(name),
          profiles(*)
        `)
        .eq('id', listingId)
        .single();

      if (error || !listing) {
        return [];
      }

      const recommendations: FeatureRecommendation[] = [];

      // Calculate listing age
      const listingAge = Math.floor(
        (new Date().getTime() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get listing views/engagement (if available)
      const { data: analytics } = await supabase
        .from('listing_analytics')
        .select('views, contacts, favorites')
        .eq('listing_id', listingId)
        .single();

      const views = analytics?.views || 0;
      const engagement = (analytics?.contacts || 0) + (analytics?.favorites || 0);

      // Recommendation logic based on listing performance
      if (views < 10 && listingAge > 3) {
        recommendations.push({
          featureKey: 'pulse_boost_24h',
          featureName: 'Pulse Boost (24h)',
          credits: 15,
          confidence: 0.9,
          reason: 'Your listing has low visibility. A boost will increase views significantly.',
          category: 'boost',
          priority: 'high',
          estimatedROI: 3.5,
          listingId,
          listingTitle: listing.title,
        });
      }

      if (listingAge > 7) {
        recommendations.push({
          featureKey: 'ad_refresh',
          featureName: 'Ad Refresh',
          credits: 5,
          confidence: 0.8,
          reason: 'Refresh your listing to appear as newly posted and attract more buyers.',
          category: 'visibility',
          priority: 'medium',
          estimatedROI: 2.0,
          listingId,
          listingTitle: listing.title,
        });
      }

      if (views > 20 && engagement < 2) {
        recommendations.push({
          featureKey: 'direct_whatsapp',
          featureName: 'Direct to WhatsApp',
          credits: 20,
          confidence: 0.7,
          reason: 'You have good visibility but low engagement. Make it easier for buyers to contact you.',
          category: 'engagement',
          priority: 'medium',
          estimatedROI: 2.5,
          listingId,
          listingTitle: listing.title,
        });
      }

      // Category-specific recommendations
      if (listing.categories?.name) {
        const categoryName = listing.categories.name.toLowerCase();
        
        if (['electronics', 'phones', 'computers'].includes(categoryName)) {
          recommendations.push({
            featureKey: 'category_spotlight_3d',
            featureName: 'Category Spotlight (3d)',
            credits: 35,
            confidence: 0.75,
            reason: `Electronics listings perform well with category spotlights. Stand out in the ${categoryName} section.`,
            category: 'visibility',
            priority: 'medium',
            estimatedROI: 2.8,
            listingId,
            listingTitle: listing.title,
          });
        }
      }

      return recommendations.slice(0, 3); // Max 3 recommendations per listing
    } catch (error) {
      console.error('Failed to generate listing recommendations:', error);
      return [];
    }
  }

  /**
   * Build comprehensive user behavior profile
   */
  private async buildUserProfile(userId: string): Promise<UserBehaviorProfile> {
    // Get user's listings
    const { data: listings } = await supabase
      .from('listings')
      .select(`
        *,
        categories(name)
      `)
      .eq('user_id', userId);

    // Get user's credits
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    // Get user's feature usage
    const { data: featureUsage } = await supabase
      .from('feature_purchases')
      .select('feature_key, activated_at')
      .eq('user_id', userId);

    const totalListings = listings?.length || 0;
    const activeListings = listings?.filter(l => l.status === 'active').length || 0;
    
    // Calculate average listing age
    const now = new Date();
    const averageListingAge = totalListings > 0 
      ? listings!.reduce((sum, listing) => {
          const age = (now.getTime() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + age;
        }, 0) / totalListings
      : 0;

    // Find most used category
    const categoryCount = listings?.reduce((acc, listing) => {
      const category = listing.categories?.name || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const mostUsedCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'General';

    // Determine listing performance
    const listingPerformance = totalListings > 5 ? 'high' : totalListings > 2 ? 'medium' : 'low';

    // Determine engagement level based on feature usage
    const hasUsedFeatures = (featureUsage?.length || 0) > 0;
    const recentFeatureUsage = featureUsage?.filter(f => {
      const usageDate = new Date(f.activated_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return usageDate > thirtyDaysAgo;
    }).length || 0;

    const engagementLevel = recentFeatureUsage > 3 ? 'high' : recentFeatureUsage > 0 ? 'medium' : 'low';

    // Get preferred feature types
    const featureTypeCount = featureUsage?.reduce((acc, usage) => {
      const featureKey = usage.feature_key;
      let type = 'other';
      
      if (featureKey.includes('boost') || featureKey.includes('pulse')) type = 'boost';
      else if (featureKey.includes('spotlight')) type = 'visibility';
      else if (featureKey.includes('whatsapp') || featureKey.includes('refresh')) type = 'engagement';
      else if (featureKey.includes('analytics')) type = 'analytics';
      else if (featureKey.includes('support')) type = 'support';

      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const preferredFeatureTypes = Object.entries(featureTypeCount)
      .sort(([,a], [,b]) => b - a)
      .map(([type]) => type);

    // Get last activity date
    const lastActivityDate = listings?.reduce((latest, listing) => {
      const listingDate = new Date(listing.updated_at);
      return listingDate > latest ? listingDate : latest;
    }, new Date(0))?.toISOString() || new Date().toISOString();

    return {
      userId,
      totalListings,
      activeListings,
      averageListingAge: Math.round(averageListingAge),
      mostUsedCategory,
      listingPerformance,
      engagementLevel,
      creditBalance: credits?.balance || 0,
      hasUsedFeatures,
      preferredFeatureTypes,
      lastActivityDate,
    };
  }

  /**
   * Get performance metrics for user's listings
   */
  private async getListingsPerformance(userId: string): Promise<any[]> {
    const { data: listings } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        boost_score,
        status
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    return listings || [];
  }

  /**
   * Generate recommendations based on user profile and behavior
   */
  private async generateRecommendations(
    profile: UserBehaviorProfile,
    usageStats: FeatureUsageStats[],
    listings: any[]
  ): Promise<FeatureRecommendation[]> {
    const recommendations: FeatureRecommendation[] = [];

    // New user recommendations
    if (!profile.hasUsedFeatures && profile.totalListings > 0) {
      recommendations.push({
        featureKey: 'pulse_boost_24h',
        featureName: 'Pulse Boost (24h)',
        credits: 15,
        confidence: 0.9,
        reason: 'First-time boost! Get 3x more views and sell faster.',
        category: 'boost',
        priority: 'high',
        estimatedROI: 4.0,
      });
    }

    // Low engagement users
    if (profile.engagementLevel === 'low' && profile.totalListings > 2) {
      recommendations.push({
        featureKey: 'ad_refresh',
        featureName: 'Ad Refresh',
        credits: 5,
        confidence: 0.8,
        reason: 'Refresh your listings to attract new buyers.',
        category: 'visibility',
        priority: 'medium',
        estimatedROI: 2.5,
      });
    }

    // High-volume sellers
    if (profile.totalListings > 10) {
      recommendations.push({
        featureKey: 'business_profile',
        featureName: 'Business Profile',
        credits: 50,
        confidence: 0.85,
        reason: 'Upgrade to business profile to build trust and increase sales.',
        category: 'boost',
        priority: 'high',
        estimatedROI: 3.2,
      });

      recommendations.push({
        featureKey: 'analytics_report',
        featureName: 'Analytics Report',
        credits: 40,
        confidence: 0.7,
        reason: 'Track your performance and optimize your listings.',
        category: 'analytics',
        priority: 'medium',
        estimatedROI: 2.0,
      });
    }

    // Budget-conscious users
    if (profile.creditBalance < 50 && profile.creditBalance > 10) {
      recommendations.push({
        featureKey: 'ad_refresh',
        featureName: 'Ad Refresh',
        credits: 5,
        confidence: 0.75,
        reason: 'Affordable way to boost visibility without breaking the bank.',
        category: 'visibility',
        priority: 'medium',
        estimatedROI: 3.0,
      });
    }

    // Category-specific recommendations
    if (profile.mostUsedCategory === 'Electronics') {
      recommendations.push({
        featureKey: 'category_spotlight_3d',
        featureName: 'Category Spotlight (3d)',
        credits: 35,
        confidence: 0.8,
        reason: 'Electronics buyers actively browse category pages. Get featured!',
        category: 'visibility',
        priority: 'medium',
        estimatedROI: 2.8,
      });
    }

    // Repeat user recommendations
    const boostUsage = usageStats.find(s => s.featureKey.includes('boost'));
    if (boostUsage && boostUsage.totalActivations > 2) {
      recommendations.push({
        featureKey: 'mega_pulse_7d',
        featureName: 'Mega Pulse (7d)',
        credits: 50,
        confidence: 0.85,
        reason: 'You love boosts! Try our premium 7-day boost for maximum impact.',
        category: 'boost',
        priority: 'high',
        estimatedROI: 3.5,
      });
    }

    // Old listings need refresh
    if (profile.averageListingAge > 14) {
      recommendations.push({
        featureKey: 'auto_refresh_30d',
        featureName: 'Auto-Refresh (30d)',
        credits: 60,
        confidence: 0.7,
        reason: 'Keep your listings fresh automatically for a month.',
        category: 'visibility',
        priority: 'medium',
        estimatedROI: 2.2,
      });
    }

    return recommendations;
  }

  /**
   * Track recommendation effectiveness
   */
  async trackRecommendationClick(
    userId: string,
    featureKey: string,
    recommendationReason: string
  ): Promise<void> {
    try {
      await supabase.from('recommendation_analytics').insert({
        user_id: userId,
        feature_key: featureKey,
        recommendation_reason: recommendationReason,
        clicked_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to track recommendation click:', error);
    }
  }

  /**
   * Track recommendation conversion (when user actually purchases)
   */
  async trackRecommendationConversion(
    userId: string,
    featureKey: string,
    purchaseId: string
  ): Promise<void> {
    try {
      await supabase
        .from('recommendation_analytics')
        .update({
          converted: true,
          purchase_id: purchaseId,
          converted_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('feature_key', featureKey)
        .is('converted', null);
    } catch (error) {
      console.error('Failed to track recommendation conversion:', error);
    }
  }
}

export const featureRecommendationEngine = new FeatureRecommendationEngine();

// Helper functions for UI components
export async function getUserRecommendations(userId: string, limit?: number): Promise<FeatureRecommendation[]> {
  return await featureRecommendationEngine.getRecommendationsForUser(userId, limit);
}

export async function getListingRecommendations(listingId: string, userId: string): Promise<FeatureRecommendation[]> {
  return await featureRecommendationEngine.getRecommendationsForListing(listingId, userId);
}

export async function trackRecommendationInteraction(
  userId: string,
  featureKey: string,
  reason: string
): Promise<void> {
  return await featureRecommendationEngine.trackRecommendationClick(userId, featureKey, reason);
}

export async function trackRecommendationPurchase(
  userId: string,
  featureKey: string,
  purchaseId: string
): Promise<void> {
  return await featureRecommendationEngine.trackRecommendationConversion(userId, featureKey, purchaseId);
}
