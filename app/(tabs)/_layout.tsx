import React, { useMemo, useEffect, useRef } from 'react';
import { router, Tabs } from 'expo-router';
import { View, Text, Image, Platform, useColorScheme, Animated, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { MessageCircle, Plus, Users, EllipsisVertical, House, BadgePlus, CirclePlus } from 'lucide-react-native';
import { useChatStore } from '@/store/useChatStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarSpacing } from '@/hooks/useBottomTabBarSpacing';
import { usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
  const { theme, isDarkMode } = useTheme();
  const colorScheme = useColorScheme();
  const { unreadCounts } = useChatStore();
  const insets = useSafeAreaInsets();
  const { tabBarHeight, tabBarBottomPadding, contentBottomPadding } = useBottomTabBarSpacing();
  const pathname = usePathname();
  
  // Calculate total unread count for inbox badge
  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  // Check if we're on the post detail screen
  const isPostDetailScreen = pathname.includes('/community/') && pathname.includes('/');

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => ({
    headerShown: false,
    // Add consistent background to prevent flashing
    sceneContainerStyle: { 
      backgroundColor: theme.colors.background,
      // Add bottom padding to prevent content from being hidden behind tab bar
      paddingBottom: isPostDetailScreen ? 0 : contentBottomPadding,
    },
    tabBarStyle: isPostDetailScreen ? { display: 'none' as const } : {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingBottom: tabBarBottomPadding,
      paddingTop: 8,
      height: tabBarHeight,
      // Prevent tab bar flashing
      elevation: 0,
      shadowOpacity: 0,
      // Ensure proper positioning on all devices
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
    },
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.text.muted,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '700' as const,
      marginTop: 4,
      letterSpacing: 0.5,
    },
    tabBarItemStyle: {
      paddingVertical: 4,
    },
    // Optimize animations
    animationEnabled: true,
    animationTypeForReplace: 'push',
    // Add press effect
    tabBarButton: (props: any) => (
      <Pressable
        {...props}
        onPress={(e) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          props.onPress?.(e);
        }}
        style={({ pressed }) => [
          props.style,
          {
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      />
    ),
  }), [theme, tabBarHeight, tabBarBottomPadding, contentBottomPadding, isPostDetailScreen]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <House size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarStyle: {
            display: 'none',
          },
          tabBarIcon: ({ size, color }) => (
            <View style={{ position: 'relative' }}>
              <MessageCircle size={size} color={color} />
              {totalUnreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    backgroundColor: theme.colors.error,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFF',
                      fontSize: 10,
                      fontWeight: '600',
                    }}
                  >
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // Always reset to inbox index when tab is pressed
            // This ensures tapping the tab always shows the chat list
            router.push('/(tabs)/inbox');
          },
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarStyle: {
            display: 'none',
          },
          tabBarIcon: ({ size, color, focused }) => {
            // Use isDarkMode to determine which icon to show
            const createIcon = isDarkMode 
              ? require('@/assets/icon/icon-dark.png')
              : require('@/assets/icon/icon-light.png');
            
            return (
              <View
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                  ...theme.shadows.lg,
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              >
                <Image source={createIcon} style={{ width: 60, height: 60 }} />
              </View>
            );
          },
          tabBarLabel: 'Sell',
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ size, color }) => (
            <EllipsisVertical size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
