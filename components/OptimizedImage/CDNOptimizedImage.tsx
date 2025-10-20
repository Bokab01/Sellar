import React, { useState, useEffect, useMemo } from 'react';
import { Image, View, ActivityIndicator, Dimensions } from 'react-native';
import { CDNOptimization } from '@/lib/cdnOptimization';
import { useTheme } from '@/theme/ThemeProvider';

interface CDNOptimizedImageProps {
  bucket: string;
  path: string;
  style?: any;
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high';
  placeholder?: React.ReactNode;
  fallbackUrl?: string;
  onLoad?: (event?: any) => void;
  onError?: (error?: any) => void;
}

export function CDNOptimizedImage({
  bucket,
  path,
  style,
  width = 300,
  height = 300,
  quality = 'medium',
  placeholder,
  fallbackUrl,
  onLoad,
  onError
}: CDNOptimizedImageProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Calculate optimal dimensions based on screen size
  const screenData = Dimensions.get('window');
  const devicePixelRatio = screenData.scale;
  
  const optimalDimensions = useMemo(() => ({
    width: Math.round(width * devicePixelRatio),
    height: Math.round(height * devicePixelRatio)
  }), [width, height, devicePixelRatio]);

  // Quality mapping
  const qualityMap = {
    low: 50,
    medium: 80,
    high: 90
  };

  useEffect(() => {
    loadOptimizedImage();
  }, [bucket, path, optimalDimensions.width, quality]);

  const loadOptimizedImage = async () => {
    try {
      setLoading(true);
      setError(false);

      if (!bucket || !path) {
        if (fallbackUrl) {
          setImageUrl(fallbackUrl);
        }
        return;
      }

      // Generate optimized URL with CDN
      const optimizedUrl = CDNOptimization.getOptimizedUrl(bucket, path, {
        width: optimalDimensions.width,
        height: optimalDimensions.height,
        quality: qualityMap[quality],
        format: 'webp',
        resize: 'cover'
      });

      setImageUrl(optimizedUrl);
    } catch (err) {
      console.error('Error loading optimized image:', err);
      setError(true);
      onError?.();
      
      if (fallbackUrl) {
        setImageUrl(fallbackUrl);
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
    
    if (fallbackUrl && imageUrl !== fallbackUrl) {
      setImageUrl(fallbackUrl);
    }
  };

  if (!imageUrl) {
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

  return (
    <Image
      source={{ uri: imageUrl }}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      resizeMode="cover"
    />
  );
}

// Hook for responsive image loading
export function useResponsiveImage(bucket: string, path: string, targetWidth: number) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bucket || !path) return;

    const loadImage = async () => {
      try {
        setLoading(true);
        
        // Get responsive URLs
        const urls = CDNOptimization.getResponsiveUrls(bucket, path);
        
        // Choose the best URL based on target width
        let bestUrl: string;
        if (targetWidth <= 150) {
          bestUrl = urls.thumbnail;
        } else if (targetWidth <= 300) {
          bestUrl = urls.small;
        } else if (targetWidth <= 600) {
          bestUrl = urls.medium;
        } else {
          bestUrl = urls.large;
        }
        
        setImageUrl(bestUrl);
      } catch (error) {
        console.error('Error loading responsive image:', error);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [bucket, path, targetWidth]);

  return { imageUrl, loading };
}
