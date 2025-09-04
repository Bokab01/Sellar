import React, { useEffect } from 'react';
import { View, Image, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
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

  useEffect(() => {
    if (isAppReady) {
      // Start the exit animation
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
  }, [isAppReady, fadeAnim, scaleAnim, logoOpacity, onAnimationComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  // Safety check for theme
  if (!theme) {
    return null;
  }

  // Choose the appropriate splash screen image based on theme
  const splashImage = isDarkMode 
    ? require('../../assets/splashscreen/splashscreen-dark.png')
    : require('../../assets/splashscreen/splashscreen-light.png');

  const backgroundColor = isDarkMode ? '#000000' : '#ffffff';

  // Early return for app not ready
  if (!isAppReady) {
    return null; // Let the native splash screen handle the initial display
  }

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
        
        {/* Optional loading indicator */}
        <View
          style={{
            marginTop: 40,
            alignItems: 'center',
          }}
        >
          <Text
            variant="bodySmall"
            style={{
              color: isDarkMode ? '#ffffff' : '#000000',
              opacity: 0.7,
              fontWeight: '500',
            }}
          >
            Loading your marketplace...
          </Text>
        </View>
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
