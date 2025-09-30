import React, { useMemo, useEffect } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { Platform } from 'react-native';

// Import the screen components explicitly
import MoreScreen from './index';
import BusinessDashboardScreen from './dashboard';
import WalletScreen from './wallet';
import SettingsScreen from './settings';
import { SafeAreaWrapper } from '@/components';

const Tab = createMaterialTopTabNavigator();

export default function MoreLayout() {
  const { theme } = useTheme();
  const { refreshSubscription } = useMonetizationStore();
  
  // Ensure subscription data is loaded
  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

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
      textTransform: 'capitalize' as const,
    },
    
    tabBarPressColor: theme.colors.primary + '20',
  }), [theme]);

  return (
    <SafeAreaWrapper>
      <Tab.Navigator screenOptions={screenOptions}>
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
