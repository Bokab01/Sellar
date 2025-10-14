import { useEffect, useState } from 'react';
import { useAppSettings } from './useAppSettings';
import { Theme } from '@/theme/types';
import { useTheme } from '@/theme/ThemeProvider';

interface DynamicThemeColors {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
}

/**
 * Hook to apply dynamic theme colors from database settings
 * This allows admin to customize brand colors without app updates
 */
export function useDynamicTheme() {
  const { theme, toggleTheme, themeMode } = useTheme();
  const { settings, loading, getSetting } = useAppSettings('theme');
  const [dynamicColors, setDynamicColors] = useState<DynamicThemeColors | null>(null);

  useEffect(() => {
    if (!loading && settings) {
      applyDynamicColors();
    }
  }, [settings, loading]);

  const applyDynamicColors = () => {
    try {
      const primaryColor = getSetting<string>('primary_color', theme.colors.primary);
      const secondaryColor = getSetting<string>('secondary_color', theme.colors.secondary);
      const successColor = getSetting<string>('success_color', theme.colors.success);
      const errorColor = getSetting<string>('error_color', theme.colors.error);
      const warningColor = getSetting<string>('warning_color', theme.colors.warning);

      // Only apply if colors are valid hex codes
      const hexRegex = /^#[0-9A-F]{6}$/i;
      const colors: DynamicThemeColors = {
        primary: hexRegex.test(primaryColor) ? primaryColor : theme.colors.primary,
        secondary: hexRegex.test(secondaryColor) ? secondaryColor : theme.colors.secondary,
        success: hexRegex.test(successColor) ? successColor : theme.colors.success,
        error: hexRegex.test(errorColor) ? errorColor : theme.colors.error,
        warning: hexRegex.test(warningColor) ? warningColor : theme.colors.warning,
      };

      setDynamicColors(colors);
    } catch (error) {
      console.error('Error applying dynamic theme:', error);
    }
  };

  /**
   * Get theme with dynamic colors applied
   * Use this when you need the theme object with custom colors
   */
  const getDynamicTheme = (): Theme => {
    if (!dynamicColors) return theme;

    return {
      ...theme,
      colors: {
        ...theme.colors,
        primary: dynamicColors.primary,
        secondary: dynamicColors.secondary,
        success: dynamicColors.success,
        error: dynamicColors.error,
        warning: dynamicColors.warning,
      },
    };
  };

  /**
   * Check if dark mode is enabled in settings
   */
  const isDarkModeEnabled = getSetting<boolean>('dark_mode_enabled', true);

  /**
   * Get default theme from settings
   */
  const defaultTheme = getSetting<string>('default_theme', 'system');

  /**
   * Check if custom font is enabled
   */
  const isCustomFontEnabled = getSetting<boolean>('custom_font_enabled', false);

  /**
   * Get custom font family
   */
  const fontFamily = getSetting<string>('font_family', 'System');

  return {
    theme: getDynamicTheme(),
    dynamicColors,
    loading,
    isDarkModeEnabled,
    defaultTheme,
    isCustomFontEnabled,
    fontFamily,
    toggleTheme,
    themeMode,
  };
}

/**
 * Hook to get specific dynamic color
 * Useful when you only need one color
 */
export function useDynamicColor(colorKey: keyof DynamicThemeColors): string {
  const { theme } = useTheme();
  const { getSetting, loading } = useAppSettings('theme');

  // Map of color keys to theme colors
  const colorMap: Record<keyof DynamicThemeColors, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    success: theme.colors.success,
    error: theme.colors.error,
    warning: theme.colors.warning,
  };

  if (loading) return colorMap[colorKey];

  const settingKey = `${colorKey}_color`;
  const customColor = getSetting<string>(settingKey, '');
  const hexRegex = /^#[0-9A-F]{6}$/i;

  return hexRegex.test(customColor) ? customColor : colorMap[colorKey];
}

