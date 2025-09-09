import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { Crown, Zap, Star, Building, Shield } from 'lucide-react-native';

interface BusinessBadgeProps {
  type: 'business' | 'priority_seller' | 'premium' | 'verified' | 'boosted';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  showIcon?: boolean;
  showText?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
}

export function BusinessBadge({
  type,
  size = 'medium',
  style,
  showIcon = true,
  showText = true,
  variant = 'default',
}: BusinessBadgeProps) {
  const { theme } = useTheme();

  const getBadgeConfig = () => {
    switch (type) {
      case 'business':
        return {
          text: 'BUSINESS',
          icon: Building,
          color: theme.colors.primary,
          backgroundColor: theme.colors.primary + '20',
          borderColor: theme.colors.primary,
        };
      case 'priority_seller':
        return {
          text: 'PRIORITY',
          icon: Star,
          color: theme.colors.warning,
          backgroundColor: theme.colors.warning + '20',
          borderColor: theme.colors.warning,
        };
      case 'premium':
        return {
          text: 'PREMIUM',
          icon: Crown,
          color: theme.colors.success,
          backgroundColor: theme.colors.success + '20',
          borderColor: theme.colors.success,
        };
      case 'verified':
        return {
          text: 'VERIFIED',
          icon: Shield,
          color: theme.colors.info,
          backgroundColor: theme.colors.info + '20',
          borderColor: theme.colors.info,
        };
      case 'boosted':
        return {
          text: 'BOOSTED',
          icon: Zap,
          color: theme.colors.secondary,
          backgroundColor: theme.colors.secondary + '20',
          borderColor: theme.colors.secondary,
        };
      default:
        return {
          text: 'BUSINESS',
          icon: Building,
          color: theme.colors.primary,
          backgroundColor: theme.colors.primary + '20',
          borderColor: theme.colors.primary,
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: 10,
          fontSize: 8,
          paddingHorizontal: theme.spacing.xs,
          paddingVertical: 2,
          borderRadius: theme.borderRadius.xs,
        };
      case 'medium':
        return {
          iconSize: 12,
          fontSize: 10,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
        };
      case 'large':
        return {
          iconSize: 14,
          fontSize: 12,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
        };
      default:
        return {
          iconSize: 12,
          fontSize: 10,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
        };
    }
  };

  const badgeConfig = getBadgeConfig();
  const sizeConfig = getSizeConfig();
  const IconComponent = badgeConfig.icon;

  if (variant === 'minimal') {
    return (
      <View style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        },
        style
      ]}>
        {showIcon && (
          <IconComponent
            size={sizeConfig.iconSize}
            color={badgeConfig.color}
          />
        )}
        {showText && (
          <Text
            variant="caption"
            style={{
              color: badgeConfig.color,
              fontSize: sizeConfig.fontSize,
              fontWeight: '600',
            }}
          >
            {badgeConfig.text}
          </Text>
        )}
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={[
        {
          backgroundColor: badgeConfig.backgroundColor,
          borderRadius: sizeConfig.borderRadius,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        },
        style
      ]}>
        {showIcon && (
          <IconComponent
            size={sizeConfig.iconSize}
            color={badgeConfig.color}
          />
        )}
        {showText && (
          <Text
            variant="caption"
            style={{
              color: badgeConfig.color,
              fontSize: sizeConfig.fontSize,
              fontWeight: '600',
            }}
          >
            {badgeConfig.text}
          </Text>
        )}
      </View>
    );
  }

  // Default variant with border and enhanced styling
  return (
    <View style={[
      {
        backgroundColor: badgeConfig.backgroundColor,
        borderColor: badgeConfig.borderColor,
        borderWidth: 1,
        borderRadius: sizeConfig.borderRadius,
        paddingHorizontal: sizeConfig.paddingHorizontal,
        paddingVertical: sizeConfig.paddingVertical,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        shadowColor: badgeConfig.color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      },
      style
    ]}>
      {showIcon && (
        <IconComponent
          size={sizeConfig.iconSize}
          color={badgeConfig.color}
        />
      )}
      {showText && (
        <Text
          variant="caption"
          style={{
            color: badgeConfig.color,
            fontSize: sizeConfig.fontSize,
            fontWeight: '600',
          }}
        >
          {badgeConfig.text}
        </Text>
      )}
    </View>
  );
}

/**
 * Multiple business badges component for displaying all user badges
 */
interface BusinessBadgesProps {
  badges: Array<'business' | 'priority_seller' | 'premium' | 'verified' | 'boosted'>;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'minimal';
  maxVisible?: number;
  style?: ViewStyle;
}

export function BusinessBadges({
  badges,
  size = 'small',
  variant = 'compact',
  maxVisible = 3,
  style,
}: BusinessBadgesProps) {
  const { theme } = useTheme();
  const visibleBadges = badges.slice(0, maxVisible);
  const remainingCount = badges.length - maxVisible;

  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexWrap: 'wrap',
      },
      style
    ]}>
      {visibleBadges.map((badge, index) => (
        <BusinessBadge
          key={`${badge}-${index}`}
          type={badge}
          size={size}
          variant={variant}
        />
      ))}
      {remainingCount > 0 && (
        <View style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.sm,
          paddingHorizontal: theme.spacing.xs,
          paddingVertical: 2,
        }}>
          <Text
            variant="caption"
            style={{
              color: theme.colors.text.muted,
              fontSize: 8,
              fontWeight: '600',
            }}
          >
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
}