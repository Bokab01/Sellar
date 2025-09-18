import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { getUserSubscriptionBadges } from '@/lib/subscriptionEntitlements';
import { Badge } from '@/components';
import { Building, Star, Crown, CheckCircle } from 'lucide-react-native';

interface UserBadgesProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  maxBadges?: number;
  showLabels?: boolean;
  horizontal?: boolean;
}

interface UserBadgeData {
  business: boolean;
  prioritySeller: boolean;
  premium: boolean;
  verified: boolean;
  businessVerified: boolean;
}

export function UserBadges({
  userId,
  size = 'sm',
  maxBadges = 3,
  showLabels = false,
  horizontal = true,
}: UserBadgesProps) {
  const { theme } = useTheme();
  const [badges, setBadges] = useState<UserBadgeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserBadges();
  }, [userId]);

  const fetchUserBadges = async () => {
    try {
      const badgeData = await getUserSubscriptionBadges(userId);
      setBadges(badgeData);
    } catch (error) {
      console.error('Failed to fetch user badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !badges) {
    return null;
  }

  const badgeConfigs = [
    {
      key: 'premium',
      show: badges.premium,
      icon: Crown,
      text: 'Premium',
      variant: 'premium' as const,
      color: theme.colors.warning,
      priority: 1,
    },
    {
      key: 'prioritySeller',
      show: badges.prioritySeller,
      icon: Star,
      text: 'Priority Seller',
      variant: 'warning' as const,
      color: theme.colors.warning,
      priority: 2,
    },
    {
      key: 'business',
      show: badges.business,
      icon: Building,
      text: 'PRO',
      variant: 'primary' as const,
      color: theme.colors.primary,
      priority: 3,
    },
    {
      key: 'verified',
      show: badges.verified,
      icon: CheckCircle,
      text: 'Verified',
      variant: 'success' as const,
      color: theme.colors.success,
      priority: 4,
    },
    {
      key: 'businessVerified',
      show: badges.businessVerified,
      icon: CheckCircle,
      text: 'Business',
      variant: 'info' as const,
      color: theme.colors.info,
      priority: 5,
    },
  ];

  const visibleBadges = badgeConfigs
    .filter(badge => badge.show)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxBadges);

  if (visibleBadges.length === 0) {
    return null;
  }

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;

  return (
    <View
      style={{
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexWrap: 'wrap',
      }}
    >
      {visibleBadges.map((badge) => {
        const IconComponent = badge.icon;
        
        return (
          <Badge
            key={badge.key}
            variant={badge.variant}
            size={size}
            text={showLabels ? badge.text : ''}
            icon={<IconComponent size={iconSize} color={badge.color} />}
          />
        );
      })}
    </View>
  );
}

// Compact version for listing cards
export function CompactUserBadges({ userId, maxBadges = 2 }: { userId: string; maxBadges?: number }) {
  return (
    <UserBadges
      userId={userId}
      size="sm"
      maxBadges={maxBadges}
      showLabels={false}
      horizontal={true}
    />
  );
}

// Full version for profile screens
export function FullUserBadges({ userId }: { userId: string }) {
  return (
    <UserBadges
      userId={userId}
      size="md"
      maxBadges={4}
      showLabels={true}
      horizontal={true}
    />
  );
}

// Single badge checker component
interface BadgeCheckerProps {
  userId: string;
  badgeType: 'business' | 'prioritySeller' | 'premium' | 'verified';
  children: (hasBadge: boolean) => React.ReactNode;
}

export function BadgeChecker({ userId, badgeType, children }: BadgeCheckerProps) {
  const [hasBadge, setHasBadge] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBadge();
  }, [userId, badgeType]);

  const checkBadge = async () => {
    try {
      const badges = await getUserSubscriptionBadges(userId);
      setHasBadge(badges[badgeType]);
    } catch (error) {
      console.error('Failed to check badge:', error);
      setHasBadge(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  return <>{children(hasBadge)}</>;
}
