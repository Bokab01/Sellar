import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Chrome as Home, MessageCircle, Plus, Users, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          href: null, // Hide from tab bar - this is for the nested stack
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ size, color }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
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
            <MoreHorizontal size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="buy-credits"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="subscription-plans"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="feature-marketplace"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="support-tickets"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="knowledge-base"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="invite"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar - this is for the nested stack
        }}
      />
    </Tabs>
  );
}