/**
 * Style Utilities
 * Helper functions for React Native Web compatibility
 */

import { ViewStyle } from 'react-native';

/**
 * Creates a flex container with proper spacing between children
 * Replaces the gap property which is not well supported in React Native Web
 */
export function createFlexContainer(
  direction: 'row' | 'column' = 'column',
  spacing: number = 8,
  alignment?: {
    alignItems?: ViewStyle['alignItems'];
    justifyContent?: ViewStyle['justifyContent'];
  }
): ViewStyle {
  return {
    flexDirection: direction,
    alignItems: alignment?.alignItems,
    justifyContent: alignment?.justifyContent,
    // Note: Children should have margin applied individually
  };
}

/**
 * Creates spacing for child elements in a flex container
 * Use this on child elements instead of gap property
 */
export function createChildSpacing(
  direction: 'row' | 'column' = 'column',
  spacing: number = 8,
  isLast: boolean = false
): ViewStyle {
  if (isLast) return {};
  
  return direction === 'row' 
    ? { marginRight: spacing }
    : { marginBottom: spacing };
}

/**
 * Creates a spaced container with children
 * Alternative to gap property
 */
export function createSpacedContainer(
  direction: 'row' | 'column' = 'column',
  spacing: number = 8,
  alignment?: {
    alignItems?: ViewStyle['alignItems'];
    justifyContent?: ViewStyle['justifyContent'];
  }
): {
  container: ViewStyle;
  childSpacing: (isLast?: boolean) => ViewStyle;
} {
  return {
    container: createFlexContainer(direction, spacing, alignment),
    childSpacing: (isLast = false) => createChildSpacing(direction, spacing, isLast),
  };
}

/**
 * Removes gap property from style object and provides alternative
 */
export function removeGapProperty(style: any): ViewStyle {
  if (!style) return {};
  
  const { gap, ...restStyle } = style;
  
  if (gap) {
    console.warn('Gap property detected and removed. Use createSpacedContainer utility instead.');
  }
  
  return restStyle;
}

/**
 * Safe style merger that removes problematic properties
 */
export function safeStyleMerge(...styles: any[]): ViewStyle {
  const mergedStyle = Object.assign({}, ...styles);
  return removeGapProperty(mergedStyle);
}
