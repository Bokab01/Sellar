/**
 * User Reputation Service
 * Manages user reputation scores and trust levels
 */

import { supabase } from './supabase';

export interface UserReputation {
  id: string;
  user_id: string;
  reputation_score: number;
  trust_level: 'new' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'restricted' | 'banned';
  total_flags: number;
  total_violations: number;
  successful_transactions: number;
  failed_transactions: number;
  positive_reviews: number;
  negative_reviews: number;
  response_rate: number;
  avg_response_time: number | null;
  last_violation_at: string | null;
  restriction_ends_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReputationHistory {
  id: string;
  user_id: string;
  action_type: string;
  points_change: number;
  previous_score: number;
  new_score: number;
  reason: string | null;
  related_content_type: string | null;
  related_content_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReputationChange {
  success: boolean;
  previous_score: number;
  new_score: number;
  trust_level: string;
}

class ReputationService {
  /**
   * Get user reputation
   */
  async getUserReputation(userId: string): Promise<UserReputation | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_reputation_summary', { p_user_id: userId });

      if (error) {
        console.error('Error fetching user reputation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user reputation:', error);
      return null;
    }
  }

  /**
   * Update user reputation
   */
  async updateReputation(
    userId: string,
    actionType: string,
    pointsChange: number,
    reason?: string,
    relatedContentType?: string,
    relatedContentId?: string
  ): Promise<ReputationChange | null> {
    try {
      const { data, error } = await supabase.rpc('update_user_reputation', {
        p_user_id: userId,
        p_action_type: actionType,
        p_points_change: pointsChange,
        p_reason: reason || null,
        p_related_content_type: relatedContentType || null,
        p_related_content_id: relatedContentId || null,
        p_created_by: null, // System action
      });

      if (error) {
        console.error('Error updating reputation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error updating reputation:', error);
      return null;
    }
  }

  /**
   * Get reputation history
   */
  async getReputationHistory(
    userId: string,
    limit: number = 20
  ): Promise<ReputationHistory[]> {
    try {
      const { data, error } = await supabase
        .from('reputation_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching reputation history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching reputation history:', error);
      return [];
    }
  }

  /**
   * Award points for positive actions
   */
  async awardPoints(
    userId: string,
    action: 'listing_created' | 'positive_review' | 'transaction_complete' | 'helpful_response' | 'verified_seller',
    relatedContentId?: string
  ): Promise<void> {
    const pointsMap = {
      listing_created: 5,
      positive_review: 10,
      transaction_complete: 15,
      helpful_response: 5,
      verified_seller: 50,
    };

    const points = pointsMap[action];
    const reason = this.getActionReason(action);

    await this.updateReputation(
      userId,
      action,
      points,
      reason,
      this.getContentType(action),
      relatedContentId
    );
  }

  /**
   * Deduct points for negative actions
   */
  async deductPoints(
    userId: string,
    action: 'content_flagged' | 'negative_review' | 'transaction_failed' | 'spam_detected' | 'violation',
    relatedContentId?: string
  ): Promise<void> {
    const pointsMap = {
      content_flagged: -5,
      negative_review: -10,
      transaction_failed: -15,
      spam_detected: -20,
      violation: -30,
    };

    const points = pointsMap[action];
    const reason = this.getActionReason(action);

    await this.updateReputation(
      userId,
      action,
      points,
      reason,
      this.getContentType(action),
      relatedContentId
    );
  }

  /**
   * Update transaction stats
   */
  async updateTransactionStats(
    userId: string,
    success: boolean
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_user_reputation', {
        p_user_id: userId,
        p_action_type: success ? 'transaction_complete' : 'transaction_failed',
        p_points_change: success ? 15 : -15,
        p_reason: success ? 'Transaction completed successfully' : 'Transaction failed',
        p_related_content_type: 'transaction',
        p_related_content_id: null,
        p_created_by: null,
      });

      if (error) {
        console.error('Error updating transaction stats:', error);
      }

      // Update the transaction count
      const field = success ? 'successful_transactions' : 'failed_transactions';
      await supabase.rpc('increment_field', {
        table_name: 'user_reputation',
        field_name: field,
        user_id: userId
      });

    } catch (error) {
      console.error('Error updating transaction stats:', error);
    }
  }

  /**
   * Update review stats
   */
  async updateReviewStats(
    userId: string,
    isPositive: boolean
  ): Promise<void> {
    try {
      const field = isPositive ? 'positive_reviews' : 'negative_reviews';
      const points = isPositive ? 10 : -10;

      await this.updateReputation(
        userId,
        isPositive ? 'positive_review' : 'negative_review',
        points,
        isPositive ? 'Received positive review' : 'Received negative review',
        'review',
        undefined
      );

      // Update the review count
      await supabase.rpc('increment_field', {
        table_name: 'user_reputation',
        field_name: field,
        user_id: userId
      });

    } catch (error) {
      console.error('Error updating review stats:', error);
    }
  }

  /**
   * Update flag stats
   */
  async updateFlagStats(
    userId: string,
    isViolation: boolean = false
  ): Promise<void> {
    try {
      await supabase.rpc('increment_field', {
        table_name: 'user_reputation',
        field_name: 'total_flags',
        user_id: userId
      });

      if (isViolation) {
        await supabase.rpc('increment_field', {
          table_name: 'user_reputation',
          field_name: 'total_violations',
          user_id: userId
        });
        
        await supabase
          .from('user_reputation')
          .update({ last_violation_at: new Date().toISOString() })
          .eq('user_id', userId);
      }

      await this.deductPoints(
        userId,
        isViolation ? 'violation' : 'content_flagged',
        undefined
      );

    } catch (error) {
      console.error('Error updating flag stats:', error);
    }
  }

  /**
   * Get trust level badge info
   */
  getTrustLevelInfo(trustLevel: string): {
    label: string;
    color: string;
    icon: string;
    description: string;
  } {
    const levels = {
      new: {
        label: 'New User',
        color: '#6B7280',
        icon: '🆕',
        description: 'New to the platform',
      },
      bronze: {
        label: 'Bronze',
        color: '#CD7F32',
        icon: '🥉',
        description: 'Building reputation',
      },
      silver: {
        label: 'Silver',
        color: '#C0C0C0',
        icon: '🥈',
        description: 'Trusted seller',
      },
      gold: {
        label: 'Gold',
        color: '#FFD700',
        icon: '🥇',
        description: 'Highly trusted',
      },
      platinum: {
        label: 'Platinum',
        color: '#E5E4E2',
        icon: '💎',
        description: 'Elite seller',
      },
      restricted: {
        label: 'Restricted',
        color: '#EF4444',
        icon: '⚠️',
        description: 'Account restricted',
      },
      banned: {
        label: 'Banned',
        color: '#991B1B',
        icon: '🚫',
        description: 'Account banned',
      },
    };

    return levels[trustLevel as keyof typeof levels] || levels.new;
  }

  /**
   * Check if user is restricted
   */
  async isUserRestricted(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_reputation')
        .select('trust_level, restriction_ends_at')
        .eq('user_id', userId)
        .single();

      if (error || !data) return false;

      if (data.trust_level === 'banned') return true;

      if (data.trust_level === 'restricted' && data.restriction_ends_at) {
        const restrictionEnd = new Date(data.restriction_ends_at);
        return restrictionEnd > new Date();
      }

      return false;
    } catch (error) {
      console.error('Error checking user restriction:', error);
      return false;
    }
  }

  /**
   * Helper: Get action reason
   */
  private getActionReason(action: string): string {
    const reasons: Record<string, string> = {
      listing_created: 'Created a new listing',
      positive_review: 'Received positive review',
      transaction_complete: 'Completed transaction',
      helpful_response: 'Provided helpful response',
      verified_seller: 'Became verified seller',
      content_flagged: 'Content was flagged',
      negative_review: 'Received negative review',
      transaction_failed: 'Transaction failed',
      spam_detected: 'Spam content detected',
      violation: 'Policy violation',
    };

    return reasons[action] || action;
  }

  /**
   * Helper: Get content type
   */
  private getContentType(action: string): string | undefined {
    const types: Record<string, string> = {
      listing_created: 'listing',
      positive_review: 'review',
      negative_review: 'review',
      transaction_complete: 'transaction',
      transaction_failed: 'transaction',
    };

    return types[action];
  }
}

export const reputationService = new ReputationService();
