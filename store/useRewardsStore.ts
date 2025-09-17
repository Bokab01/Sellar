import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface CommunityReward {
  id: string;
  user_id: string;
  reward_type: string;
  credits_earned: number;
  trigger_action: string;
  reference_id?: string;
  reference_type?: string;
  metadata?: any;
  is_validated: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description?: string;
  credits_rewarded: number;
  progress_current: number;
  progress_required: number;
  is_completed: boolean;
  unlocked_at?: string;
  created_at: string;
}

export interface RewardSummary {
  total_credits_earned: number;
  total_rewards: number;
  achievements_unlocked: number;
  recent_rewards: CommunityReward[];
}

export interface ProgressInfo {
  current: number;
  required: number;
  percentage: number;
  is_completed: boolean;
}

export interface RewardResult {
  success: boolean;
  credits_awarded?: number;
  error?: string;
  achievement_unlocked?: boolean;
}

interface RewardsStore {
  // State
  rewardSummary: RewardSummary | null;
  recentRewards: CommunityReward[];
  achievements: UserAchievement[];
  availableRewards: any[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchRewardSummary: () => Promise<void>;
  fetchRecentRewards: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  fetchAvailableRewards: () => Promise<void>;
  claimAnniversaryBonus: () => Promise<RewardResult>;
  claimReferralBonus: (refereeId: string, referralCode?: string) => Promise<RewardResult>;
  subscribeToRewards: (userId: string, onRewardReceived?: (reward: CommunityReward) => void) => () => void;
  getRewardProgress: (achievementType: string) => ProgressInfo;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRewardsStore = create<RewardsStore>((set, get) => ({
  // Initial state
  rewardSummary: null,
  recentRewards: [],
  achievements: [],
  availableRewards: [],
  loading: false,
  error: null,

  // Fetch user reward summary
  fetchRewardSummary: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_user_reward_summary', {
        p_user_id: user.id
      } as any);

      if (error) throw error;

      // Map the database response to the expected interface
      const mappedSummary = {
        total_credits_earned: data?.credits?.lifetime_earned || 0,
        total_rewards: data?.community_points?.total_rewards || 0,
        achievements_unlocked: 0, // TODO: Add achievements count when implemented
        recent_rewards: [], // This will be fetched separately
      };

      set({ rewardSummary: mappedSummary, loading: false });
    } catch (error) {
      console.error('Error fetching reward summary:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch rewards', loading: false });
    }
  },

  // Fetch recent rewards
  fetchRecentRewards: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('community_rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_validated', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Map database fields to interface fields
      const mappedRewards = (data || []).map(reward => ({
        id: reward.id,
        user_id: reward.user_id,
        reward_type: reward.type,
        credits_earned: reward.points,
        trigger_action: reward.description,
        reference_id: reward.metadata?.post_id || reward.metadata?.review_id || null,
        reference_type: reward.type,
        metadata: reward.metadata,
        is_validated: reward.is_validated,
        created_at: reward.created_at,
      }));

      set({ recentRewards: mappedRewards, loading: false });
    } catch (error) {
      console.error('Error fetching recent rewards:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch recent rewards', loading: false });
    }
  },

  // Fetch user achievements
  fetchAchievements: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ achievements: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching achievements:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch achievements', loading: false });
    }
  },

  // Fetch available rewards (predefined reward types and their requirements)
  fetchAvailableRewards: async () => {
    const availableRewards = [
      {
        type: 'positive_review',
        name: 'Positive Review',
        description: 'Earn 3 credits for each 4-5 star review you receive',
        credits: 3,
        category: 'marketplace',
        icon: '⭐',
        automatic: true,
      },
      {
        type: 'first_post_bonus',
        name: 'First Post Bonus',
        description: 'Get 5 credits for creating your first community post',
        credits: 5,
        category: 'community',
        icon: '📝',
        automatic: true,
        one_time: true,
      },
      {
        type: 'viral_post',
        name: 'Viral Post',
        description: 'Earn 10 credits when your post gets 50+ likes',
        credits: 10,
        category: 'community',
        icon: '🔥',
        automatic: true,
      },
      {
        type: 'super_viral_post',
        name: 'Super Viral Post',
        description: 'Earn 15 credits when your post reaches 100+ likes',
        credits: 15,
        category: 'community',
        icon: '💥',
        automatic: true,
      },
      {
        type: 'report_validation',
        name: 'Report Validation',
        description: 'Get 5 credits when your report leads to action',
        credits: 5,
        category: 'community',
        icon: '🛡️',
        automatic: true,
      },
      {
        type: 'community_guardian',
        name: 'Community Guardian',
        description: 'Unlock 10 credits for 5+ validated reports',
        credits: 10,
        category: 'milestones',
        icon: '🏆',
        automatic: true,
        achievement: true,
      },
      {
        type: 'referral_bonus',
        name: 'Referral Bonus',
        description: 'Earn 20 credits for each successful referral',
        credits: 20,
        category: 'milestones',
        icon: '👥',
        automatic: false,
      },
      {
        type: 'anniversary_bonus',
        name: 'Anniversary Bonus',
        description: 'Claim 25 credits on your account anniversary',
        credits: 25,
        category: 'milestones',
        icon: '🎉',
        automatic: false,
        yearly: true,
      },
    ];

    set({ availableRewards });
  },

  // Claim anniversary bonus
  claimAnniversaryBonus: async (): Promise<RewardResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('claim_anniversary_bonus', {
        p_user_id: user.id
      } as any);

      if (error) throw error;

      if (data.success) {
        // Refresh data
        get().fetchRewardSummary();
        get().fetchRecentRewards();
      }

      return data;
    } catch (error) {
      console.error('Error claiming anniversary bonus:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim bonus'
      };
    }
  },

  // Claim referral bonus
  claimReferralBonus: async (refereeId: string, referralCode?: string): Promise<RewardResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('claim_referral_bonus', {
        p_referrer_id: user.id,
        p_referee_id: refereeId,
        p_referral_code: referralCode
      } as any);

      if (error) throw error;

      if (data.success) {
        // Refresh data
        get().fetchRewardSummary();
        get().fetchRecentRewards();
      }

      return data;
    } catch (error) {
      console.error('Error claiming referral bonus:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim referral bonus'
      };
    }
  },

  // Subscribe to real-time reward updates
  subscribeToRewards: (userId: string, onRewardReceived?: (reward: CommunityReward) => void) => {
    if (!userId) {
      // Return a no-op unsubscribe function if no user ID
      return () => {};
    }
    
    const subscription = supabase
      .channel('user_rewards_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_rewards',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const reward = payload.new as CommunityReward;
        
        // Call callback if provided
        if (onRewardReceived) {
          onRewardReceived(reward);
        }
        
        // Refresh local data
        get().fetchRewardSummary();
        get().fetchRecentRewards();
      })
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  },

  // Get progress for a specific achievement type
  getRewardProgress: (achievementType: string): ProgressInfo => {
    const achievement = get().achievements.find(a => a.achievement_type === achievementType);
    
    // Check if this reward type has been earned in community_rewards
    const earnedReward = get().recentRewards.find(r => r.reward_type === achievementType);
    
    // If we have an achievement record, use that
    if (achievement) {
      const percentage = Math.min((achievement.progress_current / achievement.progress_required) * 100, 100);

      return {
        current: achievement.progress_current,
        required: achievement.progress_required,
        percentage,
        is_completed: achievement.is_completed
      };
    }
    
    // If no achievement but we have earned this reward, mark as completed
    if (earnedReward) {
      return {
        current: 1,
        required: 1,
        percentage: 100,
        is_completed: true
      };
    }
    
    // Default: not completed
    return {
      current: 0,
      required: 1,
      percentage: 0,
      is_completed: false
    };
  },

  // Utility functions
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  reset: () => set({
    rewardSummary: null,
    recentRewards: [],
    achievements: [],
    availableRewards: [],
    loading: false,
    error: null
  })
}));
