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
import { Heart, Eye } from 'lucide-react-native';

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
    variant?: 'new' | 'sold' | 'featured' | 'discount' | 'info' | 'success' | 'neutral' | 'warning' | 'error';
  };
  onPress?: () => void;
  onSellerPress?: () => void;
  onActionPress?: () => void;
  actionText?: string;
  location?: string;
  layout?: 'default' | 'grid' | 'list';
  fullWidth?: boolean; // New prop for full-width mode
  enableImageViewer?: boolean; // New prop to enable/disable ImageViewer
  // New props for favorites and views
  listingId?: string;
  isFavorited?: boolean;
  viewCount?: number;
  onFavoritePress?: () => void;
  onViewPress?: () => void;
  // Premium feature props
  isHighlighted?: boolean;
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
  // New props for favorites and views
  listingId,
  isFavorited = false,
  viewCount = 0,
  onFavoritePress,
  onViewPress,
  // Premium feature props
  isHighlighted = false,
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
          // Add highlight border if highlighted
          ...(isHighlighted && {
            borderWidth: 3,
            borderColor: theme.colors.warning,
            shadowColor: theme.colors.warning,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }),
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

        {/* Heart/Favorite Icon */}
        {onFavoritePress && (
          <TouchableOpacity
            onPress={onFavoritePress}
            style={{
              position: 'absolute',
              top: theme.spacing.sm,
              right: theme.spacing.sm,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 20,
              padding: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <Heart 
              size={isGridLayout ? 16 : 18} 
              color={isFavorited ? '#ff4757' : '#ffffff'} 
              fill={isFavorited ? '#ff4757' : 'transparent'}
            />
          </TouchableOpacity>
        )}

        {/* View Count */}
        {viewCount > 0 && (
          <TouchableOpacity
            onPress={onViewPress}
            style={{
              position: 'absolute',
              bottom: theme.spacing.sm,
              right: theme.spacing.sm,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
            activeOpacity={0.7}
          >
            <Eye size={12} color="#ffffff" />
            <Text 
              variant="caption" 
              style={{ 
                color: '#ffffff', 
                fontSize: 11,
                fontWeight: '600'
              }}
            >
              {viewCount.toLocaleString()}
            </Text>
          </TouchableOpacity>
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
          // Seller name removed from grid layout
          null
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

// Export Card as an alias for ProductCard
export const Card = ProductCard;