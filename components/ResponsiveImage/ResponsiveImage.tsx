import React, { useState, useMemo } from 'react';
import { View, Image, ImageStyle, ViewStyle, Dimensions, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { CDNOptimizedImage } from '@/components/OptimizedImage/CDNOptimizedImage';

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
  // CDN optimization props
  bucket?: string;
  path?: string;
  quality?: 'low' | 'medium' | 'high';
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
  bucket,
  path,
  quality = 'medium',
}: ResponsiveImageProps) {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const availableWidth = maxWidth || screenWidth - (theme.spacing.lg * 2); // Account for padding

  const handleImageLoad = (event: any) => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleImageError = (error: any) => {
    setImageError(true);
    onError?.(error);
  };

  // Calculate dimensions once - no state changes on image load to prevent blinking
  const optimalDimensions = useMemo(() => {
    return {
      width: availableWidth,
      height: Math.min(availableWidth / aspectRatio, maxHeight),
    };
  }, [availableWidth, aspectRatio, maxHeight]);

  const containerStyles: ViewStyle = {
    backgroundColor: backgroundColor || theme.colors.surfaceVariant,
    borderRadius: borderRadius || theme.borderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    width: optimalDimensions.width,
    height: optimalDimensions.height,
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

  // Use CDN optimized image if bucket and path are provided
  if (bucket && path) {
    return (
      <View style={containerStyles}>
        <CDNOptimizedImage
          bucket={bucket}
          path={path}
          style={imageStyles}
          width={optimalDimensions.width}
          height={optimalDimensions.height}
          quality={quality}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </View>
    );
  }

  // Fallback to regular Image component
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
      bucket="community-images"
      quality="medium"
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
      bucket="listing-images"
      quality="medium"
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
      bucket="profile-images"
      quality="medium"
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
      bucket="profile-images"
      quality="low"
      {...props}
    />
  );
}
