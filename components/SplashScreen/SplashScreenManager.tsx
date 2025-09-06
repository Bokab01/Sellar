import React, { useEffect } from 'react';
import { View, Image, Dimensions, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
} from 'react-native-reanimated';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

interface SplashScreenManagerProps {
  isAppReady: boolean;
  onAnimationComplete?: () => void;
}

const { width, height } = Dimensions.get('window');

export function SplashScreenManager({ isAppReady, onAnimationComplete }: SplashScreenManagerProps) {
  const { theme, isDarkMode } = useTheme();
  const fadeAnim = useSharedValue(1);
  const scaleAnim = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const loadingOpacity = useSharedValue(1);

  useEffect(() => {
    // Start loading animation immediately
    loadingOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1, // Infinite repeat
      false
    );

    if (isAppReady) {
      // Stop loading animation and start exit animation
      loadingOpacity.value = withTiming(0, { duration: 300 });
      
      fadeAnim.value = withSequence(
        withTiming(1, { duration: 500 }),
        withDelay(300, withTiming(0, { duration: 800 }))
      );
      
      scaleAnim.value = withSequence(
        withTiming(1.05, { duration: 500 }),
        withTiming(1, { duration: 300 }),
        withDelay(300, withTiming(0.95, { duration: 800 }))
      );

      logoOpacity.value = withSequence(
        withTiming(1, { duration: 500 }),
        withDelay(600, withTiming(0, { duration: 400 }))
      );

      // Hide the native splash screen and complete animation
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
        onAnimationComplete?.();
      }, 1600);

      return () => clearTimeout(timer);
    }
  }, [isAppReady, fadeAnim, scaleAnim, logoOpacity, loadingOpacity, onAnimationComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  // Safety check for theme - provide fallback colors
  const safeTheme = theme || {
    colors: {
      background: isDarkMode ? '#000000' : '#ffffff',
      text: { primary: isDarkMode ? '#ffffff' : '#000000' }
    }
  };

  // Choose the appropriate splash screen image based on theme
  const splashImage = isDarkMode 
    ? require('../../assets/splashscreen/splashscreen-dark.png')
    : require('../../assets/splashscreen/splashscreen-light.png');

  const backgroundColor = safeTheme.colors.background;

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        },
      ]}
    >
      <Animated.View
        style={[
          logoAnimatedStyle,
          {
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Image
          source={splashImage}
          style={{
            width: width * 0.6,
            height: height * 0.3,
            resizeMode: 'contain',
          }}
        />
        
        {/* Loading indicator with animation */}
        <Animated.View
          style={[
            loadingAnimatedStyle,
            {
              marginTop: 40,
              alignItems: 'center',
            }
          ]}
        >
          <ActivityIndicator
            size="large"
            color={isDarkMode ? '#ffffff' : '#000000'}
            style={{ marginBottom: 16 }}
          />
          <Text
            variant="bodySmall"
            style={{
              color: isDarkMode ? '#ffffff' : '#000000',
              opacity: 0.7,
              fontWeight: '500',
            }}
          >
            Getting ready...
          </Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// Hook to manage splash screen state
export function useSplashScreen() {
  const [isAppReady, setIsAppReady] = React.useState(false);
  const [showCustomSplash, setShowCustomSplash] = React.useState(true);

  const handleAppReady = React.useCallback(() => {
    setIsAppReady(true);
  }, []);

  const handleAnimationComplete = React.useCallback(() => {
    setShowCustomSplash(false);
  }, []);

  return {
    isAppReady,
    showCustomSplash,
    handleAppReady,
    handleAnimationComplete,
  };
}
