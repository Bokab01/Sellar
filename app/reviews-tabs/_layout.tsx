import React from 'react';
import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { AppHeader, SafeAreaWrapper } from '@/components';
import { router } from 'expo-router';
import { Star, MessageSquare } from 'lucide-react-native';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

export default function ReviewsTabsLayout() {
  const { theme } = useTheme();

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Reviews & Ratings"
        showBackButton
        onBackPress={() => router.back()}
      />
      
      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.text.secondary,
          tabBarIndicatorStyle: {
            backgroundColor: theme.colors.primary,
            height: 3,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarPressColor: theme.colors.primary + '20',
          swipeEnabled: true,
          lazy: false,
          lazyPreloadDistance: 1,
        }}
      >
        <MaterialTopTabs.Screen
          name="received"
          options={{
            tabBarLabel: 'Received',
            tabBarIcon: ({ color }: { color: string }) => <Star size={20} color={color} />,
          }}
        />
        <MaterialTopTabs.Screen
          name="given"
          options={{
            tabBarLabel: 'Given',
            tabBarIcon: ({ color }: { color: string }) => <MessageSquare size={20} color={color} />,
          }}
        />
      </MaterialTopTabs>
    </SafeAreaWrapper>
  );
}

