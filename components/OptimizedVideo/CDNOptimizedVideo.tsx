import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, Dimensions, TouchableOpacity, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { VideoOptimization } from '@/lib/videoOptimization';
import { useTheme } from '@/theme/ThemeProvider';
import { CDNOptimizedImage } from '@/components/OptimizedImage/CDNOptimizedImage';
import { Play } from 'lucide-react-native';

interface CDNOptimizedVideoProps {
  bucket: string;
  path: string;
  style?: any;
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high';
  showThumbnail?: boolean;
  thumbnailSize?: number;
  placeholder?: React.ReactNode;
  fallbackUrl?: string;
  onLoad?: (event?: any) => void;
  onError?: (error?: any) => void;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export function CDNOptimizedVideo({
  bucket,
  path,
  style,
  width = 300,
  height = 200,
  quality = 'medium',
  showThumbnail = true,
  thumbnailSize = 300,
  placeholder,
  fallbackUrl,
  onLoad,
  onError,
  autoPlay = false,
  loop = false,
  muted = true
}: CDNOptimizedVideoProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  // Calculate optimal dimensions based on screen size
  const screenData = Dimensions.get('window');
  const devicePixelRatio = screenData.scale;
  
  const optimalDimensions = useMemo(() => ({
    width: Math.round(width * devicePixelRatio),
    height: Math.round(height * devicePixelRatio)
  }), [width, height, devicePixelRatio]);

  useEffect(() => {
    loadOptimizedVideo();
  }, [bucket, path, optimalDimensions.width, quality]);

  const loadOptimizedVideo = async () => {
    try {
      setLoading(true);
      setError(false);

      if (!bucket || !path) {
        if (fallbackUrl) {
          setVideoUrl(fallbackUrl);
        }
        return;
      }

      // Generate optimized video URL
      const optimizedUrl = VideoOptimization.getOptimizedVideoUrl(bucket, path, {
        quality,
        maxWidth: optimalDimensions.width,
        maxHeight: optimalDimensions.height
      });

      // Generate thumbnail if requested
      if (showThumbnail) {
        const thumbnail = VideoOptimization.getVideoThumbnailUrl(
          bucket, 
          path, 
          1, // 1 second timestamp
          thumbnailSize
        );
        setThumbnailUrl(thumbnail);
      }

      setVideoUrl(optimizedUrl);
    } catch (err) {
      console.error('Error loading optimized video:', err);
      setError(true);
      onError?.(err);
      
      if (fallbackUrl) {
        setVideoUrl(fallbackUrl);
      }
    }
  };

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
    
    if (fallbackUrl && videoUrl !== fallbackUrl) {
      setVideoUrl(fallbackUrl);
    }
  };

  const handleThumbnailPress = () => {
    setShowVideo(true);
  };

  // Create video player
  const player = videoUrl ? useVideoPlayer(videoUrl, (player) => {
    player.loop = loop;
    player.muted = muted;
    if (autoPlay) {
      player.play();
    }
  }) : null;

  if (!videoUrl) {
    return (
      <View style={[style, { backgroundColor: theme.colors.background }]}>
        {placeholder || (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
      </View>
    );
  }

  if (error) {
    return (
      <View style={[style, { 
        backgroundColor: theme.colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center'
      }]}>
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.full,
          width: 48,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.5,
        }}>
          <Text style={{ fontSize: 20 }}>🎬</Text>
        </View>
      </View>
    );
  }

  // Show thumbnail first, then video on press
  if (showThumbnail && thumbnailUrl && !showVideo) {
    return (
      <View style={style}>
        <CDNOptimizedImage
          bucket={bucket}
          path={path}
          style={style}
          width={width}
          height={height}
          quality="medium"
          onLoad={handleLoad}
          onError={handleError}
        />
        {/* Play button overlay */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}>
          <TouchableOpacity
            onPress={handleThumbnailPress}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: theme.borderRadius.full,
              width: 60,
              height: 60,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show video player
  return (
    <View style={style}>
      {player && (
        <VideoView
          player={player}
          style={style}
          contentFit="cover"
          nativeControls={true}
        />
      )}
    </View>
  );
}

// Hook for responsive video loading
export function useResponsiveVideo(bucket: string, path: string, targetWidth: number) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bucket || !path) return;

    const loadVideo = async () => {
      try {
        setLoading(true);
        
        // Get responsive URLs
        const urls = VideoOptimization.getResponsiveVideoUrls(bucket, path);
        
        // Choose the best URL based on target width
        let bestUrl: string;
        if (targetWidth <= 300) {
          bestUrl = urls.low;
        } else if (targetWidth <= 600) {
          bestUrl = urls.medium;
        } else {
          bestUrl = urls.high;
        }
        
        setVideoUrl(bestUrl);
        setThumbnailUrl(urls.thumbnail);
      } catch (error) {
        console.error('Error loading responsive video:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [bucket, path, targetWidth]);

  return { videoUrl, thumbnailUrl, loading };
}
