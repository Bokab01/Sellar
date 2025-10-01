import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  Badge,
  LoadingSkeleton,
  EmptyState,
} from '@/components';
import { RewardsTracker } from '@/components/RewardsTracker/RewardsTracker';
import { CompactRewardNotification } from '@/components/RewardNotification/RewardNotification';
import { useRewardsStore, CommunityReward } from '@/store/useRewardsStore';
import { 
  Coins, 
  Trophy, 
  TrendingUp, 
  Calendar,
  Users,
  Gift,
  Star,
  ChevronRight
} from 'lucide-react-native';

type TabType = 'overview' | 'tracker' | 'history';

export default function MyRewardsScreen() {
  const { theme } = useTheme();
  const {
    rewardSummary,
    recentRewards,
    loading,
    fetchRewardSummary,
    fetchRecentRewards,
    claimAnniversaryBonus,
    claimReferralBonus
  } = useRewardsStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchRewardSummary(),
      fetchRecentRewards()
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClaimAnniversary = async () => {
    setClaiming(true);
    try {
      const result = await claimAnniversaryBonus();
      if (result.success) {
        Alert.alert(
          '🎉 Anniversary Bonus!',
          `You've been awarded ${result.credits_awarded} credits!`,
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        Alert.alert('Unable to Claim', result.error || 'Please try again later');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to claim anniversary bonus');
    } finally {
      setClaiming(false);
    }
  };

  const renderOverviewTab = () => (
    <ScrollView
      contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Credits Summary */}
      <View
        style={{
          backgroundColor: theme.colors.primary,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.lg,
          ...theme.shadows.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <Coins size={24} color={theme.colors.primaryForeground} />
          <Text
            variant="h3"
            style={{
              color: theme.colors.primaryForeground,
              fontWeight: '700',
              marginLeft: theme.spacing.sm,
            }}
          >
            {rewardSummary?.total_credits_earned || 0}
          </Text>
          <Text
            variant="body"
            style={{
              color: theme.colors.primaryForeground + 'CC',
              marginLeft: theme.spacing.sm,
            }}
          >
            Credits Earned
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center' }}>
            <Text
              variant="h4"
              style={{
                color: theme.colors.primaryForeground,
                fontWeight: '600',
              }}
            >
              {rewardSummary?.total_rewards || 0}
            </Text>
            <Text
              variant="caption"
              style={{
                color: theme.colors.primaryForeground + 'CC',
              }}
            >
              Total Rewards
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text
              variant="h4"
              style={{
                color: theme.colors.primaryForeground,
                fontWeight: '600',
              }}
            >
              {rewardSummary?.achievements_unlocked || 0}
            </Text>
            <Text
              variant="caption"
              style={{
                color: theme.colors.primaryForeground + 'CC',
              }}
            >
              Achievements
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          ...theme.shadows.sm,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg, fontWeight: '600' }}>
          Quick Actions
        </Text>

        <View style={{ gap: theme.spacing.md }}>
          <Button
            variant="secondary"
            onPress={handleClaimAnniversary}
            loading={claiming}
            icon={<Calendar size={18} color={theme.colors.primary} />}
            style={{ justifyContent: 'flex-start' }}
          >
            Claim Anniversary Bonus
          </Button>

          <Button
            variant="secondary"
            onPress={() => router.push('/invite')}
            icon={<Users size={18} color={theme.colors.primary} />}
            style={{ justifyContent: 'flex-start' }}
          >
            Invite Friends
          </Button>

          <Button
            variant="secondary"
            onPress={() => router.push('/(tabs)/community')}
            icon={<Star size={18} color={theme.colors.primary} />}
            style={{ justifyContent: 'flex-start' }}
          >
            Join Community
          </Button>
        </View>
      </View>

      {/* Recent Achievements */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          ...theme.shadows.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg }}>
          <Text variant="h4" style={{ fontWeight: '600' }}>
            Recent Rewards
          </Text>
          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text variant="bodySmall" color="primary">
              View All
            </Text>
            <ChevronRight size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {recentRewards.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {recentRewards.slice(0, 3).map((reward) => (
              <CompactRewardNotification
                key={reward.id}
                reward={reward}
                onPress={() => setActiveTab('history')}
              />
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
            <Gift size={48} color={theme.colors.text.muted} />
            <Text variant="body" color="muted" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
              No rewards yet
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
              Start engaging with the community to earn your first rewards!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView
      contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {recentRewards.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          {recentRewards.map((reward) => (
            <RewardHistoryItem key={reward.id} reward={reward} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon={<TrendingUp size={64} color={theme.colors.text.muted} />}
          title="No Reward History"
          description="Your reward history will appear here as you earn credits through community engagement."
          action={{
            text: 'Start Earning',
            onPress: () => router.push('/(tabs)/community'),
          }}
        />
      )}
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'tracker':
        return <RewardsTracker />;
      case 'history':
        return renderHistoryTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading && !rewardSummary) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="My Rewards" showBack />
        <Container>
          <LoadingSkeleton width="100%" height={150} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          <LoadingSkeleton width="100%" height={200} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={80} style={{ marginBottom: theme.spacing.md }} />
          ))}
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader 
        title="My Rewards" 
        showBack 
        onBackPress={() => router.back()}
      />
      
      {/* Tab Navigation */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.sm }}
        >
          {[
            { id: 'overview' as TabType, label: 'Overview', icon: TrendingUp },
            { id: 'tracker' as TabType, label: 'Tracker', icon: Trophy },
            { id: 'history' as TabType, label: 'History', icon: Calendar },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComponent = tab.icon;

            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.md,
                  marginRight: theme.spacing.lg,
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? theme.colors.primary : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconComponent
                    size={16}
                    color={isActive ? theme.colors.primary : theme.colors.text.muted}
                  />
                  <Text
                    variant="bodySmall"
                    style={{
                      color: isActive ? theme.colors.primary : theme.colors.text.muted,
                      fontWeight: isActive ? '600' : '400',
                      marginLeft: theme.spacing.xs,
                    }}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Container style={{ flex: 1 }}>
        {renderTabContent()}
      </Container>
    </SafeAreaWrapper>
  );
}

// Helper component for reward history items
function RewardHistoryItem({ reward }: { reward: CommunityReward }) {
  const { theme } = useTheme();

  const getRewardIcon = (rewardType: string) => {
    const icons: Record<string, string> = {
      positive_review: '⭐',
      first_post_bonus: '📝',
      viral_post: '🔥',
      report_validation: '🛡️',
      community_guardian: '🏆',
      referral_bonus: '👥',
      anniversary_bonus: '🎉',
      default: '🎁'
    };
    return icons[rewardType] || icons.default;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, marginRight: theme.spacing.md }}>
          {getRewardIcon(reward.reward_type)}
        </Text>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Coins size={16} color={theme.colors.success} />
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.success,
                  fontWeight: '600',
                  marginLeft: theme.spacing.xs,
                }}
              >
                +{reward.credits_earned}
              </Text>
            </View>
            <Text variant="caption" color="muted">
              {formatDate(reward.created_at)}
            </Text>
          </View>

          <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            {reward.trigger_action}
          </Text>

          {reward.is_validated && (
            <Badge text="Validated" variant="success" size="sm" />
          )}
        </View>
      </View>
    </View>
  );
}
