import React, { useRef, useEffect, useState, ReactNode } from 'react';
import {
  ScrollView,
  View,
  Keyboard,
  Platform,
  Dimensions,
  KeyboardEvent,
  LayoutChangeEvent,
  TextInput,
  ViewStyle,
  ScrollViewProps,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface KeyboardAwareScrollViewProps extends Omit<ScrollViewProps, 'onScroll'> {
  children: ReactNode;
  extraScrollHeight?: number;
  enableAutomaticScroll?: boolean;
  enableResetScrollToCoords?: boolean;
  resetScrollToCoords?: { x: number; y: number };
  keyboardOpeningTime?: number;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  enableOnAndroid?: boolean;
  innerRef?: React.RefObject<ScrollView>;
  onKeyboardShow?: (keyboardHeight: number) => void;
  onKeyboardHide?: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  viewIsInsideTabBar?: boolean;
  extraHeight?: number;
}

const { height: screenHeight } = Dimensions.get('window');

export function KeyboardAwareScrollView({
  children,
  extraScrollHeight = 75,
  enableAutomaticScroll = true,
  enableResetScrollToCoords = true,
  resetScrollToCoords = { x: 0, y: 0 },
  keyboardOpeningTime = 250,
  keyboardShouldPersistTaps = 'handled',
  enableOnAndroid = true,
  innerRef,
  onKeyboardShow,
  onKeyboardHide,
  onScroll,
  viewIsInsideTabBar = false,
  extraHeight = 0,
  contentContainerStyle,
  style,
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [currentlyFocusedInput, setCurrentlyFocusedInput] = useState<TextInput | null>(null);

  // Use provided ref or internal ref
  const scrollRef = innerRef || scrollViewRef;

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'ios' || enableOnAndroid) {
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
    }
  }, []);

  const handleKeyboardShow = (event: KeyboardEvent) => {
    const { height: kbHeight } = event.endCoordinates;
    setKeyboardHeight(kbHeight);
    onKeyboardShow?.(kbHeight);

    if (enableAutomaticScroll && currentlyFocusedInput) {
      setTimeout(() => {
        scrollToFocusedInput();
      }, keyboardOpeningTime);
    }
  };

  const handleKeyboardHide = () => {
    setKeyboardHeight(0);
    onKeyboardHide?.();

    if (enableResetScrollToCoords) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          ...resetScrollToCoords,
          animated: true,
        });
      }, keyboardOpeningTime);
    }
  };

  const scrollToFocusedInput = () => {
    if (!currentlyFocusedInput || !scrollRef.current) return;

    // Add a small delay to ensure the keyboard animation has started
    setTimeout(() => {
      currentlyFocusedInput.measureLayout(
        scrollRef.current as any,
        (x, y, width, height) => {
          const inputBottom = y + height;
          const availableHeight = screenData.height - keyboardHeight - (viewIsInsideTabBar ? 80 : 0);
          
          if (inputBottom > availableHeight - extraScrollHeight) {
            const scrollOffset = inputBottom - availableHeight + extraScrollHeight + extraHeight;
            
            scrollRef.current?.scrollTo({
              x: 0,
              y: Math.max(0, scrollOffset),
              animated: true,
            });
          }
        },
        () => {
          // Fallback to measureInWindow if measureLayout fails
          currentlyFocusedInput.measureInWindow((x, y, width, height) => {
            const inputBottom = y + height;
            const keyboardTop = screenData.height - keyboardHeight;
            const tabBarHeight = viewIsInsideTabBar ? 80 : 0;
            const availableSpace = keyboardTop - tabBarHeight;

            if (inputBottom > availableSpace) {
              const scrollOffset = inputBottom - availableSpace + extraScrollHeight + extraHeight;
              
              scrollRef.current?.scrollTo({
                x: 0,
                y: Math.max(0, scrollOffset),
                animated: true,
              });
            }
          });
        }
      );
    }, 150);
  };

  const handleInputFocus = (input: TextInput) => {
    setCurrentlyFocusedInput(input);
  };

  const handleInputBlur = () => {
    setCurrentlyFocusedInput(null);
  };

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    setContentHeight(contentHeight);
  };

  const handleScrollViewLayout = (event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScroll?.(event);
  };

  // Enhanced content container style
  const enhancedContentContainerStyle: ViewStyle = {
    flexGrow: 1,
    paddingBottom: keyboardHeight > 0 ? extraScrollHeight : 0,
    ...(contentContainerStyle as ViewStyle),
  };

  return (
    <View style={[{ flex: 1 }, style]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={enhancedContentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
        onScroll={handleScroll}
        {...scrollViewProps}
      >
        <InputFocusProvider
          onInputFocus={handleInputFocus}
          onInputBlur={handleInputBlur}
        >
          {children}
        </InputFocusProvider>
      </ScrollView>
    </View>
  );
}

// Context provider to track focused inputs
interface InputFocusContextType {
  onInputFocus: (input: TextInput) => void;
  onInputBlur: () => void;
}

const InputFocusContext = React.createContext<InputFocusContextType | null>(null);

interface InputFocusProviderProps {
  children: ReactNode;
  onInputFocus: (input: TextInput) => void;
  onInputBlur: () => void;
}

function InputFocusProvider({ children, onInputFocus, onInputBlur }: InputFocusProviderProps) {
  const contextValue: InputFocusContextType = {
    onInputFocus,
    onInputBlur,
  };

  return (
    <InputFocusContext.Provider value={contextValue}>
      {children}
    </InputFocusContext.Provider>
  );
}

// Hook to use input focus tracking
export function useInputFocus() {
  const context = React.useContext(InputFocusContext);
  return context;
}

// Enhanced TextInput wrapper that automatically registers with keyboard avoiding
interface KeyboardAwareTextInputProps {
  children: (props: {
    onFocus: () => void;
    onBlur: () => void;
    ref: React.RefObject<TextInput>;
  }) => ReactNode;
}

export function KeyboardAwareTextInput({ children }: KeyboardAwareTextInputProps) {
  const inputRef = useRef<TextInput>(null);
  const focusContext = useInputFocus();

  const handleFocus = () => {
    if (inputRef.current && focusContext) {
      focusContext.onInputFocus(inputRef.current);
    }
  };

  const handleBlur = () => {
    if (focusContext) {
      focusContext.onInputBlur();
    }
  };

  return (
    <>
      {children({
        onFocus: handleFocus,
        onBlur: handleBlur,
        ref: inputRef as React.RefObject<TextInput>,
      })}
    </>
  );
}
