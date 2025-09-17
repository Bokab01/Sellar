import { supabase } from './supabase';
import { featureActivationService } from './featureActivation';

export interface ExpiryCheckResult {
  expiredFeatures: number;
  expiredBoosts: number;
  expiredSpotlights: number;
  expiredUserFeatures: number;
  processedAt: string;
}

export interface FeatureUsageStats {
  userId: string;
  featureKey: string;
  totalActivations: number;
  totalCreditsSpent: number;
  lastUsed: string;
  averageUsagePerWeek: number;
  mostUsedListingId?: string;
}

class FeatureExpiryService {
  /**
   * Run comprehensive feature expiry cleanup
   */
  async runExpiryCleanup(): Promise<ExpiryCheckResult> {
    const now = new Date().toISOString();
    
    console.log('🧹 Starting feature expiry cleanup...');

    // 1. Expire feature purchases
    const expiredFeatures = await this.expireFeaturePurchases(now);
    
    // 2. Clear expired listing boosts
    const expiredBoosts = await this.clearExpiredBoosts(now);
    
    // 3. Clear expired spotlights
    const expiredSpotlights = await this.clearExpiredSpotlights(now);
    
    // 4. Clear expired user features
    const expiredUserFeatures = await this.clearExpiredUserFeatures(now);
    
    // 5. Send expiry notifications
    await this.sendExpiryNotifications();
    
    const result: ExpiryCheckResult = {
      expiredFeatures,
      expiredBoosts,
      expiredSpotlights,
      expiredUserFeatures,
      processedAt: now,
    };

    console.log('✅ Feature expiry cleanup completed:', result);
    return result;
  }

  /**
   * Expire feature purchases that have passed their expiry date
   */
  private async expireFeaturePurchases(now: string): Promise<number> {
    const { data, error } = await supabase
      .from('feature_purchases')
      .update({ 
        status: 'expired',
        expired_at: now,
        updated_at: now,
      })
      .eq('status', 'active')
      .lt('expires_at', now)
      .select('id');

    if (error) {
      console.error('Failed to expire feature purchases:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Clear expired boosts from listings
   */
  private async clearExpiredBoosts(now: string): Promise<number> {
    const { data, error } = await supabase
      .from('listings')
      .update({
        boost_score: 0,
        boost_until: null,
        updated_at: now,
      })
      .not('boost_until', 'is', null)
      .lt('boost_until', now)
      .select('id');

    if (error) {
      console.error('Failed to clear expired boosts:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Clear expired spotlights from listings
   */
  private async clearExpiredSpotlights(now: string): Promise<number> {
    const { data, error } = await supabase
      .from('listings')
      .update({
        spotlight_category: null,
        spotlight_until: null,
        updated_at: now,
      })
      .not('spotlight_until', 'is', null)
      .lt('spotlight_until', now)
      .select('id');

    if (error) {
      console.error('Failed to clear expired spotlights:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Clear expired user features (analytics, priority support, etc.)
   */
  private async clearExpiredUserFeatures(now: string): Promise<number> {
    let totalCleared = 0;

    // Clear expired analytics access
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('profiles')
      .update({
        analytics_access: false,
        analytics_expires_at: null,
        updated_at: now,
      })
      .eq('analytics_access', true)
      .not('analytics_expires_at', 'is', null)
      .lt('analytics_expires_at', now)
      .select('id');

    if (!analyticsError) {
      totalCleared += analyticsData?.length || 0;
    }

    // Clear expired priority support
    const { data: supportData, error: supportError } = await supabase
      .from('profiles')
      .update({
        priority_support: false,
        priority_support_expires_at: null,
        updated_at: now,
      })
      .eq('priority_support', true)
      .not('priority_support_expires_at', 'is', null)
      .lt('priority_support_expires_at', now)
      .select('id');

    if (!supportError) {
      totalCleared += supportData?.length || 0;
    }

    return totalCleared;
  }

  /**
   * Send notifications to users about expired features
   */
  private async sendExpiryNotifications(): Promise<void> {
    try {
      // Get users with recently expired features (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: expiredFeatures } = await supabase
        .from('feature_purchases')
        .select('user_id, feature_name, expired_at')
        .eq('status', 'expired')
        .gte('expired_at', yesterday.toISOString())
        .order('expired_at', { ascending: false });

      if (!expiredFeatures || expiredFeatures.length === 0) return;

      // Group by user
      const userExpirations = expiredFeatures.reduce((acc, feature) => {
        if (!acc[feature.user_id]) {
          acc[feature.user_id] = [];
        }
        acc[feature.user_id].push(feature);
        return acc;
      }, {} as Record<string, any[]>);

      // Send notifications
      for (const [userId, features] of Object.entries(userExpirations)) {
        const featureNames = features.map(f => f.feature_name).join(', ');
        
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Features Expired',
          message: `Your ${featureNames} feature${features.length > 1 ? 's have' : ' has'} expired. Renew to continue enjoying premium benefits!`,
          notification_type: 'feature_expired',
          related_type: 'feature_purchase',
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to send expiry notifications:', error);
    }
  }

  /**
   * Get feature usage statistics for a user
   */
  async getUserFeatureUsageStats(userId: string): Promise<FeatureUsageStats[]> {
    try {
      const { data, error } = await supabase
        .from('feature_purchases')
        .select(`
          feature_key,
          feature_name,
          credits_spent,
          listing_id,
          activated_at
        `)
        .eq('user_id', userId)
        .order('activated_at', { ascending: false });

      if (error || !data) {
        console.error('Failed to get feature usage stats:', error);
        return [];
      }

      // Group by feature key and calculate stats
      const featureGroups = data.reduce((acc, purchase) => {
        const key = purchase.feature_key;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(purchase);
        return acc;
      }, {} as Record<string, any[]>);

      const stats: FeatureUsageStats[] = [];

      for (const [featureKey, purchases] of Object.entries(featureGroups)) {
        const totalActivations = purchases.length;
        const totalCreditsSpent = purchases.reduce((sum, p) => sum + (p.credits_spent || 0), 0);
        const lastUsed = purchases[0]?.activated_at || '';
        
        // Calculate average usage per week
        const firstUsage = new Date(purchases[purchases.length - 1]?.activated_at || '');
        const lastUsage = new Date(purchases[0]?.activated_at || '');
        const weeksDiff = Math.max(1, (lastUsage.getTime() - firstUsage.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const averageUsagePerWeek = totalActivations / weeksDiff;

        // Find most used listing
        const listingUsage = purchases.reduce((acc, p) => {
          if (p.listing_id) {
            acc[p.listing_id] = (acc[p.listing_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        const mostUsedListingId = Object.entries(listingUsage)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0];

        stats.push({
          userId,
          featureKey,
          totalActivations,
          totalCreditsSpent,
          lastUsed,
          averageUsagePerWeek: Math.round(averageUsagePerWeek * 100) / 100,
          mostUsedListingId,
        });
      }

      return stats.sort((a, b) => b.totalActivations - a.totalActivations);
    } catch (error) {
      console.error('Failed to calculate feature usage stats:', error);
      return [];
    }
  }

  /**
   * Get features expiring soon (next 24 hours)
   */
  async getFeaturesExpiringSoon(userId: string): Promise<any[]> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('feature_purchases')
        .select(`
          id,
          feature_key,
          feature_name,
          listing_id,
          expires_at,
          listings!inner(title)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .not('expires_at', 'is', null)
        .lt('expires_at', tomorrow.toISOString())
        .order('expires_at', { ascending: true });

      if (error) {
        console.error('Failed to get expiring features:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get expiring features:', error);
      return [];
    }
  }

  /**
   * Renew a feature before it expires
   */
  async renewFeature(
    featureId: string, 
    userId: string, 
    extensionHours: number = 24
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: feature, error: fetchError } = await supabase
        .from('feature_purchases')
        .select('*')
        .eq('id', featureId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !feature) {
        return { success: false, error: 'Feature not found' };
      }

      // Calculate new expiry date
      const currentExpiry = new Date(feature.expires_at || new Date());
      const newExpiry = new Date(currentExpiry.getTime() + (extensionHours * 60 * 60 * 1000));

      // Update feature expiry
      const { error: updateError } = await supabase
        .from('feature_purchases')
        .update({
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', featureId);

      if (updateError) {
        return { success: false, error: 'Failed to renew feature' };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule automatic expiry cleanup (to be called by a cron job)
   */
  async scheduleExpiryCleanup(): Promise<void> {
    // This would typically be called by a background job/cron
    // For now, we'll just run the cleanup
    await this.runExpiryCleanup();
  }
}

export const featureExpiryService = new FeatureExpiryService();

// Helper functions for UI components
export async function checkExpiredFeatures(): Promise<ExpiryCheckResult> {
  return await featureExpiryService.runExpiryCleanup();
}

export async function getFeatureUsageStats(userId: string): Promise<FeatureUsageStats[]> {
  return await featureExpiryService.getUserFeatureUsageStats(userId);
}

export async function getExpiringSoonFeatures(userId: string): Promise<any[]> {
  return await featureExpiryService.getFeaturesExpiringSoon(userId);
}

export async function renewFeatureById(
  featureId: string, 
  userId: string, 
  hours: number = 24
): Promise<{ success: boolean; error?: string }> {
  return await featureExpiryService.renewFeature(featureId, userId, hours);
}
