import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Container({ 
  children, 
  padding = 'md', 
  margin = 'none',
  style,
  ...props 
}: ContainerProps) {
  const { theme } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return theme.spacing.sm;
      case 'md': return theme.spacing.lg;
      case 'lg': return theme.spacing.xl;
      case 'xl': return theme.spacing['2xl'];
      default: return theme.spacing.lg;
    }
  };

  const getMargin = () => {
    switch (margin) {
      case 'none': return 0;
      case 'sm': return theme.spacing.sm;
      case 'md': return theme.spacing.lg;
      case 'lg': return theme.spacing.xl;
      case 'xl': return theme.spacing['2xl'];
      default: return 0;
    }
  };

  return (
    <View
      style={[
        {
          padding: getPadding(),
          margin: getMargin(),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
