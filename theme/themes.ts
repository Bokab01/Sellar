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
    fontSize: 14,
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
  location: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: getFontFamily('body', 'regular'),
    letterSpacing: 0,
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
    background: '#F8F9FA', // Professional light gray background
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
    textSecondary: colorPalette.neutral[600],
    
    // Additional colors used in components
    card: '#ffffff',
    purple: colorPalette.primary[600],
    onErrorContainer: '#ffffff',
    destructive: colorPalette.error[600],
    outline: colorPalette.neutral[300],
    onPrimary: '#ffffff',
    info: colorPalette.primary[500],
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
    surface: '#1a1a1a', // Slightly lighter - good balance
    surfaceVariant: '#1a1a1a',
    border: colorPalette.neutral[700],
    text: {
      primary: '#ffffff',
      secondary: colorPalette.neutral[300],
      muted: colorPalette.neutral[400],
      inverse: colorPalette.neutral[900],
    },
    error: colorPalette.error[400],
    errorForeground: '#ffffff',
    success: colorPalette.success[400], // #00ff00 - Neon green with dark text
    successForeground: colorPalette.neutral[900], // Dark text for better contrast
    warning: colorPalette.warning[400],
    warningForeground: colorPalette.neutral[900],
    
    // Additional color properties that might be missing
    primaryContainer: colorPalette.primary[800],
    secondaryContainer: colorPalette.secondary[800],
    errorContainer: colorPalette.error[800],
    successContainer: colorPalette.success[800],
    warningContainer: colorPalette.warning[800],
    textMuted: colorPalette.neutral[400],
    textSecondary: colorPalette.neutral[400],
    
    // Additional colors used in components
    card: '#1a1a1a', // Slightly lighter - matches surface
    purple: colorPalette.primary[400],
    onErrorContainer: '#ffffff',
    destructive: colorPalette.error[500],
    outline: colorPalette.neutral[600],
    onPrimary: '#ffffff',
    info: colorPalette.primary[400],
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

// AMOLED Dark Theme (Pure Black) - Better for OLED screens
export const amoledTheme: Theme = {
  colors: {
    primary: colorPalette.primary[300],
    primaryForeground: '#ffffff',
    secondary: colorPalette.secondary[800],
    secondaryForeground: colorPalette.secondary[300],
    background: colorPalette.neutral[900], // Pure black
    surface: colorPalette.neutral[900], // Pure black cards for AMOLED
    surfaceVariant: '#0A0A0A', // Slightly lighter than pure black
    border: '#2A2A2A', // Subtle but visible borders
    text: {
      primary: '#ffffff',
      secondary: colorPalette.neutral[300],
      muted: colorPalette.neutral[400],
      inverse: colorPalette.neutral[900],
    },
    error: colorPalette.error[400],
    errorForeground: '#ffffff',
    success: colorPalette.success[500], // #00ff00 - Neon green with dark text
    successForeground: colorPalette.neutral[900], // Dark text for better contrast
    warning: colorPalette.warning[400],
    warningForeground: colorPalette.neutral[900],
    
    // Additional color properties
    primaryContainer: colorPalette.primary[800],
    secondaryContainer: colorPalette.secondary[800],
    errorContainer: colorPalette.error[800],
    successContainer: colorPalette.success[800],
    warningContainer: colorPalette.warning[800],
    textMuted: colorPalette.neutral[400],
    textSecondary: colorPalette.neutral[400],
    
    // Additional colors used in components
    card: colorPalette.neutral[900],
    purple: colorPalette.primary[400],
    onErrorContainer: '#ffffff',
    destructive: colorPalette.error[500],
    outline: '#333333', // Subtle outline
    onPrimary: '#ffffff',
    info: colorPalette.primary[400],
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.5,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.7,
      shadowRadius: 16,
      elevation: 5,
    },
  },
};