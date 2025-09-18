import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button/Button';
import { Text } from '@/components/Typography/Text';
import { NotificationHelpers } from '@/lib/notificationHelpers';

export function NotificationTester() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createTestNotification = async () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    setLoading(true);
    try {
      const result = await NotificationHelpers.createTestNotification(user.id);
      
      if (result.success) {
        Alert.alert('Success', 'Test notification created successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create notification');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const createWelcomeNotification = async () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    setLoading(true);
    try {
      const result = await NotificationHelpers.createWelcomeNotification(user.id, user.email || 'User');
      
      if (result.success) {
        Alert.alert('Success', 'Welcome notification created successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create notification');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={{ padding: theme.spacing.lg }}>
        <Text variant="body" color="muted">
          Please log in to test notifications
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: theme.spacing.lg }}>
      <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
        Notification Tester
      </Text>
      
      <Text variant="body" color="muted" style={{ marginBottom: theme.spacing.lg }}>
        Use these buttons to create test notifications and verify the notification system is working.
      </Text>

      <View style={{ gap: theme.spacing.md }}>
        <Button
          onPress={createTestNotification}
          loading={loading}
          variant="primary"
        >
          Create Test Notification
        </Button>

        <Button
          onPress={createWelcomeNotification}
          loading={loading}
          variant="secondary"
        >
          Create Welcome Notification
        </Button>
      </View>

      <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.lg }}>
        After creating notifications, check the notifications screen to see them.
      </Text>
    </View>
  );
}
