import React, { useMemo } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@/theme/ThemeProvider';

// Import the screen components explicitly
import MoreScreen from './index';
import BusinessDashboardScreen from './dashboard';
import WalletScreen from './wallet';
import SettingsScreen from './settings';

const Tab = createMaterialTopTabNavigator();

export default function MoreLayout() {
  const { theme } = useTheme();

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => ({
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginTop: 30,
    },
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.text.muted,
    tabBarIndicatorStyle: {
      backgroundColor: theme.colors.primary,
      height: 3,
    },
    tabBarLabelStyle: {
      fontSize: 13,
      fontWeight: '700' as const,
      textTransform: 'capitalize' as const,
    },
    tabBarPressColor: theme.colors.primary + '20',
  }), [theme]);

  return (
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
  );
}
