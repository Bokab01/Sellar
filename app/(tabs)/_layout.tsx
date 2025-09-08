import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { MessageCircle, Plus, Users, EllipsisVertical, House } from 'lucide-react-native';
import { useChatStore } from '@/store/useChatStore';

export default function TabLayout() {
  const { theme } = useTheme();
  const { unreadCounts } = useChatStore();
  
  // Calculate total unread count for inbox badge
  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => ({
    headerShown: false,
    // Add consistent background to prevent flashing
    sceneContainerStyle: { backgroundColor: theme.colors.background },
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingBottom: 8,
      paddingTop: 8,
      height: 70,
      // Prevent tab bar flashing
      elevation: 0,
      shadowOpacity: 0,
    },
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.text.muted,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '500' as const,
      marginTop: 4,
    },
    // Optimize animations
    animationEnabled: true,
    animationTypeForReplace: 'push',
  }), [theme]);

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
      />

      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarStyle: {
            display: 'none',
          },
          tabBarIcon: ({ size, color }) => (
            <View
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: 28,
                width: 56,
                height: 56,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                ...theme.shadows.lg,
              }}
            >
              <Plus size={28} color={theme.colors.primaryForeground} />
            </View>
          ),
          tabBarLabel: () => null,
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
