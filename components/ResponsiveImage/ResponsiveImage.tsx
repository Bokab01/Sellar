import React, { useState } from 'react';
import { View, Image, ImageStyle, ViewStyle, Dimensions, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface ResponsiveImageProps {
  source: { uri: string };
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  aspectRatio?: number;
  maxHeight?: number;
  maxWidth?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  borderRadius?: number;
  backgroundColor?: string;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export function ResponsiveImage({
  source,
  style,
  containerStyle,
  aspectRatio = 16/9,
  maxHeight = 400,
  maxWidth,
  resizeMode = 'contain',
  borderRadius,
  backgroundColor,
  onLoad,
  onError,
}: ResponsiveImageProps) {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const availableWidth = maxWidth || screenWidth - (theme.spacing.lg * 2); // Account for padding

  const handleImageLoad = (event: any) => {
    const { width, height } = event.nativeEvent.source;
    setImageDimensions({ width, height });
    setImageLoaded(true);
    onLoad?.();
  };

  const handleImageError = (error: any) => {
    setImageError(true);
    onError?.(error);
  };

  // Calculate optimal dimensions
  const getOptimalDimensions = () => {
    if (imageDimensions) {
      const imageAspectRatio = imageDimensions.width / imageDimensions.height;
      
      // If image is wider than our target aspect ratio, limit by width
      if (imageAspectRatio > aspectRatio) {
        return {
          width: availableWidth,
          height: availableWidth / imageAspectRatio,
        };
      } else {
        // If image is taller than our target aspect ratio, limit by height
        const calculatedHeight = availableWidth / imageAspectRatio;
        return {
          width: availableWidth,
          height: Math.min(calculatedHeight, maxHeight),
        };
      }
    }
    
    // Fallback to aspect ratio based sizing
    return {
      width: availableWidth,
      height: Math.min(availableWidth / aspectRatio, maxHeight),
    };
  };

  const optimalDimensions = getOptimalDimensions();

  const containerStyles: ViewStyle = {
    backgroundColor: backgroundColor || theme.colors.surfaceVariant,
    borderRadius: borderRadius || theme.borderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...containerStyle,
  };

  const imageStyles: ImageStyle = {
    width: optimalDimensions.width,
    height: optimalDimensions.height,
    ...style,
  };

  if (imageError) {
    return (
      <View style={[containerStyles, imageStyles, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.full,
          width: 48,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.5,
        }}>
          <Text style={{ fontSize: 20 }}>📷</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyles}>
      <Image
        source={source}
        style={imageStyles}
        resizeMode={resizeMode}
        onLoad={handleImageLoad}
        onError={handleImageError}
        progressiveRenderingEnabled={true}
      />
    </View>
  );
}

// Preset components for common use cases
export function PostImage({ 
  source, 
  ...props 
}: Omit<ResponsiveImageProps, 'aspectRatio' | 'maxHeight'>) {
  return (
    <ResponsiveImage
      source={source}
      aspectRatio={16/9}
      maxHeight={400}
      resizeMode="cover"
      {...props}
    />
  );
}

export function ListingImage({ 
  source, 
  ...props 
}: Omit<ResponsiveImageProps, 'aspectRatio' | 'maxHeight'>) {
  return (
    <ResponsiveImage
      source={source}
      aspectRatio={4/3}
      maxHeight={300}
      resizeMode="contain"
      {...props}
    />
  );
}

export function ProfileImage({ 
  source, 
  ...props 
}: Omit<ResponsiveImageProps, 'aspectRatio' | 'maxHeight'>) {
  return (
    <ResponsiveImage
      source={source}
      aspectRatio={1}
      maxHeight={200}
      resizeMode="cover"
      {...props}
    />
  );
}

export function ThumbnailImage({ 
  source, 
  size = 60,
  ...props 
}: Omit<ResponsiveImageProps, 'aspectRatio' | 'maxHeight'> & { size?: number }) {
  return (
    <ResponsiveImage
      source={source}
      aspectRatio={1}
      maxHeight={size}
      maxWidth={size}
      resizeMode="cover"
      style={{ width: size, height: size }}
      {...props}
    />
  );
}
