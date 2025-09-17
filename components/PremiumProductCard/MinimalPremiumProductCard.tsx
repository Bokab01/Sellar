import React from 'react';
import { View, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { useMemoryManager } from '@/utils/memoryManager';
import { useImageViewer } from '@/hooks/useImageViewer';
import { ImageViewer } from '@/components/ImageViewer/ImageViewer';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { CompactUserBadges } from '@/components/UserBadges/UserBadges';

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
}

export function MinimalPremiumProductCard({
  title,
  price,
  currency = 'GHS',
  image,
  seller,
  onPress,
}: MinimalPremiumProductCardProps) {
  const { theme } = useTheme();
  const { shouldLoadHeavyComponent } = useMemoryManager();
  
  // Handle different image formats for ImageViewer (same as original)
  const images = Array.isArray(image) 
    ? image.filter(img => typeof img === 'string') as string[]
    : typeof image === 'string' 
    ? [image] 
    : [];
  
  const displayImage = Array.isArray(image) ? image[0] : image;
  const imageSource = typeof displayImage === 'string' ? displayImage : displayImage;

  // Add useImageViewer hook
  const {
    visible: imageViewerVisible,
    currentIndex: imageViewerIndex,
    openViewer: openImageViewer,
    closeViewer: closeImageViewer,
  } = useImageViewer({ images });
  
  // Add the complex styling functions from original PremiumProductCard
  const isBusinessUser = seller?.isBusinessUser || false;
  
  const getCardStyles = () => ({
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden' as const,
    borderWidth: isBusinessUser ? 2 : 1,
    borderColor: isBusinessUser ? theme.colors.primary : theme.colors.border,
    ...(isBusinessUser ? theme.shadows.lg : theme.shadows.sm),
  });

  const getBadgeConfig = () => isBusinessUser ? {
    text: 'BUSINESS',
    variant: 'primary' as const,
    size: 'small' as const,
  } : null;

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
  });

  // Calculate styles
  const cardStyles = getCardStyles();
  const badgeConfig = getBadgeConfig();
  const sellerStyles = getSellerStyles();
  
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        style={{
          ...cardStyles,
          // Remove fixed width - let container determine width like ProductCard
          height: 280, // Match ProductCard grid layout height
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
              fontSize: 10,
              fontWeight: '600'
            }}>
              ⭐ BUSINESS
            </Text>
          </View>
        )}

        {/* Image Section */}
        {imageSource ? (
          <TouchableOpacity
            onPress={() => {
              if (images.length > 0) {
                openImageViewer(0);
              }
            }}
            style={{ 
              height: 182, // Match ProductCard grid image height (65% of 280px)
              position: 'relative',
            }}
          >
            <Image
              source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource}
              style={{
                width: '100%',
                height: '100%',
                borderTopLeftRadius: theme.borderRadius.lg,
                borderTopRightRadius: theme.borderRadius.lg,
                backgroundColor: theme.colors.surfaceVariant,
              }}
              resizeMode="cover"
            />
            
            {/* Gradient overlay for better text readability */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderTopLeftRadius: theme.borderRadius.lg,
              borderTopRightRadius: theme.borderRadius.lg,
            }} />
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
          justifyContent: 'space-between',
          minHeight: 98, // Remaining height after image (280 - 182 = 98)
        }}>
          {/* Title and Price */}
          <View>
            <Text 
              variant="body" 
              numberOfLines={1} 
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
                marginBottom: theme.spacing.xs,
                fontWeight: '700',
              }}
            />
          </View>
          
          {/* Seller Info */}
          <View style={{
            ...sellerStyles.container,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text 
                variant="caption" 
                color="secondary"
                style={{
                  ...sellerStyles.name,
                  fontSize: 10, // Smaller to fit in compact space
                }}
                numberOfLines={1}
              >
                {seller.name}
              </Text>
              
              {seller.isBusinessUser && (
                <Text 
                  variant="caption" 
                  style={{ 
                    color: theme.colors.primary,
                    fontSize: 8, // Smaller for compact layout
                    fontWeight: '500',
                    marginTop: 1,
                  }}
                >
                  Verified Business
                </Text>
              )}
            </View>
            
            {/* Premium Badge */}
            {seller.isBusinessUser && (
              <View style={{
                backgroundColor: theme.colors.primary + '15',
                paddingHorizontal: 4, // Smaller padding for compact layout
                paddingVertical: 1,
                borderRadius: theme.borderRadius.sm,
                borderWidth: 1,
                borderColor: theme.colors.primary + '30',
              }}>
                <Text variant="caption" style={{ 
                  color: theme.colors.primary,
                  fontSize: 7, // Smaller font for compact layout
                  fontWeight: '600'
                }}>
                  PREMIUM
                </Text>
              </View>
            )}
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
}
