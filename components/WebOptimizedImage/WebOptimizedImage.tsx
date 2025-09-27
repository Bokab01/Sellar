import React, { useState, useEffect } from 'react';
import { Image, View, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

interface WebOptimizedImageProps {
  source: { uri: string } | number;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholder?: string;
  fallback?: string;
  quality?: number;
  width?: number;
  height?: number;
  alt?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export const WebOptimizedImage: React.FC<WebOptimizedImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  placeholder,
  fallback,
  quality = 80,
  width,
  height,
  alt = '',
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(source);

  // Web-specific optimizations
  useEffect(() => {
    if (Platform.OS === 'web' && typeof source === 'object' && 'uri' in source) {
      const originalUri = source.uri;
      
      // Add web-specific optimizations
      let optimizedUri = originalUri;
      
      // Add quality parameter if not present
      if (!optimizedUri.includes('quality=') && quality !== 80) {
        const separator = optimizedUri.includes('?') ? '&' : '?';
        optimizedUri = `${originalUri}${separator}quality=${quality}`;
      }
      
      // Add width/height for responsive images
      if (width && height) {
        const separator = optimizedUri.includes('?') ? '&' : '?';
        optimizedUri = `${optimizedUri}${separator}w=${width}&h=${height}`;
      }
      
      setImageSrc({ uri: optimizedUri });
    }
  }, [source, quality, width, height]);

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    if (fallback) {
      setImageSrc({ uri: fallback });
    }
    onError?.();
  };

  // Web-specific attributes
  const webProps = Platform.OS === 'web' ? {
    loading,
    decoding: 'async' as const,
    alt,
  } : {};

  if (imageError && !fallback) {
    return (
      <View style={[
        style,
        {
          backgroundColor: theme.colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: height || 200,
        }
      ]}>
        <Text variant="caption" color="muted">
          Image failed to load
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      {!imageLoaded && placeholder && (
        <View style={[
          style,
          {
            position: 'absolute',
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }
        ]}>
          <Text variant="caption" color="muted">
            Loading...
          </Text>
        </View>
      )}
      
      <Image
        source={imageSrc}
        style={[
          style,
          { opacity: imageLoaded ? 1 : 0 }
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        {...webProps}
      />
    </View>
  );
};
