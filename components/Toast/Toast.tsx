import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, CircleX as XCircle, Info, X } from 'lucide-react-native';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';
type ToastPosition = 'top' | 'bottom';

interface ToastProps {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  duration?: number;
  onHide?: () => void;
  action?: {
    text: string;
    onPress: () => void;
  };
}

export function Toast({
  visible,
  message,
  variant = 'info',
  position = 'top',
  duration = 4000,
  onHide,
  action,
}: ToastProps) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      if (duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const getToastColors = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.success + '40',
          textColor: theme.colors.text.primary,
          iconColor: theme.colors.success,
          icon: <CheckCircle size={20} color={theme.colors.success} />,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.error + '40',
          textColor: theme.colors.text.primary,
          iconColor: theme.colors.error,
          icon: <XCircle size={20} color={theme.colors.error} />,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.warning + '40',
          textColor: theme.colors.text.primary,
          iconColor: theme.colors.warning,
          icon: <AlertCircle size={20} color={theme.colors.warning} />,
        };
      case 'info':
      default:
        return {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.primary + '40',
          textColor: theme.colors.text.primary,
          iconColor: theme.colors.primary,
          icon: <Info size={20} color={theme.colors.primary} />,
        };
    }
  };

  const colors = getToastColors();

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      zIndex: 9999,
    };

    if (position === 'top') {
      return {
        ...baseStyles,
        top: Platform.OS === 'ios' ? 60 : 40,
      };
    } else {
      return {
        ...baseStyles,
        bottom: Platform.OS === 'ios' ? 50 : 30,
      };
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        getPositionStyles(),
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={{
          backgroundColor: colors.backgroundColor,
          borderRadius: theme.borderRadius.xl,
          borderWidth: 1,
          borderLeftWidth: 4,
          borderLeftColor: colors.iconColor,
          borderColor: colors.borderColor,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          ...theme.shadows.md,
          maxWidth: screenWidth - (theme.spacing.lg * 2),
        }}
      >
        {/* Icon with background */}
        {colors.icon && (
          <View 
            style={{ 
              marginRight: theme.spacing.md,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.iconColor + '15',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {colors.icon}
          </View>
        )}

        {/* Content */}
        <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
          <Text
            variant="body"
            style={{
              color: colors.textColor,
              fontWeight: '500',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {message}
          </Text>
        </View>

        {/* Action or Dismiss Button */}
        {action ? (
          <TouchableOpacity
            onPress={action.onPress}
            style={{
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              backgroundColor: colors.iconColor + '15',
              borderRadius: theme.borderRadius.md,
            }}
          >
            <Text
              variant="button"
              style={{
                color: colors.iconColor,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {action.text}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={hideToast}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: theme.colors.surfaceVariant,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: theme.spacing.xs,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
