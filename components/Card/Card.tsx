import React from 'react';
import { View, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { CompactUserBadges } from '@/components/UserBadges/UserBadges';

interface ProductCardProps {
  image: ImageSourcePropType | string;
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
    variant?: 'new' | 'sold' | 'featured' | 'discount';
  };
  onPress?: () => void;
  onSellerPress?: () => void;
  onActionPress?: () => void;
  actionText?: string;
  location?: string;
  layout?: 'default' | 'grid';
}

export function ProductCard({
  image,
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
}: ProductCardProps) {
  const { theme } = useTheme();

  const imageSource = typeof image === 'string' ? { uri: image } : image;
  
  const isGridLayout = layout === 'grid';
  const imageHeight = isGridLayout ? 140 : 200;
  const cardPadding = isGridLayout ? theme.spacing.md : theme.spacing.lg;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.md,
        overflow: 'hidden',
        marginBottom: isGridLayout ? 0 : theme.spacing.md,
      }}
      activeOpacity={0.95}
    >
      {/* Image Container */}
      <View style={{ position: 'relative' }}>
        <Image
          source={imageSource}
          style={{
            width: '100%',
            height: imageHeight,
            backgroundColor: theme.colors.surfaceVariant,
          }}
          resizeMode="cover"
        />
        
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
      <View style={{ padding: cardPadding }}>
        <Text 
          variant={isGridLayout ? 'body' : 'h4'} 
          numberOfLines={isGridLayout ? 1 : 2}
          style={{ 
            marginBottom: theme.spacing.sm,
            fontSize: isGridLayout ? 14 : undefined,
            fontWeight: isGridLayout ? '600' : undefined,
          }}
        >
          {title}
        </Text>

        <PriceDisplay 
          amount={price} 
          currency={currency}
          size={isGridLayout ? 'md' : 'lg'}
          style={{ marginBottom: isGridLayout ? theme.spacing.sm : theme.spacing.md }}
        />

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
            style={{ marginBottom: theme.spacing.sm }}
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
  );
}