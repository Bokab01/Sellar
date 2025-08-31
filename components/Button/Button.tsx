import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'icon' | 'fab';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}
import { getFontFamily } from '@/theme/fonts';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  icon,
  fullWidth = false,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  
  const isDisabled = disabled || loading;

  const getButtonStyles = () => {
    const baseStyles = {
      borderRadius: theme.borderRadius.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    };

    // Size styles
    const sizeStyles = {
      sm: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 36,
      },
      md: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        minHeight: 44,
      },
      lg: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
        minHeight: 52,
      },
    };

    // Variant styles
    let variantStyles = {};
    switch (variant) {
      case 'primary':
        variantStyles = {
          backgroundColor: isDisabled ? theme.colors.text.muted : theme.colors.primary,
          ...theme.shadows.sm,
        };
        break;
      case 'secondary':
        variantStyles = {
          backgroundColor: isDisabled ? theme.colors.surfaceVariant : theme.colors.secondary,
          ...theme.shadows.sm,
        };
        break;
      case 'tertiary':
        variantStyles = {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDisabled ? theme.colors.border : theme.colors.primary,
        };
        break;
      case 'ghost':
        variantStyles = {
          backgroundColor: 'transparent',
        };
        break;
      case 'icon':
        variantStyles = {
          backgroundColor: 'transparent',
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          minHeight: 40,
          width: 40,
          borderRadius: theme.borderRadius.lg,
        };
        break;
      case 'fab':
        variantStyles = {
          backgroundColor: isDisabled ? theme.colors.text.muted : theme.colors.primary,
          width: 56,
          height: 56,
          borderRadius: theme.borderRadius.full,
          ...theme.shadows.lg,
        };
        break;
    }

    // FAB specific sizing
    if (variant === 'fab') {
      return [baseStyles, variantStyles, fullWidth && { width: '100%' }];
    }

    return [
      baseStyles,
      sizeStyles[size],
      variantStyles,
      fullWidth && { width: '100%' },
    ];
  };

  const getTextColor = () => {
    if (isDisabled) {
      return variant === 'primary' || variant === 'fab' 
        ? theme.colors.text.inverse 
        : theme.colors.text.muted;
    }

    switch (variant) {
      case 'primary':
      case 'fab':
        return theme.colors.primaryForeground;
      case 'secondary':
        return theme.colors.secondaryForeground;
      case 'tertiary':
      case 'ghost':
        return theme.colors.primary;
      case 'icon':
        return theme.colors.text.primary;
      default:
        return theme.colors.text.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon && !children && <View>{icon}</View>}
          {icon && children && (
            <>
              {icon}
              <Text
                variant="button"
                style={{ 
                  color: getTextColor(),
                  marginLeft: theme.spacing.sm,
                }}
              >
                {children}
              </Text>
            </>
          )}
          {children && !icon && variant !== 'icon' && (
            <Text
              variant="button"
              style={{ 
                color: getTextColor(),
              }}
            >
              {children}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}