import { useTheme } from '@/theme/ThemeProvider';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';

const {Navigator} = createMaterialTopTabNavigator();
const Tabs = withLayoutContext(Navigator);

export default function MoreLayout() {

    const {theme} = useTheme()

  return (
    <Tabs  screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 10,
          paddingTop: 15,
          height: 60,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarIndicatorStyle: {
          backgroundColor: theme.colors.primary,
        },
        tabBarIndicatorContainerStyle: {
          backgroundColor: theme.colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '500',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen name="index" options={{title: 'Profile'}} />
      <Tabs.Screen name="dashboard" options={{title: 'Dashboard'}}/>
      <Tabs.Screen name="wallet" options={{title: 'Wallet'}}/>
      <Tabs.Screen name="settings" options={{title: 'Settings'}}/>
    </Tabs>
  );
}