/**
 * Step 2: Location & Address
 * Address input with autocomplete and map pin placement
 */

import React, { memo, useCallback, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { MapPin, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import type { ShopSetupData, ShopAddress } from '../types';
import { AddressAutocomplete, LocationPickerMap } from '../components';

interface Step2LocationProps {
  data: Partial<ShopSetupData>;
  updateData: <K extends keyof ShopSetupData>(key: K, value: ShopSetupData[K]) => void;
  updateMultiple: (updates: Partial<ShopSetupData>) => void;
}

const Step2Location = memo<Step2LocationProps>(({ data, updateData }) => {
  const { theme } = useTheme();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const address = data.address || {} as ShopAddress;

  const updateAddress = useCallback((updates: Partial<ShopAddress>) => {
    updateData('address', { ...address, ...updates });
  }, [address, updateData]);

  // Get current location
  const handleGetCurrentLocation = useCallback(async () => {
    try {
      setIsGettingLocation(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission denied. Please enable location access in settings.');
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResult) {
        updateAddress({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: `${addressResult.street || ''} ${addressResult.streetNumber || ''}`.trim(),
          city: addressResult.city || addressResult.subregion || '',
          state: addressResult.region || 'Greater Accra',
          postal_code: addressResult.postalCode || '',
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get current location. Please enter manually.');
    } finally {
      setIsGettingLocation(false);
    }
  }, [updateAddress]);

  // Handle address selection from autocomplete
  const handleAddressSelect = useCallback((selectedAddress: any) => {
    updateAddress({
      address: selectedAddress.address,
      city: selectedAddress.city,
      state: selectedAddress.state,
      postal_code: selectedAddress.postal_code,
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
    });
  }, [updateAddress]);

  // Handle map pin drag
  const handleMapPinChange = useCallback((coords: { latitude: number; longitude: number }) => {
    updateAddress({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  }, [updateAddress]);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Header */}
      <View>
        <Text variant="h3" style={{ marginBottom: theme.spacing.xs }}>
          Where is your shop located?
        </Text>
        <Text variant="body" color="secondary">
          Help buyers find you with an accurate address
        </Text>
      </View>

      {/* Get Current Location Button */}
      <TouchableOpacity
        onPress={handleGetCurrentLocation}
        disabled={isGettingLocation}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          gap: theme.spacing.sm,
        }}
      >
        {isGettingLocation ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Navigation size={20} color={theme.colors.primary} />
        )}
        <Text variant="body" style={{ color: theme.colors.primary, fontWeight: '600' }}>
          {isGettingLocation ? 'Getting location...' : 'Use Current Location'}
        </Text>
      </TouchableOpacity>

      {/* Address Autocomplete */}
      <AddressAutocomplete
        value={address.address || ''}
        onSelect={handleAddressSelect}
        placeholder="Search for your shop address..."
      />

      {/* Manual Address Fields */}
      <View style={{ gap: theme.spacing.md }}>
        <Input
          label="Street Address *"
          placeholder="e.g., 123 Oxford Street"
          value={address.address || ''}
          onChangeText={(value: string) => updateAddress({ address: value })}
          maxLength={200}
        />

        <Input
          label="Address Line 2"
          placeholder="Suite, floor, building (optional)"
          value={address.address_line_2 || ''}
          onChangeText={(value: string) => updateAddress({ address_line_2: value })}
          maxLength={100}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label="City *"
              placeholder="e.g., Accra"
              value={address.city || ''}
              onChangeText={(value: string) => updateAddress({ city: value })}
              autoCapitalize="words"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Region *"
              placeholder="e.g., Greater Accra"
              value={address.state || ''}
              onChangeText={(value: string) => updateAddress({ state: value })}
              autoCapitalize="words"
            />
          </View>
        </View>

        <Input
          label="Postal Code"
          placeholder="e.g., GA-123-4567 (optional)"
          value={address.postal_code || ''}
          onChangeText={(value: string) => updateAddress({ postal_code: value })}
          autoCapitalize="characters"
          maxLength={20}
        />
      </View>

      {/* Landmark Directions (Ghana-specific) */}
      <View>
        <Input
          label="Landmark Directions"
          placeholder="e.g., Behind Total Filling Station, near Shoprite"
          value={address.directions_note || ''}
          onChangeText={(value: string) => updateAddress({ directions_note: value })}
          multiline
          numberOfLines={2}
          maxLength={200}
        />
        <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
          Help customers find you with local landmarks
        </Text>
      </View>

      {/* Map Pin Placement */}
      {address.latitude && address.longitude ? (
        <View>
          <Text variant="bodySmall" style={{ marginBottom: theme.spacing.sm, fontWeight: '600' }}>
            Confirm Your Location on Map *
          </Text>
          <LocationPickerMap
            initialLocation={{
              latitude: address.latitude,
              longitude: address.longitude,
            }}
            onLocationChange={handleMapPinChange}
          />
          <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
            Drag the pin to adjust your exact location
          </Text>
        </View>
      ) : (
        <View style={{
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}>
          <MapPin size={32} color={theme.colors.text.muted} />
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            Enter an address or use current location to pin your shop on the map
          </Text>
        </View>
      )}

      {/* Info Box */}
      <View style={{
        backgroundColor: theme.colors.warning + '10',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
      }}>
        <Text variant="bodySmall" style={{ lineHeight: 20 }}>
          ⚠️ <Text style={{ fontWeight: '600' }}>Important:</Text> Make sure your pin is accurately placed. Buyers will use this to visit your shop!
        </Text>
      </View>
    </View>
  );
});

Step2Location.displayName = 'Step2Location';

export default Step2Location;

