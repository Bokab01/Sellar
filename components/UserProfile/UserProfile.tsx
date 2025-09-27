import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { CompactUserBadges } from '@/components/UserBadgeSystem';
import { Rating } from '@/components/Rating/Rating';
import { Button } from '@/components/Button/Button';
import { MessageCircle, Phone, MapPin, Calendar } from 'lucide-react-native';

interface UserProfileProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    reviewCount?: number;
    joinDate?: string;
    location?: string;
    isVerified?: boolean;
    isBusinessUser?: boolean;
    isBusinessVerified?: boolean;
    isOnline?: boolean;
    responseTime?: string;
    totalSales?: number;
  };
  variant?: 'full' | 'compact' | 'minimal';
  showActions?: boolean;
  onMessage?: () => void;
  onCall?: () => void;
  onViewProfile?: () => void;
  style?: any;
}

export function UserProfile({
  user,
  variant = 'compact',
  showActions = true,
  onMessage,
  onCall,
  onViewProfile,
  style,
}: UserProfileProps) {
  const { theme } = useTheme();

  if (variant === 'minimal') {
    return (
      <TouchableOpacity
        onPress={onViewProfile}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
          },
          style,
        ]}
        activeOpacity={0.7}
      >
        <Avatar
          source={user.avatar}
          name={user.name}
          size="sm"
          isOnline={user.isOnline}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {user.name}
            </Text>
            <CompactUserBadges
              isBusinessUser={user.isBusinessUser}
              isVerified={user.isVerified}
              isBusinessVerified={user.isBusinessVerified}
            />
          </View>
          {user.rating && (
            <Rating rating={user.rating} size="sm" showValue />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}
      >
        <Avatar
          source={user.avatar}
          name={user.name}
          size={variant === 'full' ? 'lg' : 'md'}
          isOnline={user.isOnline}
          showBorder
          style={{ marginRight: theme.spacing.md }}
        />

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Text variant={variant === 'full' ? 'h3' : 'body'} style={{ fontWeight: '600' }}>
              {user.name}
            </Text>
            <CompactUserBadges
              isBusinessUser={user.isBusinessUser}
              isVerified={user.isVerified}
              isBusinessVerified={user.isBusinessVerified}
            />
          </View>

          {user.rating && (
            <Rating
              rating={user.rating}
              size={variant === 'full' ? 'md' : 'sm'}
              showValue
              showCount={variant === 'full'}
              reviewCount={user.reviewCount}
            />
          )}

          {user.responseTime && variant === 'full' && (
            <Text variant="bodySmall" color="muted" style={{ marginTop: theme.spacing.xs }}>
              Usually responds within {user.responseTime}
            </Text>
          )}
        </View>
      </View>

      {/* Stats - Full variant only */}
      {variant === 'full' && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: theme.spacing.lg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.colors.border,
            marginBottom: theme.spacing.lg,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text variant="h4" style={{ fontWeight: '700' }}>
              {user.totalSales || 0}
            </Text>
            <Text variant="caption" color="muted">
              Sales
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text variant="h4" style={{ fontWeight: '700' }}>
              {user.reviewCount || 0}
            </Text>
            <Text variant="caption" color="muted">
              Reviews
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text variant="h4" style={{ fontWeight: '700' }}>
              {user.rating?.toFixed(1) || '0.0'}
            </Text>
            <Text variant="caption" color="muted">
              Rating
            </Text>
          </View>
        </View>
      )}

      {/* Details */}
      <View style={{ gap: theme.spacing.sm, marginBottom: showActions ? theme.spacing.lg : 0 }}>
        {user.location && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <MapPin size={16} color={theme.colors.text.muted} />
            <Text variant="bodySmall" color="muted">
              {user.location}
            </Text>
          </View>
        )}

        {user.joinDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Calendar size={16} color={theme.colors.text.muted} />
            <Text variant="bodySmall" color="muted">
              Member since {user.joinDate}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {showActions && (
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {onMessage && (
            <Button
              variant="primary"
              icon={<MessageCircle size={18} color={theme.colors.primaryForeground} />}
              onPress={onMessage}
              style={{ flex: 1 }}
            >
              Message
            </Button>
          )}

          {onCall && (
            <Button
              variant="secondary"
              icon={<Phone size={18} color={theme.colors.secondaryForeground} />}
              onPress={onCall}
              style={{ flex: 1 }}
            >
              Call
            </Button>
          )}

          {!onMessage && !onCall && onViewProfile && (
            <Button
              variant="primary"
              onPress={onViewProfile}
              fullWidth
            >
              View Profile
            </Button>
          )}

          {onViewProfile && (onMessage || onCall) && (
            <Button
              variant="ghost"
              onPress={onViewProfile}
              fullWidth
              style={{ marginTop: theme.spacing.md }}
            >
              View Full Profile
            </Button>
          )}
        </View>
      )}
    </View>
  );
}