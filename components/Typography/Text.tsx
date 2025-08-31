import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'button';
type TextColor = 'primary' | 'secondary' | 'muted' | 'inverse' | 'error' | 'success' | 'warning';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  children: React.ReactNode;
}

export function Text({ 
  variant = 'body', 
  color = 'primary', 
  style, 
  children, 
  ...props 
}: TextProps) {
  const { theme } = useTheme();

  const getTextColor = (colorVariant: TextColor) => {
    switch (colorVariant) {
      case 'primary':
        return theme.colors.text.primary;
      case 'secondary':
        return theme.colors.text.secondary;
      case 'muted':
        return theme.colors.text.muted;
      case 'inverse':
        return theme.colors.text.inverse;
      case 'error':
        return theme.colors.error;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      default:
        return theme.colors.text.primary;
    }
  };

  const textStyle = [
    {
      fontSize: theme.typography[variant].fontSize,
      lineHeight: theme.typography[variant].lineHeight,
      fontFamily: theme.typography[variant].fontFamily,
      letterSpacing: theme.typography[variant].letterSpacing,
      color: getTextColor(color),
    },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
}