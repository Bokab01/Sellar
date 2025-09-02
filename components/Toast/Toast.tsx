import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, Circle as XCircle, Info } from 'lucide-react-native';

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
  position = 'bottom',
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
          backgroundColor: theme.colors.success,
          textColor: theme.colors.successForeground,
          icon: <CheckCircle size={20} color={theme.colors.successForeground} />,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          textColor: theme.colors.errorForeground,
          icon: <XCircle size={20} color={theme.colors.errorForeground} />,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          textColor: theme.colors.warningForeground,
          icon: <AlertCircle size={20} color={theme.colors.warningForeground} />,
        };
      case 'info':
      default:
        return {
          backgroundColor: theme.colors.text.primary,
          textColor: theme.colors.text.inverse,
          icon: <Info size={20} color={theme.colors.text.inverse} />,
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

  if (!visible && fadeAnim._value === 0) {
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
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          ...theme.shadows.lg,
          maxWidth: screenWidth - (theme.spacing.lg * 2),
        }}
      >
        {colors.icon && (
          <View style={{ marginRight: theme.spacing.md }}>
            {colors.icon}
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            variant="body"
            style={{
              color: colors.textColor,
              fontWeight: '500',
            }}
          >
            {message}
          </Text>
        </View>

        {action && (
          <TouchableOpacity
            onPress={action.onPress}
            style={{
              marginLeft: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
            }}
          >
            <Text
              variant="button"
              style={{
                color: colors.textColor,
                fontWeight: '600',
                textDecorationLine: 'underline',
              }}
            >
              {action.text}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}