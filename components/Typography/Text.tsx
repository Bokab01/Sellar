import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'location' | 'button';
type TextColor = 'primary' | 'secondary' | 'muted' | 'inverse' | 'error' | 'success' | 'warning';
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: TextWeight;
  children: React.ReactNode;
}

export function Text({ 
  variant = 'body', 
  color = 'primary', 
  weight = 'normal',
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

  const typographyVariant = theme.typography[variant];
  
  // Safety check to prevent fontSize errors
  if (!typographyVariant) {
    console.warn(`Typography variant "${variant}" not found in theme`);
    return (
      <RNText style={[{ color: getTextColor(color) }, style]} {...props}>
        {children}
      </RNText>
    );
  }

  const getFontWeight = (weightVariant: TextWeight): TextStyle['fontWeight'] => {
    switch (weightVariant) {
      case 'normal':
        return '400';
      case 'medium':
        return '500';
      case 'semibold':
        return '600';
      case 'bold':
        return '700';
      default:
        return '400';
    }
  };

  const textStyle = [
    {
      fontSize: typographyVariant.fontSize || 16,
      lineHeight: typographyVariant.lineHeight || 24,
      fontFamily: typographyVariant.fontFamily || 'System',
      letterSpacing: typographyVariant.letterSpacing || 0,
      fontWeight: getFontWeight(weight),
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