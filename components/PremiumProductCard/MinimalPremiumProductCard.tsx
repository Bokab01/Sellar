import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { useMemoryManager } from '@/utils/memoryManager';
import { useImageViewer } from '@/hooks/useImageViewer';
import { ImageViewer } from '@/components/ImageViewer/ImageViewer';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { CompactUserBadges } from '@/components/UserBadges/UserBadges';
import { Heart, Eye } from 'lucide-react-native';

interface MinimalPremiumProductCardProps {
  title: string;
  price: number;
  currency?: string;
  image?: ImageSourcePropType | string | string[];
  seller: {
    id?: string;
    name: string;
    isBusinessUser?: boolean;
  };
  onPress?: () => void;
  // New props for view count and favorites
  viewCount?: number;
  isFavorited?: boolean;
  onFavoritePress?: () => void;
  listingId?: string;
}

const MinimalPremiumProductCard = memo(function MinimalPremiumProductCard({
  title,
  price,
  currency = 'GHS',
  image,
  seller,
  onPress,
  viewCount = 0,
  isFavorited = false,
  onFavoritePress,
  listingId,
}: MinimalPremiumProductCardProps) {
  const { theme } = useTheme();
  const { shouldLoadHeavyComponent } = useMemoryManager();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Memoize image processing to prevent recalculation
  const { images, displayImage, imageSource } = useMemo(() => {
    const processedImages = Array.isArray(image) 
      ? image.filter(img => typeof img === 'string') as string[]
      : typeof image === 'string' 
      ? [image] 
      : [];
    
    const processedDisplayImage = Array.isArray(image) ? image[0] : image;
    const processedImageSource = typeof processedDisplayImage === 'string' ? processedDisplayImage : processedDisplayImage;
    
    return {
      images: processedImages,
      displayImage: processedDisplayImage,
      imageSource: processedImageSource
    };
  }, [image]);

  // Add useImageViewer hook
  const {
    visible: imageViewerVisible,
    currentIndex: imageViewerIndex,
    openViewer: openImageViewer,
    closeViewer: closeImageViewer,
  } = useImageViewer({ images });
  
  // Memoize business user check
  const isBusinessUser = useMemo(() => seller?.isBusinessUser || false, [seller?.isBusinessUser]);
  
  // Memoize complex styling calculations
  const { cardStyles, badgeConfig, sellerStyles } = useMemo(() => {
    const cardStyles = {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden' as const,
      borderWidth: isBusinessUser ? 2 : 1,
      borderColor: isBusinessUser ? theme.colors.primary : theme.colors.border,
      ...(isBusinessUser ? theme.shadows.lg : theme.shadows.sm),
    };

    const badgeConfig = isBusinessUser ? {
      text: 'PRO',
      variant: 'primary' as const,
      size: 'small' as const,
    } : null;

    const sellerStyles = {
      container: isBusinessUser ? {
        backgroundColor: theme.colors.primary + '10',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.primary + '20',
      } : {},
      name: isBusinessUser ? {
        fontWeight: '600' as const,
        color: theme.colors.primary,
      } : {},
    };

    return { cardStyles, badgeConfig, sellerStyles };
  }, [theme, isBusinessUser]);
  
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        style={{
          ...cardStyles,
          width: '100%', // Take full width of container
          height: 280, // Fixed height for consistency
          marginBottom: theme.spacing.sm,
        }}
        activeOpacity={0.8}
      >
        {/* Premium Business Indicator */}
        {seller.isBusinessUser && (
          <View style={{
            position: 'absolute',
            top: theme.spacing.sm,
            right: theme.spacing.sm,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.borderRadius.full,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <Text variant="caption" style={{ 
              color: theme.colors.primaryForeground, 
              fontSize: 8,
              fontWeight: '700'
            }}>
              ⭐ PRO
            </Text>
          </View>
        )}

        {/* Image Section with Lazy Loading */}
        {imageSource ? (
          <TouchableOpacity
            onPress={() => {
              if (images.length > 0) {
                openImageViewer(0);
              }
            }}
            style={{ 
              height: 182, // Fixed height for image section
              width: '100%', // Full width of card
              position: 'relative',
              overflow: 'hidden', // Prevent image from expanding beyond container
            }}
          >
            {!imageLoaded && !imageError && (
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: theme.colors.surfaceVariant,
                borderTopLeftRadius: theme.borderRadius.lg,
                borderTopRightRadius: theme.borderRadius.lg,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text variant="caption" color="secondary">Loading...</Text>
              </View>
            )}
            <Image
              source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource}
              style={{
                width: '100%',
                height: '100%',
                borderTopLeftRadius: theme.borderRadius.lg,
                borderTopRightRadius: theme.borderRadius.lg,
                backgroundColor: theme.colors.surfaceVariant,
                opacity: imageLoaded ? 1 : 0,
              }}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                console.log('Image failed to load for listing');
              }}
            />
            
            {/* View Count */}
            {viewCount > 0 && (
              <View style={{
                position: 'absolute',
                top: theme.spacing.sm,
                left: theme.spacing.sm,
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: theme.spacing.xs,
                paddingVertical: 2,
                borderRadius: theme.borderRadius.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
              }}>
                <Eye size={12} color="white" />
                <Text variant="caption" style={{ color: 'white', fontSize: 10 }}>
                  {viewCount}
                </Text>
              </View>
            )}

            {/* Heart/Favorite Icon */}
            {onFavoritePress && (
              <TouchableOpacity
                onPress={onFavoritePress}
                style={{
                  position: 'absolute',
                  bottom: theme.spacing.sm,
                  right: theme.spacing.sm,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  padding: theme.spacing.xs,
                  borderRadius: theme.borderRadius.full,
                }}
              >
                <Heart 
                  size={16} 
                  color={isFavorited ? theme.colors.error : 'white'} 
                  fill={isFavorited ? theme.colors.error : 'transparent'}
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ 
            height: 182,
            backgroundColor: theme.colors.surfaceVariant,
            justifyContent: 'center',
            alignItems: 'center',
            borderTopLeftRadius: theme.borderRadius.lg,
            borderTopRightRadius: theme.borderRadius.lg,
          }}>
            <Text variant="caption" color="secondary">No Image</Text>
          </View>
        )}
        
        {/* Content Section */}
        <View style={{ 
          padding: theme.spacing.md, // Match ProductCard grid padding
          flex: 1,
          justifyContent: 'center', // Center content since we removed seller info
          minHeight: 98, // Remaining height after image (280 - 182 = 98)
        }}>
          {/* Title and Price */}
          <View>
            <Text 
              variant="body" 
              numberOfLines={2} // Allow 2 lines for title
              style={{ 
                marginBottom: theme.spacing.xs,
                fontWeight: '600',
                fontSize: 12, // Match ProductCard grid fontSize
                lineHeight: 15, // Match ProductCard grid lineHeight
              }}
            >
              {title}
            </Text>
            
            <PriceDisplay
              amount={price}
              currency={currency}
              size="md" // Use medium size to match grid layout
              style={{ 
                fontWeight: '700',
              }}
            />
          </View>
          
        </View>
      </TouchableOpacity>

      {/* ImageViewer */}
      <ImageViewer
        visible={imageViewerVisible}
        images={images}
        initialIndex={imageViewerIndex}
        onClose={closeImageViewer}
      />
    </>
  );
});

export { MinimalPremiumProductCard };
