import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader, Button, Input } from '@/components';
import { useAppStore } from '@/store/useAppStore';

export default function FilterPriceScreen() {
  const { theme } = useTheme();
  const { filters, setFilters } = useAppStore();
  const [minPrice, setMinPrice] = useState(filters.priceRange.min?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(filters.priceRange.max?.toString() || '');

  const handleApply = () => {
    const min = minPrice ? parseFloat(minPrice) : undefined;
    const max = maxPrice ? parseFloat(maxPrice) : undefined;
    
    setFilters({ 
      ...filters, 
      priceRange: { min, max } 
    });
    router.back();
  };

  const handleClearAll = () => {
    setMinPrice('');
    setMaxPrice('');
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Price"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={(minPrice || maxPrice) ? [
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, padding: theme.spacing.lg }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Price Range
          </Text>
          
          <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.lg }}>
            Enter minimum and maximum price in GHS
          </Text>

          <View style={{ gap: theme.spacing.lg }}>
            <View>
              <Text variant="bodySmall" style={{ marginBottom: theme.spacing.sm, fontWeight: '500' }}>
                Minimum Price (GH₵)
              </Text>
              <Input
                placeholder="0"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
            </View>

            <View>
              <Text variant="bodySmall" style={{ marginBottom: theme.spacing.sm, fontWeight: '500' }}>
                Maximum Price (GH₵)
              </Text>
              <Input
                placeholder="No limit"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>
          </View>
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
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}
