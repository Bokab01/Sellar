import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ViewStyle,
  ScrollViewProps,
} from 'react-native';
import { useKeyboard } from '@/hooks/useKeyboard';

interface HybridKeyboardAvoidingViewProps extends Omit<ScrollViewProps, 'children'> {
  children: ReactNode;
  behavior?: 'height' | 'position' | 'padding';
  keyboardVerticalOffset?: number;
  extraScrollHeight?: number;
  style?: ViewStyle;
}

/**
 * A hybrid approach that combines React Native's KeyboardAvoidingView
 * with ScrollView for more reliable keyboard handling
 */
export function HybridKeyboardAvoidingView({
  children,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  keyboardVerticalOffset = 0,
  extraScrollHeight = 100,
  style,
  contentContainerStyle,
  ...scrollViewProps
}: HybridKeyboardAvoidingViewProps) {
  const { isVisible, height } = useKeyboard();

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={behavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
      enabled={true}
    >
      <ScrollView
        contentContainerStyle={[
          {
            flexGrow: 1,
            paddingBottom: isVisible ? extraScrollHeight : 0,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


