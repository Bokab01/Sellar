/**
 * ShopInfoCard Component
 * Displays physical shop information in a compact, beautiful card
 * Optimized with memoization
 */

import React, { memo, useCallback } from 'react';
import { View, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { MapPin, Phone, Clock, Navigation, ExternalLink } from 'lucide-react-native';

interface ShopInfoCardProps {
  shopName: string;
  address: string;
  city?: string;
  state?: string;
  phone?: string;
  directionsNote?: string;
  latitude?: number;
  longitude?: number;
  isOpen?: boolean;
  todayHours?: string;
  onViewHours?: () => void;
  compact?: boolean;
}

export const ShopInfoCard = memo<ShopInfoCardProps>(({
  shopName,
  address,
  city,
  state,
  phone,
  directionsNote,
  latitude,
  longitude,
  isOpen,
  todayHours,
  onViewHours,
  compact = false,
}) => {
  const { theme } = useTheme();

  const handleCallShop = useCallback(() => {
    if (!phone) return;
    
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    });
  }, [phone]);

  const handleGetDirections = useCallback(() => {
    if (!latitude || !longitude) return;

    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${latitude},${longitude}`;
    const label = encodeURIComponent(shopName);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Google Maps web
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latLng}`;
          Linking.openURL(googleMapsUrl);
        }
      });
    }
  }, [latitude, longitude, shopName]);

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flex: 1 }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.xs }}>
            {shopName}
          </Text>
          {isOpen !== undefined && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}>
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isOpen ? theme.colors.success : theme.colors.destructive,
              }} />
              <Text variant="caption" style={{
                color: isOpen ? theme.colors.success : theme.colors.destructive,
                fontWeight: '600',
              }}>
                {isOpen ? 'Open Now' : 'Closed'}
              </Text>
              {todayHours && (
                <Text variant="caption" color="muted">
                  • {todayHours}
                </Text>
              )}
            </View>
          )}
        </View>
        
        {onViewHours && (
          <TouchableOpacity
            onPress={onViewHours}
            style={{
              padding: theme.spacing.sm,
            }}
          >
            <Clock size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Address */}
      <View style={{
        flexDirection: 'row',
        gap: theme.spacing.sm,
      }}>
        <MapPin size={16} color={theme.colors.text.secondary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ lineHeight: 20 }}>
            {address}
          </Text>
          {(city || state) && (
            <Text variant="bodySmall" color="secondary">
              {[city, state].filter(Boolean).join(', ')}
            </Text>
          )}
          {directionsNote && !compact && (
            <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs, fontStyle: 'italic' }}>
              📍 {directionsNote}
            </Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.xs,
      }}>
        {/* Get Directions */}
        {latitude && longitude && (
          <TouchableOpacity
            onPress={handleGetDirections}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.xs,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <Navigation size={16} color={theme.colors.primaryForeground} />
            <Text style={{
              color: theme.colors.primaryForeground,
              fontWeight: '600',
              fontSize: 14,
            }}>
              Directions
            </Text>
          </TouchableOpacity>
        )}

        {/* Call Shop */}
        {phone && (
          <TouchableOpacity
            onPress={handleCallShop}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.xs,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Phone size={16} color={theme.colors.text.primary} />
            <Text style={{
              color: theme.colors.text.primary,
              fontWeight: '600',
              fontSize: 14,
            }}>
              Call
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

ShopInfoCard.displayName = 'ShopInfoCard';

