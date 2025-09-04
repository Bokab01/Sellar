import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Building, Star, Crown, Shield } from 'lucide-react-native';

type BadgeType = 'business' | 'priority_seller' | 'premium' | 'verified';

interface BusinessBadgeProps {
  type: BadgeType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  style?: any;
}

export function BusinessBadge({ 
  type, 
  size = 'md',
  showIcon = true,
  style 
}: BusinessBadgeProps) {
  const { theme } = useTheme();

  const getBadgeConfig = () => {
    switch (type) {
      case 'business':
        return {
          text: 'Business',
          icon: <Building size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} color={theme.colors.primaryForeground} />,
          backgroundColor: theme.colors.primary,
          textColor: theme.colors.primaryForeground,
        };
      case 'priority_seller':
        return {
          text: 'Priority Seller',
          icon: <Star size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} color={theme.colors.warningForeground} />,
          backgroundColor: theme.colors.warning,
          textColor: theme.colors.warningForeground,
        };
      case 'premium':
        return {
          text: 'Premium',
          icon: <Crown size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} color={theme.colors.successForeground} />,
          backgroundColor: theme.colors.success,
          textColor: theme.colors.successForeground,
        };
      case 'verified':
        return {
          text: 'Verified',
          icon: <Shield size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} color={theme.colors.successForeground} />,
          backgroundColor: theme.colors.success,
          textColor: theme.colors.successForeground,
        };
      default:
        return {
          text: 'Badge',
          icon: null,
          backgroundColor: theme.colors.surfaceVariant,
          textColor: theme.colors.text.secondary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
          gap: theme.spacing.xs,
        };
      case 'lg':
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          gap: theme.spacing.md,
        };
      case 'md':
      default:
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          gap: theme.spacing.sm,
        };
    }
  };

  const config = getBadgeConfig();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: config.backgroundColor,
          alignSelf: 'flex-start',
          ...sizeStyles,
        },
        style,
      ]}
    >
      {showIcon && config.icon && (
        <View style={{ marginRight: sizeStyles.gap }}>
          {config.icon}
        </View>
      )}
      
      <Text
        variant="caption"
        style={{
          color: config.textColor,
          fontSize: size === 'sm' ? 10 : size === 'lg' ? 14 : 12,
          fontWeight: '600',
          textTransform: 'uppercase',
        }}
      >
        {config.text}
      </Text>
    </View>
  );
}
