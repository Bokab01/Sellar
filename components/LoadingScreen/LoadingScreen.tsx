import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface LoadingScreenProps {
  backgroundColor?: string;
  showSpinner?: boolean;
}

export function LoadingScreen({ 
  backgroundColor, 
  showSpinner = false 
}: LoadingScreenProps) {
  const { theme } = useTheme();
  
  const bgColor = backgroundColor || theme.colors.background;
  
  return (
    <View 
      style={{
        flex: 1,
        backgroundColor: bgColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {showSpinner && (
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary} 
        />
      )}
    </View>
  );
}

// Minimal loading screen that matches system theme immediately
export function SystemLoadingScreen() {
  // Use system colors directly to avoid theme provider dependency
  const backgroundColor = '#ffffff'; // Default to light, will be corrected quickly
  
  return (
    <View 
      style={{
        flex: 1,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    />
  );
}
