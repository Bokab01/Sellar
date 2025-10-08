import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { 
  CircleCheck as CheckCircle, 
  CircleAlert as AlertCircle, 
  Info, 
  CircleX as XCircle,
  X 
} from 'lucide-react-native';

export type AlertBannerVariant = 'info' | 'success' | 'warning' | 'error';
export type AlertBannerSize = 'sm' | 'md' | 'lg';

export interface AlertBannerProps {
  variant?: AlertBannerVariant;
  size?: AlertBannerSize;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    text: string;
    onPress: () => void;
  };
  showIcon?: boolean;
  style?: any;
}

export function AlertBanner({
  variant = 'info',
  size = 'md',
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  showIcon = true,
  style,
}: AlertBannerProps) {
  const { theme } = useTheme();

  const getAlertColors = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: theme.colors.success + '10',
          borderColor: theme.colors.success + '30',
          iconColor: theme.colors.success,
          titleColor: theme.colors.success,
          textColor: theme.colors.text.primary,
          icon: <CheckCircle size={20} color={theme.colors.success} />,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning + '10',
          borderColor: theme.colors.warning + '30',
          iconColor: theme.colors.warning,
          titleColor: theme.colors.warning,
          textColor: theme.colors.text.primary,
          icon: <AlertCircle size={20} color={theme.colors.warning} />,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error + '10',
          borderColor: theme.colors.error + '30',
          iconColor: theme.colors.error,
          titleColor: theme.colors.error,
          textColor: theme.colors.text.primary,
          icon: <XCircle size={20} color={theme.colors.error} />,
        };
      case 'info':
      default:
        return {
          backgroundColor: theme.colors.primary + '10',
          borderColor: theme.colors.primary + '30',
          iconColor: theme.colors.primary,
          titleColor: theme.colors.primary,
          textColor: theme.colors.text.primary,
          icon: <Info size={20} color={theme.colors.primary} />,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.sm,
          gap: theme.spacing.sm,
        };
      case 'lg':
        return {
          padding: theme.spacing.xl,
          borderRadius: theme.borderRadius.lg,
          gap: theme.spacing.lg,
        };
      case 'md':
      default:
        return {
          padding: theme.spacing.lg,
          borderRadius: theme.borderRadius.md,
          gap: theme.spacing.md,
        };
    }
  };

  const colors = getAlertColors();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        {
          backgroundColor: colors.backgroundColor,
          borderWidth: 1,
          borderColor: colors.borderColor,
          ...sizeStyles,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: sizeStyles.gap,
        }}
      >
        {/* Icon */}
        {showIcon && (
          <View style={{ marginTop: 2 }}>
            {colors.icon}
          </View>
        )}

        {/* Content */}
        <View style={{ flex: 1 }}>
          {title && (
            <Text
              variant={size === 'sm' ? 'bodySmall' : 'body'}
              style={{
                color: colors.titleColor,
                fontWeight: '600',
                marginBottom: theme.spacing.xs,
              }}
            >
              {title}
            </Text>
          )}

          <Text
            variant={size === 'sm' ? 'bodySmall' : 'body'}
            style={{
              color: colors.textColor,
              lineHeight: size === 'sm' ? 18 : 22,
            }}
          >
            {message}
          </Text>

          {/* Action Button */}
          {action && (
            <TouchableOpacity
              onPress={action.onPress}
              style={{
                marginTop: theme.spacing.md,
                alignSelf: 'flex-start',
              }}
            >
              <Text
                variant="button"
                style={{
                  color: colors.iconColor,
                  textDecorationLine: 'underline',
                }}
              >
                {action.text}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dismiss Button */}
        {dismissible && onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              padding: theme.spacing.xs,
              marginTop: -theme.spacing.xs,
              marginRight: -theme.spacing.xs,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={colors.iconColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
