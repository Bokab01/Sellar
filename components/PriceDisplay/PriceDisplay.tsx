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
  showCurrency?: boolean;
  style?: any;
}

export function PriceDisplay({
  amount,
  currency = 'GHS',
  size = 'md',
  variant = 'default',
  originalPrice,
  showCurrency = true,
  style,
}: PriceDisplayProps) {
  const { theme } = useTheme();

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
    switch (variant) {
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

  const formattedPrice = showCurrency ? formatPrice(amount || 0, currency) : (amount || 0).toLocaleString();
  const formattedOriginalPrice = originalPrice && showCurrency 
    ? formatPrice(originalPrice, currency) 
    : originalPrice?.toLocaleString();

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
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }, style]}>
      <Text
        variant={getTextVariant()}
        style={{
          color: getPriceColor(),
          fontSize: getFontSize(),
          fontWeight: '700',
          textDecorationLine: variant === 'original' ? 'line-through' : 'none',
        }}
      >
        {formattedPrice}
      </Text>

      {originalPrice && variant === 'discount' && (
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.text.muted,
            fontSize: getFontSize() * 0.8,
            textDecorationLine: 'line-through',
          }}
        >
          {formattedOriginalPrice}
        </Text>
      )}
    </View>
  );
}
