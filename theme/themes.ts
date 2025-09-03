import { Theme } from './types';
import { colorPalette } from './colors';
import { getFontFamily } from './fonts';

const baseTypography = {
  h1: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: getFontFamily('heading', 'bold'),
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: getFontFamily('heading', 'semiBold'),
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: getFontFamily('heading', 'semiBold'),
    letterSpacing: 0,
  },
  h4: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: getFontFamily('heading', 'semiBold'),
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: getFontFamily('body', 'regular'),
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: getFontFamily('body', 'regular'),
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: getFontFamily('body', 'medium'),
    letterSpacing: 0.5,
  },
  button: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: getFontFamily('body', 'semiBold'),
    letterSpacing: 0.25,
  },
};

const baseSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

const baseBorderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const lightTheme: Theme = {
  colors: {
    primary: colorPalette.primary[500],
    primaryForeground: '#ffffff',
    secondary: colorPalette.secondary[100],
    secondaryForeground: colorPalette.secondary[700],
    background: colorPalette.secondary[50],
    surface: '#ffffff',
    surfaceVariant: colorPalette.neutral[50],
    border: colorPalette.neutral[200],
    text: {
      primary: colorPalette.neutral[900],
      secondary: colorPalette.neutral[600],
      muted: colorPalette.neutral[500],
      inverse: '#ffffff',
    },
    error: colorPalette.error[600],
    errorForeground: '#ffffff',
    success: colorPalette.success[600],
    successForeground: '#ffffff',
    warning: colorPalette.warning[600],
    warningForeground: '#ffffff',
    
    // Additional color properties that might be missing
    primaryContainer: colorPalette.primary[100],
    secondaryContainer: colorPalette.secondary[100],
    errorContainer: colorPalette.error[100],
    successContainer: colorPalette.success[100],
    warningContainer: colorPalette.warning[100],
    textMuted: colorPalette.neutral[500],
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 5,
    },
  },
};

export const darkTheme: Theme = {
  colors: {
    primary: colorPalette.primary[300],
    primaryForeground: '#ffffff',
    secondary: colorPalette.secondary[800],
    secondaryForeground: colorPalette.secondary[300],
    background: colorPalette.neutral[900],
    surface: colorPalette.neutral[800],
    surfaceVariant: colorPalette.neutral[800],
    border: colorPalette.neutral[700],
    text: {
      primary: '#ffffff',
      secondary: colorPalette.neutral[300],
      muted: colorPalette.neutral[400],
      inverse: colorPalette.neutral[900],
    },
    error: colorPalette.error[500],
    errorForeground: '#ffffff',
    success: colorPalette.success[500],
    successForeground: '#ffffff',
    warning: colorPalette.warning[500],
    warningForeground: '#ffffff',
    
    // Additional color properties that might be missing
    primaryContainer: colorPalette.primary[800],
    secondaryContainer: colorPalette.secondary[800],
    errorContainer: colorPalette.error[800],
    successContainer: colorPalette.success[800],
    warningContainer: colorPalette.warning[800],
    textMuted: colorPalette.neutral[400],
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 5,
    },
  },
};