export interface ColorPalette {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  error: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  success: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  warning: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  error: string;
  errorForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  
  // Container colors
  primaryContainer: string;
  secondaryContainer: string;
  errorContainer: string;
  successContainer: string;
  warningContainer: string;
  
  // Additional text colors
  textMuted: string;
}

export interface Typography {
  h1: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    letterSpacing: number;
  };
  h2: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    letterSpacing: number;
  };
  h3: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    letterSpacing: number;
  };
  h4: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    letterSpacing: number;
  };
  body: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    letterSpacing: number;
  };
  bodySmall: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    letterSpacing: number;
  };
  caption: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    letterSpacing: number;
  };
  button: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    letterSpacing: number;
  };
}

export interface Spacing {
  xs: number; // 4
  sm: number; // 8
  md: number; // 12
  lg: number; // 16
  xl: number; // 24
  '2xl': number; // 32
  '3xl': number; // 48
  '4xl': number; // 64
}

export interface BorderRadius {
  xs: number; // 2
  sm: number; // 4
  md: number; // 8
  lg: number; // 12
  xl: number; // 16
  '2xl': number; // 24
  full: number; // 9999
}

export interface Theme {
  colors: ThemeColors;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}