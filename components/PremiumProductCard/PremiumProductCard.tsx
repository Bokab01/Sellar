import React from 'react';
import { View, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { CompactUserBadges } from '@/components/UserBadgeSystem';
import { ListingImage } from '@/components/OptimizedImage/OptimizedImage';
import { useMemoryManager } from '@/utils/memoryManager';
import { ImageViewer } from '@/components/ImageViewer/ImageViewer';
import { useImageViewer } from '@/hooks/useImageViewer';
// Removed usePremiumBranding import to avoid infinite re-renders
import { Heart, Eye, Crown, Zap, Star } from 'lucide-react-native';

interface PremiumProductCardProps {
  image: ImageSourcePropType | string | string[];
  imagePath?: string;
  title: string;
  price: number;
  currency?: string;
  seller: {
    id?: string;
    name: string;
    avatar?: string;
    rating?: number;
    isBusinessUser?: boolean; // New prop to identify business users
    isVerified?: boolean; // ID verification status
    isBusinessVerified?: boolean; // Business verification status
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
  fullWidth?: boolean;
  enableImageViewer?: boolean;
  listingId?: string;
  isFavorited?: boolean;
  viewCount?: number;
  onFavoritePress?: () => void;
  onViewPress?: () => void;
  // Premium features
  isBoosted?: boolean;
  isSponsored?: boolean;
  isPriority?: boolean;
}

export function PremiumProductCard({
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
  listingId,
  isFavorited = false,
  viewCount = 0,
  onFavoritePress,
  onViewPress,
  // Premium features
  isBoosted = false,
  isSponsored = false,
  isPriority = false,
}: PremiumProductCardProps) {
  const { theme } = useTheme();
  const { shouldLoadHeavyComponent } = useMemoryManager();
  
  // Simple business user check without complex memoization
  const isBusinessUser = seller?.isBusinessUser || false;
  
  // Simple inline functions without memoization to avoid infinite re-renders
  const getCardStyles = () => ({
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden' as const,
    borderWidth: isBusinessUser ? 2 : 1,
    borderColor: isBusinessUser ? theme.colors.primary : theme.colors.border,
    ...(isBusinessUser ? theme.shadows.lg : theme.shadows.sm),
  });

  const getBadgeConfig = () => isBusinessUser ? {
    text: 'PRO',
    variant: 'primary' as const,
    size: 'small' as const,
  } : null;

  const getRibbonStyles = () => null;

  const getSellerStyles = () => ({
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
    badge: null,
  });

  const getPriorityIndicator = () => null;

  const getImageStyles = () => ({
    borderRadius: theme.borderRadius.md,
  });

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
  const totalCardHeight = isGridLayout ? 320 : 360;
  const imageHeight = isGridLayout ? totalCardHeight * 0.7 : 200;
  const cardPadding = isGridLayout ? theme.spacing.sm : theme.spacing.lg;

  // Get premium styling
  const cardStyles = getCardStyles();
  const premiumBadgeConfig = getBadgeConfig();
  const ribbonStyles = getRibbonStyles();
  const sellerStyles = getSellerStyles();
  const priorityIndicator = getPriorityIndicator();
  const imageStyles = getImageStyles();

  const handleLongPress = () => {
    if (enableImageViewer && images.length > 0) {
      openImageViewer(0);
    }
  };

  const handleImagePress = () => {
    if (enableImageViewer && images.length > 0) {
      openImageViewer(0);
    } else if (onPress) {
      onPress();
    }
  };

  const renderPremiumIndicators = () => {
    if (!seller.isBusinessUser) return null;

    return (
      <View style={{
        position: 'absolute',
        top: theme.spacing.sm,
        left: theme.spacing.sm,
        flexDirection: 'row',
        gap: theme.spacing.xs,
        zIndex: 10,
      }}>
        {isBoosted && (
          <Badge
            text="BOOSTED"
            variant="warning"
            size="small"
            icon={<Zap size={12} color={theme.colors.warning} />}
            style={{
              backgroundColor: theme.colors.warning + '20',
              borderColor: theme.colors.warning,
              borderWidth: 1,
            }}
          />
        )}
        {isSponsored && (
          <Badge
            text="SPONSORED"
            variant="info"
            size="small"
            icon={<Star size={12} color={theme.colors.info} />}
            style={{
              backgroundColor: theme.colors.info + '20',
              borderColor: theme.colors.info,
              borderWidth: 1,
            }}
          />
        )}
        {isPriority && (
          <Badge
            text="PRIORITY"
            variant="success"
            size="small"
            icon={<Crown size={12} color={theme.colors.success} />}
            style={{
              backgroundColor: theme.colors.success + '20',
              borderColor: theme.colors.success,
              borderWidth: 1,
            }}
          />
        )}
      </View>
    );
  };

  const renderBusinessBadge = () => {
    if (!seller.isBusinessUser || !premiumBadgeConfig) return null;

    return (
      <View style={{
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
        zIndex: 10,
      }}>
        <Text
          variant="caption"
          style={{
            color: theme.colors.primaryForeground,
            fontWeight: '600',
            fontSize: 10,
          }}
        >
          {premiumBadgeConfig.text}
        </Text>
      </View>
    );
  };

  const renderPriorityIndicator = () => {
    if (!seller.isBusinessUser || !priorityIndicator) return null;

    return <View style={priorityIndicator} />;
  };

  const renderEnhancedSeller = () => {
    const styles = getSellerStyles();
    
    return (
      <View style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: theme.spacing.sm,
        },
        styles.container
      ]}>
        <Avatar
          name={seller.name}
          source={seller.avatar}
          size="sm"
          style={{ marginRight: theme.spacing.sm }}
        />
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={onSellerPress}>
            <Text
              variant="bodySmall"
              style={[
                { fontWeight: '500' },
                styles.name
              ]}
              numberOfLines={1}
            >
              {seller.name}
            </Text>
          </TouchableOpacity>
          {seller.rating && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text variant="caption" color="muted">
                {seller.rating.toFixed(1)}
              </Text>
              <Text variant="caption" color="warning" style={{ marginLeft: 2 }}>
                ★
              </Text>
            </View>
          )}
        </View>
        <CompactUserBadges
          isBusinessUser={seller.isBusinessUser}
          isVerified={seller.isVerified}
          isBusinessVerified={seller.isBusinessVerified}
        />
      </View>
    );
  };

  return (
    <View style={{ 
      width: fullWidth ? '100%' : isGridLayout ? '48%' : '100%',
      marginBottom: theme.spacing.lg,
    }}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleLongPress}
        activeOpacity={0.9}
        style={[
          cardStyles,
          {
            height: totalCardHeight,
            position: 'relative',
          }
        ]}
      >
        {/* Priority Indicator */}
        {renderPriorityIndicator()}

        {/* Image Section */}
        <View style={{ height: imageHeight, position: 'relative' }}>
          {shouldLoadHeavyComponent() ? (
            imagePath ? (
              <TouchableOpacity onPress={handleImagePress} style={{ flex: 1 }}>
                <ListingImage
                  path={imagePath}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderTopLeftRadius: theme.borderRadius.lg,
                    borderTopRightRadius: theme.borderRadius.lg,
                    ...imageStyles
                  }}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleImagePress} style={{ flex: 1 }}>
                <Image
                  source={imageSource}
                  style={[
                    {
                      width: '100%',
                      height: '100%',
                      borderTopLeftRadius: theme.borderRadius.lg,
                      borderTopRightRadius: theme.borderRadius.lg,
                    },
                    imageStyles
                  ]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: theme.colors.surfaceVariant,
                borderTopLeftRadius: theme.borderRadius.lg,
                borderTopRightRadius: theme.borderRadius.lg,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text variant="caption" color="muted">
                Loading...
              </Text>
            </View>
          )}

          {/* Premium Indicators */}
          {renderPremiumIndicators()}

          {/* Business Badge */}
          {renderBusinessBadge()}

          {/* Regular Badge */}
          {badge && (
            <View style={{
              position: 'absolute',
              bottom: theme.spacing.sm,
              left: theme.spacing.sm,
              zIndex: 5,
            }}>
              <Badge
                text={badge.text}
                variant={badge.variant || 'info'}
                size="small"
              />
            </View>
          )}

          {/* Favorite & View Actions */}
          <View style={{
            position: 'absolute',
            bottom: theme.spacing.sm,
            right: theme.spacing.sm,
            flexDirection: 'row',
            gap: theme.spacing.xs,
            zIndex: 5,
          }}>
            {viewCount > 0 && (
              <TouchableOpacity
                onPress={onViewPress}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: theme.borderRadius.sm,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Eye size={12} color="white" />
                <Text
                  variant="caption"
                  style={{
                    color: 'white',
                    marginLeft: theme.spacing.xs,
                    fontSize: 10,
                  }}
                >
                  {viewCount}
                </Text>
              </TouchableOpacity>
            )}
            
            {onFavoritePress && (
              <TouchableOpacity
                onPress={onFavoritePress}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: theme.borderRadius.sm,
                  padding: theme.spacing.sm,
                }}
              >
                <Heart
                  size={16}
                  color={isFavorited ? theme.colors.error : 'white'}
                  fill={isFavorited ? theme.colors.error : 'transparent'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={{ 
          padding: cardPadding,
          flex: 1,
          justifyContent: 'space-between',
        }}>
          {/* Title and Price */}
          <View>
            <Text
              variant={isGridLayout ? 'body' : 'h4'}
              style={{
                fontWeight: '600',
                marginBottom: theme.spacing.xs,
                color: seller.isBusinessUser ? theme.colors.primary : theme.colors.text.primary,
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
            
            <PriceDisplay
              amount={price}
              currency={currency}
              size={isGridLayout ? 'md' : 'lg'}
              style={{ 
                marginBottom: theme.spacing.sm,
                fontWeight: seller.isBusinessUser ? '700' : '600',
              }}
            />
            
            {location && (
              <Text variant="caption" color="muted" numberOfLines={1}>
                📍 {location}
              </Text>
            )}
          </View>

          {/* Enhanced Seller Info */}
          {renderEnhancedSeller()}

          {/* Action Button */}
          {onActionPress && (
            <Button
              variant={seller.isBusinessUser ? "primary" : "secondary"}
              size="sm"
              onPress={onActionPress}
              style={{ 
                marginTop: theme.spacing.sm,
                ...(seller.isBusinessUser && {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                })
              }}
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
    </View>
  );
}
