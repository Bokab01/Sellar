import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useNotificationStore } from '@/store/useNotificationStore';
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
import { Bell, MessageCircle, DollarSign, Heart, MessageSquare, UserPlus2, Star, Package, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Trash2, ChevronRight, CheckSquare, Square, MailOpen, Mail } from 'lucide-react-native';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { 
    notifications, 
    loading, 
    error, 
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refresh,
    fetchNotifications
  } = useNotificationStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);


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

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(notificationId);
            setToastMessage('Notification deleted');
            setShowToast(true);
          },
        },
      ]
    );
  };

  const handleDeleteAllNotifications = async () => {
    Alert.alert(
      'Delete All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllNotifications();
            setToastMessage('All notifications deleted');
            setShowToast(true);
          },
        },
      ]
    );
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
    
    try {
      switch (notification.type) {
        case 'message':
          // Navigate to specific conversation
          if (data.conversation_id) {
            router.push(`/(tabs)/inbox/${data.conversation_id}`);
          } else {
            // Fallback to inbox if no specific conversation
            router.push('/(tabs)/inbox');
          }
          break;

        case 'offer':
          // Offers are usually discussed in conversations
          if (data.conversation_id) {
            router.push(`/(tabs)/inbox/${data.conversation_id}`);
          } else if (data.listing_id) {
            // Fallback to listing detail
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else {
            router.push('/(tabs)/inbox');
          }
          break;

        case 'like':
        case 'comment':
          // Navigate to the specific post that was liked/commented
          if (data.post_id) {
            router.push(`/post/${data.post_id}` as any);
          } else {
            router.push('/(tabs)/community');
          }
          break;

        case 'follow':
          // Navigate to the profile of the user who followed you
          if (data.user_id || data.follower_id) {
            const userId = data.user_id || data.follower_id;
            router.push(`/profile/${userId}`);
          } else {
            router.push('/(tabs)/community');
          }
          break;

        case 'review':
          // Navigate to the listing that was reviewed or user profile
          if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else if (data.transaction_id) {
            router.push('/transactions');
          } else if (data.user_id) {
            router.push(`/profile/${data.user_id}`);
          } else {
            router.push('/(tabs)/home');
          }
          break;

        case 'listing':
        case 'listing_update':
          // Navigate to the specific listing
          if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else {
            router.push('/(tabs)/home');
          }
          break;

        case 'verification':
          // Navigate to verification screen or profile
          if (data.verification_id) {
            router.push(`/verification-status` as any);
          } else {
            router.push('/profile' as any);
          }
          break;

        case 'payment':
          // Navigate to transactions or credits
          if (data.transaction_id) {
            router.push('/transactions');
          } else if (data.credit_transaction_id) {
            router.push('/transactions');
          } else {
            router.push('/buy-credits');
          }
          break;

        case 'promotion':
          // Navigate to the promoted listing
          if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else {
            router.push('/(tabs)/home');
          }
          break;

        case 'system':
          // Handle system notifications
          if (data.action === 'update_app') {
            router.push('/(tabs)/more/settings');
          } else if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else if (data.user_id) {
            router.push(`/profile/${data.user_id}`);
          } else {
            // Show toast for general system messages
            setToastMessage('System notification viewed');
            setShowToast(true);
          }
          break;

        case 'reminder':
          // Navigate based on what the reminder is about
          if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else if (data.conversation_id) {
            router.push(`/(tabs)/inbox/${data.conversation_id}`);
          } else {
            router.push('/(tabs)/home');
          }
          break;

        default:
          // For unknown notification types, show helpful message
          console.log('Unknown notification type:', notification.type, 'Data:', data);
          setToastMessage(`Notification type: ${notification.type}`);
          setShowToast(true);
          break;
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setToastMessage('Unable to navigate to content');
      setShowToast(true);
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
        rightActions={notifications.length > 0 ? [
          <Button
            key="mark-all-read"
            variant="ghost"
            onPress={handleMarkAllRead}
            size="sm"
            style={{ marginRight: theme.spacing.sm }}
          >
            Mark All Read
          </Button>,
          <Button
            key="delete-all"
            variant="ghost"
            onPress={handleDeleteAllNotifications}
            size="sm"
          >
            Delete All
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
              {notifications.map((notification, index) => {
                const data = notification.data || {};
                const hasActionableContent = data.conversation_id || data.listing_id || data.post_id || data.user_id;
                
                return (
                  <View
                    key={notification.id}
                    style={{
                      borderBottomWidth: index < notifications.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                      backgroundColor: notification.is_read 
                        ? 'transparent' 
                        : theme.colors.primary + '05',
                      // Add subtle visual cue for clickable notifications
                      ...(hasActionableContent && {
                        borderLeftWidth: 3,
                        borderLeftColor: notification.is_read 
                          ? theme.colors.text.muted 
                          : theme.colors.primary,
                      }),
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleNotificationPress(notification)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: theme.spacing.lg,
                        paddingHorizontal: theme.spacing.lg,
                      }}
                      activeOpacity={0.7}
                    >
                      {/* Left Icon */}
                      <View style={{ marginRight: theme.spacing.md }}>
                        {getNotificationIcon(notification.type)}
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: theme.spacing.xs,
                          }}
                        >
                          <Text
                            variant="body"
                            numberOfLines={1}
                            style={{
                              flex: 1,
                              fontWeight: notification.is_read ? '500' : '600',
                              marginRight: theme.spacing.sm,
                            }}
                          >
                            {notification.title}
                          </Text>

                          <Text
                            variant="caption"
                            color="muted"
                            style={{ fontSize: 11 }}
                          >
                            {new Date(notification.created_at).toLocaleString()}
                          </Text>
                        </View>

                        <Text
                          variant="bodySmall"
                          color="muted"
                          numberOfLines={2}
                          style={{ lineHeight: 18 }}
                        >
                          {notification.body}
                        </Text>
                      </View>

                      {/* Right Side */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: theme.spacing.sm,
                        }}
                      >
                        {hasActionableContent && (
                          <ChevronRight
                            size={16}
                            color={theme.colors.text.muted}
                          />
                        )}
                        
                        {/* Delete Button */}
                        <TouchableOpacity
                          onPress={() => handleDeleteNotification(notification.id)}
                          style={{
                            padding: theme.spacing.sm,
                            borderRadius: theme.borderRadius.sm,
                            backgroundColor: theme.colors.error + '10',
                          }}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
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
