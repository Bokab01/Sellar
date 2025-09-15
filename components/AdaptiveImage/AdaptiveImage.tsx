import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Image, Dimensions, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { networkUtils } from '@/utils/networkUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AdaptiveImageProps {
  source: { uri: string } | number;
  style?: any;
  containerStyle?: any;
  width?: number;
  height?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholder?: React.ReactNode;
  fallbackUrl?: string;
  enableProgressive?: boolean;
  enableCaching?: boolean;
  compressionQuality?: 'low' | 'medium' | 'high' | 'auto';
  onLoad?: () => void;
  onError?: (error: any) => void;
  priority?: 'low' | 'medium' | 'high';
}

interface ImageVariant {
  url: string;
  quality: 'low' | 'medium' | 'high';
  size: number;
  width: number;
  height: number;
}

const CACHE_PREFIX = 'adaptive_image_';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export function AdaptiveImage({
  source,
  style,
  containerStyle,
  width,
  height,
  resizeMode = 'cover',
  placeholder,
  fallbackUrl,
  enableProgressive = true,
  enableCaching = true,
  compressionQuality = 'auto',
  onLoad,
  onError,
  priority = 'medium',
}: AdaptiveImageProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [loadedQuality, setLoadedQuality] = useState<'low' | 'medium' | 'high' | null>(null);
  const [networkQuality, setNetworkQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');
  
  const loadAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  // Get screen dimensions for responsive sizing
  const screenData = Dimensions.get('window');
  const devicePixelRatio = screenData.scale;

  // Calculate optimal image dimensions
  const optimalDimensions = useMemo(() => {
    const targetWidth = width || (style as any)?.width || 300;
    const targetHeight = height || (style as any)?.height || 300;
    
    return {
      width: Math.round(targetWidth * devicePixelRatio),
      height: Math.round(targetHeight * devicePixelRatio),
    };
  }, [width, height, style, devicePixelRatio]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadOptimalImage();
  }, [source, optimalDimensions.width, optimalDimensions.height, compressionQuality]);

  const loadOptimalImage = async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(false);
      loadAttemptRef.current += 1;
      const currentAttempt = loadAttemptRef.current;

      // Check network quality
      const networkStatus = await networkUtils.checkNetworkStatus();
      setNetworkQuality(networkStatus.quality);

      // Handle local/static images
      if (typeof source === 'number' || !source.uri) {
        setCurrentImageUrl(typeof source === 'number' ? null : source.uri);
        setLoading(false);
        return;
      }

      const imageUrl = source.uri;

      // Try to load from cache first
      if (enableCaching) {
        const cachedUrl = await getCachedImageUrl(imageUrl);
        if (cachedUrl && mountedRef.current && currentAttempt === loadAttemptRef.current) {
          setCurrentImageUrl(cachedUrl);
          setLoadedQuality('medium'); // Assume cached is medium quality
          setLoading(false);
          onLoad?.();
          return;
        }
      }

      // Determine optimal quality based on network and settings
      const targetQuality = getTargetQuality(networkStatus.quality, compressionQuality);
      
      // Generate image variants
      const variants = generateImageVariants(imageUrl, optimalDimensions, targetQuality);
      
      // Load image progressively if enabled
      if (enableProgressive && networkStatus.quality !== 'excellent') {
        await loadProgressively(variants, currentAttempt);
      } else {
        await loadSingleImage(variants[0], currentAttempt);
      }

    } catch (err) {
      console.error('Error loading adaptive image:', err);
      if (mountedRef.current) {
        setError(true);
        setLoading(false);
        onError?.(err);
        
        // Try fallback URL if provided
        if (fallbackUrl && currentImageUrl !== fallbackUrl) {
          setCurrentImageUrl(fallbackUrl);
          setError(false);
        }
      }
    }
  };

  const generateImageVariants = (
    baseUrl: string, 
    dimensions: { width: number; height: number },
    targetQuality: 'low' | 'medium' | 'high'
  ): ImageVariant[] => {
    const variants: ImageVariant[] = [];
    
    // If it's a Supabase storage URL, generate transform variants
    if (baseUrl.includes('supabase') && baseUrl.includes('storage')) {
      const qualities = getQualityProgression(targetQuality);
      
      qualities.forEach(quality => {
        const { width: w, height: h, compression } = getQualitySettings(quality, dimensions);
        const transformUrl = addTransformParams(baseUrl, w, h, compression);
        
        variants.push({
          url: transformUrl,
          quality,
          size: estimateImageSize(w, h, compression),
          width: w,
          height: h,
        });
      });
    } else {
      // For external URLs, just use the original
      variants.push({
        url: baseUrl,
        quality: targetQuality,
        size: estimateImageSize(dimensions.width, dimensions.height, 80),
        width: dimensions.width,
        height: dimensions.height,
      });
    }

    return variants.sort((a, b) => a.size - b.size); // Sort by size, smallest first
  };

  const getTargetQuality = (
    networkQuality: 'poor' | 'fair' | 'good' | 'excellent',
    compressionQuality: 'low' | 'medium' | 'high' | 'auto'
  ): 'low' | 'medium' | 'high' => {
    if (compressionQuality !== 'auto') {
      return compressionQuality;
    }

    switch (networkQuality) {
      case 'poor': return 'low';
      case 'fair': return 'medium';
      case 'good': return 'medium';
      case 'excellent': return 'high';
      default: return 'medium';
    }
  };

  const getQualityProgression = (targetQuality: 'low' | 'medium' | 'high'): ('low' | 'medium' | 'high')[] => {
    switch (targetQuality) {
      case 'low': return ['low'];
      case 'medium': return ['low', 'medium'];
      case 'high': return ['low', 'medium', 'high'];
      default: return ['medium'];
    }
  };

  const getQualitySettings = (
    quality: 'low' | 'medium' | 'high',
    baseDimensions: { width: number; height: number }
  ) => {
    switch (quality) {
      case 'low':
        return {
          width: Math.round(baseDimensions.width * 0.5),
          height: Math.round(baseDimensions.height * 0.5),
          compression: 60,
        };
      case 'medium':
        return {
          width: Math.round(baseDimensions.width * 0.75),
          height: Math.round(baseDimensions.height * 0.75),
          compression: 75,
        };
      case 'high':
        return {
          width: baseDimensions.width,
          height: baseDimensions.height,
          compression: 90,
        };
      default:
        return {
          width: baseDimensions.width,
          height: baseDimensions.height,
          compression: 80,
        };
    }
  };

  const addTransformParams = (url: string, width: number, height: number, quality: number): string => {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('width', width.toString());
      urlObj.searchParams.set('height', height.toString());
      urlObj.searchParams.set('resize', 'cover');
      urlObj.searchParams.set('quality', quality.toString());
      
      // Prefer WebP if supported
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        urlObj.searchParams.set('format', 'webp');
      }
      
      return urlObj.toString();
    } catch (error) {
      console.warn('Failed to add transform params:', error);
      return url;
    }
  };

  const estimateImageSize = (width: number, height: number, quality: number): number => {
    // Rough estimation: width * height * bytes_per_pixel * compression_factor
    const bytesPerPixel = 3; // RGB
    const compressionFactor = quality / 100;
    return Math.round(width * height * bytesPerPixel * compressionFactor);
  };

  const loadProgressively = async (variants: ImageVariant[], attemptId: number) => {
    for (const variant of variants) {
      if (!mountedRef.current || attemptId !== loadAttemptRef.current) return;

      try {
        await loadSingleImage(variant, attemptId);
        
        // If this is not the highest quality, continue loading better quality
        if (variant.quality !== variants[variants.length - 1].quality) {
          // Small delay to show the current image before loading next quality
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`Failed to load ${variant.quality} quality image:`, error);
        // Continue to next variant
      }
    }
  };

  const loadSingleImage = async (variant: ImageVariant, attemptId: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!mountedRef.current || attemptId !== loadAttemptRef.current) {
        reject(new Error('Component unmounted or new load started'));
        return;
      }

      // Use React Native's Image.prefetch for loading
      Image.prefetch(variant.url)
        .then(() => {
          if (mountedRef.current && attemptId === loadAttemptRef.current) {
            setCurrentImageUrl(variant.url);
            setLoadedQuality(variant.quality);
            setLoading(false);
            
            // Cache the successful URL
            if (enableCaching && typeof source === 'object' && source.uri) {
              cacheImageUrl(source.uri, variant.url);
            }
            
            onLoad?.();
            resolve();
          }
        })
        .catch((error) => {
          reject(error);
        });

      // Set a timeout for slow networks
      const timeout = networkQuality === 'poor' ? 30000 : 15000;
      setTimeout(() => {
        if (mountedRef.current && attemptId === loadAttemptRef.current) {
          reject(new Error('Image load timeout'));
        }
      }, timeout);
    });
  };

  // ============ CACHING UTILITIES ============

  const getCachedImageUrl = async (originalUrl: string): Promise<string | null> => {
    try {
      const cacheKey = `${CACHE_PREFIX}${Buffer.from(originalUrl).toString('base64')}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const { url, timestamp } = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_EXPIRY) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return url;
    } catch (error) {
      console.warn('Failed to get cached image URL:', error);
      return null;
    }
  };

  const cacheImageUrl = async (originalUrl: string, optimizedUrl: string): Promise<void> => {
    try {
      const cacheKey = `${CACHE_PREFIX}${Buffer.from(originalUrl).toString('base64')}`;
      const cacheData = {
        url: optimizedUrl,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Periodically clean up old cache entries
      if (Math.random() < 0.1) { // 10% chance
        await cleanupImageCache();
      }
    } catch (error) {
      console.warn('Failed to cache image URL:', error);
    }
  };

  const cleanupImageCache = async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const imageKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      const cacheEntries = await Promise.all(
        imageKeys.map(async (key) => {
          try {
            const data = await AsyncStorage.getItem(key);
            return { key, data: data ? JSON.parse(data) : null };
          } catch {
            return { key, data: null };
          }
        })
      );

      // Remove expired entries
      const expiredKeys = cacheEntries
        .filter(entry => !entry.data || Date.now() - entry.data.timestamp > CACHE_EXPIRY)
        .map(entry => entry.key);

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        console.log(`Cleaned up ${expiredKeys.length} expired image cache entries`);
      }

      // If cache is still too large, remove oldest entries
      const validEntries = cacheEntries.filter(entry => entry.data && Date.now() - entry.data.timestamp <= CACHE_EXPIRY);
      
      if (validEntries.length > 100) { // Keep max 100 cached images
        const sortedByAge = validEntries.sort((a, b) => a.data.timestamp - b.data.timestamp);
        const toRemove = sortedByAge.slice(0, validEntries.length - 100).map(entry => entry.key);
        
        await AsyncStorage.multiRemove(toRemove);
        console.log(`Cleaned up ${toRemove.length} old image cache entries`);
      }
    } catch (error) {
      console.warn('Failed to cleanup image cache:', error);
    }
  };

  // ============ RENDER ============

  const containerStyles = [
    {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden' as const,
      position: 'relative' as const,
    },
    containerStyle,
  ];

  const imageStyles = [
    {
      width: '100%',
      height: '100%',
    },
    style,
  ];

  // Show loading skeleton
  if (loading) {
    return (
      <View style={containerStyles}>
        {placeholder || (
          <LoadingSkeleton
            width="100%"
            height={height || 200}
            style={{ borderRadius: 0 }}
          />
        )}
        
        {/* Network quality indicator for debugging */}
        {__DEV__ && (
          <View style={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 4,
            padding: 2,
          }}>
            <Text variant="caption" style={{ color: 'white', fontSize: 10 }}>
              {networkQuality}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Show error state
  if (error && !currentImageUrl) {
    return (
      <View style={[containerStyles, {
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: height || 200,
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
          <Text variant="caption" color="muted">
            📷
          </Text>
        </View>
        <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs, textAlign: 'center' }}>
          Image failed to load
        </Text>
      </View>
    );
  }

  // Show image
  return (
    <View style={containerStyles}>
      {currentImageUrl ? (
        <Image
          source={{ uri: currentImageUrl }}
          style={imageStyles}
          resizeMode={resizeMode}
          onLoad={() => {
            setLoading(false);
            onLoad?.();
          }}
          onError={(err) => {
            setError(true);
            setLoading(false);
            onError?.(err);
          }}
          // Progressive loading for better UX
          progressiveRenderingEnabled={true}
        />
      ) : (
        typeof source === 'number' && (
          <Image
            source={source}
            style={imageStyles}
            resizeMode={resizeMode}
            onLoad={() => {
              setLoading(false);
              onLoad?.();
            }}
            onError={(err) => {
              setError(true);
              setLoading(false);
              onError?.(err);
            }}
          />
        )
      )}
      
      {/* Quality indicator for debugging */}
      {__DEV__ && loadedQuality && (
        <View style={{
          position: 'absolute',
          bottom: 4,
          left: 4,
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: 4,
          padding: 2,
        }}>
          <Text variant="caption" style={{ color: 'white', fontSize: 10 }}>
            {loadedQuality}
          </Text>
        </View>
      )}
    </View>
  );
}

// Preset components for common use cases
export function AdaptiveListingImage({ 
  source, 
  ...props 
}: Omit<AdaptiveImageProps, 'compressionQuality' | 'enableProgressive'>) {
  return (
    <AdaptiveImage
      source={source}
      compressionQuality="auto"
      enableProgressive={true}
      priority="medium"
      {...props}
    />
  );
}

export function AdaptiveProfileImage({ 
  source, 
  ...props 
}: Omit<AdaptiveImageProps, 'compressionQuality' | 'enableProgressive'>) {
  return (
    <AdaptiveImage
      source={source}
      compressionQuality="medium"
      enableProgressive={false}
      priority="low"
      {...props}
    />
  );
}

export function AdaptiveThumbnailImage({ 
  source, 
  ...props 
}: Omit<AdaptiveImageProps, 'compressionQuality' | 'enableProgressive'>) {
  return (
    <AdaptiveImage
      source={source}
      compressionQuality="low"
      enableProgressive={false}
      priority="low"
      {...props}
    />
  );
}
