import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface CreditState {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactions: any[];
  loading: boolean;
  error: string | null;
}

interface SubscriptionState {
  currentPlan: any | null;
  entitlements: any;
  loading: boolean;
  error: string | null;
}

interface MonetizationState extends CreditState, SubscriptionState {
  // Credit actions
  refreshCredits: () => Promise<void>;
  purchaseCredits: (packageId: string) => Promise<{ success: boolean; error?: string; paymentUrl?: string }>;
  spendCredits: (amount: number, reason: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  
  // Feature actions
  purchaseFeature: (featureKey: string, credits: number, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  hasFeatureAccess: (featureKey: string) => boolean;
  
  // Subscription actions
  refreshSubscription: () => Promise<void>;
  subscribeToPlan: (planId: string) => Promise<{ success: boolean; error?: string; paymentUrl?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  
  // Entitlements
  getMaxListings: () => number;
  hasUnlimitedListings: () => boolean;
  getAvailableBadges: () => string[];
  getAnalyticsTier: () => 'none' | 'basic' | 'advanced' | 'full';
  hasPrioritySupport: () => boolean;
  hasAutoBoost: () => boolean;
}

export const useMonetizationStore = create<MonetizationState>((set, get) => ({
  // Credit state
  balance: 0,
  lifetimeEarned: 0,
  lifetimeSpent: 0,
  transactions: [],
  
  // Subscription state
  currentPlan: null,
  entitlements: {},
  
  // Loading states
  loading: false,
  error: null,

  // Credit actions
  refreshCredits: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get credit balance
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        throw creditsError;
      }

      // Get recent transactions
      const { data: transactions, error: transError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transError) throw transError;

      set({
        balance: credits?.balance || 0,
        lifetimeEarned: credits?.lifetime_earned || 0,
        lifetimeSpent: credits?.lifetime_spent || 0,
        transactions: transactions || [],
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  purchaseCredits: async (packageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get package details
      const { data: package_, error: packageError } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('name', packageId)
        .single();

      if (packageError) throw packageError;

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('credit_purchases')
        .insert({
          user_id: user.id,
          package_id: package_.id,
          credits: package_.credits,
          amount_ghs: package_.price_ghs,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Initialize payment with Paystack
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'paystack-initialize',
        {
          body: {
            amount: package_.price_ghs * 100, // Convert to pesewas
            email: user.email,
            reference: `credit_${purchase.id}`,
            purpose: 'credit_purchase',
            purpose_id: purchase.id,
          },
        }
      );

      if (paymentError) throw paymentError;

      return {
        success: true,
        paymentUrl: paymentData.authorization_url,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  spendCredits: async (amount: number, reason: string, metadata?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('spend_user_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: reason,
        p_reference_id: metadata?.referenceId,
        p_reference_type: metadata?.referenceType,
      });

      if (error) throw error;

      if (data.success) {
        // Update local state
        set(state => ({
          balance: data.new_balance,
          lifetimeSpent: state.lifetimeSpent + amount,
        }));
        
        // Refresh transactions
        get().refreshCredits();
      }

      return { success: data.success, error: data.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Feature actions
  purchaseFeature: async (featureKey: string, credits: number, metadata?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('purchase_feature', {
        p_user_id: user.id,
        p_feature_key: featureKey,
        p_credits: credits,
        p_metadata: metadata || {},
      });

      if (error) throw error;

      if (data.success) {
        // Update local state
        set(state => ({
          balance: data.new_balance,
          lifetimeSpent: state.lifetimeSpent + credits,
        }));
        
        // Refresh data
        get().refreshCredits();
        get().refreshSubscription();
      }

      return { success: data.success, error: data.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  hasFeatureAccess: (featureKey: string) => {
    const { entitlements } = get();
    
    // Check if feature is included in subscription
    if (entitlements.subscription?.features?.[featureKey]) {
      return true;
    }
    
    // Check if feature was purchased and not expired
    // This would require checking feature_purchases table
    return false;
  },

  // Subscription actions
  refreshSubscription: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;

      // Get entitlements
      const { data: entitlements, error: entError } = await supabase.rpc('get_user_entitlements', {
        p_user_id: user.id,
      });

      if (entError) throw entError;

      set({
        currentPlan: subscription,
        entitlements: entitlements || {},
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  subscribeToPlan: async (planId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', planId.replace('_', ' '))
        .single();

      if (planError) throw planError;

      // Create subscription record
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

      if (subError) throw subError;

      // Initialize payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'paystack-initialize',
        {
          body: {
            amount: plan.price_ghs * 100, // Convert to pesewas
            email: user.email,
            reference: `sub_${subscription.id}`,
            purpose: 'subscription',
            purpose_id: subscription.id,
          },
        }
      );

      if (paymentError) throw paymentError;

      return {
        success: true,
        paymentUrl: paymentData.authorization_url,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  cancelSubscription: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'cancelled',
          auto_renew: false,
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      // Refresh subscription data
      get().refreshSubscription();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Entitlement helpers
  getMaxListings: () => {
    const { entitlements } = get();
    return entitlements.max_listings || 5;
  },

  hasUnlimitedListings: () => {
    const { entitlements } = get();
    return entitlements.max_listings === null || entitlements.max_listings > 999;
  },

  getAvailableBadges: () => {
    const { entitlements } = get();
    return entitlements.badges || [];
  },

  getAnalyticsTier: () => {
    const { entitlements } = get();
    return entitlements.analytics_tier || 'none';
  },

  hasPrioritySupport: () => {
    const { entitlements } = get();
    return entitlements.priority_support || false;
  },

  hasAutoBoost: () => {
    const { entitlements } = get();
    return entitlements.auto_boost || false;
  },
}));