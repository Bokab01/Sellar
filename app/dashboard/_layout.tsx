import React, { useMemo, useEffect } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { Dimensions, Platform } from 'react-native';
import { SafeAreaWrapper, AppHeader } from '@/components';
import { router } from 'expo-router';

const Tab = createMaterialTopTabNavigator();

// Dynamically require screen components to avoid circular dependencies
const DashboardOverviewScreen = require('./index').default;
const DashboardAutoRefreshScreen = require('./auto-refresh').default;
const DashboardAnalyticsScreen = require('./analytics').default;
const DashboardSupportScreen = require('./support').default;

export default function DashboardLayout() {
  const { theme } = useTheme();
  const refreshSubscription = useMonetizationStore(state => state.refreshSubscription);
  const hasBusinessPlan = useMonetizationStore(state => state.hasBusinessPlan);
  const initialLayout = { width: Dimensions.get('window').width };

  // Ensure subscription data is loaded
  useEffect(() => {
    refreshSubscription();
  }, []);

  // Check if user has business plan
  const isBusinessUser = hasBusinessPlan();

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => ({
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      elevation: 0,
      shadowOpacity: 0,
      paddingHorizontal: theme.spacing.sm,
    },
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.text.muted,
    tabBarIndicatorStyle: {
      backgroundColor: theme.colors.primary,
      height: 3,
    },
    tabBarLabelStyle: {
      fontSize: Platform.OS === 'android' ? 13 : 12,
      fontWeight: '700' as const,
      textTransform: 'capitalize' as const,
      marginHorizontal: -2,
    },
    tabBarItemStyle: {
      paddingHorizontal: theme.spacing.sm,
    },
    tabBarPressColor: theme.colors.primary + '20',
    tabBarScrollEnabled: false,
    // CRITICAL: Add background color to prevent white flash
    sceneContainerStyle: {
      backgroundColor: theme.colors.background,
    },
    // CRITICAL: Enable lazy loading with optimized distance
    lazy: true,
    lazyPreloadDistance: 1,
    // Enable swipe for better UX
    swipeEnabled: true,
    // Optimize animations
    animationEnabled: Platform.OS === 'ios',
  }), [theme]);

  return (
    <SafeAreaWrapper style={{ backgroundColor: theme.colors.background }}>
      {/* Header */}
      {/* <AppHeader
        title={isBusinessUser ? "Business Dashboard" : "Dashboard"}
        subtitle={isBusinessUser ? "Manage your business performance" : "Upgrade to unlock all features"}
        showBackButton
        onBackPress={() => router.back()}
      /> */}

      {/* Tab Navigator */}
      <Tab.Navigator 
        screenOptions={screenOptions}
        style={{ backgroundColor: theme.colors.background }}
        initialLayout={initialLayout}
      >
        <Tab.Screen 
          name="index" 
          component={DashboardOverviewScreen}
          options={{ title: 'Overview' }}
        />
        <Tab.Screen 
          name="auto-refresh" 
          component={DashboardAutoRefreshScreen}
          options={{ title: 'Auto-Refresh' }}
        />
        <Tab.Screen 
          name="analytics" 
          component={DashboardAnalyticsScreen}
          options={{ title: 'Analytics' }}
        />
        <Tab.Screen 
          name="support" 
          component={DashboardSupportScreen}
          options={{ title: 'Support' }}
        />
      </Tab.Navigator>
    </SafeAreaWrapper>
  );
}

