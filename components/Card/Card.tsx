import React from 'react';
import { View, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { CompactUserBadges } from '@/components/UserBadges/UserBadges';
import { ListingImage } from '@/components/OptimizedImage/OptimizedImage';
import { useMemoryManager } from '@/utils/memoryManager';
import { ImageViewer } from '@/components/ImageViewer/ImageViewer';
import { useImageViewer } from '@/hooks/useImageViewer';

interface ProductCardProps {
  image: ImageSourcePropType | string | string[];
  imagePath?: string; // For optimized images from storage
  title: string;
  price: number;
  currency?: string;
  seller: {
    id?: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
  badge?: {
    text: string;
    variant?: 'new' | 'sold' | 'featured' | 'discount' | 'info' | 'success';
  };
  onPress?: () => void;
  onSellerPress?: () => void;
  onActionPress?: () => void;
  actionText?: string;
  location?: string;
  layout?: 'default' | 'grid';
  fullWidth?: boolean; // New prop for full-width mode
  enableImageViewer?: boolean; // New prop to enable/disable ImageViewer
}

export function ProductCard({
  image,
  imagePath,
  title,
  price,
  currency = 'GHS',
  seller,
  badge,
  onPress,
  onSellerPress,
  onActionPress,
  actionText = 'View',
  location,
  layout = 'default',
  fullWidth = false,
  enableImageViewer = true,
}: ProductCardProps) {
  const { theme } = useTheme();
  const { shouldLoadHeavyComponent } = useMemoryManager();

  // Handle different image formats for ImageViewer
  const images = Array.isArray(image) 
    ? image.filter(img => typeof img === 'string') as string[]
    : typeof image === 'string' 
    ? [image] 
    : [];
  
  const displayImage = Array.isArray(image) ? image[0] : image;
  const imageSource = typeof displayImage === 'string' ? { uri: displayImage } : displayImage;

  // Initialize ImageViewer hook
  const {
    visible: imageViewerVisible,
    currentIndex: imageViewerIndex,
    openViewer: openImageViewer,
    closeViewer: closeImageViewer,
  } = useImageViewer({ images });
  
  const isGridLayout = layout === 'grid';
  // Increased card height and made image cover 70% of the card
  const totalCardHeight = isGridLayout ? 320 : 360;
  const imageHeight = isGridLayout ? totalCardHeight * 0.7 : 200; // 70% for grid, keep default for list
  const cardPadding = isGridLayout ? theme.spacing.sm : theme.spacing.lg;

  const handleLongPress = () => {
    if (enableImageViewer && images.length > 0) {
      openImageViewer(0);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleLongPress}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: fullWidth ? theme.borderRadius.sm : theme.borderRadius.lg,
          ...(fullWidth ? theme.shadows.sm : theme.shadows.md),
          overflow: 'hidden',
          marginBottom: isGridLayout ? 0 : theme.spacing.md,
          height: isGridLayout ? totalCardHeight : undefined,
        }}
        activeOpacity={0.95}
      >
      {/* Image Container */}
      <View style={{ position: 'relative' }}>
        {imagePath ? (
          <ListingImage
            path={imagePath}
            style={{
              width: '100%',
              height: imageHeight,
            }}
            containerStyle={{
              backgroundColor: theme.colors.surfaceVariant,
            }}
            width={isGridLayout ? 300 : 400}
            height={imageHeight}
            resizeMode="cover"
            enableLazyLoading={shouldLoadHeavyComponent()}
          />
        ) : (
          <Image
            source={imageSource}
            style={{
              width: '100%',
              height: imageHeight,
              backgroundColor: theme.colors.surfaceVariant,
            }}
            resizeMode="cover"
          />
        )}
        
        {badge && (
          <View style={{
            position: 'absolute',
            top: theme.spacing.sm,
            left: theme.spacing.sm,
          }}>
            <Badge 
              variant={badge.variant} 
              text={badge.text} 
              size={isGridLayout ? 'sm' : 'md'}
            />
          </View>
        )}
      </View>

      {/* Content */}

      <View style={{ 
        padding: cardPadding,
        flex: isGridLayout ? 1 : undefined,
        justifyContent: isGridLayout ? 'space-between' : undefined,
      }}>
        <View>
          <Text 
            variant={isGridLayout ? 'bodySmall' : 'h4'} 
            numberOfLines={isGridLayout ? 2 : 2}
            style={{ 
              marginBottom: isGridLayout ? theme.spacing.xs : theme.spacing.sm,
              fontSize: isGridLayout ? 13 : undefined,
              fontWeight: isGridLayout ? '600' : undefined,
              lineHeight: isGridLayout ? 16 : undefined,
            }}
          >
            {title}
          </Text>

          <PriceDisplay 
            amount={price} 
            currency={currency}
            size={isGridLayout ? 'sm' : 'lg'}
            style={{ marginBottom: isGridLayout ? theme.spacing.xs : theme.spacing.md }}
          />
        </View>

        {location && !isGridLayout && (
          <Text 
            variant="bodySmall" 
            color="muted"
            style={{ marginBottom: theme.spacing.md }}
          >
            📍 {location}
          </Text>
        )}

        {/* Seller Info - Simplified for grid layout */}
        {isGridLayout ? (
          <Text 
            variant="caption" 
            color="secondary" 
            numberOfLines={1}
            style={{ 
              fontSize: 11,
              marginTop: 'auto', // Push to bottom
            }}
          >
            {seller.name}
          </Text>
        ) : (
          <TouchableOpacity
            onPress={onSellerPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}
            activeOpacity={0.7}
          >
            <Avatar
              source={seller.avatar}
              name={seller.name}
              size="sm"
              style={{ marginRight: theme.spacing.md }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
                <Text variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>
                  {seller.name}
                </Text>
                {seller.id && (
                  <CompactUserBadges userId={seller.id} maxBadges={1} />
                )}
              </View>
              {seller.rating && (
                <Text variant="caption" color="muted">
                  ⭐ {seller.rating.toFixed(1)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Action Button - Only show in default layout */}
        {onActionPress && !isGridLayout && (
          <Button
            variant="primary"
            size="sm"
            onPress={onActionPress}
            fullWidth
          >
            {actionText}
          </Button>
        )}
      </View>
    </TouchableOpacity>

    {/* Image Viewer */}
    {enableImageViewer && (
      <ImageViewer
        visible={imageViewerVisible}
        images={images}
        initialIndex={imageViewerIndex}
        onClose={closeImageViewer}
      />
    )}
  </>
  );
}
