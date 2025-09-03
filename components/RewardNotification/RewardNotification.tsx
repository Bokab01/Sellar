import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { X, Coins } from 'lucide-react-native';
import { CommunityReward } from '@/store/useRewardsStore';

const { width: screenWidth } = Dimensions.get('window');

interface RewardNotificationProps {
  reward: CommunityReward | null;
  visible: boolean;
  onClose: () => void;
  autoHide?: boolean;
  duration?: number;
}

export function RewardNotification({
  reward,
  visible,
  onClose,
  autoHide = true,
  duration = 4000
}: RewardNotificationProps) {
  const { theme } = useTheme();
  const [slideAnim] = useState(new Animated.Value(-screenWidth));

  useEffect(() => {
    if (visible && reward) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Auto hide
      if (autoHide) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, reward, autoHide, duration]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const getRewardIcon = (rewardType: string) => {
    const icons: Record<string, string> = {
      positive_review: '⭐',
      first_post_bonus: '📝',
      first_like_bonus: '👍',
      engagement_milestone_10: '📈',
      engagement_milestone_25: '🚀',
      engagement_milestone_50: '🔥',
      viral_post: '🔥',
      super_viral_post: '💥',
      helpful_commenter: '💬',
      report_validation: '🛡️',
      community_guardian: '🏆',
      referral_bonus: '👥',
      anniversary_bonus: '🎉',
      default: '🎁'
    };
    return icons[rewardType] || icons.default;
  };

  const getRewardTitle = (rewardType: string) => {
    const titles: Record<string, string> = {
      positive_review: 'Positive Review!',
      first_post_bonus: 'First Post Bonus!',
      first_like_bonus: 'First Like!',
      engagement_milestone_10: '10 Likes Milestone!',
      engagement_milestone_25: '25 Likes Milestone!',
      engagement_milestone_50: '50 Likes Milestone!',
      viral_post: 'Viral Post!',
      super_viral_post: 'Super Viral Post!',
      helpful_commenter: 'Helpful Commenter!',
      report_validation: 'Report Validated!',
      community_guardian: 'Community Guardian!',
      referral_bonus: 'Referral Bonus!',
      anniversary_bonus: 'Anniversary Bonus!',
      default: 'Reward Earned!'
    };
    return titles[rewardType] || titles.default;
  };

  if (!reward) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        zIndex: 1000,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          ...theme.shadows.lg,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.success,
        }}
      >
        {/* Reward Icon */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: theme.colors.success + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.md,
          }}
        >
          <Text style={{ fontSize: 24 }}>
            {getRewardIcon(reward.reward_type)}
          </Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <Coins size={16} color={theme.colors.success} />
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.success,
                fontWeight: '600',
                marginLeft: theme.spacing.xs,
              }}
            >
              +{reward.credits_earned} Credits
            </Text>
          </View>
          
          <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            {getRewardTitle(reward.reward_type)}
          </Text>
          
          <Text variant="bodySmall" color="secondary" numberOfLines={2}>
            {reward.trigger_action}
          </Text>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          onPress={handleClose}
          style={{
            padding: theme.spacing.sm,
            marginLeft: theme.spacing.sm,
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color={theme.colors.text.muted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Compact version for in-app notifications
interface CompactRewardNotificationProps {
  reward: CommunityReward;
  onPress?: () => void;
  style?: any;
}

export function CompactRewardNotification({
  reward,
  onPress,
  style
}: CompactRewardNotificationProps) {
  const { theme } = useTheme();

  const getRewardIcon = (rewardType: string) => {
    const icons: Record<string, string> = {
      positive_review: '⭐',
      first_post_bonus: '📝',
      first_like_bonus: '👍',
      engagement_milestone_10: '📈',
      engagement_milestone_25: '🚀',
      engagement_milestone_50: '🔥',
      viral_post: '🔥',
      super_viral_post: '💥',
      helpful_commenter: '💬',
      report_validation: '🛡️',
      community_guardian: '🏆',
      referral_bonus: '👥',
      anniversary_bonus: '🎉',
      default: '🎁'
    };
    return icons[rewardType] || icons.default;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.colors.success + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.colors.success + '30',
        },
        style
      ]}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 20, marginRight: theme.spacing.sm }}>
        {getRewardIcon(reward.reward_type)}
      </Text>
      
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Coins size={14} color={theme.colors.success} />
          <Text
            variant="caption"
            style={{
              color: theme.colors.success,
              fontWeight: '600',
              marginLeft: theme.spacing.xs,
            }}
          >
            +{reward.credits_earned}
          </Text>
        </View>
        <Text variant="bodySmall" numberOfLines={1} style={{ marginTop: 2 }}>
          {reward.trigger_action}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
