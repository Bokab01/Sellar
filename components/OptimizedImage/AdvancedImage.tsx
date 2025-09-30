import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Image, View, ActivityIndicator, ImageSourcePropType, Dimensions } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

interface AdvancedImageProps {
  source: ImageSourcePropType | string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholder?: React.ReactNode;
  showLoader?: boolean;
  enableBlur?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'original';
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const AdvancedImage = React.memo(function AdvancedImage({
  source,
  style,
  resizeMode = 'cover',
  placeholder,
  showLoader = true,
  enableBlur = true,
  quality = 'medium',
  onLoad,
  onError,
  lazy = true,
  priority = 'normal',
}: AdvancedImageProps) {
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(!lazy);
  
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const blurRadius = useSharedValue(enableBlur ? 10 : 0);

  // Optimize image source based on quality
  const optimizedSource = useMemo(() => {
    if (typeof source === 'string') {
      // Add quality parameters for web images
      const qualityMap = {
        low: '?q=20&w=300',
        medium: '?q=60&w=600',
        high: '?q=80&w=1200',
        original: ''
      };
      
      return { 
        uri: source + qualityMap[quality],
        priority: priority === 'high' ? 'high' : 'normal'
      };
    }
    return source;
  }, [source, quality, priority]);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (lazy && !inView) {
      // Simple viewport detection - in a real app, you'd use IntersectionObserver
      const timer = setTimeout(() => setInView(true), 100);
      return () => clearTimeout(timer);
    }
  }, [lazy, inView]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    blurRadius.value = withTiming(0, { duration: 300 });
    onLoad?.();
  }, [onLoad, opacity, scale, blurRadius]);

  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const blurStyle = useAnimatedStyle(() => ({
    // Note: blurRadius is not supported in React Native Animated
    // This is a placeholder for future implementation
  }));

  if (error) {
    return (
      <View style={[style, { 
        backgroundColor: theme.colors.border, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }]}>
        {placeholder || (
          <View style={{
            width: 40,
            height: 40,
            backgroundColor: theme.colors.border,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <ActivityIndicator size="small" color={theme.colors.text.muted} />
          </View>
        )}
      </View>
    );
  }

  if (!inView) {
    return (
      <View style={[style, { backgroundColor: theme.colors.surface }]}>
        {placeholder}
      </View>
    );
  }

  return (
    <View style={style}>
      <Animated.Image
        source={optimizedSource}
        style={[style, animatedStyle]}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode={resizeMode}
        // Performance optimizations
        fadeDuration={0}
      />
      
      {enableBlur && !loaded && (
        <Animated.Image
          source={optimizedSource}
          style={[style, { position: 'absolute' }, blurStyle]}
          resizeMode={resizeMode}
          blurRadius={10}
        />
      )}
      
      {!loaded && showLoader && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
        }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
});
