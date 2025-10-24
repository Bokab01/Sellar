import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '@/theme/ThemeProvider';
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 0.5,
};
const TIMING_CONFIG = { duration: 300 };

// Media type detection
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.m4v', '.avi', '.wmv', '.flv', '.webm'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaViewerProps {
  visible: boolean;
  media: string[]; // Array of image/video URLs
  initialIndex?: number;
  onClose: () => void;
  showControls?: boolean;
  backgroundColor?: string;
}

interface ZoomableImageProps {
  imageUrl: string;
  isActive: boolean;
  onSingleTap: () => void;
}

interface VideoPlayerProps {
  videoUrl: string;
  isActive: boolean;
  onSingleTap: () => void;
}

/**
 * Video player component with playback controls
 */
function VideoPlayer({ videoUrl, isActive, onSingleTap }: VideoPlayerProps) {
  const { theme } = useTheme();
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    player.muted = isMuted;
  });

  const [isPlaying, setIsPlaying] = useState(player.playing);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  // Auto-play when active, pause when inactive
  useEffect(() => {
    if (!player) return;
    
    if (isActive) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [isActive, player]);

  // Reset video when modal closes
  useEffect(() => {
    if (!isActive && player) {
      player.currentTime = 0;
      setPosition(0);
    }
  }, [isActive, player]);

  // Track playback status
  useEffect(() => {
    if (!player) return;
    
    const interval = setInterval(() => {
      setIsPlaying(player.playing);
      setPosition(player.currentTime * 1000);
      setDuration(player.duration * 1000);
      setIsLoading(false);
    }, 100);

    return () => clearInterval(interval);
  }, [player]);

  // Auto-hide controls after 3 seconds when playing
  const startControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const resetControlsTimeout = useCallback(() => {
    // Always show controls when this is called
    setShowControls(true);
    
    // Clear any existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Start new timeout to hide controls (will be set after state updates)
  }, []);

  // Auto-hide controls when playing
  useEffect(() => {
    if (showControls && isPlaying) {
      startControlsTimeout();
    }
  }, [showControls, isPlaying, startControlsTimeout]);

  // Always show controls when paused
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isPlaying]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const togglePlayPause = () => {
    if (player) {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
      setIsPlaying(player.playing);
    }
    resetControlsTimeout();
  };
  
  const handleTap = () => {
    // Only toggle video controls visibility, don't call onSingleTap
    // onSingleTap is for toggling MediaViewer controls (close/nav buttons)
    resetControlsTimeout();
  };

  const toggleMute = () => {
    if (player) {
      player.muted = !player.muted;
      setIsMuted(player.muted);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.videoWrapper}>
      {/* Video layer */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
        pointerEvents="none"
      />

      {/* Touchable overlay - always present to capture taps */}
      <TouchableOpacity 
        style={styles.videoTouchableOverlay} 
        onPress={handleTap}
        activeOpacity={1}
      >
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.videoLoadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

        {/* Video controls overlay - auto-hide when playing */}
        {!isLoading && showControls && (
          <View style={styles.videoControlsOverlay} pointerEvents="box-none">
            {/* Play/Pause button */}
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              activeOpacity={0.8}
            >
              {isPlaying ? (
                <Pause size={48} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={48} color="#FFFFFF" fill="#FFFFFF" />
              )}
            </TouchableOpacity>

            {/* Bottom controls */}
            <View style={styles.videoBottomControls} pointerEvents="box-none">
              {/* Time display */}
              <Text style={styles.videoTimeText}>
                {formatTime(position)} / {formatTime(duration)}
              </Text>

              {/* Mute button */}
              <TouchableOpacity
                style={styles.muteButton}
                onPress={toggleMute}
                activeOpacity={0.8}
              >
                {isMuted ? (
                  <VolumeX size={24} color="#FFFFFF" />
                ) : (
                  <Volume2 size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarContainer} pointerEvents="none">
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

/**
 * Zoomable image component (same as before)
 */
function ZoomableImage({ imageUrl, isActive, onSingleTap }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

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
        scale.value = withSpring(1, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
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

  // Combine gestures
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

/**
 * Main MediaViewer component
 */
export function MediaViewer({
  visible,
  media,
  initialIndex = 0,
  onClose,
  showControls = true,
  backgroundColor = 'rgba(0, 0, 0, 0.9)',
}: MediaViewerProps) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);

  // ✅ FIX: Safety check for media array
  if (!visible || !media || !Array.isArray(media) || media.length === 0) {
    return null;
  }

  // Parse media items
  const mediaItems: MediaItem[] = media.map(url => ({
    url,
    type: isVideoUrl(url) ? 'video' : 'image',
  }));

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

  const changeMedia = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < mediaItems.length) {
      setCurrentIndex(newIndex);
      translateX.value = withTiming(-newIndex * screenWidth, TIMING_CONFIG);
      savedTranslateX.value = -newIndex * screenWidth;
    }
  }, [mediaItems.length]);

  // Pan gesture for swiping between media
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

      if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
        if (offset > 0 && currentIndex > 0) {
          runOnJS(changeMedia)(currentIndex - 1);
        } else if (offset < 0 && currentIndex < mediaItems.length - 1) {
          runOnJS(changeMedia)(currentIndex + 1);
        } else {
          translateX.value = withSpring(savedTranslateX.value, SPRING_CONFIG);
        }
      } else {
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
      changeMedia(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < mediaItems.length - 1) {
      changeMedia(currentIndex + 1);
    }
  };

  const toggleControls = useCallback(() => {
    setControlsVisible((prev) => !prev);
  }, []);

  if (!visible) return null;

  const currentMedia = mediaItems[currentIndex];

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
            <Animated.View style={[styles.mediaContainer, containerStyle]}>
              {mediaItems.map((item, index) => (
                <View key={index} style={styles.mediaItemWrapper}>
                  {item.type === 'video' ? (
                    <VideoPlayer
                      videoUrl={item.url}
                      isActive={index === currentIndex}
                      onSingleTap={toggleControls}
                    />
                  ) : (
                    <ZoomableImage
                      imageUrl={item.url}
                      isActive={index === currentIndex}
                      onSingleTap={toggleControls}
                    />
                  )}
                </View>
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
                  <Text style={styles.mediaCounter}>
                    {currentIndex + 1} of {mediaItems.length}
                  </Text>
                  <View style={styles.mediaTypeLabelContainer}>
                    {currentMedia.type === 'video' && (
                      <Text style={styles.mediaTypeLabel}>VIDEO</Text>
                    )}
                  </View>
                </View>
              </SafeAreaView>

              {/* Navigation arrows */}
              {mediaItems.length > 1 && (
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

                  {currentIndex < mediaItems.length - 1 && (
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
              {mediaItems.length > 1 && (
                <View style={styles.indicators}>
                  {mediaItems.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        index === currentIndex && styles.indicatorActive,
                        item.type === 'video' && styles.indicatorVideo,
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
  mediaContainer: {
    flexDirection: 'row',
    height: screenHeight,
  },
  mediaItemWrapper: {
    width: screenWidth,
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
  videoWrapper: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
  },
  videoTouchableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  videoControlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBottomControls: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  videoTimeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  muteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
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
  mediaCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  mediaTypeLabelContainer: {
    height: 20,
    marginTop: 2,
    alignItems: 'flex-end',
  },
  mediaTypeLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
  indicatorVideo: {
    borderWidth: 1,
    borderColor: '#FF0000',
  },
});
