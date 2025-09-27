import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import {
  PanGestureHandler,
  PinchGestureHandler,
  TapGestureHandler,
  GestureHandlerRootView,
  State,
  PanGestureHandlerGestureEvent,
  PinchGestureHandlerGestureEvent,
  TapGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
// Using regular Image component for better reliability
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const imageTranslateX = useSharedValue(-initialIndex * screenWidth);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (visible) {
      console.log('ImageViewer: Modal opened with initialIndex', initialIndex);
      setCurrentIndex(initialIndex);
      imageTranslateX.value = -initialIndex * screenWidth;
      lastImageTranslateX.value = -initialIndex * screenWidth;
      // Reset zoom and position
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      lastScale.value = 1;
      lastTranslateX.value = 0;
      lastTranslateY.value = 0;
    }
  }, [visible, initialIndex]);

  // Refs for gesture handlers
  const panRef = useRef<any>(null);
  const pinchRef = useRef<any>(null);
  const tapRef = useRef<any>(null);
  const doubleTapRef = useRef<any>(null);

  // Track gesture state
  const lastScale = useSharedValue(1);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  const lastImageTranslateX = useSharedValue(-initialIndex * screenWidth);

  const resetImagePosition = useCallback(() => {
    'worklet';
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    lastScale.value = 1;
    lastTranslateX.value = 0;
    lastTranslateY.value = 0;
  }, []);

  const changeImage = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
      imageTranslateX.value = withTiming(-newIndex * screenWidth, { duration: 300 });
      lastImageTranslateX.value = -newIndex * screenWidth;
      runOnJS(resetImagePosition)();
    }
  }, [images.length, resetImagePosition]);

  // Pinch gesture handler
  const pinchHandler = {
    onStart: () => {
      lastScale.value = scale.value;
    },
    onActive: (event: any) => {
      scale.value = Math.max(0.5, Math.min(lastScale.value * event.scale, 5));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        lastTranslateX.value = 0;
        lastTranslateY.value = 0;
      }
      lastScale.value = scale.value;
    },
  };

  // Pan gesture handler
  const panHandler = {
    onStart: () => {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
      lastImageTranslateX.value = imageTranslateX.value;
    },
    onActive: (event: any) => {
      if (scale.value > 1) {
        // Pan when zoomed in
        const maxTranslateX = (screenWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (screenHeight * (scale.value - 1)) / 2;
        
        translateX.value = Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, lastTranslateX.value + event.translationX)
        );
        translateY.value = Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, lastTranslateY.value + event.translationY)
        );
      } else {
        // Swipe between images when not zoomed
        imageTranslateX.value = lastImageTranslateX.value + event.translationX;
      }
    },
    onEnd: (event: any) => {
      if (scale.value <= 1) {
        // Handle image swiping
        const threshold = screenWidth * 0.3;
        const velocity = Math.abs(event.velocityX) > 500;
        
        if (event.translationX > threshold || (velocity && event.velocityX > 0)) {
          // Swipe right - previous image
          if (currentIndex > 0) {
            runOnJS(changeImage)(currentIndex - 1);
          } else {
            imageTranslateX.value = withTiming(lastImageTranslateX.value, { duration: 200 });
          }
        } else if (event.translationX < -threshold || (velocity && event.velocityX < 0)) {
          // Swipe left - next image
          if (currentIndex < images.length - 1) {
            runOnJS(changeImage)(currentIndex + 1);
          } else {
            imageTranslateX.value = withTiming(lastImageTranslateX.value, { duration: 200 });
          }
        } else {
          // Snap back
          imageTranslateX.value = withTiming(lastImageTranslateX.value, { duration: 200 });
        }
      }
    },
  };

  // Single tap handler
  const tapHandler = {
    onEnd: () => {
      runOnJS(setControlsVisible)(!controlsVisible);
    },
  };

  // Double tap handler
  const doubleTapHandler = {
    onEnd: (event: any) => {
      if (scale.value > 1) {
        // Zoom out
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        lastScale.value = 1;
        lastTranslateX.value = 0;
        lastTranslateY.value = 0;
      } else {
        // Zoom in to tap location
        const newScale = 2.5;
        scale.value = withSpring(newScale);
        
        // Calculate translate to center on tap
        const tapX = event.x - screenWidth / 2;
        const tapY = event.y - screenHeight / 2;
        
        translateX.value = withSpring(-tapX * (newScale - 1) / newScale);
        translateY.value = withSpring(-tapY * (newScale - 1) / newScale);
        
        lastScale.value = newScale;
        lastTranslateX.value = translateX.value;
        lastTranslateY.value = translateY.value;
      }
    },
  };

  // Animated styles
  const imageContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: imageTranslateX.value },
      ],
    };
  });

  const imageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const controlsOpacity = useAnimatedStyle(() => {
    return {
      opacity: withTiming(controlsVisible ? 1 : 0, { duration: 200 }),
    };
  });

  const handleClose = () => {
    resetImagePosition();
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
        <PanGestureHandler
          ref={panRef}
          onGestureEvent={(event) => {
            if (event.nativeEvent.state === State.BEGAN) {
              panHandler.onStart();
            } else if (event.nativeEvent.state === State.ACTIVE) {
              panHandler.onActive(event.nativeEvent);
            } else if (event.nativeEvent.state === State.END) {
              panHandler.onEnd(event.nativeEvent);
            }
          }}
          simultaneousHandlers={[pinchRef]}
          minPointers={1}
          maxPointers={1}
        >
          <Animated.View style={styles.gestureContainer}>
            <PinchGestureHandler
              ref={pinchRef}
              onGestureEvent={(event) => {
                if (event.nativeEvent.state === State.BEGAN) {
                  pinchHandler.onStart();
                } else if (event.nativeEvent.state === State.ACTIVE) {
                  pinchHandler.onActive(event.nativeEvent);
                } else if (event.nativeEvent.state === State.END) {
                  pinchHandler.onEnd();
                }
              }}
              simultaneousHandlers={[panRef]}
            >
              <Animated.View style={styles.gestureContainer}>
                <TapGestureHandler
                  ref={tapRef}
                  onGestureEvent={(event) => {
                    if (event.nativeEvent.state === State.END) {
                      tapHandler.onEnd();
                    }
                  }}
                  waitFor={doubleTapRef}
                  numberOfTaps={1}
                >
                  <Animated.View style={styles.gestureContainer}>
                    <TapGestureHandler
                      ref={doubleTapRef}
                      onGestureEvent={(event) => {
                        if (event.nativeEvent.state === State.END) {
                          doubleTapHandler.onEnd(event.nativeEvent);
                        }
                      }}
                      numberOfTaps={2}
                    >
                      <Animated.View style={styles.gestureContainer}>
                        <Animated.View style={[styles.imageContainer, imageContainerStyle]}>
                          {images.map((imageUrl, index) => (
                            <Animated.View
                              key={index}
                              style={[
                                styles.imageWrapper,
                                index === currentIndex && imageStyle,
                              ]}
                            >
                              <Image
                                source={{ uri: imageUrl }}
                                style={styles.image}
                                resizeMode="contain"
                              />
                            </Animated.View>
                          ))}
                        </Animated.View>
                      </Animated.View>
                    </TapGestureHandler>
                  </Animated.View>
                </TapGestureHandler>
              </Animated.View>
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>

        {showControls && (
          <Animated.View style={[styles.controls, controlsOpacity]}>
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
  gestureContainer: {
    flex: 1,
  },
  imageContainer: {
    flexDirection: 'row',
    width: screenWidth * 10, // Accommodate multiple images
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
    marginTop: -24,
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
