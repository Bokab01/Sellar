/**
 * PickupOptionBanner Component
 * Displays pickup availability for listings from shops
 * Optimized with memoization
 */

import React, { memo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Package, MapPin, Store } from 'lucide-react-native';

interface PickupOptionBannerProps {
  shopName: string;
  address: string;
  preparationTime?: number; // in minutes
  pickupInstructions?: string;
  onViewShop?: () => void;
  compact?: boolean;
}

export const PickupOptionBanner = memo<PickupOptionBannerProps>(({
  shopName,
  address,
  preparationTime = 0,
  pickupInstructions,
  onViewShop,
  compact = false,
}) => {
  const { theme } = useTheme();

  const formatPreparationTime = () => {
    if (!preparationTime || preparationTime === 0) return 'Usually ready within the hour';
    if (preparationTime < 60) return `Ready in ${preparationTime} minutes`;
    const hours = Math.floor(preparationTime / 60);
    const minutes = preparationTime % 60;
    if (minutes === 0) return `Ready in ${hours} hour${hours > 1 ? 's' : ''}`;
    return `Ready in ${hours}h ${minutes}m`;
  };

  return (
    <TouchableOpacity
      activeOpacity={onViewShop ? 0.7 : 1}
      onPress={onViewShop}
      disabled={!onViewShop}
      style={{
        backgroundColor: theme.colors.primary + '10',
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary + '40',
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
      }}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
      }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Package size={18} color={theme.colors.primaryForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontWeight: '600',
            color: theme.colors.primary,
            marginBottom: 2,
          }}>
            Pickup Available
          </Text>
          <Text variant="caption" color="secondary">
            {formatPreparationTime()}
          </Text>
        </View>
      </View>

      {!compact && (
        <>
          {/* Shop Info */}
          <View style={{
            paddingLeft: 40, // Align with text above
            gap: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Store size={14} color={theme.colors.text.secondary} />
              <Text variant="bodySmall" style={{ fontWeight: '500' }}>
                {shopName}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <MapPin size={14} color={theme.colors.text.secondary} style={{ marginTop: 2 }} />
              <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 18 }}>
                {address}
              </Text>
            </View>
          </View>

          {/* Instructions */}
          {pickupInstructions && (
            <View style={{
              paddingLeft: 40,
              paddingTop: theme.spacing.xs,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}>
              <Text variant="caption" color="muted" style={{ fontStyle: 'italic', lineHeight: 16 }}>
                📋 {pickupInstructions}
              </Text>
            </View>
          )}

          {/* View Shop Link */}
          {onViewShop && (
            <View style={{
              paddingLeft: 40,
              paddingTop: theme.spacing.xs,
            }}>
              <Text variant="bodySmall" style={{
                color: theme.colors.primary,
                fontWeight: '600',
              }}>
                View Shop Details →
              </Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
});

PickupOptionBanner.displayName = 'PickupOptionBanner';

