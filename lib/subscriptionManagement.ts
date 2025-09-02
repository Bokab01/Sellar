import { supabase } from './supabase';
import { BUSINESS_PLANS } from '@/constants/monetization';

export interface SubscriptionChangeResult {
  success: boolean;
  error?: string;
  newSubscriptionId?: string;
  prorationAmount?: number;
  effectiveDate?: string;
}

export interface CancellationResult {
  success: boolean;
  error?: string;
  cancellationDate?: string;
  refundAmount?: number;
}

export interface BillingCycle {
  id: string;
  subscriptionId: string;
  planId: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  paymentReference?: string;
}

class SubscriptionManagementService {
  /**
   * Upgrade user's subscription to a higher plan
   */
  async upgradeSubscription(
    userId: string,
    newPlanId: string,
    paymentReference?: string
  ): Promise<SubscriptionChangeResult> {
    try {
      // Get current subscription
      const { data: currentSub, error: currentError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (currentError || !currentSub) {
        return { success: false, error: 'No active subscription found' };
      }

      // Get plan details
      const currentPlan = BUSINESS_PLANS.find(p => p.id === currentSub.plan_id);
      const newPlan = BUSINESS_PLANS.find(p => p.id === newPlanId);

      if (!currentPlan || !newPlan) {
        return { success: false, error: 'Invalid plan configuration' };
      }

      // Validate upgrade (new plan should be more expensive)
      if (newPlan.priceMonthly <= currentPlan.priceMonthly) {
        return { success: false, error: 'Cannot upgrade to a lower-tier plan' };
      }

      // Calculate proration
      const prorationAmount = this.calculateProration(
        currentSub.current_period_start,
        currentSub.current_period_end,
        currentPlan.priceMonthly,
        newPlan.priceMonthly
      );

      // Create new subscription
      const now = new Date().toISOString();
      const nextPeriodEnd = new Date(currentSub.current_period_end);
      
      const { data: newSubscription, error: createError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: newPlanId,
          status: 'active',
          current_period_start: now,
          current_period_end: nextPeriodEnd.toISOString(),
          payment_reference: paymentReference,
          upgraded_from: currentSub.id,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: 'Failed to create new subscription' };
      }

      // Cancel old subscription
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: now,
          cancellation_reason: 'upgraded',
          updated_at: now,
        })
        .eq('id', currentSub.id);

      // Log subscription change
      await this.logSubscriptionChange(userId, 'upgrade', currentSub.id, newSubscription.id, {
        old_plan: currentPlan.name,
        new_plan: newPlan.name,
        proration_amount: prorationAmount,
      });

      return {
        success: true,
        newSubscriptionId: newSubscription.id,
        prorationAmount,
        effectiveDate: now,
      };
    } catch (error: any) {
      console.error('Subscription upgrade error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Downgrade user's subscription to a lower plan
   */
  async downgradeSubscription(
    userId: string,
    newPlanId: string,
    effectiveDate?: string
  ): Promise<SubscriptionChangeResult> {
    try {
      // Get current subscription
      const { data: currentSub, error: currentError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (currentError || !currentSub) {
        return { success: false, error: 'No active subscription found' };
      }

      // Get plan details
      const currentPlan = BUSINESS_PLANS.find(p => p.id === currentSub.plan_id);
      const newPlan = BUSINESS_PLANS.find(p => p.id === newPlanId);

      if (!currentPlan || !newPlan) {
        return { success: false, error: 'Invalid plan configuration' };
      }

      // Validate downgrade
      if (newPlan.priceMonthly >= currentPlan.priceMonthly) {
        return { success: false, error: 'Cannot downgrade to a higher-tier plan' };
      }

      // Determine when downgrade takes effect
      const downgradeTo = effectiveDate ? new Date(effectiveDate) : new Date(currentSub.current_period_end);
      const now = new Date().toISOString();

      if (downgradeTo <= new Date()) {
        // Immediate downgrade
        const { data: newSubscription, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_id: newPlanId,
            status: 'active',
            current_period_start: now,
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            downgraded_from: currentSub.id,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (createError) {
          return { success: false, error: 'Failed to create new subscription' };
        }

        // Cancel old subscription
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: now,
            cancellation_reason: 'downgraded',
            updated_at: now,
          })
          .eq('id', currentSub.id);

        await this.logSubscriptionChange(userId, 'downgrade', currentSub.id, newSubscription.id, {
          old_plan: currentPlan.name,
          new_plan: newPlan.name,
          effective_immediately: true,
        });

        return {
          success: true,
          newSubscriptionId: newSubscription.id,
          effectiveDate: now,
        };
      } else {
        // Schedule downgrade for end of current period
        await supabase
          .from('user_subscriptions')
          .update({
            scheduled_plan_change: newPlanId,
            scheduled_change_date: downgradeTo.toISOString(),
            updated_at: now,
          })
          .eq('id', currentSub.id);

        await this.logSubscriptionChange(userId, 'downgrade_scheduled', currentSub.id, null, {
          old_plan: currentPlan.name,
          new_plan: newPlan.name,
          scheduled_for: downgradeTo.toISOString(),
        });

        return {
          success: true,
          effectiveDate: downgradeTo.toISOString(),
        };
      }
    } catch (error: any) {
      console.error('Subscription downgrade error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel user's subscription
   */
  async cancelSubscription(
    userId: string,
    reason?: string,
    cancelImmediately: boolean = false
  ): Promise<CancellationResult> {
    try {
      // Get current subscription
      const { data: currentSub, error: currentError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (currentError || !currentSub) {
        return { success: false, error: 'No active subscription found' };
      }

      const now = new Date().toISOString();
      let cancellationDate: string;
      let refundAmount = 0;

      if (cancelImmediately) {
        // Immediate cancellation with potential refund
        cancellationDate = now;
        
        // Calculate refund for unused period
        const remainingDays = Math.max(0, 
          (new Date(currentSub.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const plan = BUSINESS_PLANS.find(p => p.id === currentSub.plan_id);
        if (plan && remainingDays > 7) { // Only refund if more than 7 days remaining
          refundAmount = Math.round((remainingDays / 30) * plan.priceMonthly * 100) / 100;
        }

        await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: now,
            cancellation_reason: reason || 'user_requested',
            refund_amount: refundAmount,
            updated_at: now,
          })
          .eq('id', currentSub.id);
      } else {
        // Cancel at end of current period
        cancellationDate = currentSub.current_period_end;
        
        await supabase
          .from('user_subscriptions')
          .update({
            cancel_at_period_end: true,
            cancellation_reason: reason || 'user_requested',
            updated_at: now,
          })
          .eq('id', currentSub.id);
      }

      // Log cancellation
      await this.logSubscriptionChange(userId, 'cancellation', currentSub.id, null, {
        reason: reason || 'user_requested',
        immediate: cancelImmediately,
        refund_amount: refundAmount,
        cancellation_date: cancellationDate,
      });

      // Send cancellation notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Subscription Cancelled',
        message: cancelImmediately 
          ? `Your subscription has been cancelled immediately${refundAmount > 0 ? ` with a refund of GHS ${refundAmount}` : ''}.`
          : `Your subscription will be cancelled on ${new Date(cancellationDate).toLocaleDateString()}.`,
        notification_type: 'subscription_cancelled',
        related_id: currentSub.id,
        related_type: 'subscription',
        created_at: now,
      });

      return {
        success: true,
        cancellationDate,
        refundAmount: refundAmount > 0 ? refundAmount : undefined,
      };
    } catch (error: any) {
      console.error('Subscription cancellation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(
    userId: string,
    planId: string,
    paymentReference: string
  ): Promise<SubscriptionChangeResult> {
    try {
      const now = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const { data: newSubscription, error: createError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          current_period_start: now,
          current_period_end: periodEnd,
          payment_reference: paymentReference,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: 'Failed to reactivate subscription' };
      }

      await this.logSubscriptionChange(userId, 'reactivation', null, newSubscription.id, {
        plan_id: planId,
      });

      return {
        success: true,
        newSubscriptionId: newSubscription.id,
        effectiveDate: now,
      };
    } catch (error: any) {
      console.error('Subscription reactivation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get billing history for a user
   */
  async getBillingHistory(userId: string, limit: number = 10): Promise<BillingCycle[]> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          plan_id,
          current_period_start,
          current_period_end,
          status,
          payment_reference,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get billing history:', error);
        return [];
      }

      return (data || []).map(sub => {
        const plan = BUSINESS_PLANS.find(p => p.id === sub.plan_id);
        return {
          id: sub.id,
          subscriptionId: sub.id,
          planId: sub.plan_id,
          startDate: sub.current_period_start,
          endDate: sub.current_period_end,
          amount: plan?.priceMonthly || 0,
          status: sub.status as any,
          paymentReference: sub.payment_reference,
        };
      });
    } catch (error) {
      console.error('Failed to get billing history:', error);
      return [];
    }
  }

  /**
   * Process scheduled plan changes (to be run by cron job)
   */
  async processScheduledChanges(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Get subscriptions with scheduled changes
      const { data: scheduledChanges } = await supabase
        .from('user_subscriptions')
        .select('*')
        .not('scheduled_plan_change', 'is', null)
        .lte('scheduled_change_date', now)
        .eq('status', 'active');

      for (const subscription of scheduledChanges || []) {
        // Create new subscription with scheduled plan
        const { data: newSub, error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: subscription.user_id,
            plan_id: subscription.scheduled_plan_change,
            status: 'active',
            current_period_start: now,
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (!error && newSub) {
          // Cancel old subscription
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: now,
              cancellation_reason: 'scheduled_change',
              updated_at: now,
            })
            .eq('id', subscription.id);

          await this.logSubscriptionChange(
            subscription.user_id,
            'scheduled_change_executed',
            subscription.id,
            newSub.id,
            {
              old_plan: subscription.plan_id,
              new_plan: subscription.scheduled_plan_change,
            }
          );
        }
      }
    } catch (error) {
      console.error('Failed to process scheduled changes:', error);
    }
  }

  /**
   * Calculate proration amount for plan changes
   */
  private calculateProration(
    periodStart: string,
    periodEnd: string,
    oldPrice: number,
    newPrice: number
  ): number {
    const now = new Date();
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    
    const totalPeriodDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const remainingDays = Math.max(0, (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const remainingRatio = remainingDays / totalPeriodDays;
    const priceDifference = newPrice - oldPrice;
    
    return Math.round(priceDifference * remainingRatio * 100) / 100;
  }

  /**
   * Log subscription changes for audit trail
   */
  private async logSubscriptionChange(
    userId: string,
    changeType: string,
    oldSubscriptionId: string | null,
    newSubscriptionId: string | null,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('subscription_change_log').insert({
        user_id: userId,
        change_type: changeType,
        old_subscription_id: oldSubscriptionId,
        new_subscription_id: newSubscriptionId,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log subscription change:', error);
    }
  }
}

export const subscriptionManagementService = new SubscriptionManagementService();

// Helper functions for UI components
export async function upgradeUserSubscription(
  userId: string,
  newPlanId: string,
  paymentReference?: string
): Promise<SubscriptionChangeResult> {
  return await subscriptionManagementService.upgradeSubscription(userId, newPlanId, paymentReference);
}

export async function downgradeUserSubscription(
  userId: string,
  newPlanId: string,
  effectiveDate?: string
): Promise<SubscriptionChangeResult> {
  return await subscriptionManagementService.downgradeSubscription(userId, newPlanId, effectiveDate);
}

export async function cancelUserSubscription(
  userId: string,
  reason?: string,
  immediate?: boolean
): Promise<CancellationResult> {
  return await subscriptionManagementService.cancelSubscription(userId, reason, immediate);
}

export async function reactivateUserSubscription(
  userId: string,
  planId: string,
  paymentReference: string
): Promise<SubscriptionChangeResult> {
  return await subscriptionManagementService.reactivateSubscription(userId, planId, paymentReference);
}

export async function getUserBillingHistory(userId: string, limit?: number): Promise<BillingCycle[]> {
  return await subscriptionManagementService.getBillingHistory(userId, limit);
}
