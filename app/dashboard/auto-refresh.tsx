import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import AutoBoostDashboard from '@/components/AutoBoostDashboard/AutoBoostDashboard';

export default function DashboardAutoRefreshScreen() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AutoBoostDashboard />
    </View>
  );
}

