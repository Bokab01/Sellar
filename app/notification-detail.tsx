import React from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
  Badge,
} from '@/components';
import { Bell, MessageCircle, DollarSign, Heart, MessageSquare, UserPlus2, Star, Package, CircleAlert as AlertCircle, ArrowRight } from 'lucide-react-native';

export default function NotificationDetailScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  
  // Parse notification from params
  const notification = params.notification ? JSON.parse(params.notification as string) : null;

  if (!notification) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Notification"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl }}>
          <Text variant="body" style={{ color: theme.colors.text.muted, textAlign: 'center' }}>
            Notification not found
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  const getNotificationIcon = (type: string) => {
    const size = 48;
    switch (type) {
      case 'message':
        return <MessageCircle size={size} color={theme.colors.primary} />;
      case 'offer':
        return <DollarSign size={size} color={theme.colors.success} />;
      case 'like':
        return <Heart size={size} color={theme.colors.error} />;
      case 'comment':
        return <MessageSquare size={size} color={theme.colors.primary} />;
      case 'follow':
        return <UserPlus2 size={size} color={theme.colors.primary} />;
      case 'review':
        return <Star size={size} color={theme.colors.warning} />;
      case 'listing':
        return <Package size={size} color={theme.colors.primary} />;
      case 'system':
        return <AlertCircle size={size} color={theme.colors.text.muted} />;
      default:
        return <Bell size={size} color={theme.colors.text.muted} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message':
        return theme.colors.primary;
      case 'offer':
        return theme.colors.success;
      case 'like':
        return theme.colors.error;
      case 'comment':
        return theme.colors.primary;
      case 'follow':
        return theme.colors.primary;
      case 'review':
        return theme.colors.warning;
      case 'listing':
        return theme.colors.primary;
      case 'system':
        return theme.colors.text.muted;
      default:
        return theme.colors.text.muted;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'message':
        return { text: 'Message', variant: 'primary' as const };
      case 'offer':
        return { text: 'Offer', variant: 'success' as const };
      case 'like':
        return { text: 'Like', variant: 'error' as const };
      case 'comment':
        return { text: 'Comment', variant: 'primary' as const };
      case 'follow':
        return { text: 'Follow', variant: 'primary' as const };
      case 'review':
        return { text: 'Review', variant: 'warning' as const };
      case 'listing':
        return { text: 'Listing', variant: 'primary' as const };
      case 'system':
        return { text: 'System', variant: 'neutral' as const };
      default:
        return { text: 'Notification', variant: 'neutral' as const };
    }
  };

  const hasActionableContent = () => {
    const data = notification.data || {};
    return data.conversation_id || data.listing_id || data.post_id || data.user_id;
  };

  const handleNavigate = () => {
    const data = notification.data || {};
    
    try {
      switch (notification.type) {
        case 'message':
          if (data.conversation_id) {
            router.push(`/(tabs)/inbox/${data.conversation_id}`);
          } else {
            router.push('/(tabs)/inbox');
          }
          break;

        case 'offer':
          if (data.conversation_id) {
            router.push(`/(tabs)/inbox/${data.conversation_id}`);
          } else if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else {
            router.push('/(tabs)/inbox');
          }
          break;

        case 'like':
        case 'comment':
          if (data.post_id) {
            router.push(`/(tabs)/community/${data.post_id}` as any);
          } else {
            router.push('/(tabs)/community');
          }
          break;

        case 'follow':
          if (data.user_id || data.follower_id) {
            const userId = data.user_id || data.follower_id;
            router.push(`/profile/${userId}`);
          } else {
            router.push('/(tabs)/community');
          }
          break;

        case 'review':
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
          if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else {
            router.push('/(tabs)/home');
          }
          break;

        case 'verification':
          if (data.verification_id) {
            router.push(`/verification-status` as any);
          } else {
            router.push('/profile' as any);
          }
          break;

        case 'payment':
          if (data.transaction_id) {
            router.push('/transactions');
          } else if (data.credit_transaction_id) {
            router.push('/transactions');
          } else {
            router.push('/buy-credits');
          }
          break;

        case 'promotion':
          if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else {
            router.push('/(tabs)/home');
          }
          break;

        case 'system':
          if (data.action === 'update_app') {
            router.push('/(tabs)/more/settings');
          } else if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else if (data.user_id) {
            router.push(`/profile/${data.user_id}`);
          }
          break;

        case 'reminder':
          if (data.listing_id) {
            router.push(`/(tabs)/home/${data.listing_id}` as any);
          } else if (data.conversation_id) {
            router.push(`/(tabs)/inbox/${data.conversation_id}`);
          } else {
            router.push('/(tabs)/home');
          }
          break;

        default:
          console.log('Unknown notification type:', notification.type, 'Data:', data);
          break;
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const notificationColor = getNotificationColor(notification.type);
  const badge = getNotificationBadge(notification.type);

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Notification Details"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
      >
        {/* Header with Icon */}
        <View
          style={{
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            marginBottom: theme.spacing.xl,
          }}
        >
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: notificationColor + '15',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.lg,
              borderWidth: 3,
              borderColor: notificationColor + '30',
            }}
          >
            {getNotificationIcon(notification.type)}
          </View>
          
          <Badge
            text={badge.text}
            variant={badge.variant}
            size="lg"
          />
        </View>

        {/* Content Section */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          {/* Title */}
          <Text
            variant="h2"
            style={{
              textAlign: 'center',
              marginBottom: theme.spacing.lg,
              color: theme.colors.text.primary,
            }}
          >
            {notification.title}
          </Text>

          {/* Body */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text
              variant="body"
              style={{
                color: theme.colors.text.primary,
                lineHeight: 24,
                fontSize: 16,
              }}
            >
              {notification.body}
            </Text>
          </View>

          {/* Timestamp */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="body" style={{ color: theme.colors.text.muted, fontWeight: '600' }}>
                📅 Received
              </Text>
              <Text variant="body" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                {new Date(notification.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        {hasActionableContent() && (
          <Button
            variant="primary"
            onPress={handleNavigate}
            icon={<ArrowRight size={20} color="#fff" />}
            style={{
              backgroundColor: notificationColor,
              paddingVertical: theme.spacing.lg,
            }}
          >
            View Related Content
          </Button>
        )}
      </ScrollView>
    </SafeAreaWrapper>
  );
}
