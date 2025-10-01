import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  withDecay,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 0.5,
};
const TIMING_CONFIG = { duration: 300 };

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  onShare?: (imageUrl: string, index: number) => Promise<void>;
  onDownload?: (imageUrl: string, index: number) => Promise<void>;
  showControls?: boolean;
  backgroundColor?: string;
}

interface ZoomableImageProps {
  imageUrl: string;
  isActive: boolean;
  onSingleTap: () => void;
}

/**
 * Individual zoomable image component with its own gesture handling
 * This prevents gesture conflicts when swiping between images
 */
function ZoomableImage({ imageUrl, isActive, onSingleTap }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Reset zoom when image becomes inactive
  useEffect(() => {
    if (!isActive && scale.value !== 1) {
      scale.value = withTiming(1, TIMING_CONFIG);
      savedScale.value = 1;
      translateX.value = withTiming(0, TIMING_CONFIG);
      translateY.value = withTiming(0, TIMING_CONFIG);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [isActive]);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(savedScale.value * event.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture for zoomed image
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        // Only allow panning when zoomed in
        const maxTranslateX = (screenWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (screenHeight * (scale.value - 1)) / 2;

        translateX.value = Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, savedTranslateX.value + event.translationX)
        );
        translateY.value = Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, savedTranslateY.value + event.translationY)
        );
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .enabled(scale.value > 1);

  // Double tap to zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > 1) {
        // Zoom out
        scale.value = withSpring(1, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to tap location
        const newScale = 2.5;
        const tapX = event.x - screenWidth / 2;
        const tapY = event.y - screenHeight / 2;

        scale.value = withSpring(newScale, SPRING_CONFIG);
        translateX.value = withSpring(-tapX * (newScale - 1) / newScale, SPRING_CONFIG);
        translateY.value = withSpring(-tapY * (newScale - 1) / newScale, SPRING_CONFIG);

        savedScale.value = newScale;
        savedTranslateX.value = -tapX * (newScale - 1) / newScale;
        savedTranslateY.value = -tapY * (newScale - 1) / newScale;
      }
    });

  // Single tap to toggle controls
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(onSingleTap)();
    });

  // Combine gestures properly
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <View style={styles.imageWrapper}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageWrapper, animatedStyle]}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function ImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
  onShare,
  onDownload,
  showControls = true,
  backgroundColor = 'rgba(0, 0, 0, 0.9)',
}: ImageViewerProps) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);

  const translateX = useSharedValue(-initialIndex * screenWidth);
  const savedTranslateX = useSharedValue(-initialIndex * screenWidth);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      translateX.value = -initialIndex * screenWidth;
      savedTranslateX.value = -initialIndex * screenWidth;
      setControlsVisible(true);
    }
  }, [visible, initialIndex]);

  const changeImage = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
      translateX.value = withTiming(-newIndex * screenWidth, TIMING_CONFIG);
      savedTranslateX.value = -newIndex * screenWidth;
    }
  }, [images.length]);

  // Pan gesture for swiping between images
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
    })
    .onEnd((event) => {
      const threshold = screenWidth * 0.25;
      const velocity = event.velocityX;
      const offset = event.translationX;

      // Determine if we should change image
      if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
        if (offset > 0 && currentIndex > 0) {
          // Swipe right - previous image
          runOnJS(changeImage)(currentIndex - 1);
        } else if (offset < 0 && currentIndex < images.length - 1) {
          // Swipe left - next image
          runOnJS(changeImage)(currentIndex + 1);
        } else {
          // Bounce back
          translateX.value = withSpring(savedTranslateX.value, SPRING_CONFIG);
        }
      } else {
        // Snap back to current position
        translateX.value = withSpring(savedTranslateX.value, SPRING_CONFIG);
      }
    })
    .activeOffsetX([-10, 10]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const controlsOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(controlsVisible ? 1 : 0, { duration: 200 }),
  }));

  const handleClose = () => {
    onClose();
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      changeImage(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      changeImage(currentIndex + 1);
    }
  };

  const toggleControls = useCallback(() => {
    setControlsVisible((prev) => !prev);
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor }]}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.imageContainer, containerStyle]}>
              {images.map((imageUrl, index) => (
                <ZoomableImage
                  key={index}
                  imageUrl={imageUrl}
                  isActive={index === currentIndex}
                  onSingleTap={toggleControls}
                />
              ))}
            </Animated.View>
          </GestureDetector>

          {showControls && (
            <Animated.View style={[styles.controls, controlsOpacity]} pointerEvents="box-none">
              {/* Header */}
              <SafeAreaView style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerSpacer} />

                <View style={styles.headerRight}>
                  <Text style={styles.imageCounter}>
                    {currentIndex + 1} of {images.length}
                  </Text>
                </View>
              </SafeAreaView>

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  {currentIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.navButton, styles.navButtonLeft]}
                      onPress={handlePrevious}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}

                  {currentIndex < images.length - 1 && (
                    <TouchableOpacity
                      style={[styles.navButton, styles.navButtonRight]}
                      onPress={handleNext}
                      activeOpacity={0.7}
                    >
                      <ChevronRight size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Page indicators */}
              {images.length > 1 && (
                <View style={styles.indicators}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        index === currentIndex && styles.indicatorActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flexDirection: 'row',
    height: screenHeight,
  },
  imageWrapper: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth,
    height: screenHeight,
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerSpacer: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  indicators: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
  },
});
