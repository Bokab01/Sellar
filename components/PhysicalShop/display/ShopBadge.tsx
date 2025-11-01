/**
 * ShopBadge Component
 * Small badge indicator for sellers with physical shops
 * Optimized and lightweight
 */

import React, { memo } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Store } from 'lucide-react-native';

interface ShopBadgeProps {
  size?: 'small' | 'medium';
  showText?: boolean;
}

export const ShopBadge = memo<ShopBadgeProps>(({
  size = 'medium',
  showText = true,
}) => {
  const { theme } = useTheme();

  const iconSize = size === 'small' ? 12 : 14;
  const padding = size === 'small' ? 4 : 6;
  const fontSize = size === 'small' ? 10 : 11;

  if (!showText) {
    return (
      <View style={{
        width: size === 'small' ? 20 : 24,
        height: size === 'small' ? 20 : 24,
        borderRadius: size === 'small' ? 10 : 12,
        backgroundColor: theme.colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Store size={iconSize} color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: padding * 1.5,
      paddingVertical: padding,
      backgroundColor: theme.colors.primary + '20',
      borderRadius: 12,
    }}>
      <Store size={iconSize} color={theme.colors.primary} />
      <Text style={{
        fontSize,
        fontWeight: '600',
        color: theme.colors.primary,
      }}>
        Physical Shop
      </Text>
    </View>
  );
});

ShopBadge.displayName = 'ShopBadge';

