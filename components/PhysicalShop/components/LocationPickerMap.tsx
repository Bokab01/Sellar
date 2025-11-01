/**
 * LocationPickerMap Component
 * Interactive map for pinning shop location
 * Optimized with lazy loading and gesture handling
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

interface LocationPickerMapProps {
  initialLocation: {
    latitude: number;
    longitude: number;
  };
  onLocationChange: (coords: { latitude: number; longitude: number }) => void;
}

const INITIAL_DELTA = {
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

export const LocationPickerMap = memo<LocationPickerMapProps>(({
  initialLocation,
  onLocationChange,
}) => {
  const { theme } = useTheme();
  const [markerPosition, setMarkerPosition] = useState(initialLocation);
  const mapRef = useRef<MapView>(null);

  const handleMarkerDragEnd = useCallback((e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
    onLocationChange({ latitude, longitude });
  }, [onLocationChange]);

  const handleMapPress = useCallback((e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
    onLocationChange({ latitude, longitude });
  }, [onLocationChange]);

  return (
    <View>
      <View style={{
        height: 300,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            ...initialLocation,
            ...INITIAL_DELTA,
          }}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          toolbarEnabled={false}
          mapType="standard"
        >
          <Marker
            coordinate={markerPosition}
            draggable
            onDragEnd={handleMarkerDragEnd}
            title="Your Shop Location"
            description="Drag to adjust pin"
            pinColor={theme.colors.primary}
          />
        </MapView>
      </View>

      {/* Coordinates Display */}
      <View style={{
        marginTop: theme.spacing.xs,
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.borderRadius.sm,
      }}>
        <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
          📍 {markerPosition.latitude.toFixed(6)}, {markerPosition.longitude.toFixed(6)}
        </Text>
      </View>
    </View>
  );
});

LocationPickerMap.displayName = 'LocationPickerMap';

