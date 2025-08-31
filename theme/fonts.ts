import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

// Font family definitions - change these to switch fonts globally
export const FONT_FAMILIES = {
  // Primary font family for headings
  heading: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semiBold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
  },
  // Secondary font family for body text
  body: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  // Monospace font for code (using system fonts)
  mono: {
    regular: 'Courier New',
    medium: 'Courier New',
    semiBold: 'Courier New',
    bold: 'Courier New',
  },
} as const;

// Font loading configuration
export const FONT_CONFIG = {
  'Inter-Regular': Inter_400Regular,
  'Inter-Medium': Inter_500Medium,
  'Inter-SemiBold': Inter_600SemiBold,
  'Inter-Bold': Inter_700Bold,
  'Poppins-Regular': Poppins_400Regular,
  'Poppins-Medium': Poppins_500Medium,
  'Poppins-SemiBold': Poppins_600SemiBold,
  'Poppins-Bold': Poppins_700Bold,
};

// Custom hook for loading fonts
export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts(FONT_CONFIG);
  
  return {
    fontsLoaded,
    fontError,
  };
}

// Helper function to get font family based on usage
export function getFontFamily(
  usage: 'heading' | 'body' | 'mono' = 'body',
  weight: 'regular' | 'medium' | 'semiBold' | 'bold' = 'regular'
): string {
  return FONT_FAMILIES[usage][weight];
}