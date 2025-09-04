import React, { useMemo } from 'react';
import { SafeAreaView, View, ViewProps, Platform } from 'react-native';
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

    // Platform-specific padding values
    const getPlatformPadding = () => {
      if (!includePlatformPadding) return {};
      
      return Platform.select({
        ios: {
          paddingTop: edges.includes('top') ? 0 : 20, // Status bar height when not using safe area
          paddingBottom: edges.includes('bottom') ? 0 : 34, // Home indicator area
        },
        android: {
          paddingTop: edges.includes('top') ? 0 : 24, // Status bar height
          paddingBottom: 0, // Android handles bottom automatically
        },
        web: {
          paddingTop: edges.includes('top') ? 0 : 0,
          paddingBottom: 0,
        },
        default: {},
      });
    };

    return { 
      flex: 1, 
      backgroundColor: bgColor,
      // Ensure consistent background during transitions
      opacity: 1,
      ...getPlatformPadding(),
    };
  }, [theme, backgroundColor, edges, includePlatformPadding]);

  return (
    <SafeAreaView 
      style={[safeAreaStyle, style]} 
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
