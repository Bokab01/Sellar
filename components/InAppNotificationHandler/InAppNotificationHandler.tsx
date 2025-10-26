import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { useInAppNotificationStore } from '@/store/useInAppNotificationStore';
import { MessageCircle, Bell, DollarSign, Info } from 'lucide-react-native';

/**
 * Global handler for in-app notifications (banner)
 * Shows when user receives messages/notifications while on other screens
 */
export function InAppNotificationHandler() {
  const { theme } = useTheme();
  const { activeNotification, hideNotification } = useInAppNotificationStore();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  // Animate in/out
  useEffect(() => {
    if (activeNotification) {
      if (__DEV__) {
        console.log('🔔 [InAppNotifHandler] Showing notification:', activeNotification);
      }
      
      // Haptic feedback
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        // Haptic not available
      }

      // Slide in
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
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeNotification]);

  if (!activeNotification) {
    return null;
  }

  // Navigate to appropriate screen based on notification type
  const handleNotificationPress = () => {
    const { type, data } = activeNotification;

    hideNotification();

    switch (type) {
      case 'message':
        if (data?.conversationId) {
          router.push(`/chat-detail/${data.conversationId}`);
        } else {
          router.push('/(tabs)/inbox');
        }
        break;
      case 'notification':
        router.push('/notifications');
        break;
      case 'offer':
        if (data?.conversationId) {
          router.push(`/chat-detail/${data.conversationId}`);
        }
        break;
      default:
        break;
    }
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 9999,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        onPress={handleNotificationPress}
        activeOpacity={0.9}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.md,
          ...theme.shadows.lg,
          gap: theme.spacing.sm,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.primary + '15',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {activeNotification.type === 'message' && (
            <MessageCircle size={20} color={theme.colors.primary} />
          )}
          {activeNotification.type === 'notification' && (
            <Bell size={20} color={theme.colors.primary} />
          )}
          {activeNotification.type === 'offer' && (
            <DollarSign size={20} color={theme.colors.success} />
          )}
          {activeNotification.type === 'system' && (
            <Info size={20} color={theme.colors.text.muted} />
          )}
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text
            variant="bodySmall"
            style={{
              fontWeight: '600',
              color: theme.colors.text.primary,
              marginBottom: 2,
            }}
          >
            {activeNotification.title}
          </Text>
          <Text
            variant="caption"
            style={{
              color: theme.colors.text.secondary,
            }}
            numberOfLines={2}
          >
            {activeNotification.message}
          </Text>
        </View>

        {/* Tap hint */}
        <Text
          variant="caption"
          style={{
            color: theme.colors.primary,
            fontWeight: '600',
          }}
        >
          Tap
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

