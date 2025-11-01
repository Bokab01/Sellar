/**
 * PickupOptionsSection Component
 * Reusable pickup options for Create/Edit Listing
 * Only visible for Pro sellers with physical shops
 */

import React, { memo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { Chip } from '@/components/Chip/Chip';
import { Store, Info } from 'lucide-react-native';

interface PickupOptionsSectionProps {
  pickupAvailable: boolean;
  pickupLocationOverride?: string;
  pickupPreparationTime?: number;
  pickupInstructions?: string;
  onPickupAvailableChange: (value: boolean) => void;
  onPickupLocationOverrideChange: (value: string) => void;
  onPickupPreparationTimeChange: (value: number) => void;
  onPickupInstructionsChange: (value: string) => void;
  shopAddress?: string;
  hasPhysicalShop: boolean;
}

const PREPARATION_TIMES = [
  { label: '15 mins', value: 15 },
  { label: '30 mins', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: 'Same day', value: 480 },
  { label: 'Next day', value: 1440 },
];

export const PickupOptionsSection = memo<PickupOptionsSectionProps>(({
  pickupAvailable,
  pickupLocationOverride,
  pickupPreparationTime = 30,
  pickupInstructions,
  onPickupAvailableChange,
  onPickupLocationOverrideChange,
  onPickupPreparationTimeChange,
  onPickupInstructionsChange,
  shopAddress,
  hasPhysicalShop,
}) => {
  const { theme } = useTheme();

  if (!hasPhysicalShop) {
    return null;
  }

  return (
    <View style={{
      backgroundColor: theme.colors.surfaceVariant,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.lg,
    }}>
      {/* Header with Toggle */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{
            backgroundColor: theme.colors.primary + '15',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.sm,
          }}>
            <Store size={20} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h4" style={{ fontWeight: '600' }}>
              Pickup Available
            </Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
              Allow buyers to pickup from your shop
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          onPress={() => onPickupAvailableChange(!pickupAvailable)}
          style={{
            width: 52,
            height: 30,
            borderRadius: 15,
            backgroundColor: pickupAvailable ? theme.colors.success : theme.colors.border,
            justifyContent: 'center',
            paddingHorizontal: 3,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            transform: [{ translateX: pickupAvailable ? 11 : -11 }],
          }} />
        </TouchableOpacity>
      </View>

      {pickupAvailable && (
        <>
          {/* Shop Address Info */}
          <View style={{
            backgroundColor: theme.colors.info + '10',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            borderLeftWidth: 3,
            borderLeftColor: theme.colors.info,
            flexDirection: 'row',
            gap: theme.spacing.sm,
          }}>
            <Info size={16} color={theme.colors.info} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: 4 }}>
                Default Pickup Location
              </Text>
              <Text variant="caption" color="muted">
                {shopAddress || 'Your shop address'}
              </Text>
            </View>
          </View>

          {/* Location Override (Optional) */}
          <View>
            <Input
              label="Custom Pickup Location (Optional)"
              placeholder="e.g., Side entrance, Warehouse 2"
              value={pickupLocationOverride}
              onChangeText={onPickupLocationOverrideChange}
              helper="Override default shop address if pickup is from a different location"
            />
          </View>

          {/* Preparation Time */}
          <View>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              Preparation Time
            </Text>
            <Text variant="caption" color="muted" style={{ marginBottom: theme.spacing.md }}>
              How long will it take to prepare this item for pickup?
            </Text>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.sm,
            }}>
              {PREPARATION_TIMES.map((time) => (
                <Chip
                  key={time.value}
                  text={time.label}
                  variant="filter"
                  selected={pickupPreparationTime === time.value}
                  onPress={() => onPickupPreparationTimeChange(time.value)}
                />
              ))}
            </View>
          </View>

          {/* Pickup Instructions */}
          <View>
            <Input
              label="Pickup Instructions (Optional)"
              placeholder="e.g., Call when you arrive, Use back entrance"
              value={pickupInstructions}
              onChangeText={onPickupInstructionsChange}
              multiline
              numberOfLines={3}
              helper="Help buyers find your shop or know what to do when they arrive"
            />
          </View>
        </>
      )}
    </View>
  );
});

PickupOptionsSection.displayName = 'PickupOptionsSection';

