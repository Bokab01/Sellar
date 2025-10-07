import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { Check } from 'lucide-react-native';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

export default function FilterSortScreen() {
  const { theme } = useTheme();
  const { filters, setFilters } = useAppStore();
  const [selectedSort, setSelectedSort] = useState(filters.sortBy || 'newest');

  const handleSelect = (value: string) => {
    setSelectedSort(value);
    setFilters({ ...filters, sortBy: value });
    router.back();
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Sort by"
        showBackButton
        onBackPress={() => router.back()}
      />

      <View style={{ flex: 1 }}>
        {SORT_OPTIONS.map((option, index) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => handleSelect(option.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing.lg,
              paddingHorizontal: theme.spacing.lg,
              borderBottomWidth: index < SORT_OPTIONS.length - 1 ? 1 : 0,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
            activeOpacity={0.7}
          >
            <Text 
              variant="body" 
              style={{ 
                fontWeight: selectedSort === option.value ? '600' : '400',
                color: selectedSort === option.value ? theme.colors.primary : theme.colors.text.primary
              }}
            >
              {option.label}
            </Text>
            {selectedSort === option.value && (
              <Check size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaWrapper>
  );
}
