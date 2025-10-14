import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Filter, Bell, Heart, ListFilter, ListFilterPlusIcon, LucideListFilterPlus, ListFilterPlus, Search } from 'lucide-react-native';

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

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bellShake = useRef(new Animated.Value(0)).current;
  const heartBeat = useRef(new Animated.Value(1)).current;
  
  // Track previous favorites count to detect additions (initialize with 0 to avoid undefined)
  const prevFavoritesCount = useRef(favoritesCount || 0);

  const firstName = profile?.first_name || user?.user_metadata?.first_name || 'User';
  const lastName = profile?.last_name || user?.user_metadata?.last_name || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  // Bell shake animation when there are unread notifications
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.sequence([
        Animated.timing(bellShake, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bellShake, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bellShake, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bellShake, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unreadCount]);

  // Heart beat animation - ONLY when a new item is added to favorites
  useEffect(() => {
    const currentCount = favoritesCount || 0;
    const previousCount = prevFavoritesCount.current || 0;
    
    // Only animate if count increased (item was added)
    if (currentCount > previousCount && currentCount > 0) {
      // Play animation once (2 beats)
      Animated.sequence([
        Animated.timing(heartBeat, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeat, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeat, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeat, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    // Update previous count for next comparison
    prevFavoritesCount.current = currentCount;
  }, [favoritesCount]);

  const handleSearchPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    onSearchPress();
  };

  const bellRotate = bellShake.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm + 2,
        marginHorizontal: theme.spacing.sm,
        ...theme.shadows.md, // Enhanced shadow
        transform: [{ scale: scaleAnim }],
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
          onPress={handleSearchPress}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            gap: theme.spacing.sm,
          }}
          activeOpacity={0.7}
        >
          <Search size={18} color={theme.colors.text.muted} />
          <Text 
            variant="body" 
            color="muted" 
            style={{ 
              flex: 1,
              fontSize: 15,
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
          {/* Notifications with Animation */}
          <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
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
                    padding: 0,
                    borderWidth: 2,
                    borderColor: theme.colors.surface,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFF',
                      fontSize: 9,
                      fontWeight: '700',
                      textAlign: 'center',
                      lineHeight: 10,
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Separator */}
          <View
            style={{
              width: 2,
              height: 20,
              backgroundColor: theme.colors.border,
              marginHorizontal: theme.spacing.xs,
            }}
          />

          {/* Favorites with Heart Beat */}
          <Animated.View style={{ transform: [{ scale: heartBeat }] }}>
            <TouchableOpacity
              style={{
                position: 'relative',
                padding: theme.spacing.sm,
                marginRight: theme.spacing.xs,
              }}
              onPress={() => router.push('/favorites')}
              activeOpacity={0.7}
            >
              <Heart 
                size={20} 
                color={favoritesCount > 0 ? theme.colors.error : theme.colors.text.primary}
                fill={favoritesCount > 0 ? theme.colors.error : 'transparent'}
              />
              {favoritesCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -1,
                    right: -1,
                    backgroundColor: theme.colors.primary,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 0,
                    borderWidth: 2,
                    borderColor: theme.colors.surface,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFF',
                      fontSize: 9,
                      fontWeight: '700',
                      textAlign: 'center',
                      lineHeight: 10,
                    }}
                  >
                    {favoritesCount > 9 ? '9+' : favoritesCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

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
    </Animated.View>
  );
}
