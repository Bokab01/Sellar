import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader, Button } from '@/components';
import { LocationPicker } from '@/components/LocationPicker/LocationPicker';
import { useAppStore } from '@/store/useAppStore';

export default function FilterLocationScreen() {
  const { theme } = useTheme();
  const { filters, setFilters } = useAppStore();
  const [selectedLocation, setSelectedLocation] = useState(filters.location || '');

  const handleApply = () => {
    setFilters({ ...filters, location: selectedLocation });
    router.back();
  };

  const handleClearAll = () => {
    setSelectedLocation('');
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Location"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={selectedLocation ? [
          <TouchableOpacity
            key="clear"
            onPress={handleClearAll}
            style={{ paddingHorizontal: theme.spacing.md }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              Clear
            </Text>
          </TouchableOpacity>
        ] : []}
      />

      <View style={{ flex: 1, padding: theme.spacing.lg }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Select Location
        </Text>
        
        <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.lg }}>
          Filter listings by location
        </Text>

        <LocationPicker
          value={selectedLocation}
          onLocationSelect={setSelectedLocation}
          placeholder="Select location"
        />
      </View>

      {/* Apply Button */}
      <View
        style={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Button
          variant="primary"
          onPress={handleApply}
          size="lg"
        >
          Apply
        </Button>
      </View>
    </SafeAreaWrapper>
  );
}
