import React, { memo, useState } from 'react';
import { View, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { CompactUserBadges } from '@/components/UserBadges/UserBadges';
import { ListingImage } from '@/components/OptimizedImage/OptimizedImage';
import { CDNOptimizedVideo } from '@/components/OptimizedVideo/CDNOptimizedVideo';
// Removed useMemoryManager for better performance
import { ImageViewer } from '@/components/ImageViewer/ImageViewer';
import { useImageViewer } from '@/hooks/useImageViewer';
import { Heart, Eye, MoreVertical, Play, Edit, Trash2, EyeOff, MapPin } from 'lucide-react-native';
import { ReportButton } from '@/components/ReportButton/ReportButton';
import { AppModal } from '@/components/Modal/Modal';

// Helper function to detect if URL is a video
const isVideoUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const videoExtensions = ['.mp4', '.mov', '.m4v', '.avi', '.wmv', '.flv', '.webm'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

interface ProductCardProps {
  image: ImageSourcePropType | string | string[];
  imagePath?: string; // For optimized images from storage
  title: string;
  price: number;
  previousPrice?: number; // NEW: For showing price drops with strikethrough
  priceChangedAt?: string; // NEW: When price was last changed
  currency?: string;
  seller?: {
    id?: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
  badge?: {
    text: string;
    variant?: 'new' | 'sold' | 'featured' | 'discount' | 'info' | 'success' | 'neutral' | 'warning' | 'error' | 'urgent' | 'spotlight' | 'primary' | 'secondary';
  };
  onPress?: () => void;
  onSellerPress?: () => void;
  onActionPress?: () => void;
  actionText?: string;
  location?: string;
  layout?: 'default' | 'grid' | 'list';
  fullWidth?: boolean; // New prop for full-width mode
  shadowSize?: 'sm' | 'md' | 'lg'; // New prop to control shadow size
  enableImageViewer?: boolean; // New prop to enable/disable ImageViewer
  // New props for favorites and views
  listingId?: string;
  isFavorited?: boolean;
  viewCount?: number;
  favoritesCount?: number;
  onFavoritePress?: () => void;
  onViewPress?: () => void;
  // Premium feature props
  isHighlighted?: boolean;
  // Report props
  showReportButton?: boolean;
  currentUserId?: string;
  // Unified card variants
  variant?: 'default' | 'compact' | 'list'; // NEW: Control card style (default, compact for featured, list for horizontal)
  width?: number; // NEW: Fixed width for compact variant
  // My Listings props
  status?: string; // NEW: For listing status (active, draft, sold, hidden)
  onEdit?: () => void; // NEW: Edit action
  onDelete?: () => void; // NEW: Delete action
  onToggleVisibility?: () => void; // NEW: Show/Hide toggle
  badges?: Array<{ // NEW: Multiple badges support
    text: string;
    variant: 'new' | 'sold' | 'featured' | 'discount' | 'info' | 'success' | 'neutral' | 'warning' | 'error' | 'urgent' | 'spotlight' | 'primary' | 'secondary';
  }>;
  borderColor?: string; // NEW: Custom border color
  menuActions?: Array<{ // NEW: Menu actions for three-dot menu
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    destructive?: boolean;
  }>;
  borderRadius?: number; // NEW: Custom border radius
}

const ProductCard = memo<ProductCardProps>(function ProductCard({
  image,
  imagePath,
  title,
  price,
  previousPrice,
  priceChangedAt,
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
  shadowSize,
  enableImageViewer = true,
  // New props for favorites and views
  listingId,
  isFavorited = false,
  viewCount = 0,
  favoritesCount = 0,
  onFavoritePress,
  onViewPress,
  // Premium feature props
  isHighlighted = false,
  // Report props
  showReportButton = false,
  currentUserId,
  // Unified card variants
  variant = 'default',
  width,
  // My Listings props
  status,
  onEdit,
  onDelete,
  onToggleVisibility,
  badges = [],
  borderColor,
  menuActions,
  borderRadius,
}) {
  const { theme, themeMode } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  // Handle different image formats for ImageViewer
  const images = Array.isArray(image) 
    ? image.filter(img => typeof img === 'string') as string[]
    : typeof image === 'string' 
    ? [image] 
    : [];
  
  // Determine display image - if first item is video, try to find first image
  let displayImage = Array.isArray(image) ? image[0] : image;
  let hasVideo = false;
  
  if (Array.isArray(image) && image.length > 0) {
    const firstItem = typeof image[0] === 'string' ? image[0] : '';
    hasVideo = isVideoUrl(firstItem);
    
    // If first item is a video, try to find first image for thumbnail
    if (hasVideo && image.length > 1) {
      const firstImageIndex = image.findIndex(item => 
        typeof item === 'string' && !isVideoUrl(item)
      );
      if (firstImageIndex !== -1) {
        displayImage = image[firstImageIndex];
      }
    }
  }
  
  const imageSource = typeof displayImage === 'string' ? { uri: displayImage } : displayImage;

  // Initialize ImageViewer hook
  const {
    visible: imageViewerVisible,
    currentIndex: imageViewerIndex,
    openViewer: openImageViewer,
    closeViewer: closeImageViewer,
  } = useImageViewer({ images });
  
  const isGridLayout = layout === 'grid';
  const isListLayout = layout === 'list';
  // Optimized card height for better mobile experience
  const totalCardHeight = isGridLayout ? 320 : 400; // Increased from 280 to 320 for grid layout
  const imageHeight = isGridLayout ? totalCardHeight * 0.75 : (isListLayout ? 300 : 200); // Increased list layout image height
  const cardPadding = isGridLayout ? theme.spacing.sm : theme.spacing.md; // Reduced padding for more compact content

  const handleLongPress = () => {
    if (enableImageViewer && images.length > 0) {
      openImageViewer(0);
    }
  };

  // Calculate dimensions based on variant
  const cardWidth = variant === 'compact' && width ? width : '100%';
  const cardHeight = variant === 'compact' ? 320 : (isGridLayout ? totalCardHeight : undefined);
  const compactImageHeight = variant === 'compact' ? 240 : imageHeight;

  // LIST VARIANT RENDERING (Horizontal layout)
  if (variant === 'list') {
    return (
      <>
        <TouchableOpacity
          onPress={onPress}
          style={{
            flexDirection: 'row',
            backgroundColor: theme.colors.surface,
            borderRadius: borderRadius ?? theme.borderRadius.lg,
            ...(shadowSize ? theme.shadows[shadowSize] : theme.shadows.sm),
            overflow: 'hidden',
            marginBottom: theme.spacing.sm,
            padding: theme.spacing.sm,
            // Add border in AMOLED mode for better card separation
            ...(themeMode === 'amoled' && {
              borderWidth: 1,
              borderColor: theme.colors.border,
            }),
          }}
          activeOpacity={0.95}
        >
          {/* Image/Video - Left Side */}
          <View style={{ position: 'relative', width: 100, height: 100, borderRadius: theme.borderRadius.md, overflow: 'hidden' }}>
            {typeof imageSource === 'object' && 'uri' in imageSource && imageSource.uri && isVideoUrl(imageSource.uri) ? (
              <CDNOptimizedVideo
                bucket="sellar-pro-videos"
                path={imageSource.uri.split('/').pop() || ''}
                width={100}
                height={100}
                quality="medium"
                showThumbnail={true}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: theme.colors.surfaceVariant,
                }}
              />
            ) : (
              <Image
                source={imageSource}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: theme.colors.surfaceVariant,
                }}
                resizeMode="cover"
              />
            )}
          </View>

          {/* Content - Middle */}
          <View style={{ flex: 1, marginLeft: theme.spacing.md, justifyContent: 'flex-start' }}>
            {/* Title */}
            <Text 
              variant="body" 
              numberOfLines={2}
              style={{ 
                fontWeight: '600',
                marginBottom: 2,
              }}
            >
              {title}
            </Text>

            {/* Price */}
            <PriceDisplay 
              amount={price}
              previousPrice={previousPrice}
              priceChangedAt={priceChangedAt}
              currency={currency}
              size="sm"
              style={{ marginBottom: 2 }}
            />

            {/* Location */}
            {location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 }}>
                <MapPin size={10} color={theme.colors.text.muted} />
                <Text 
                  variant="location"
                  color="muted"
                  numberOfLines={1}
                >
                  {location}
                </Text>
              </View>
            )}

            {/* Feature Badges */}
            {badges.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                {badges.slice(0, 2).map((badgeItem, index) => (
                  <Badge
                    key={index}
                    variant={badgeItem.variant}
                    text={badgeItem.text}
                    size="xs"
                  />
                ))}
              </View>
            )}
          </View>

          {/* Right Side Container - Menu AND Stats Icons */}
          <View style={{ flexDirection: 'column', justifyContent: 'space-between', marginLeft: theme.spacing.sm, minHeight: 100 }}>
            {/* Three-Dot Menu (for My Listings) OR Heart Icon */}
            <View style={{ alignSelf: 'flex-start' }}>
              {menuActions ? (
                <TouchableOpacity
                  onPress={() => setShowMenu(true)}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.md,
                    width: 30,
                    height: 30,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  activeOpacity={0.7}
                >
                  <MoreVertical size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              ) : onFavoritePress ? (
                <TouchableOpacity
                  onPress={onFavoritePress}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: 16,
                    width: 26,
                    height: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Heart 
                    size={18}
                    color={isFavorited ? '#ff4757' : '#ffffff'} 
                    fill={isFavorited ? '#ff4757' : 'transparent'}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* View Count - Bottom (Always show if available) */}
            {viewCount > 0 && (
              <View style={{ alignSelf: 'flex-start' }}>
                <TouchableOpacity
                  onPress={onViewPress}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 2,
                  }}
                  activeOpacity={0.7}
                >
                  <Eye size={10} color="#ffffff" />
                  <Text 
                    variant="caption" 
                    style={{ 
                      color: '#ffffff',
                      fontSize: 9,
                      fontWeight: '600'
                    }}
                  >
                    {viewCount}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* ImageViewer */}
        <ImageViewer
          visible={imageViewerVisible}
          images={images}
          initialIndex={imageViewerIndex}
          onClose={closeImageViewer}
        />

        {/* Menu Actions Modal */}
        {menuActions && (
          <AppModal
            visible={showMenu}
            onClose={() => setShowMenu(false)}
            title="Actions"
            position="bottom"
          >
            <View style={{ gap: theme.spacing.sm }}>
              {menuActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setShowMenu(false);
                    setTimeout(() => action.onPress(), 300); // Delay to allow modal to close
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.md,
                    gap: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  activeOpacity={0.7}
                >
                  {action.icon}
                  <Text 
                    variant="body" 
                    style={{ 
                      flex: 1,
                      color: action.destructive ? theme.colors.error : theme.colors.text.primary,
                      fontWeight: '500',
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </AppModal>
        )}
      </>
    );
  }

  // DEFAULT & COMPACT VARIANT RENDERING (Vertical layout)
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleLongPress}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: borderRadius ?? (fullWidth ? theme.borderRadius.sm : theme.borderRadius.lg),
          ...(shadowSize ? theme.shadows[shadowSize] : (fullWidth ? theme.shadows.sm : theme.shadows.md)),
          overflow: 'hidden',
          marginBottom: isGridLayout ? 0 : theme.spacing.md,
          height: cardHeight,
          width: cardWidth,
          // Add border in AMOLED mode for better card separation
          ...(themeMode === 'amoled' && {
            borderWidth: 1,
            borderColor: theme.colors.border,
          }),
          // Add custom border if provided (overrides AMOLED border)
          ...(borderColor && {
            borderWidth: 1.5,
            borderColor: borderColor,
          }),
          // Add highlight border if highlighted
          ...(isHighlighted && {
            borderWidth: 3,
            borderColor: theme.colors.warning,
            shadowColor: theme.colors.warning,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
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
              height: variant === 'compact' ? compactImageHeight : imageHeight,
            }}
            containerStyle={{
              backgroundColor: theme.colors.surfaceVariant,
            }}
            width={isGridLayout ? 300 : 400}
            height={imageHeight}
            resizeMode="cover"
            enableLazyLoading={true}
          />
        ) : (
          <Image
            source={imageSource}
            style={{
              width: '100%',
              height: variant === 'compact' ? compactImageHeight : imageHeight,
              backgroundColor: theme.colors.surfaceVariant,
            }}
            resizeMode="cover"
          />
        )}
        
        {/* Video Play Icon Overlay */}
        {hasVideo && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}>
            <View style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 50,
              width: isGridLayout ? 50 : 60,
              height: isGridLayout ? 50 : 60,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Play 
                size={isGridLayout ? 24 : 28} 
                color="#FFFFFF" 
                fill="#FFFFFF" 
              />
            </View>
          </View>
        )}
        
        {badge && (
          <View style={{
            position: 'absolute',
            top: theme.spacing.xs,
            left: theme.spacing.xs,
            zIndex: 2,
          }}>
            <Badge 
              variant={badge.variant} 
              text={badge.text} 
              size="sm" // Always use small size for better space efficiency
            />
          </View>
        )}

        {/* Heart/Favorite Icon */}
        {onFavoritePress && (
          <TouchableOpacity
            onPress={onFavoritePress}
            style={{
              position: 'absolute',
              top: theme.spacing.xs,
              right: theme.spacing.xs,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: isGridLayout ? 16 : 20,
              padding: isGridLayout ? 6 : 8,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
            activeOpacity={0.7}
          >
            <Heart 
              size={isGridLayout ? 18 : 20} // Increased size for better visibility
              color={isFavorited ? '#ff4757' : '#ffffff'} 
              fill={isFavorited ? '#ff4757' : 'transparent'}
            />
          </TouchableOpacity>
        )}

        {/* Report Button */}
        {showReportButton && listingId && currentUserId && seller?.id && currentUserId !== seller.id && (
          <View style={{
            position: 'absolute',
            top: theme.spacing.xs,
            right: onFavoritePress ? (isGridLayout ? 50 : 60) : theme.spacing.xs,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: isGridLayout ? 16 : 20,
            padding: isGridLayout ? 6 : 8,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}>
            <ReportButton
              targetType="listing"
              targetId={listingId}
              targetTitle={title}
              variant="icon"
              size="sm"
              style={{ padding: 0 }}
            />
          </View>
        )}

        {/* Three-Dot Menu (for My Listings - Grid/Default Layout) */}
        {menuActions && !onFavoritePress && (
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={{
              position: 'absolute',
              top: theme.spacing.xs,
              right: theme.spacing.xs,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: isGridLayout ? 16 : 20,
              padding: isGridLayout ? 6 : 8,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
            activeOpacity={0.7}
          >
            <MoreVertical size={18} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* View Count */}
        {viewCount > 0 && (
          <TouchableOpacity
            onPress={onViewPress}
            style={{
              position: 'absolute',
              bottom: theme.spacing.xs,
              right: theme.spacing.xs,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: isGridLayout ? 8 : 12,
              paddingHorizontal: isGridLayout ? 6 : 8,
              paddingVertical: isGridLayout ? 2 : 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: isGridLayout ? 2 : 4,
            }}
            activeOpacity={0.7}
          >
            <Eye size={isGridLayout ? 10 : 12} color="#ffffff" />
            <Text 
              variant="caption" 
              style={{ 
                color: '#ffffff', 
                fontSize: isGridLayout ? 9 : 11,
                fontWeight: '600'
              }}
            >
              {viewCount > 999 ? `${Math.floor(viewCount / 1000)}k` : viewCount.toString()}
            </Text>
          </TouchableOpacity>
        )}

        {/* Favorites Count */}
        {favoritesCount > 0 && (
          <View
            style={{
              position: 'absolute',
              bottom: theme.spacing.xs,
              left: theme.spacing.xs,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: isGridLayout ? 8 : 12,
              paddingHorizontal: isGridLayout ? 6 : 8,
              paddingVertical: isGridLayout ? 2 : 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: isGridLayout ? 2 : 4,
            }}
          >
            <Text style={{ fontSize: isGridLayout ? 10 : 12, color: '#ff4757' }}>♡</Text>
            <Text 
              variant="caption" 
              style={{ 
                color: '#ffffff', 
                fontSize: isGridLayout ? 9 : 11,
                fontWeight: '600'
              }}
            >
              {favoritesCount > 999 ? `${Math.floor(favoritesCount / 1000)}k` : favoritesCount.toString()}
            </Text>
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
              marginBottom: isGridLayout ? 2 : theme.spacing.xs,
              fontSize: isGridLayout ? 12 : undefined, // Reduced from 13 to 12
              fontWeight: isGridLayout ? '600' : undefined,
              lineHeight: isGridLayout ? 15 : undefined, // Reduced from 16 to 15
            }}
          >
            {title}
          </Text>

          <PriceDisplay 
            amount={price}
            previousPrice={previousPrice}
            priceChangedAt={priceChangedAt}
            currency={currency}
            size={isGridLayout ? 'sm' : 'lg'}
            style={{ marginBottom: isGridLayout ? 2 : theme.spacing.sm }}
          />
        </View>

        {location && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isGridLayout ? theme.spacing.xs : theme.spacing.sm, gap: 4 }}>
            <MapPin size={10} color={theme.colors.text.muted} />
            <Text 
              variant="location"
              color="muted"
              numberOfLines={1}
            >
              {location}
            </Text>
          </View>
        )}

        {/* Seller Info - Only show if seller exists and not in grid layout */}
        {seller && !isGridLayout && (
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

    {/* Menu Actions Modal */}
    {menuActions && (
      <AppModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        title="Actions"
        position="bottom"
      >
        <View style={{ gap: theme.spacing.sm }}>
          {menuActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setShowMenu(false);
                setTimeout(() => action.onPress(), 300); // Delay to allow modal to close
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: theme.spacing.md,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                gap: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
              activeOpacity={0.7}
            >
              {action.icon}
              <Text 
                variant="body" 
                style={{ 
                  flex: 1,
                  color: action.destructive ? theme.colors.error : theme.colors.text.primary,
                  fontWeight: '500',
                }}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </AppModal>
    )}
  </>
  );
});

// Export Card as an alias for ProductCard
export { ProductCard };
export const Card = ProductCard;