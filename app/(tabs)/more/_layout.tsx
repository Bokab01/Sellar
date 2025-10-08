import React, { useMemo, useEffect } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { Dimensions, Platform, View } from 'react-native';

// Import the screen components explicitly
import MoreScreen from './index';
import BusinessDashboardScreen from './dashboard';
import WalletScreen from './wallet';
import SettingsScreen from './settings';
import { SafeAreaWrapper } from '@/components';

const Tab = createMaterialTopTabNavigator();

export default function MoreLayout() {
  const { theme } = useTheme();
  const refreshSubscription = useMonetizationStore(state => state.refreshSubscription);
  const initialLayout = { width: Dimensions.get('window').width };
  // Ensure subscription data is loaded (only once on mount)
  useEffect(() => {
    refreshSubscription();
  }, []); // Empty deps - only run once on mount

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => ({
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
    },
    tabBarPressColor: theme.colors.primary + '20',
    // CRITICAL: Add background color to prevent white flash
    sceneContainerStyle: {
      backgroundColor: theme.colors.background,
    },
    // CRITICAL: Enable lazy loading to prevent all tabs from rendering at once
    lazy: true,
    lazyPreloadDistance: 1,
    // CRITICAL: Disable swipe to prevent white flash during gesture
    swipeEnabled: true,
    // Optimize animations to prevent flashing
    animationEnabled: false,
  }), [theme]);

  return (
      <SafeAreaWrapper style={{ backgroundColor: theme.colors.background }}>
        <Tab.Navigator 
          screenOptions={screenOptions}
          style={{ backgroundColor: theme.colors.background }}
          initialLayout={initialLayout}
        >
          <Tab.Screen 
            name="Profile" 
            component={MoreScreen}
            options={{ title: 'Profile' }}
          />
          <Tab.Screen 
            name="Dashboard" 
            component={BusinessDashboardScreen}
            options={{ title: 'Dashboard' }}
          />
          <Tab.Screen 
            name="Wallet" 
            component={WalletScreen}
            options={{ title: 'Wallet' }}
          />
          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </Tab.Navigator>
      </SafeAreaWrapper>
   
  );
}
