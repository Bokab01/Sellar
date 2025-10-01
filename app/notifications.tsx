import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { useNotificationStore } from '@/store/useNotificationStore';
import { dbHelpers } from '@/lib/supabase';
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
    deleteNotification,
    refresh,
    fetchNotifications
  } = useNotificationStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Bulk operations state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState({
    markAsRead: false,
    markAsUnread: false,
    delete: false,
  });

  // Animation state
  const bulkActionsOpacity = useRef(new Animated.Value(0)).current;
  const bulkActionsTranslateY = useRef(new Animated.Value(-20)).current;

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Animate bulk actions when selection changes
  useEffect(() => {
    if (isSelectionMode && selectedNotifications.size > 0) {
      Animated.parallel([
        Animated.timing(bulkActionsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bulkActionsTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bulkActionsOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bulkActionsTranslateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelectionMode, selectedNotifications.size]);


  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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

    // Navigate to notification detail screen
    router.push({
      pathname: '/notification-detail',
      params: {
        notification: JSON.stringify(notification),
      },
    });
  };

  // Bulk operation functions
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedNotifications(new Set());
  };

  const toggleNotificationSelection = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const selectAllNotifications = () => {
    const allIds = new Set(notifications.map(notification => notification.id));
    setSelectedNotifications(allIds);
  };

  const clearSelection = () => {
    setSelectedNotifications(new Set());
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    setBulkActionLoading(prev => ({ ...prev, markAsRead: true }));
    
    try {
      // Mark selected notifications as read
      for (const notificationId of selectedNotifications) {
        await markAsRead(notificationId);
      }
      
      setToastMessage(`${selectedNotifications.size} notifications marked as read`);
      setShowToast(true);
      
      clearSelection();
      setIsSelectionMode(false);
      
    } catch (error) {
      console.error('Bulk mark as read error:', error);
      setToastMessage('Failed to mark notifications as read');
      setShowToast(true);
    } finally {
      setBulkActionLoading(prev => ({ ...prev, markAsRead: false }));
    }
  };

  const handleBulkMarkAsUnread = async () => {
    if (selectedNotifications.size === 0) return;

    setBulkActionLoading(prev => ({ ...prev, markAsUnread: true }));
    
    try {
      // Mark selected notifications as unread
      for (const notificationId of selectedNotifications) {
        // We need to implement markAsUnread in the store
        // For now, we'll use a direct database call
        const { error } = await dbHelpers.markNotificationAsUnread(notificationId);
        if (error) {
          console.error('Error marking notification as unread:', error);
        }
      }
      
      setToastMessage(`${selectedNotifications.size} notifications marked as unread`);
      setShowToast(true);
      
      clearSelection();
      setIsSelectionMode(false);
      
      // Refresh notifications to update the UI
      await refresh();
      
    } catch (error) {
      console.error('Bulk mark as unread error:', error);
      setToastMessage('Failed to mark notifications as unread');
      setShowToast(true);
    } finally {
      setBulkActionLoading(prev => ({ ...prev, markAsUnread: false }));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.size === 0) return;

    Alert.alert(
      'Delete Notifications',
      `Are you sure you want to delete ${selectedNotifications.size} notification${selectedNotifications.size > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBulkActionLoading(prev => ({ ...prev, delete: true }));
            
            try {
              // Delete selected notifications
              for (const notificationId of selectedNotifications) {
                await deleteNotification(notificationId);
              }
              
              setToastMessage(`${selectedNotifications.size} notifications deleted`);
              setShowToast(true);
              
              clearSelection();
              setIsSelectionMode(false);
              
            } catch (error) {
              console.error('Bulk delete error:', error);
              setToastMessage('Failed to delete notifications');
              setShowToast(true);
            } finally {
              setBulkActionLoading(prev => ({ ...prev, delete: false }));
            }
          },
        },
      ]
    );
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
          isSelectionMode && selectedNotifications.size > 0 && (
            <Button
              key="select-all"
              variant="icon"
              size="sm"
              icon={<CheckSquare size={20} color={theme.colors.primary} />}
              onPress={selectAllNotifications}
              style={{
                backgroundColor: theme.colors.primary + '15',
                borderRadius: 20,
                marginRight: theme.spacing.sm,
              }}
            />
          ),
          // Selection mode toggle
          <Button
            key="selection-toggle"
            variant="icon"
            size="sm"
            icon={isSelectionMode ? <Square size={20} color={theme.colors.text.primary} /> : <CheckSquare size={20} color={theme.colors.text.primary} />}
            onPress={toggleSelectionMode}
            style={{
              backgroundColor: isSelectionMode ? theme.colors.primary + '15' : 'transparent',
              borderRadius: 20,
            }}
          />
        ] : []}
      />

      {/* Bulk Action Buttons */}
      {isSelectionMode && selectedNotifications.size > 0 && (
        <Animated.View style={{
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          opacity: bulkActionsOpacity,
          transform: [{ translateY: bulkActionsTranslateY }],
        }}>
          <View style={{
            flexDirection: 'row',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            gap: theme.spacing.sm,
          }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<MailOpen size={14} color={theme.colors.primary} />}
              onPress={handleBulkMarkAsRead}
              loading={bulkActionLoading.markAsRead}
              style={{ 
                flex: 1,
                backgroundColor: theme.colors.primary + '10',
                borderColor: theme.colors.primary + '30',
                borderWidth: 1,
                elevation: 0,
                shadowOpacity: 0,
                shadowRadius: 0,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              Read
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Mail size={14} color={theme.colors.warning} />}
              onPress={handleBulkMarkAsUnread}
              loading={bulkActionLoading.markAsUnread}
              style={{ 
                flex: 1,
                backgroundColor: theme.colors.warning + '10',
                borderColor: theme.colors.warning + '30',
                borderWidth: 1,
                elevation: 0,
                shadowOpacity: 0,
                shadowRadius: 0,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              Unread
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Trash2 size={14} color={theme.colors.error} />}
              onPress={handleBulkDelete}
              loading={bulkActionLoading.delete}
              style={{ 
                flex: 1,
                backgroundColor: theme.colors.error + '10',
                borderColor: theme.colors.error + '30',
                borderWidth: 1,
                elevation: 0,
                shadowOpacity: 0,
                shadowRadius: 0,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              Delete
            </Button>
          </View>
        </Animated.View>
      )}

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
                      onPress={() => isSelectionMode ? toggleNotificationSelection(notification.id) : handleNotificationPress(notification)}
                      onLongPress={() => {
                        if (!isSelectionMode) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setIsSelectionMode(true);
                          toggleNotificationSelection(notification.id);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: theme.spacing.lg,
                        paddingHorizontal: theme.spacing.lg,
                      }}
                      activeOpacity={0.7}
                    >
                      {/* Selection Checkbox or Left Icon */}
                      <View style={{ marginRight: theme.spacing.md }}>
                        {isSelectionMode ? (
                          <TouchableOpacity
                            onPress={() => toggleNotificationSelection(notification.id)}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              borderWidth: 2,
                              borderColor: selectedNotifications.has(notification.id) ? theme.colors.primary : theme.colors.border,
                              backgroundColor: selectedNotifications.has(notification.id) ? theme.colors.primary : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            activeOpacity={0.7}
                          >
                            {selectedNotifications.has(notification.id) && (
                              <CheckSquare size={16} color="white" />
                            )}
                          </TouchableOpacity>
                        ) : (
                          getNotificationIcon(notification.type)
                        )}
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
                      {!isSelectionMode && (
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
                      )}
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
