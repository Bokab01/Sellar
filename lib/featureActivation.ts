import { supabase } from './supabase';
import { FEATURE_CATALOG, getFeatureByKey } from '@/constants/monetization';

export interface ActiveFeature {
  id: string;
  user_id: string;
  listing_id?: string;
  feature_key: string;
  feature_name: string;
  credits_spent: number;
  status: 'active' | 'expired' | 'cancelled';
  activated_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface FeatureEffect {
  type: 'boost' | 'spotlight' | 'refresh' | 'whatsapp' | 'business_profile' | 'analytics' | 'priority_support';
  multiplier?: number;
  duration_hours?: number;
  category_id?: string;
  permanent?: boolean;
}

class FeatureActivationService {
  /**
   * Activate a feature for a user or listing
   */
  async activateFeature(
    userId: string,
    featureKey: string,
    listingId?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string; featureId?: string }> {
    try {
      const feature = this.getFeatureConfig(featureKey);
      if (!feature) {
        return { success: false, error: 'Feature not found' };
      }
      
      // Type assertion to ensure feature has the expected properties
      const featureConfig = feature as any;

      // Calculate expiry date
      const expiresAt = this.calculateExpiryDate(featureKey);

      // Create feature purchase record
      const { data: featurePurchase, error: purchaseError } = await supabase
        .from('feature_purchases')
        .insert({
          user_id: userId,
          listing_id: listingId,
          feature_key: featureKey,
          feature_name: featureConfig.name || featureKey,
          credits_spent: featureConfig.credits || 0,
          status: 'active',
          expires_at: expiresAt,
          metadata: {
            ...metadata,
            duration: featureConfig.duration || '24 hours',
            category: 'feature',
          },
        })
        .select()
        .single();

      if (purchaseError) {
        console.error('Failed to create feature purchase:', purchaseError);
        return { success: false, error: 'Failed to activate feature' };
      }

      // Apply the feature effect
      await this.applyFeatureEffect(featureKey, userId, listingId, featurePurchase.id);

      return { success: true, featureId: featurePurchase.id };
    } catch (error: any) {
      console.error('Feature activation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply the actual feature effect
   */
  private async applyFeatureEffect(
    featureKey: string,
    userId: string,
    listingId?: string,
    featureId?: string
  ): Promise<void> {
    const effect = this.getFeatureEffect(featureKey);
    if (!effect) return;

    switch (effect.type) {
      case 'boost':
        await this.applyBoostEffect(userId, listingId, effect, featureId);
        break;
      case 'spotlight':
        await this.applySpotlightEffect(userId, listingId, effect, featureId);
        break;
      case 'refresh':
        await this.applyRefreshEffect(userId, listingId);
        break;
      case 'whatsapp':
        await this.applyWhatsAppEffect(userId, listingId);
        break;
      case 'business_profile':
        await this.applyBusinessProfileEffect(userId);
        break;
      case 'analytics':
        await this.applyAnalyticsEffect(userId);
        break;
      case 'priority_support':
        await this.applyPrioritySupportEffect(userId);
        break;
    }
  }

  /**
   * Apply boost effect - increases listing visibility
   */
  private async applyBoostEffect(
    userId: string,
    listingId?: string,
    effect?: FeatureEffect,
    featureId?: string
  ): Promise<void> {
    if (!listingId) return;

    const boostMultiplier = effect?.multiplier || 2.0;
    const boostScore = Math.floor(boostMultiplier * 100);

    // Update listing with boost score and boost expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (effect?.duration_hours || 24));

    await supabase
      .from('listings')
      .update({
        boost_score: boostScore,
        boost_until: expiresAt.toISOString(),
        boosted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .eq('user_id', userId);

    // Log boost activity
    await this.logFeatureActivity('boost_applied', userId, listingId, {
      feature_id: featureId,
      boost_score: boostScore,
      expires_at: expiresAt.toISOString(),
    });
  }

  /**
   * Apply spotlight effect - category-specific highlighting
   */
  private async applySpotlightEffect(
    userId: string,
    listingId?: string,
    effect?: FeatureEffect,
    featureId?: string
  ): Promise<void> {
    if (!listingId) return;

    // Get listing category
    const { data: listing } = await supabase
      .from('listings')
      .select('category_id')
      .eq('id', listingId)
      .single();

    if (!listing) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (effect?.duration_hours || 72)); // 3 days

    // Update listing with spotlight
    await supabase
      .from('listings')
      .update({
        spotlight_category: listing.category_id,
        spotlight_until: expiresAt.toISOString(),
        spotlighted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .eq('user_id', userId);

    // Log spotlight activity
    await this.logFeatureActivity('spotlight_applied', userId, listingId, {
      feature_id: featureId,
      category_id: listing.category_id,
      expires_at: expiresAt.toISOString(),
    });
  }

  /**
   * Apply refresh effect - moves listing to top
   */
  private async applyRefreshEffect(userId: string, listingId?: string): Promise<void> {
    if (!listingId) return;

    // Update listing's updated_at to move it to top of results
    await supabase
      .from('listings')
      .update({
        updated_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .eq('user_id', userId);

    await this.logFeatureActivity('listing_refreshed', userId, listingId);
  }

  /**
   * Apply WhatsApp effect - enables direct WhatsApp contact
   */
  private async applyWhatsAppEffect(userId: string, listingId?: string): Promise<void> {
    if (!listingId) return;

    await supabase
      .from('listings')
      .update({
        whatsapp_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .eq('user_id', userId);

    await this.logFeatureActivity('whatsapp_enabled', userId, listingId);
  }

  /**
   * Apply business profile effect
   */
  private async applyBusinessProfileEffect(userId: string): Promise<void> {
    await supabase
      .from('profiles')
      .update({
        is_business: true,
        business_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    await this.logFeatureActivity('business_profile_activated', userId);
  }

  /**
   * Apply analytics access effect
   */
  private async applyAnalyticsEffect(userId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await supabase
      .from('profiles')
      .update({
        analytics_access: true,
        analytics_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    await this.logFeatureActivity('analytics_activated', userId, undefined, {
      expires_at: expiresAt.toISOString(),
    });
  }

  /**
   * Apply priority support effect
   */
  private async applyPrioritySupportEffect(userId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await supabase
      .from('profiles')
      .update({
        priority_support: true,
        priority_support_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    await this.logFeatureActivity('priority_support_activated', userId, undefined, {
      expires_at: expiresAt.toISOString(),
    });
  }

  /**
   * Get active features for a user or listing
   */
  async getActiveFeatures(userId: string, listingId?: string): Promise<ActiveFeature[]> {
    let query = supabase
      .from('feature_purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (listingId) {
      query = query.eq('listing_id', listingId);
    }

    const { data, error } = await query.order('activated_at', { ascending: false });

    if (error) {
      console.error('Failed to get active features:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeatureAccess(userId: string, featureKey: string, listingId?: string): Promise<boolean> {
    const activeFeatures = await this.getActiveFeatures(userId, listingId);
    return activeFeatures.some(feature => feature.feature_key === featureKey);
  }

  /**
   * Expire old features
   */
  async expireOldFeatures(): Promise<void> {
    const now = new Date().toISOString();

    // Update expired feature purchases
    await supabase
      .from('feature_purchases')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', now);

    // Clear expired boosts from listings
    await supabase
      .from('listings')
      .update({
        boost_score: 0,
        boost_until: null,
      })
      .lt('boost_until', now);

    // Clear expired spotlights from listings
    await supabase
      .from('listings')
      .update({
        spotlight_category: null,
        spotlight_until: null,
      })
      .lt('spotlight_until', now);
  }

  /**
   * Get feature configuration
   */
  private getFeatureConfig(featureKey: string) {
    for (const category of Object.values(FEATURE_CATALOG)) {
      for (const [key, feature] of Object.entries(category)) {
        if (key === featureKey) {
          return feature;
        }
      }
    }
    return null;
  }

  /**
   * Get feature effect configuration
   */
  private getFeatureEffect(featureKey: string): FeatureEffect | null {
    const effectMap: Record<string, FeatureEffect> = {
      pulse_boost_24h: { type: 'boost', multiplier: 2.0, duration_hours: 24 },
      mega_pulse_7d: { type: 'boost', multiplier: 3.0, duration_hours: 168 }, // 7 days
      category_spotlight_3d: { type: 'spotlight', duration_hours: 72 }, // 3 days
      ad_refresh: { type: 'refresh' },
      auto_refresh_30d: { type: 'refresh', duration_hours: 720 }, // 30 days
      direct_whatsapp: { type: 'whatsapp', permanent: true },
      business_profile: { type: 'business_profile', permanent: true },
      analytics_report: { type: 'analytics', duration_hours: 720 }, // 30 days
      priority_support: { type: 'priority_support', duration_hours: 720 }, // 30 days
    };

    return effectMap[featureKey] || null;
  }

  /**
   * Calculate expiry date for a feature
   */
  private calculateExpiryDate(featureKey: string): string | null {
    const effect = this.getFeatureEffect(featureKey);
    if (!effect || effect.permanent) return null;

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + (effect.duration_hours || 24));
    return expiryDate.toISOString();
  }

  /**
   * Log feature activity for analytics
   */
  private async logFeatureActivity(
    activity: string,
    userId: string,
    listingId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('feature_activity_log').insert({
        user_id: userId,
        listing_id: listingId,
        activity,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log feature activity:', error);
      // Don't throw - logging failure shouldn't break feature activation
    }
  }
}

export const featureActivationService = new FeatureActivationService();

// Helper functions for UI components
export async function activateListingFeature(
  featureKey: string,
  listingId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const feature = getFeatureByKey(featureKey);
    if (!feature) {
      return { success: false, error: 'Feature not found' };
    }

    // Use the database function to purchase and activate the feature
    const { data, error } = await supabase.rpc('purchase_feature', {
      p_user_id: userId,
      p_feature_key: featureKey,
      p_credits: feature.regularCredits,
      p_metadata: { listing_id: listingId },
    });

    if (error) {
      console.error('Feature activation error:', error);
      return { success: false, error: error.message };
    }

    return { success: data.success, error: data.error };
  } catch (error: any) {
    console.error('Feature activation error:', error);
    return { success: false, error: error.message };
  }
}

export async function activateUserFeature(
  featureKey: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const feature = getFeatureByKey(featureKey);
    if (!feature) {
      return { success: false, error: 'Feature not found' };
    }

    // Use the database function to purchase and activate the feature
    const { data, error } = await supabase.rpc('purchase_feature', {
      p_user_id: userId,
      p_feature_key: featureKey,
      p_credits: feature.regularCredits,
      p_metadata: {},
    });

    if (error) {
      console.error('Feature activation error:', error);
      return { success: false, error: error.message };
    }

    return { success: data.success, error: data.error };
  } catch (error: any) {
    console.error('Feature activation error:', error);
    return { success: false, error: error.message };
  }
}

export async function getListingFeatures(listingId: string, userId: string): Promise<ActiveFeature[]> {
  return await featureActivationService.getActiveFeatures(userId, listingId);
}

export async function getUserFeatures(userId: string): Promise<ActiveFeature[]> {
  return await featureActivationService.getActiveFeatures(userId);
}

export async function hasFeature(
  userId: string,
  featureKey: string,
  listingId?: string
): Promise<boolean> {
  return await featureActivationService.hasFeatureAccess(userId, featureKey, listingId);
}
