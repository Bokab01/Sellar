import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

type BadgeVariant = 'new' | 'sold' | 'featured' | 'discount' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'secondary' | 'default' | 'premium' | 'urgent' | 'spotlight';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'small' | 'large';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: any;
  leftIcon?: React.ReactNode;
  icon?: React.ReactNode;
  onPress?: () => void;
}

export function Badge({ 
  text, 
  variant = 'neutral', 
  size = 'md',
  style,
  leftIcon,
  icon,
  onPress
}: BadgeProps) {
  const { theme } = useTheme();

  const getBadgeConfig = () => {
    switch (variant) {
      case 'new':
        return {
          backgroundColor: theme.colors.success,
          textColor: theme.colors.successForeground,
          icon: null,
        };
      case 'sold':
        return {
          backgroundColor: theme.colors.text.muted,
          textColor: theme.colors.text.inverse,
          icon: null,
        };
      case 'featured':
        return {
          backgroundColor: theme.colors.warning,
          textColor: '#FFFFFF', // Always white for better contrast
          icon: '⚡',
        };
      case 'discount':
        return {
          backgroundColor: theme.colors.error,
          textColor: theme.colors.errorForeground,
          icon: null,
        };
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          textColor: theme.colors.successForeground,
          icon: null,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          textColor: theme.colors.warningForeground,
          icon: null,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          textColor: theme.colors.errorForeground,
          icon: null,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.primary,
          textColor: theme.colors.primaryForeground,
          icon: null,
        };
      case 'primary':
        return {
          backgroundColor: theme.colors.primary,
          textColor: theme.colors.primaryForeground,
          icon: null,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          textColor: theme.colors.secondaryForeground,
          icon: null,
        };
      case 'premium':
        return {
          backgroundColor: theme.colors.warning,
          textColor: theme.colors.warningForeground,
          icon: null,
        };
      case 'urgent':
        return {
          backgroundColor: '#FF4444', // Bright red for urgency
          textColor: '#FFFFFF',
          icon: '🔥',
        };
      case 'spotlight':
        return {
          backgroundColor: '#9C27B0', // Purple for spotlight
          textColor: '#FFFFFF',
          icon: '🎯',
        };
      case 'default':
      case 'neutral':
      default:
        return {
          backgroundColor: theme.colors.surfaceVariant,
          textColor: theme.colors.text.secondary,
          icon: null,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return {
          paddingHorizontal: theme.spacing.xs,
          paddingVertical: 0,
          borderRadius: theme.borderRadius.md,
          marginLeft: theme.spacing.xs,
        };
      case 'sm':
      case 'small':
        return {
          paddingHorizontal: theme.spacing.xs + 2,
          paddingVertical: theme.spacing.xs - 3,
          borderRadius: theme.borderRadius.lg,
        };
      case 'lg':
      case 'large':
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

  const config = getBadgeConfig();
  const sizeStyles = getSizeStyles();

  // Use built-in icon from config if no custom leftIcon/icon is provided
  const shouldShowBuiltInIcon = config.icon && !leftIcon && !icon;

  const badgeContent = (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center',
    }}>
      {/* Custom left icon (overrides built-in icon) */}
      {leftIcon && (
        <View style={{ marginRight: theme.spacing.xs }}>
          {leftIcon}
        </View>
      )}
      {/* Built-in icon based on variant */}
      {shouldShowBuiltInIcon && (
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.4)', // Bright white background for maximum contrast
          borderRadius: 999, // Perfect circle
          width: size === 'xs' ? 12 : size === 'sm' || size === 'small' ? 14 : size === 'lg' || size === 'large' ? 24 : 16,
          height: size === 'xs' ? 12 : size === 'sm' || size === 'small' ? 14 : size === 'lg' || size === 'large' ? 24 : 16,
          marginRight: theme.spacing.xs - 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ 
            fontSize: size === 'xs' ? 7 : (size === 'sm' || size === 'small') ? 9 : (size === 'lg' || size === 'large') ? 16 : 12,
            lineHeight: size === 'xs' ? 9 : (size === 'sm' || size === 'small') ? 11 : (size === 'lg' || size === 'large') ? 18 : 14,
          }}>
            {config.icon}
          </Text>
        </View>
      )}
      <Text
        variant="caption"
        style={{
          color: config.textColor,
          fontSize: size === 'xs' ? 7 : (size === 'sm' || size === 'small') ? 8 : (size === 'lg' || size === 'large') ? 14 : 12,
          fontWeight: '700',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {text}
      </Text>
      {/* Custom right icon */}
      {icon && (
        <View style={{ marginLeft: theme.spacing.xs }}>
          {icon}
        </View>
      )}
    </View>
  );

  return (
    <View
      style={[
        {
          backgroundColor: config.backgroundColor,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          ...sizeStyles,
        },
        style,
      ]}
    >
      {onPress ? (
        <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {badgeContent}
        </TouchableOpacity>
      ) : (
        badgeContent
      )}
    </View>
  );
}
