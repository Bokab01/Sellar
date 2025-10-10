import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Filter, Bell, Heart, ListFilter, ListFilterPlusIcon, LucideListFilterPlus, ListFilterPlus } from 'lucide-react-native';

interface EnhancedSearchHeaderProps {
  searchQuery?: string;
  onSearchPress: () => void;
  onFilterPress: () => void;
  onAvatarPress: () => void;
  placeholder?: string;
}

export function EnhancedSearchHeader({
  searchQuery,
  onSearchPress,
  onFilterPress,
  onAvatarPress,
  placeholder = "Search for anything..."
}: EnhancedSearchHeaderProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const { unreadCount } = useNotificationStore();
  const { favoritesCount } = useFavoritesStore();

  const firstName = profile?.first_name || user?.user_metadata?.first_name || 'User';
  const lastName = profile?.last_name || user?.user_metadata?.last_name || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm + 2,
        marginHorizontal: theme.spacing.sm, // Minimal margins for true floating effect
        ...theme.shadows.sm, // Add shadow for floating effect
      }}
    >
        {/* Avatar Button */}
        <TouchableOpacity
          onPress={onAvatarPress}
          style={{
            marginRight: theme.spacing.sm,
          }}
          activeOpacity={0.7}
        >
          <Avatar
            source={avatarUrl}
            name={`${firstName} ${lastName}`}
            size="sm"
          />
        </TouchableOpacity>

        {/* Search Input Area */}
        <TouchableOpacity
          onPress={onSearchPress}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
          }}
          activeOpacity={0.7}
        >
          <Text 
            variant="body" 
            color="muted" 
            style={{ 
              flex: 1,
            }}
          >
            {searchQuery || placeholder}
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: theme.spacing.sm,
            borderLeftWidth: 1,
            borderLeftColor: theme.colors.border,
          }}
        >
          {/* Notifications */}
          <TouchableOpacity
            style={{
              position: 'relative',
              padding: theme.spacing.sm,
              marginRight: theme.spacing.xs,
            }}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Bell size={20} color={theme.colors.text.primary} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -1,
                  backgroundColor: theme.colors.error,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                 padding: 0
                }}
              >
                <Text
                  style={{
                    color: '#FFF',
                    fontSize: 9,
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: 10,
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Separator */}
          <View
            style={{
              width: 2,
              height: 20,
              backgroundColor: theme.colors.border,
              marginHorizontal: theme.spacing.xs,
            }}
          />

          {/* Favorites */}
          <TouchableOpacity
            style={{
              position: 'relative',
              padding: theme.spacing.sm,
              marginRight: theme.spacing.xs,
            }}
            onPress={() => router.push('/favorites')}
            activeOpacity={0.7}
          >
            <Heart size={20} color={theme.colors.text.primary} />
            {favoritesCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -1,
                  backgroundColor: theme.colors.error,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                <Text
                  style={{
                    color: '#FFF',
                    fontSize: 9,
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: 10,
                  }}
                >
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Separator */}
          <View
            style={{
              width: 1,
              height: 20,
              backgroundColor: theme.colors.border,
              marginHorizontal: theme.spacing.xs,
            }}
          />

          {/* Filter */}
          <TouchableOpacity
            style={{
              padding: theme.spacing.sm,
            }}
            onPress={onFilterPress}
            activeOpacity={0.7}
          >
            <ListFilterPlus size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
    </View>
  );
}
