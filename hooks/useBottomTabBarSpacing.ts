import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom hook to calculate proper bottom spacing for content
 * that needs to account for the bottom tab bar
 */
export function useBottomTabBarSpacing() {
  const insets = useSafeAreaInsets();

  const spacing = useMemo(() => {
    // Base height of the tab bar content (without safe area)
    const baseTabBarHeight = 60;
    
    // Base padding for tab content
    const basePadding = 8;
    
    // Calculate total bottom padding needed
    const bottomPadding = Math.max(basePadding + insets.bottom, 8);
    
    // Total tab bar height including safe area
    const totalTabBarHeight = baseTabBarHeight + bottomPadding;
    
    // Platform-specific adjustments
    const platformAdjustment = Platform.select({
      ios: {
        // iOS handles safe area automatically, but we need to account for home indicator
        additionalPadding: insets.bottom > 0 ? 0 : 8,
      },
      android: {
        // Android may need additional padding for gesture navigation
        additionalPadding: insets.bottom > 0 ? 0 : 8,
      },
      web: {
        // Web doesn't need safe area padding
        additionalPadding: 8,
      },
      default: {
        additionalPadding: 8,
      },
    });

    return {
      // Total height of the tab bar (for positioning content above it)
      tabBarHeight: totalTabBarHeight,
      
      // Bottom padding for content that should be above the tab bar
      contentBottomPadding: totalTabBarHeight + platformAdjustment.additionalPadding,
      
      // Safe area bottom inset
      safeAreaBottom: insets.bottom,
      
      // Base tab bar height without safe area
      baseTabBarHeight,
      
      // Bottom padding for the tab bar itself
      tabBarBottomPadding: bottomPadding,
    };
  }, [insets]);

  return spacing;
}
