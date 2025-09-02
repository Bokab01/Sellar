import React, { useEffect, useRef, useState, ReactNode } from 'react';
import {
  View,
  Animated,
  Keyboard,
  Platform,
  Dimensions,
  KeyboardEvent,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface KeyboardAvoidingViewProps {
  children: ReactNode;
  style?: ViewStyle;
  behavior?: 'padding' | 'height' | 'position';
  keyboardVerticalOffset?: number;
  enabled?: boolean;
  extraScrollHeight?: number;
  resetScrollToCoords?: { x: number; y: number };
  contentContainerStyle?: ViewStyle;
  onKeyboardShow?: (keyboardHeight: number) => void;
  onKeyboardHide?: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

export function CustomKeyboardAvoidingView({
  children,
  style,
  behavior = 'padding',
  keyboardVerticalOffset = 0,
  enabled = true,
  extraScrollHeight = 75,
  resetScrollToCoords = { x: 0, y: 0 },
  contentContainerStyle,
  onKeyboardShow,
  onKeyboardHide,
}: KeyboardAvoidingViewProps) {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [enabled]);

  const handleKeyboardShow = (event: KeyboardEvent) => {
    const { height: kbHeight, duration = 250 } = event.endCoordinates;
    const adjustedHeight = kbHeight - keyboardVerticalOffset;

    setKeyboardHeight(adjustedHeight);
    setIsKeyboardVisible(true);
    onKeyboardShow?.(adjustedHeight);

    if (behavior === 'height') {
      Animated.timing(animatedValue, {
        toValue: -adjustedHeight,
        duration: Platform.OS === 'ios' ? duration : 150,
        useNativeDriver: false,
      }).start();
    } else if (behavior === 'padding') {
      Animated.timing(animatedValue, {
        toValue: adjustedHeight,
        duration: Platform.OS === 'ios' ? duration : 150,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleKeyboardHide = (event?: KeyboardEvent) => {
    const duration = event?.duration || 250;

    setKeyboardHeight(0);
    setIsKeyboardVisible(false);
    onKeyboardHide?.();

    Animated.timing(animatedValue, {
      toValue: 0,
      duration: Platform.OS === 'ios' ? duration : 150,
      useNativeDriver: false,
    }).start();
  };

  const getAnimatedStyle = (): ViewStyle => {
    switch (behavior) {
      case 'height':
        return {
          height: screenData.height + animatedValue._value,
        };
      case 'position':
        return {
          bottom: animatedValue,
        };
      case 'padding':
      default:
        return {
          paddingBottom: animatedValue,
        };
    }
  };

  const containerStyle: ViewStyle = {
    flex: 1,
    ...style,
  };

  return (
    <Animated.View style={[containerStyle, getAnimatedStyle()]}>
      <View style={[{ flex: 1 }, contentContainerStyle]}>
        {children}
      </View>
    </Animated.View>
  );
}

// Export keyboard state hook for external use
export function useKeyboardState() {
  const [isVisible, setIsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setIsVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return { isVisible, keyboardHeight };
}
