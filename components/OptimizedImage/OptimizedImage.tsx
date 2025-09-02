import React, { useState, useEffect, useMemo } from 'react';
import { View, Image, ImageStyle, ViewStyle, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { imageOptimization, ImageVariant } from '@/lib/imageOptimization';

interface OptimizedImageProps {
  bucket: string;
  path: string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  width?: number;
  height?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  quality?: number;
  preferWebP?: boolean;
  enableLazyLoading?: boolean;
  placeholder?: React.ReactNode;
  fallbackUrl?: string;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export function OptimizedImage({
  bucket,
  path,
  style,
  containerStyle,
  width,
  height,
  resizeMode = 'cover',
  quality = 85,
  preferWebP = true,
  enableLazyLoading = true,
  placeholder,
  fallbackUrl,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [variants, setVariants] = useState<ImageVariant[]>([]);

  // Get screen dimensions for responsive sizing
  const screenData = Dimensions.get('window');
  const devicePixelRatio = screenData.scale;

  // Calculate optimal image dimensions
  const optimalDimensions = useMemo(() => {
    const targetWidth = width || (style as any)?.width || 300;
    const targetHeight = height || (style as any)?.height || 300;
    
    // Account for device pixel ratio for crisp images
    return {
      width: Math.round(targetWidth * devicePixelRatio),
      height: Math.round(targetHeight * devicePixelRatio),
    };
  }, [width, height, style, devicePixelRatio]);

  useEffect(() => {
    loadOptimalImage();
  }, [bucket, path, optimalDimensions.width, preferWebP]);

  const loadOptimalImage = async () => {
    try {
      setLoading(true);
      setError(false);

      // First, try to get pre-generated variants
      const imageVariants = await imageOptimization.getOptimizedUrls(bucket, path);
      setVariants(imageVariants);

      if (imageVariants.length > 0) {
        // Use the best variant for the target size
        const bestUrl = imageOptimization.getBestImageUrl(
          imageVariants,
          optimalDimensions.width,
          preferWebP
        );
        
        if (bestUrl) {
          setImageUrl(bestUrl);
          return;
        }
      }

      // Fallback to Supabase transform API
      const transformedUrl = imageOptimization.getTransformedUrl(bucket, path, {
        width: optimalDimensions.width,
        height: optimalDimensions.height,
        quality,
        format: preferWebP ? 'webp' : 'jpeg',
        resize: 'cover',
      });

      setImageUrl(transformedUrl);

    } catch (err) {
      console.error('Error loading optimized image:', err);
      setError(true);
      onError?.(err);
      
      // Use fallback URL if provided
      if (fallbackUrl) {
        setImageUrl(fallbackUrl);
      }
    }
  };

  const handleImageLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleImageError = (err: any) => {
    setLoading(false);
    setError(true);
    onError?.(err);
    
    // Try fallback URL
    if (fallbackUrl && imageUrl !== fallbackUrl) {
      setImageUrl(fallbackUrl);
    }
  };

  // Lazy loading implementation
  const [shouldLoad, setShouldLoad] = useState(!enableLazyLoading);

  useEffect(() => {
    if (enableLazyLoading && !shouldLoad) {
      // Simple intersection observer alternative for React Native
      // In a real implementation, you might use a more sophisticated approach
      const timer = setTimeout(() => setShouldLoad(true), 100);
      return () => clearTimeout(timer);
    }
  }, [enableLazyLoading, shouldLoad]);

  const containerStyles = [
    {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.sm,
      overflow: 'hidden' as const,
    },
    containerStyle,
  ];

  const imageStyles: ImageStyle = {
    width: '100%' as any,
    height: '100%' as any,
    ...style,
  };

  if (!shouldLoad) {
    return (
      <View style={containerStyles}>
        {placeholder || (
          <LoadingSkeleton
            width="100%"
            height={height || 200}
            style={{ borderRadius: 0 }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={containerStyles}>
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {placeholder || (
            <LoadingSkeleton
              width="100%"
              height={height || 200}
              style={{ borderRadius: 0 }}
            />
          )}
        </View>
      )}
      
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={imageStyles}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          onError={handleImageError}
          // Progressive loading for better UX
          progressiveRenderingEnabled={true}
        />
      )}
      
      {error && !loading && (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceVariant,
            minHeight: height || 200,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.full,
              width: 48,
              height: 48,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: 0.5,
            }}
          >
            <Text variant="caption" color="muted">
              📷
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Preset components for common use cases
export function ListingImage({ 
  bucket = 'listing-images', 
  path, 
  ...props 
}: Omit<OptimizedImageProps, 'bucket'> & { bucket?: string }) {
  return (
    <OptimizedImage
      bucket={bucket}
      path={path}
      quality={85}
      preferWebP={true}
      enableLazyLoading={true}
      {...props}
    />
  );
}

export function ProfileImage({ 
  bucket = 'profile-images', 
  path, 
  ...props 
}: Omit<OptimizedImageProps, 'bucket'> & { bucket?: string }) {
  return (
    <OptimizedImage
      bucket={bucket}
      path={path}
      quality={90}
      preferWebP={true}
      enableLazyLoading={false} // Profile images should load immediately
      {...props}
    />
  );
}

export function CommunityImage({ 
  bucket = 'community-images', 
  path, 
  ...props 
}: Omit<OptimizedImageProps, 'bucket'> & { bucket?: string }) {
  return (
    <OptimizedImage
      bucket={bucket}
      path={path}
      quality={80}
      preferWebP={true}
      enableLazyLoading={true}
      {...props}
    />
  );
}
