import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  // Aliases for backward compatibility
  creditBalance: number;
  currentSubscription: any | null;
  
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
  upgradeToBusinessWithCredits: () => Promise<{ success: boolean; error?: string; creditsRequired?: number }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  
  // Entitlements
  getMaxListings: () => number;
  hasUnlimitedListings: () => boolean;
  getAvailableBadges: () => string[];
  getAnalyticsTier: () => 'none' | 'basic' | 'advanced' | 'full';
  hasPrioritySupport: () => boolean;
  hasAutoBoost: () => boolean;
  hasBusinessPlan: () => boolean;
  getBusinessPlanCreditCost: () => number;
}

export const useMonetizationStore = create<MonetizationState>()(
  persist(
    (set, get) => ({
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

  // Aliases for backward compatibility
  get creditBalance() {
    return get().balance;
  },
  get currentSubscription() {
    return get().currentPlan;
  },

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
        balance: (credits as any)?.balance || 0,
        lifetimeEarned: (credits as any)?.lifetime_earned || 0,
        lifetimeSpent: (credits as any)?.lifetime_spent || 0,
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
          package_id: (package_ as any).id,
          credits: (package_ as any).credits,
          amount_ghs: (package_ as any).price_ghs,
        } as any)
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Initialize payment with Paystack
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'paystack-initialize',
        {
          body: {
            amount: (package_ as any).price_ghs * 100, // Convert to pesewas
            email: user.email,
            reference: `credit_${(purchase as any).id}`,
            purpose: 'credit_purchase',
            purpose_id: (purchase as any).id,
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
      } as any);

      if (error) throw error;

      // The RPC returns an array since it's a table-returning function
      // We need to get the first (and only) row
      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success) {
        // Update local state
        set(state => ({
          balance: result.new_balance,
          lifetimeSpent: state.lifetimeSpent + amount,
        }));
        
        // Refresh transactions
        get().refreshCredits();
      }

      return { success: result?.success || false, error: result?.error || null };
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
      } as any);

      if (error) {
        console.error('Purchase feature RPC error:', error);
        throw error;
      }

      // The RPC returns an array since it's a table-returning function
      // We need to get the first (and only) row
      const result = Array.isArray(data) ? data[0] : data;
      
      console.log('Purchase feature result:', result);

      if (result && result.success) {
        // Update local state immediately
        set(state => ({
          balance: result.new_balance,
          lifetimeSpent: state.lifetimeSpent + credits,
        }));
        
        // Refresh data to get updated transactions and subscription info
        await Promise.all([
          get().refreshCredits(),
          get().refreshSubscription(),
        ]);
        
        return { success: true };
      } else {
        return { success: false, error: result?.error || 'Unknown error occurred' };
      }
    } catch (error: any) {
      console.error('Purchase feature error:', error);
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

      // Get current subscription (including cancelled ones that are still within their period)
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'cancelled'])
        .gte('current_period_end', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;

      console.log('🔄 refreshSubscription - Found subscription:', subscription);

      // Get entitlements
      const { data: entitlements, error: entError } = await supabase.rpc('get_user_entitlements', {
        p_user_id: user.id,
      } as any);


      if (entError) throw entError;

      console.log('🔄 refreshSubscription - Setting currentPlan to:', subscription);
      console.log('🔄 refreshSubscription - Setting entitlements to:', entitlements);

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
          plan_id: (plan as any).id,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        } as any)
        .select()
        .single();

      if (subError) throw subError;

      // Initialize payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'paystack-initialize',
        {
          body: {
            amount: (plan as any).price_ghs * 100, // Convert to pesewas
            email: user.email,
            reference: `sub_${(subscription as any).id}`,
            purpose: 'subscription',
            purpose_id: (subscription as any).id,
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

  upgradeToBusinessWithCredits: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Business plan costs 400 GHS
      // Using the best credit rate (0.143 GHS per credit from Max package)
      // Credits needed = 400 / 0.143 ≈ 2798 credits
      const BUSINESS_PLAN_PRICE_GHS = 400;
      const CREDIT_RATE = 0.143; // Best rate from Max package
      const CREDITS_REQUIRED = Math.ceil(BUSINESS_PLAN_PRICE_GHS / CREDIT_RATE);

      const currentBalance = get().balance;
      
      // Check if user has enough credits
      if (currentBalance < CREDITS_REQUIRED) {
        return {
          success: false,
          error: `Insufficient credits. You need ${CREDITS_REQUIRED} credits but only have ${currentBalance}.`,
          creditsRequired: CREDITS_REQUIRED,
        };
      }

      // Check if user already has an active business plan
      if (get().hasBusinessPlan()) {
        return {
          success: false,
          error: 'You already have an active business plan.',
        };
      }

      // Get business plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'Sellar Pro')
        .single();

      if (planError) throw planError;

      // Spend credits for the upgrade
      const spendResult = await get().spendCredits(
        CREDITS_REQUIRED,
        'Business Plan Upgrade',
        {
          referenceType: 'subscription_upgrade',
          planId: (plan as any).id,
        }
      );

      if (!spendResult.success) {
        return {
          success: false,
          error: spendResult.error || 'Failed to process credit payment',
        };
      }

      // Create subscription record
      const currentDate = new Date();
      const endDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: (plan as any).id,
          status: 'active',
          current_period_start: currentDate.toISOString(),
          current_period_end: endDate.toISOString(),
          auto_renew: false, // Credit-based upgrades don't auto-renew
        } as any)
        .select()
        .single();

      if (subError) {
        // If subscription creation fails, we should refund the credits
        // This would require a refund function or transaction rollback
        console.error('Subscription creation failed after spending credits:', subError);
        return {
          success: false,
          error: 'Failed to activate business plan. Please contact support for assistance.',
        };
      }

      // Award business plan credits (120 credits monthly allocation)
      const { error: creditError } = await supabase.rpc('award_community_reward', {
        p_user_id: user.id,
        p_type: 'business_plan_bonus',
        p_points: 120,
        p_description: 'Business Plan Monthly Allocation',
        p_metadata: {
          subscription_id: (subscription as any).id,
          plan_name: 'Sellar Pro',
        },
      } as any);

      if (creditError) {
        console.warn('Failed to award business plan credits:', creditError);
        // Don't fail the upgrade for this, just log it
      }

      // Refresh subscription and credit data
      await Promise.all([
        get().refreshSubscription(),
        get().refreshCredits(),
      ]);

      return {
        success: true,
        creditsRequired: CREDITS_REQUIRED,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  cancelSubscription: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔄 Starting subscription cancellation for user:', user.id);

      const { data: currentSub, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (fetchError) {
        console.error('❌ Error fetching current subscription:', fetchError);
        throw new Error('No active subscription found');
      }

      console.log('📋 Current subscription found:', currentSub);

      // Use RPC function to cancel subscription (bypasses RLS)
      const { data: cancelResult, error } = await supabase.rpc('cancel_user_subscription', {
        p_user_id: user.id,
        p_subscription_id: currentSub.id,
      } as any);

      if (error) {
        console.error('❌ Error cancelling subscription via RPC:', error);
        throw error;
      }

      console.log('✅ Subscription cancelled successfully via RPC');
      console.log('📋 Cancel result:', cancelResult);

      // Verify the update by fetching the subscription again
      const { data: verifySub, error: verifyError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', currentSub.id)
        .single();

      if (verifyError) {
        console.error('❌ Error verifying update:', verifyError);
      } else {
        console.log('🔍 Verification - Current subscription status:', verifySub?.status);
      }

      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh subscription data
      await get().refreshSubscription();

      console.log('🔄 Subscription data refreshed');

      return { success: true };
    } catch (error: any) {
      console.error('❌ Cancellation failed:', error);
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

  hasBusinessPlan: () => {
    const { currentPlan, entitlements } = get();
    
    // Check if user has a business plan subscription (active OR cancelled but still within period)
    if (currentPlan && (currentPlan.status === 'active' || currentPlan.status === 'cancelled')) {
      // For cancelled subscriptions, check if still within the current period
      if (currentPlan.status === 'cancelled') {
        const now = new Date();
        const periodEnd = new Date(currentPlan.current_period_end);
        if (now > periodEnd) {
          // Subscription has expired, no longer has business plan
          return false;
        }
      }
      
      const planName = currentPlan.subscription_plans?.name?.toLowerCase();
      
      // Check for exact match first
      if (planName === 'sellar pro') {
        return true;
      }
      
      // Check for partial matches
      if (planName?.includes('business') || planName?.includes('starter') || planName?.includes('plus') || planName?.includes('premium')) {
        return true;
      }
    }
    
    // Check entitlements for business features
    const hasBusinessFeatures = entitlements.business_features === true || entitlements.business_badge === true || entitlements.max_listings > 5;
    
    // Additional fallback: check if user has auto-refresh feature (business plan feature)
    if (entitlements.auto_refresh_2h === true) {
      return true;
    }
    
    return hasBusinessFeatures;
  },

  getBusinessPlanCreditCost: () => {
    // Business plan costs 400 GHS
    // Using the best credit rate (0.143 GHS per credit from Max package)
    const BUSINESS_PLAN_PRICE_GHS = 400;
    const CREDIT_RATE = 0.143;
    return Math.ceil(BUSINESS_PLAN_PRICE_GHS / CREDIT_RATE);
  },
}),
    {
      name: 'monetization-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the essential data, not functions
      partialize: (state) => ({
        balance: state.balance,
        lifetimeEarned: state.lifetimeEarned,
        lifetimeSpent: state.lifetimeSpent,
        transactions: state.transactions,
        currentPlan: state.currentPlan,
        entitlements: state.entitlements,
        loading: state.loading,
        error: state.error,
      }),
    }
  )
);