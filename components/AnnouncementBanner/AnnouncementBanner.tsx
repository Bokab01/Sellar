import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components';
import { useAppSettings } from '@/hooks/useAppSettings';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

interface AnnouncementBannerProps {
  onDismiss?: () => void;
}

const DISMISSED_KEY = '@announcement_dismissed_';

export function AnnouncementBanner({ onDismiss }: AnnouncementBannerProps) {
  const { theme } = useTheme();
  const { settings, loading } = useAppSettings('announcements');
  const [dismissed, setDismissed] = useState(false);

  // Check if announcement is enabled and valid
  const enabled = settings.announcement_enabled;
  const title = settings.announcement_title || '';
  const message = settings.announcement_message || '';
  const type = settings.announcement_type || 'info';
  const actionText = settings.announcement_action_text || '';
  const actionUrl = settings.announcement_action_url || '';
  const dismissible = settings.announcement_dismissible !== false;
  const expiresAt = settings.announcement_expires_at;

  useEffect(() => {
    checkIfDismissed();
  }, [message]);

  const checkIfDismissed = async () => {
    if (!dismissible) return;
    
    try {
      const key = `${DISMISSED_KEY}${message}`;
      const value = await AsyncStorage.getItem(key);
      setDismissed(value === 'true');
    } catch (error) {
      console.error('Error checking announcement dismissal:', error);
    }
  };

  const handleDismiss = async () => {
    if (!dismissible) return;

    try {
      const key = `${DISMISSED_KEY}${message}`;
      await AsyncStorage.setItem(key, 'true');
      setDismissed(true);
      onDismiss?.();
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }
  };

  const handleAction = () => {
    if (!actionUrl) return;

    // Handle deep links or navigation
    if (actionUrl.startsWith('/')) {
      router.push(actionUrl as any);
    } else if (actionUrl.startsWith('http')) {
      // Open external URL
      // You can use Linking.openURL(actionUrl) here
      console.log('Open URL:', actionUrl);
    } else {
      // Navigate to internal screen
      router.push(`/${actionUrl}` as any);
    }
  };

  // Don't show if loading, disabled, dismissed, or expired
  if (loading || !enabled || dismissed || !message) return null;

  // Check if expired
  if (expiresAt && expiresAt !== 'null') {
    const expiryDate = new Date(expiresAt);
    if (expiryDate < new Date()) return null;
  }

  // Get colors and icon based on type
  const getAnnouncementStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.colors.success + '15',
          borderColor: theme.colors.success,
          textColor: theme.colors.success,
          icon: CheckCircle,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning + '15',
          borderColor: theme.colors.warning,
          textColor: theme.colors.warning,
          icon: AlertTriangle,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error + '15',
          borderColor: theme.colors.error,
          textColor: theme.colors.error,
          icon: AlertCircle,
        };
      case 'promo':
        return {
          backgroundColor: theme.colors.primary + '15',
          borderColor: theme.colors.primary,
          textColor: theme.colors.primary,
          icon: Sparkles,
        };
      case 'info':
      default:
        return {
          backgroundColor: theme.colors.primary + '10',
          borderColor: theme.colors.primary,
          textColor: theme.colors.primary,
          icon: Info,
        };
    }
  };

  const announcementStyle = getAnnouncementStyle();
  const Icon = announcementStyle.icon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: announcementStyle.backgroundColor,
          borderLeftColor: announcementStyle.borderColor,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Icon */}
        <Icon
          size={20}
          color={announcementStyle.textColor}
          style={{ marginTop: 2 }}
        />

        {/* Text Content */}
        <View style={styles.textContainer}>
          {title && (
            <Text
              variant="bodySmall"
              style={{
                fontWeight: '700',
                color: announcementStyle.textColor,
                marginBottom: theme.spacing.xs,
              }}
            >
              {title}
            </Text>
          )}
          <Text
            variant="caption"
            style={{
              color: theme.colors.text.primary,
              lineHeight: 18,
            }}
          >
            {message}
          </Text>

          {/* Action Button */}
          {actionText && actionUrl && (
            <TouchableOpacity
              onPress={handleAction}
              style={[
                styles.actionButton,
                {
                  backgroundColor: announcementStyle.borderColor,
                  marginTop: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.borderRadius.sm,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                variant="caption"
                style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                }}
              >
                {actionText}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dismiss Button */}
        {dismissible && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <X size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  actionButton: {
    alignSelf: 'flex-start',
  },
  dismissButton: {
    padding: 2,
  },
});

