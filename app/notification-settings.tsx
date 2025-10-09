import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  ListItem,
  Button,
  Toast,
  LoadingSkeleton,
  ErrorState,
} from '@/components';
import {
  Bell,
  MessageCircle,
  DollarSign,
  Users,
  Settings,
  Clock,
  TestTube,
  BellRing,
  BellOff,
  Mail,
} from 'lucide-react-native';

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const {
    preferences: hookPreferences,
    loading,
    error,
    hasPermission,
    isInitialized,
    requestPermissions,
    updatePreferences,
    sendTestNotification,
    loadNotificationPreferences,
  } = usePushNotifications();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  
  // Local state for immediate UI updates
  const [localPreferences, setLocalPreferences] = useState(hookPreferences);
  
  // Email notification state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loadingEmailSettings, setLoadingEmailSettings] = useState(true);

  // Sync local state with hook preferences
  useEffect(() => {
    setLocalPreferences(hookPreferences);
  }, [hookPreferences]);

  // Fetch email notification settings
  useEffect(() => {
    if (user) {
      fetchEmailSettings();
    }
  }, [user]);

  const fetchEmailSettings = async () => {
    if (!user) return;
    
    try {
      setLoadingEmailSettings(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('email_notifications')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching email settings:', error);
      } else if (data) {
        setEmailNotifications(data.email_notifications ?? true);
      }
    } catch (err) {
      console.error('Error fetching email settings:', err);
    } finally {
      setLoadingEmailSettings(false);
    }
  };

  const updateEmailNotifications = async (value: boolean) => {
    if (!user) return;

    // Optimistic update
    setEmailNotifications(value);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          email_notifications: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating email settings:', error);
        showErrorToast('Failed to update email notifications');
        // Revert on failure
        setEmailNotifications(!value);
      } else {
        showSuccessToast('Email notifications updated successfully');
      }
    } catch (err) {
      console.error('Error updating email settings:', err);
      showErrorToast('Failed to update email notifications');
      // Revert on failure
      setEmailNotifications(!value);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      loadNotificationPreferences();
    }
  }, [isInitialized]);

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastVariant('success');
    setShowToast(true);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastVariant('error');
    setShowToast(true);
  };

  const handleTogglePreference = async (key: string, value: boolean) => {
    // Optimistic update - update UI immediately
    if (localPreferences) {
      setLocalPreferences({ ...localPreferences, [key]: value });
    }
    
    const success = await updatePreferences({ [key]: value });
    
    if (success) {
      showSuccessToast('Preferences updated successfully');
    } else {
      showErrorToast('Failed to update preferences');
      // Revert on failure
      if (localPreferences) {
        setLocalPreferences({ ...localPreferences, [key]: !value });
      }
    }
  };

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    
    if (granted) {
      showSuccessToast('Notification permissions granted');
    } else {
      Alert.alert(
        'Permissions Required',
        'To receive push notifications, please enable notifications in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            // You can use Linking.openSettings() here if needed
          }},
        ]
      );
    }
  };

  const handleSendTestNotification = async () => {
    try {
      await sendTestNotification();
      // Success - user will see the actual push notification
    } catch (error) {
      // Show error if notifications are disabled
      const message = error instanceof Error ? error.message : 'Failed to send test notification';
      showErrorToast(message);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Notification Settings"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width="100%"
              height={60}
              borderRadius={theme.borderRadius.lg}
              style={{ marginBottom: theme.spacing.md }}
            />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  if (error) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Notification Settings"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          message={error}
          onRetry={loadNotificationPreferences}
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Notification Settings"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        {/* Permission Status */}
        {!hasPermission && (
          <Container style={{ margin: theme.spacing.lg }}>
            <View
              style={{
                backgroundColor: theme.colors.warning + '10',
                borderColor: theme.colors.warning + '30',
                borderWidth: 1,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <BellOff size={48} color={theme.colors.warning} style={{ marginBottom: theme.spacing.md }} />
              <Text variant="h3" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
                Notifications Disabled
              </Text>
              <Text variant="body" style={{ textAlign: 'center', marginBottom: theme.spacing.lg, color: theme.colors.text.muted }}>
                Enable push notifications to stay updated on messages, offers, and community activity.
              </Text>
              <Button
                onPress={handleRequestPermissions}
                variant="primary"
                leftIcon={<Bell size={20} color={theme.colors.surface} />}
              >
                Enable Notifications
              </Button>
            </View>
          </Container>
        )}

        {/* Main Settings */}
        {hasPermission && localPreferences && (
          <>
            {/* General Settings */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                marginHorizontal: theme.spacing.lg,
                marginTop: theme.spacing.lg,
                borderRadius: theme.borderRadius.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
            >
              <View style={{ padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <Text variant="h3">General Settings</Text>
              </View>

              <ListItem
                title="Push Notifications"
                description="Receive notifications on your device"
                leftIcon={<Bell size={20} color={theme.colors.primary} />}
                toggle={{
                  value: localPreferences.push_enabled,
                  onToggle: (value) => handleTogglePreference('push_enabled', value),
                }}
              />

              <ListItem
                title="Instant Notifications"
                description="Receive notifications immediately"
                leftIcon={<BellRing size={20} color={theme.colors.primary} />}
                toggle={{
                  value: localPreferences.instant_notifications,
                  onToggle: (value) => handleTogglePreference('instant_notifications', value),
                }}
              />

              <ListItem
                title="Email Notifications"
                description="Receive important updates via email"
                leftIcon={<Mail size={20} color={theme.colors.primary} />}
                toggle={{
                  value: emailNotifications,
                  onToggle: updateEmailNotifications,
                }}
                style={{ borderBottomWidth: 0 }}
              />
            </View>

            {/* Category Settings */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                marginHorizontal: theme.spacing.lg,
                marginTop: theme.spacing.lg,
                borderRadius: theme.borderRadius.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
            >
              <View style={{ padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <Text variant="h3">Notification Categories</Text>
              </View>

              <ListItem
                title="Messages"
                description="New chat messages and conversations"
                leftIcon={<MessageCircle size={20} color={theme.colors.primary} />}
                toggle={{
                  value: localPreferences.messages_enabled,
                  onToggle: (value) => handleTogglePreference('messages_enabled', value),
                }}
              />

              <ListItem
                title="Offers & Deals"
                description="Offer updates and transaction notifications"
                leftIcon={<DollarSign size={20} color={theme.colors.success} />}
                toggle={{
                  value: localPreferences.offers_enabled,
                  onToggle: (value) => handleTogglePreference('offers_enabled', value),
                }}
              />

              <ListItem
                title="Community"
                description="Likes, comments, and follows"
                leftIcon={<Users size={20} color={theme.colors.primary} />}
                toggle={{
                  value: localPreferences.community_enabled,
                  onToggle: (value) => handleTogglePreference('community_enabled', value),
                }}
              />

              <ListItem
                title="System & Updates"
                description="App updates and important announcements"
                leftIcon={<Settings size={20} color={theme.colors.text.muted} />}
                toggle={{
                  value: localPreferences.system_enabled,
                  onToggle: (value) => handleTogglePreference('system_enabled', value),
                }}
                style={{ borderBottomWidth: 0 }}
              />
            </View>

            {/* Quiet Hours */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                marginHorizontal: theme.spacing.lg,
                marginTop: theme.spacing.lg,
                borderRadius: theme.borderRadius.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
            >
              <View style={{ padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <Text variant="h3">Quiet Hours</Text>
              </View>

              <ListItem
                title="Enable Quiet Hours"
                description={`No notifications from ${localPreferences.quiet_start_time} to ${localPreferences.quiet_end_time}`}
                leftIcon={<Clock size={20} color={theme.colors.primary} />}
                toggle={{
                  value: localPreferences.quiet_hours_enabled,
                  onToggle: (value) => handleTogglePreference('quiet_hours_enabled', value),
                }}
                style={{ borderBottomWidth: 0 }}
              />
            </View>

            {/* Digest Settings */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                marginHorizontal: theme.spacing.lg,
                marginTop: theme.spacing.lg,
                borderRadius: theme.borderRadius.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
            >
              <View style={{ padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <Text variant="h3">Digest Options</Text>
              </View>

              <ListItem
                title="Daily Digest"
                description="Summary of daily activity"
                leftIcon={<Bell size={20} color={theme.colors.primary} />}
                toggle={{
                  value: localPreferences.daily_digest,
                  onToggle: (value) => handleTogglePreference('daily_digest', value),
                }}
              />

              <ListItem
                title="Weekly Summary"
                description="Weekly overview of your activity"
                leftIcon={<Bell size={20} color={theme.colors.primary} />}
                toggle={{
                  value: localPreferences.weekly_summary,
                  onToggle: (value) => handleTogglePreference('weekly_summary', value),
                }}
                style={{ borderBottomWidth: 0 }}
              />
            </View>

            {/* Test Notification */}
            <Container style={{ margin: theme.spacing.lg }}>
              <Button
                onPress={handleSendTestNotification}
                variant="tertiary"
                leftIcon={<TestTube size={20} color={theme.colors.primary} />}
              >
                Send Test Notification
              </Button>
            </Container>
          </>
        )}
      </ScrollView>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}
