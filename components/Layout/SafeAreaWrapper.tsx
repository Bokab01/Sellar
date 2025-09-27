import React, { useMemo } from 'react';
import { View, ViewProps, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

interface SafeAreaWrapperProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  statusBarStyle?: 'auto' | 'light' | 'dark';
  includePlatformPadding?: boolean;
}

export function SafeAreaWrapper({ 
  children, 
  edges = ['top', 'bottom'],
  backgroundColor,
  statusBarStyle = 'auto',
  includePlatformPadding = true,
  style,
  ...props 
}: SafeAreaWrapperProps) {
  const { theme } = useTheme();

  const safeAreaStyle = useMemo(() => {
    const bgColor = backgroundColor || theme.colors.background;

    return { 
      flex: 1, 
      backgroundColor: bgColor,
    };
  }, [theme, backgroundColor]);

  return (
    <SafeAreaView 
      style={[safeAreaStyle, style]} 
      edges={edges}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}

// Alternative wrapper for screens that need custom safe area handling
export function SafeAreaContainer({ 
  children, 
  backgroundColor,
  includePlatformPadding = true,
  style,
  ...props 
}: Omit<SafeAreaWrapperProps, 'edges' | 'statusBarStyle'>) {
  const { theme } = useTheme();

  const containerStyle = useMemo(() => {
    const bgColor = backgroundColor || theme.colors.background;

    // Custom safe area implementation with platform-specific values
    const getCustomSafeAreaPadding = () => {
      if (!includePlatformPadding) return {};
      
      return Platform.select({
        ios: {
          paddingTop: 44, // Standard iOS status bar + navigation area
          paddingBottom: 34, // Home indicator area
        },
        android: {
          paddingTop: 24, // Android status bar
          paddingBottom: 0,
        },
        web: {
          paddingTop: 0,
          paddingBottom: 0,
        },
        default: {
          paddingTop: 20,
          paddingBottom: 0,
        },
      });
    };

    return { 
      flex: 1, 
      backgroundColor: bgColor,
      ...getCustomSafeAreaPadding(),
    };
  }, [theme, backgroundColor, includePlatformPadding]);

  return (
    <View 
      style={[containerStyle, style]} 
      {...props}
    >
      {children}
    </View>
  );
}
