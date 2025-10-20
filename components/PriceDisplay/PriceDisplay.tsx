import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

type PriceSize = 'sm' | 'md' | 'lg' | 'xl';
type PriceVariant = 'default' | 'discount' | 'original' | 'free';

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  size?: PriceSize;
  variant?: PriceVariant;
  originalPrice?: number;
  previousPrice?: number; // Auto-detect price drops
  priceChangedAt?: string; // When price changed
  showPriceDropBadge?: boolean; // Show "X% OFF" badge
  showCurrency?: boolean;
  style?: any;
}

export function PriceDisplay({
  amount,
  currency = 'GHS',
  size = 'md',
  variant = 'default',
  originalPrice,
  previousPrice,
  priceChangedAt,
  showPriceDropBadge = true,
  showCurrency = true,
  style,
}: PriceDisplayProps) {
  const { theme } = useTheme();

  // Auto-detect price drop from previousPrice
  const hasPriceDrop = previousPrice && amount < previousPrice;
  const discountPercent = hasPriceDrop 
    ? Math.round(((previousPrice! - amount) / previousPrice!) * 100)
    : 0;

  // Check if price drop is recent (within 7 days)
  const isRecentPriceDrop = hasPriceDrop && priceChangedAt 
    ? (new Date().getTime() - new Date(priceChangedAt).getTime()) / (1000 * 60 * 60 * 24) <= 7
    : false;

  // Auto-set variant to discount if there's a price drop
  const effectiveVariant = hasPriceDrop && variant === 'default' ? 'discount' : variant;
  const displayedOriginalPrice = hasPriceDrop ? previousPrice : originalPrice;

  const formatPrice = (price: number, currencyCode: string) => {
    // Format for Ghana Cedis and other currencies
    const formatter = new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    });

    try {
      return formatter.format(price);
    } catch {
      // Fallback for unsupported currencies
      return `${currencyCode} ${price.toLocaleString()}`;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return 14;
      case 'md': return 16;
      case 'lg': return 20;
      case 'xl': return 28;
      default: return 16;
    }
  };

  const getTextVariant = () => {
    switch (size) {
      case 'sm': return 'bodySmall' as const;
      case 'md': return 'body' as const;
      case 'lg': return 'h4' as const;
      case 'xl': return 'h2' as const;
      default: return 'body' as const;
    }
  };

  const getPriceColor = () => {
    switch (effectiveVariant) {
      case 'discount':
        return theme.colors.error;
      case 'original':
        return theme.colors.text.muted;
      case 'free':
        return theme.colors.success;
      case 'default':
      default:
        return theme.colors.text.primary;
    }
  };

  const formattedPrice = showCurrency ? formatPrice(amount || 0, currency) : ((amount || 0)).toLocaleString();
  const formattedOriginalPrice = displayedOriginalPrice && showCurrency 
    ? formatPrice(displayedOriginalPrice, currency) 
    : (displayedOriginalPrice || 0).toLocaleString();

  if (variant === 'free') {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <Text
          variant={getTextVariant()}
          style={{
            color: getPriceColor(),
            fontSize: getFontSize(),
            fontWeight: '700',
          }}
        >
          FREE
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.xs }, style]}>
      {/* Current Price */}
      <Text
        variant={getTextVariant()}
        style={{
          color: getPriceColor(),
          fontSize: getFontSize(),
          fontWeight: '700',
          textDecorationLine: effectiveVariant === 'original' ? 'line-through' : 'none',
        }}
      >
        {formattedPrice}
      </Text>

      {/* Previous/Original Price with Strikethrough */}
      {displayedOriginalPrice && effectiveVariant === 'discount' && (
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.text.muted,
            fontSize: getFontSize() * 0.7,
            textDecorationLine: 'line-through',
            fontWeight: '500',
          }}
        >
          {formattedOriginalPrice}
        </Text>
      )}

      {/* Price Drop Badge (only if recent) */}
      {hasPriceDrop && isRecentPriceDrop && showPriceDropBadge && discountPercent > 0 && (
        <View style={{
          backgroundColor: theme.colors.error + '15',
          borderRadius: theme.borderRadius.xs,
          paddingHorizontal: 4,
          paddingVertical: 1,
          borderWidth: 1,
          borderColor: theme.colors.error + '30',
        }}>
          <Text
            variant="caption"
            style={{
              color: theme.colors.error,
              fontSize: 8,
              fontWeight: '700',
            }}
          >
            -{discountPercent}%
          </Text>
        </View>
      )}
    </View>
  );
}
