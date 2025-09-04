import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

type BadgeVariant = 'new' | 'sold' | 'featured' | 'discount' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: any;
}

export function Badge({ 
  text, 
  variant = 'neutral', 
  size = 'md',
  style 
}: BadgeProps) {
  const { theme } = useTheme();

  const getBadgeColors = () => {
    switch (variant) {
      case 'new':
        return {
          backgroundColor: theme.colors.success,
          textColor: theme.colors.successForeground,
        };
      case 'sold':
        return {
          backgroundColor: theme.colors.text.muted,
          textColor: theme.colors.text.inverse,
        };
      case 'featured':
        return {
          backgroundColor: theme.colors.warning,
          textColor: theme.colors.warningForeground,
        };
      case 'discount':
        return {
          backgroundColor: theme.colors.error,
          textColor: theme.colors.errorForeground,
        };
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          textColor: theme.colors.successForeground,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          textColor: theme.colors.warningForeground,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          textColor: theme.colors.errorForeground,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.primary,
          textColor: theme.colors.primaryForeground,
        };
      case 'neutral':
      default:
        return {
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
        };
      case 'lg':
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
        };
      case 'md':
      default:
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
        };
    }
  };

  const colors = getBadgeColors();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        {
          backgroundColor: colors.backgroundColor,
          alignSelf: 'flex-start',
          ...sizeStyles,
        },
        style,
      ]}
    >
      <Text
        variant="caption"
        style={{
          color: colors.textColor,
          fontSize: size === 'sm' ? 10 : size === 'lg' ? 14 : 12,
          fontWeight: '600',
          textTransform: 'uppercase',
        }}
      >
        {text}
      </Text>
    </View>
  );
}
