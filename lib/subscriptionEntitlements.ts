import { supabase } from './supabase';
import { BUSINESS_PLANS } from '@/constants/monetization';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanEntitlements {
  // Listing limits
  maxListings: number | null; // null = unlimited
  freeListings: number;
  
  // Credits
  monthlyCredits: number;
  boostCredits: number;
  
  // Features
  businessBadge: boolean;
  prioritySellerBadge: boolean;
  premiumBadge: boolean;
  autoBoost: boolean;
  autoBoostDays: number;
  
  // Analytics
  analyticsLevel: 'none' | 'basic' | 'advanced' | 'full';
  
  // Support
  prioritySupport: boolean;
  accountManager: boolean;
  
  // Branding
  homepagePlacement: boolean;
  premiumBranding: boolean;
  
  // Additional features
  sponsoredPosts: boolean;
  bulkOperations: boolean;
  apiAccess: boolean;
}

class SubscriptionEntitlementsService {
  /**
   * Get user's current subscription
   */
  async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          plan_name,
          display_name,
          features
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Get user's plan entitlements
   */
  async getUserEntitlements(userId: string): Promise<PlanEntitlements> {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (!subscription) {
      return this.getFreeUserEntitlements();
    }

    return this.getPlanEntitlements(subscription.plan_name);
  }

  /**
   * Get entitlements for a specific plan
   */
  getPlanEntitlements(planName: string): PlanEntitlements {
    const plan = BUSINESS_PLANS.find(p => p.id === planName);
    
    if (!plan) {
      return this.getFreeUserEntitlements();
    }

    const baseEntitlements: PlanEntitlements = {
      maxListings: plan.maxListings,
      freeListings: 5, // All plans get 5 free listings
      monthlyCredits: plan.boostCredits,
      boostCredits: plan.boostCredits,
      businessBadge: plan.badges.includes('business'),
      prioritySellerBadge: plan.badges.includes('priority_seller'),
      premiumBadge: plan.badges.includes('premium'),
      autoBoost: plan.features.autoBoost || false,
      autoBoostDays: plan.features.autoBoostDays || 0,
      analyticsLevel: plan.features.analytics as any || 'none',
      prioritySupport: plan.features.prioritySupport || false,
      accountManager: plan.features.accountManager || false,
      homepagePlacement: plan.features.homepagePlacement || false,
      premiumBranding: plan.features.homepagePlacement || false, // Same as homepage placement
      sponsoredPosts: plan.features.accountManager || false, // Premium feature
      bulkOperations: plan.maxListings === null, // Unlimited plans get bulk ops
      apiAccess: plan.features.accountManager || false, // Premium feature
    };

    return baseEntitlements;
  }

  /**
   * Get default entitlements for free users
   */
  getFreeUserEntitlements(): PlanEntitlements {
    return {
      maxListings: 5,
      freeListings: 5,
      monthlyCredits: 0,
      boostCredits: 0,
      businessBadge: false,
      prioritySellerBadge: false,
      premiumBadge: false,
      autoBoost: false,
      autoBoostDays: 0,
      analyticsLevel: 'none',
      prioritySupport: false,
      accountManager: false,
      homepagePlacement: false,
      premiumBranding: false,
      sponsoredPosts: false,
      bulkOperations: false,
      apiAccess: false,
    };
  }

  /**
   * Check if user can create more listings
   */
  async canCreateListing(userId: string): Promise<{ canCreate: boolean; reason?: string; needsCredits?: boolean }> {
    const entitlements = await this.getUserEntitlements(userId);
    
    // Get user's current active listings count
    const { count: activeListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    const currentListings = activeListings || 0;

    // Check if user has unlimited listings
    if (entitlements.maxListings === null) {
      return { canCreate: true };
    }

    // Check if within free listing limit
    if (currentListings < entitlements.freeListings) {
      return { canCreate: true };
    }

    // Check if within subscription listing limit
    if (currentListings < entitlements.maxListings) {
      return { canCreate: true };
    }

    // User needs to pay credits for additional listings
    return {
      canCreate: false,
      reason: `You've reached your listing limit of ${entitlements.maxListings}. Additional listings cost 10 credits each.`,
      needsCredits: true,
    };
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeatureAccess(userId: string, feature: keyof PlanEntitlements): Promise<boolean> {
    const entitlements = await this.getUserEntitlements(userId);
    return Boolean(entitlements[feature]);
  }

  /**
   * Get user's badge configuration
   */
  async getUserBadges(userId: string): Promise<{
    business: boolean;
    prioritySeller: boolean;
    premium: boolean;
    verified: boolean;
  }> {
    const entitlements = await this.getUserEntitlements(userId);
    
    // Get user verification status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_verified')
      .eq('id', userId)
      .single();

    return {
      business: entitlements.businessBadge,
      prioritySeller: entitlements.prioritySellerBadge,
      premium: entitlements.premiumBadge,
      verified: profile?.is_verified || false,
    };
  }

  /**
   * Apply subscription benefits to user profile
   */
  async applySubscriptionBenefits(userId: string, planName: string): Promise<void> {
    const entitlements = this.getPlanEntitlements(planName);
    
    // Update user profile with subscription benefits
    await supabase
      .from('profiles')
      .update({
        is_business: entitlements.businessBadge,
        priority_seller: entitlements.prioritySellerBadge,
        premium_member: entitlements.premiumBadge,
        analytics_access: entitlements.analyticsLevel !== 'none',
        analytics_level: entitlements.analyticsLevel,
        priority_support: entitlements.prioritySupport,
        account_manager: entitlements.accountManager,
        homepage_placement: entitlements.homepagePlacement,
        premium_branding: entitlements.premiumBranding,
        api_access: entitlements.apiAccess,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Add monthly credits if applicable
    if (entitlements.monthlyCredits > 0) {
      await this.addMonthlyCredits(userId, entitlements.monthlyCredits, planName);
    }

    // Set up auto-boost if enabled
    if (entitlements.autoBoost) {
      await this.setupAutoBoost(userId, entitlements.autoBoostDays);
    }
  }

  /**
   * Remove subscription benefits when subscription ends
   */
  async removeSubscriptionBenefits(userId: string): Promise<void> {
    await supabase
      .from('profiles')
      .update({
        is_business: false,
        priority_seller: false,
        premium_member: false,
        analytics_access: false,
        analytics_level: 'none',
        priority_support: false,
        account_manager: false,
        homepage_placement: false,
        premium_branding: false,
        api_access: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Disable auto-boost
    await this.disableAutoBoost(userId);
  }

  /**
   * Add monthly credits to user account
   */
  private async addMonthlyCredits(userId: string, credits: number, planName: string): Promise<void> {
    try {
      await supabase.rpc('add_user_credits', {
        user_uuid: userId,
        credit_amount: credits,
        transaction_description: `Monthly credits from ${planName} plan`,
        reference_type: 'subscription_credits',
        reference_id: planName,
      });
    } catch (error) {
      console.error('Failed to add monthly credits:', error);
    }
  }

  /**
   * Set up auto-boost for user's listings
   */
  private async setupAutoBoost(userId: string, boostDays: number): Promise<void> {
    // This would typically involve setting up a scheduled job
    // For now, we'll just mark the user as having auto-boost enabled
    await supabase
      .from('profiles')
      .update({
        auto_boost_enabled: true,
        auto_boost_days: boostDays,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  /**
   * Disable auto-boost for user
   */
  private async disableAutoBoost(userId: string): Promise<void> {
    await supabase
      .from('profiles')
      .update({
        auto_boost_enabled: false,
        auto_boost_days: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  /**
   * Get subscription analytics data
   */
  async getSubscriptionAnalytics(userId: string): Promise<{
    canAccess: boolean;
    level: string;
    data?: any;
  }> {
    const entitlements = await this.getUserEntitlements(userId);
    
    if (entitlements.analyticsLevel === 'none') {
      return { canAccess: false, level: 'none' };
    }

    // Fetch analytics data based on level
    const analyticsData = await this.fetchAnalyticsData(userId, entitlements.analyticsLevel);
    
    return {
      canAccess: true,
      level: entitlements.analyticsLevel,
      data: analyticsData,
    };
  }

  /**
   * Fetch analytics data based on access level
   */
  private async fetchAnalyticsData(userId: string, level: string): Promise<any> {
    const baseQuery = supabase
      .from('listings')
      .select('id, views, favorites_count, created_at, status')
      .eq('user_id', userId);

    switch (level) {
      case 'basic':
        return await this.getBasicAnalytics(userId);
      case 'advanced':
        return await this.getAdvancedAnalytics(userId);
      case 'full':
        return await this.getFullAnalytics(userId);
      default:
        return null;
    }
  }

  private async getBasicAnalytics(userId: string) {
    // Basic analytics: listing count, total views, favorites
    const { data: listings } = await supabase
      .from('listings')
      .select('views, favorites_count, status')
      .eq('user_id', userId);

    if (!listings) return null;

    return {
      totalListings: listings.length,
      activeListings: listings.filter(l => l.status === 'active').length,
      totalViews: listings.reduce((sum, l) => sum + (l.views || 0), 0),
      totalFavorites: listings.reduce((sum, l) => sum + (l.favorites_count || 0), 0),
    };
  }

  private async getAdvancedAnalytics(userId: string) {
    const basic = await this.getBasicAnalytics(userId);
    
    // Advanced analytics: includes time-based data, conversion rates
    const { data: messages } = await supabase
      .from('messages')
      .select('created_at, conversation_id')
      .eq('sender_id', userId);

    return {
      ...basic,
      totalMessages: messages?.length || 0,
      responseRate: 0.85, // Placeholder - would calculate actual rate
      averageResponseTime: '2 hours', // Placeholder
    };
  }

  private async getFullAnalytics(userId: string) {
    const advanced = await this.getAdvancedAnalytics(userId);
    
    // Full analytics: includes detailed breakdowns, trends, insights
    return {
      ...advanced,
      categoryBreakdown: {}, // Placeholder
      locationBreakdown: {}, // Placeholder
      priceAnalysis: {}, // Placeholder
      trendAnalysis: {}, // Placeholder
      competitorInsights: {}, // Placeholder
    };
  }
}

export const subscriptionEntitlementsService = new SubscriptionEntitlementsService();

// Helper functions for UI components
export async function getCurrentUserSubscription(userId: string): Promise<UserSubscription | null> {
  return await subscriptionEntitlementsService.getCurrentSubscription(userId);
}

export async function getUserPlanEntitlements(userId: string): Promise<PlanEntitlements> {
  return await subscriptionEntitlementsService.getUserEntitlements(userId);
}

export async function canUserCreateListing(userId: string): Promise<{ canCreate: boolean; reason?: string; needsCredits?: boolean }> {
  return await subscriptionEntitlementsService.canCreateListing(userId);
}

export async function hasUserFeatureAccess(userId: string, feature: keyof PlanEntitlements): Promise<boolean> {
  return await subscriptionEntitlementsService.hasFeatureAccess(userId, feature);
}

export async function getUserSubscriptionBadges(userId: string) {
  return await subscriptionEntitlementsService.getUserBadges(userId);
}

export async function getUserAnalyticsAccess(userId: string) {
  return await subscriptionEntitlementsService.getSubscriptionAnalytics(userId);
}
