import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  ListItem,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Toast,
} from '@/components';
import { Bell, MessageCircle, DollarSign, Heart, MessageSquare, UserPlus2, Star, Package, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Trash2 } from 'lucide-react-native';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { 
    notifications, 
    loading, 
    error, 
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh 
  } = useNotifications();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setToastMessage('All notifications marked as read');
    setShowToast(true);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={20} color={theme.colors.primary} />;
      case 'offer':
        return <DollarSign size={20} color={theme.colors.success} />;
      case 'like':
        return <Heart size={20} color={theme.colors.error} />;
      case 'comment':
        return <MessageSquare size={20} color={theme.colors.primary} />;
      case 'follow':
        return <UserPlus2 size={20} color={theme.colors.primary} />;
      case 'review':
        return <Star size={20} color={theme.colors.warning} />;
      case 'listing':
        return <Package size={20} color={theme.colors.primary} />;
      case 'system':
        return <AlertCircle size={20} color={theme.colors.text.muted} />;
      default:
        return <Bell size={20} color={theme.colors.text.muted} />;
    }
  };

  const handleNotificationPress = async (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and data
    const data = notification.data || {};
    
    switch (notification.type) {
      case 'message':
        if (data.conversation_id) {
          router.push(`/(tabs)/inbox/${data.conversation_id}`);
        }
        break;
      case 'offer':
        if (data.listing_id) {
          router.push(`/(tabs)/home/${data.listing_id}`);
        } else if (data.conversation_id) {
          router.push(`/(tabs)/inbox/${data.conversation_id}`);
        }
        break;
      case 'like':
      case 'comment':
        if (data.post_id) {
          router.push(`/(tabs)/community/${data.post_id}`);
        }
        break;
      case 'follow':
        if (data.user_id) {
          router.push(`/profile/${data.user_id}`);
        }
        break;
      case 'review':
        if (data.user_id) {
          router.push(`/profile/${data.user_id}`);
        }
        break;
      case 'listing':
        if (data.listing_id) {
          router.push(`/(tabs)/home/${data.listing_id}`);
        }
        break;
      default:
        // No specific navigation
        break;
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Notifications"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width="100%"
              height={80}
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
          title="Notifications"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          message={error}
          onRetry={refresh}
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Notifications"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={unreadCount > 0 ? [
          <Button
            key="mark-all-read"
            variant="ghost"
            onPress={handleMarkAllRead}
            size="sm"
          >
            Mark All Read
          </Button>,
        ] : []}
      />

      <View style={{ flex: 1 }}>
        {notifications.length > 0 ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            {/* Unread Count Header */}
            {unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: theme.colors.primary + '10',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.primary + '20',
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.md,
                }}
              >
                <Text variant="bodySmall" style={{ color: theme.colors.primary, textAlign: 'center' }}>
                  📬 {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Notifications List */}
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
              {notifications.map((notification, index) => (
                <ListItem
                  key={notification.id}
                  title={notification.title}
                  description={notification.body}
                  timestamp={new Date(notification.created_at).toLocaleString()}
                  rightIcon={getNotificationIcon(notification.type)}
                  onPress={() => handleNotificationPress(notification)}
                  style={{
                    borderBottomWidth: index < notifications.length - 1 ? 1 : 0,
                    backgroundColor: notification.is_read 
                      ? 'transparent' 
                      : theme.colors.primary + '05',
                    paddingVertical: theme.spacing.lg,
                  }}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState
            icon={<Bell size={64} color={theme.colors.text.muted} />}
            title="No notifications yet"
            description="You'll see notifications for messages, offers, likes, and other activities here."
          />
        )}
      </View>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}
