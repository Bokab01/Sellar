import { useEffect, useState, useRef } from 'react';
import {
  Keyboard,
  KeyboardEvent,
  Platform,
  Dimensions,
  EmitterSubscription,
} from 'react-native';

export interface KeyboardInfo {
  isVisible: boolean;
  height: number;
  duration: number;
  easing: string;
  endCoordinates: {
    height: number;
    screenX: number;
    screenY: number;
    width: number;
  };
}

/**
 * Hook to track keyboard state and metrics
 */
export function useKeyboard() {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
    duration: 0,
    easing: '',
    endCoordinates: {
      height: 0,
      screenX: 0,
      screenY: 0,
      width: 0,
    },
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setKeyboardInfo({
        isVisible: true,
        height: event.endCoordinates.height,
        duration: event.duration || 250,
        easing: event.easing || 'keyboard',
        endCoordinates: event.endCoordinates,
      });
    });

    const hideListener = Keyboard.addListener(hideEvent, (event: KeyboardEvent) => {
      setKeyboardInfo({
        isVisible: false,
        height: 0,
        duration: event?.duration || 250,
        easing: event?.easing || 'keyboard',
        endCoordinates: {
          height: 0,
          screenX: 0,
          screenY: 0,
          width: 0,
        },
      });
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return keyboardInfo;
}

/**
 * Hook to get available screen height (screen height minus keyboard height)
 */
export function useAvailableScreenHeight() {
  const { height: keyboardHeight, isVisible } = useKeyboard();
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });

    return () => subscription?.remove();
  }, []);

  const availableHeight = isVisible ? screenHeight - keyboardHeight : screenHeight;

  return {
    availableHeight,
    screenHeight,
    keyboardHeight,
    isKeyboardVisible: isVisible,
  };
}

/**
 * Hook to dismiss keyboard programmatically
 */
export function useKeyboardDismiss() {
  const dismiss = () => {
    Keyboard.dismiss();
  };

  return { dismiss };
}

/**
 * Hook to track keyboard events with callbacks
 */
export function useKeyboardEvents(
  onShow?: (event: KeyboardEvent) => void,
  onHide?: (event: KeyboardEvent) => void
) {
  const onShowRef = useRef(onShow);
  const onHideRef = useRef(onHide);

  // Update refs when callbacks change
  useEffect(() => {
    onShowRef.current = onShow;
  }, [onShow]);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      onShowRef.current?.(event);
    });

    const hideListener = Keyboard.addListener(hideEvent, (event: KeyboardEvent) => {
      onHideRef.current?.(event);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);
}

/**
 * Hook to get keyboard animation values for custom animations
 */
export function useKeyboardAnimation() {
  const keyboardInfo = useKeyboard();
  
  return {
    ...keyboardInfo,
    // Helper values for animations
    animationConfig: {
      duration: keyboardInfo.duration,
      easing: keyboardInfo.easing,
    },
    // Common animation values
    translateY: keyboardInfo.isVisible ? -keyboardInfo.height : 0,
    paddingBottom: keyboardInfo.isVisible ? keyboardInfo.height : 0,
    marginBottom: keyboardInfo.isVisible ? keyboardInfo.height : 0,
  };
}

/**
 * Hook to detect if device has software keyboard (useful for tablets)
 */
export function useHasSoftwareKeyboard() {
  const [hasSoftwareKeyboard, setHasSoftwareKeyboard] = useState(true);

  useEffect(() => {
    // On tablets, sometimes there's no software keyboard
    // This is a simple heuristic - you might want to enhance this
    const { width, height } = Dimensions.get('window');
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    
    // Tablets typically have aspect ratios closer to 4:3 or 16:10
    // Phones are more like 16:9 or taller
    if (aspectRatio < 1.6) {
      setHasSoftwareKeyboard(false);
    }
  }, []);

  return hasSoftwareKeyboard;
}

/**
 * Hook for keyboard-aware padding/margins
 */
export function useKeyboardSpacing(
  baseSpacing: number = 0,
  keyboardSpacing: number = 20
) {
  const { isVisible, height } = useKeyboard();
  
  const spacing = isVisible ? height + keyboardSpacing : baseSpacing;
  
  return {
    spacing,
    paddingBottom: spacing,
    marginBottom: spacing,
    isKeyboardVisible: isVisible,
    keyboardHeight: height,
  };
}
