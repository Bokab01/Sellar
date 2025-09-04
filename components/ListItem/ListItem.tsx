import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { ChevronRight } from 'lucide-react-native';

interface ListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  avatar?: {
    source?: string;
    name: string;
    isOnline?: boolean;
  };
  timestamp?: string;
  badge?: {
    text: string;
    variant?: 'new' | 'sold' | 'featured' | 'discount' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  };
  unreadCount?: number;
  rightIcon?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: any;
}

export function ListItem({
  title,
  subtitle,
  description,
  avatar,
  timestamp,
  badge,
  unreadCount,
  rightIcon,
  showChevron = false,
  onPress,
  style,
}: ListItemProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        style,
      ]}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Avatar */}
      {avatar && (
        <Avatar
          source={avatar.source}
          name={avatar.name}
          size="md"
          isOnline={avatar.isOnline}
          style={{ marginRight: theme.spacing.md }}
        />
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: subtitle || description ? theme.spacing.xs : 0,
          }}
        >
          <Text
            variant="body"
            numberOfLines={1}
            style={{
              flex: 1,
              fontWeight: unreadCount ? '600' : '500',
              marginRight: theme.spacing.sm,
            }}
          >
            {title}
          </Text>

          {timestamp && (
            <Text
              variant="caption"
              color="muted"
              style={{ fontSize: 11 }}
            >
              {timestamp}
            </Text>
          )}
        </View>

        {subtitle && (
          <Text
            variant="bodySmall"
            color="secondary"
            numberOfLines={1}
            style={{ marginBottom: description ? theme.spacing.xs : 0 }}
          >
            {subtitle}
          </Text>
        )}

        {description && (
          <Text
            variant="bodySmall"
            color="muted"
            numberOfLines={2}
            style={{ lineHeight: 18 }}
          >
            {description}
          </Text>
        )}

        {badge && (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Badge
              text={badge.text}
              variant={badge.variant}
              size="sm"
            />
          </View>
        )}
      </View>

      {/* Right Side */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        {unreadCount && unreadCount > 0 && (
          <View
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.full,
              minWidth: 20,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.xs,
            }}
          >
            <Text
              variant="caption"
              style={{
                color: theme.colors.primaryForeground,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}

        {rightIcon && (
          <View>{rightIcon}</View>
        )}

        {showChevron && (
          <ChevronRight
            size={16}
            color={theme.colors.text.muted}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
