import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { useRewardsStore, ProgressInfo } from '@/store/useRewardsStore';
import { Coins, Trophy, Users, Star, Shield, Zap, Gift } from 'lucide-react-native';

type RewardCategory = 'all' | 'community' | 'marketplace' | 'milestones';

interface RewardTrackerItemProps {
  reward: any;
  progress: ProgressInfo;
  onPress?: () => void;
}

function RewardTrackerItem({ reward, progress, onPress }: RewardTrackerItemProps) {
  const { theme } = useTheme();

  const getProgressColor = () => {
    if (progress.is_completed) return theme.colors.success;
    if (progress.percentage > 50) return theme.colors.warning;
    return theme.colors.primary;
  };

  const getStatusBadge = () => {
    if (progress.is_completed) {
      return <Badge text="Completed" variant="success" size="sm" />;
    }
    if (reward.automatic) {
      return <Badge text="Automatic" variant="info" size="sm" />;
    }
    return <Badge text="Claimable" variant="warning" size="sm" />;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: progress.is_completed ? theme.colors.success + '30' : theme.colors.border,
        ...theme.shadows.sm,
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Icon */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: getProgressColor() + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.md,
          }}
        >
          <Text style={{ fontSize: 24 }}>
            {reward.icon}
          </Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
            <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
              {reward.name}
            </Text>
            {getStatusBadge()}
          </View>

          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
            {reward.description}
          </Text>

          {/* Credits and Progress */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Coins size={16} color={theme.colors.warning} />
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.warning,
                  fontWeight: '600',
                  marginLeft: theme.spacing.xs,
                }}
              >
                {reward.credits} Credits
              </Text>
            </View>

            {!progress.is_completed && (
              <Text variant="caption" color="muted">
                {progress.current}/{progress.required}
              </Text>
            )}
          </View>

          {/* Progress Bar */}
          {progress.required > 1 && (
            <View style={{ marginTop: theme.spacing.sm }}>
              <View
                style={{
                  height: 4,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${progress.percentage}%`,
                    backgroundColor: getProgressColor(),
                  }}
                />
              </View>
            </View>
          )}

          {/* Tips */}
          {!progress.is_completed && (
            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.sm,
                padding: theme.spacing.sm,
                marginTop: theme.spacing.sm,
              }}
            >
              <Text variant="caption" color="muted">
                💡 {getRewardTip(reward.type)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getRewardTip(rewardType: string): string {
  const tips: Record<string, string> = {
    positive_review: 'Provide excellent service to earn positive reviews from buyers',
    first_post_bonus: 'Share your first post in the Community tab to unlock this bonus',
    viral_post: 'Create engaging content that resonates with the community',
    report_validation: 'Help keep the community safe by reporting violations',
    community_guardian: 'Continue reporting violations to unlock this achievement',
    referral_bonus: 'Share your referral code with friends to earn bonuses',
    anniversary_bonus: 'Check back on your account anniversary to claim this bonus',
  };
  return tips[rewardType] || 'Complete the required actions to earn this reward';
}

interface RewardsTrackerProps {
  style?: any;
}

export function RewardsTracker({ style }: RewardsTrackerProps) {
  const { theme } = useTheme();
  const {
    availableRewards,
    achievements,
    recentRewards,
    loading,
    fetchAvailableRewards,
    fetchAchievements,
    fetchRecentRewards,
    getRewardProgress
  } = useRewardsStore();

  const [selectedCategory, setSelectedCategory] = useState<RewardCategory>('all');

  useEffect(() => {
    fetchAvailableRewards();
    fetchAchievements();
    fetchRecentRewards(); // Also fetch recent rewards for progress tracking
  }, []);

  const categories = [
    { id: 'all' as RewardCategory, label: 'All', icon: Gift },
    { id: 'community' as RewardCategory, label: 'Community', icon: Users },
    { id: 'marketplace' as RewardCategory, label: 'Marketplace', icon: Star },
    { id: 'milestones' as RewardCategory, label: 'Milestones', icon: Trophy },
  ];

  const filteredRewards = availableRewards.filter(reward => {
    if (selectedCategory === 'all') return true;
    return reward.category === selectedCategory;
  });

  if (loading) {
    return (
      <View style={[{ padding: theme.spacing.sm }, style]}>
        {Array.from({ length: 5 }).map((_, index) => (
          <LoadingSkeleton
            key={index}
            width="100%"
            height={120}
            borderRadius={theme.borderRadius.lg}
            style={{ marginBottom: theme.spacing.md }}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={style}>
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.lg,
          paddingRight: theme.spacing.xl, // Extra padding on the right
        }}
        style={{ marginBottom: theme.spacing.md }}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          const IconComponent = category.icon;

          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                borderRadius: theme.borderRadius.full,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                marginRight: theme.spacing.md,
                borderWidth: 1,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                minHeight: 40,
              }}
              activeOpacity={0.7}
            >
              <IconComponent
                size={16}
                color={isSelected ? theme.colors.primaryForeground : theme.colors.text.primary}
              />
              <Text
                variant="bodySmall"
                style={{
                  color: isSelected ? theme.colors.primaryForeground : theme.colors.text.primary,
                  fontWeight: '600',
                  marginLeft: theme.spacing.sm,
                  fontSize: 14,
                  lineHeight: 20,
                }}
                numberOfLines={1}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Rewards List */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xs,
          paddingBottom: theme.spacing.xs,
        }}
        showsVerticalScrollIndicator={false}
      >
        {filteredRewards.map((reward) => {
          // Always get progress for all rewards, not just achievements
          const progress = getRewardProgress(reward.type);

          return (
            <RewardTrackerItem
              key={reward.type}
              reward={reward}
              progress={progress}
              onPress={() => {
                // Handle reward item press (could navigate to details or claim)
                console.log('Reward pressed:', reward.type);
              }}
            />
          );
        })}

        {filteredRewards.length === 0 && (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.spacing.xl * 2,
            }}
          >
            <Zap size={48} color={theme.colors.text.muted} />
            <Text variant="h4" color="muted" style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}>
              No rewards in this category
            </Text>
            <Text variant="body" color="secondary" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
              Try selecting a different category to see available rewards
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
