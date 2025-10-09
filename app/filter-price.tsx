import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader, Button } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { Check, DollarSign } from 'lucide-react-native';

// Common price ranges
const PRICE_RANGES = [
  { min: undefined, max: undefined, label: 'Any Price' },
  { min: undefined, max: 50, label: 'Under ₵50' },
  { min: 50, max: 100, label: '₵50 - ₵100' },
  { min: 100, max: 250, label: '₵100 - ₵250' },
  { min: 250, max: 500, label: '₵250 - ₵500' },
  { min: 500, max: 1000, label: '₵500 - ₵1,000' },
  { min: 1000, max: 2500, label: '₵1,000 - ₵2,500' },
  { min: 2500, max: 5000, label: '₵2,500 - ₵5,000' },
  { min: 5000, max: undefined, label: 'Over ₵5,000' },
];

export default function FilterPriceScreen() {
  const { theme } = useTheme();
  const { filters, setFilters, searchQuery } = useAppStore();
  const [selectedRange, setSelectedRange] = useState<{ min?: number; max?: number }>({
    min: filters.priceRange.min,
    max: filters.priceRange.max,
  });
  const [customMin, setCustomMin] = useState(filters.priceRange.min?.toString() || '');
  const [customMax, setCustomMax] = useState(filters.priceRange.max?.toString() || '');
  const [isCustom, setIsCustom] = useState(
    filters.priceRange.min !== undefined || filters.priceRange.max !== undefined
  );
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Fetch listing count based on search query and current filters
  const fetchListingCount = async (priceMin?: number, priceMax?: number) => {
    try {
      setLoadingCount(true);
      
      let query = supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      // Apply search query filter (if active)
      if (searchQuery && searchQuery.trim()) {
        const searchTerms = searchQuery.trim().split(' ').filter((term: string) => term.trim());
        if (searchTerms.length > 0) {
          const searchConditions = searchTerms.map((term: string) => 
            `title.ilike.%${term}%,description.ilike.%${term}%`
          ).join(',');
          query = query.or(searchConditions);
        }
      }

      // Apply existing filters (categories, location, attributes, sortBy)
      if (filters.categories && filters.categories.length > 0) {
        const categoryIdentifier = Array.isArray(filters.categories) 
          ? filters.categories[filters.categories.length - 1]
          : filters.categories;
        
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('name', categoryIdentifier)
          .single();
        
        if (categoryData) {
          const { data: allCategories } = await supabase
            .from('categories')
            .select('id, parent_id')
            .eq('is_active', true);
          
          if (allCategories) {
            const categoryIds = new Set<string>([categoryData.id]);
            const findSubcategories = (parentId: string) => {
              allCategories.forEach(cat => {
                if (cat.parent_id === parentId && !categoryIds.has(cat.id)) {
                  categoryIds.add(cat.id);
                  findSubcategories(cat.id);
                }
              });
            };
            findSubcategories(categoryData.id);
            query = query.in('category_id', Array.from(categoryIds));
          }
        }
      }

      if (filters.location && filters.location !== '' && filters.location !== 'All Regions') {
        if (filters.location.startsWith('All ')) {
          const regionName = filters.location.replace('All ', '');
          query = query.ilike('location', `%${regionName}%`);
        } else {
          query = query.ilike('location', `%${filters.location}%`);
        }
      }

      // Apply the selected price range
      if (priceMin !== undefined && priceMin > 0) {
        query = query.gte('price', priceMin);
      }
      if (priceMax !== undefined && priceMax > 0) {
        query = query.lte('price', priceMax);
      }

      if (filters.attributeFilters && Object.keys(filters.attributeFilters).length > 0) {
        Object.entries(filters.attributeFilters).forEach(([key, value]) => {
          if (value) {
            if (Array.isArray(value) && value.length > 0) {
              const orConditions = value.map(v => `attributes->>${key}.eq.${v}`).join(',');
              query = query.or(orConditions);
            } else {
              query = query.eq(`attributes->>${key}`, value);
            }
          }
        });
      }
      
      const { count, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      
      setListingCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching listing count:', error?.message || error);
      setListingCount(0);
    } finally {
      setLoadingCount(false);
    }
  };

  // Fetch count when price range changes
  useEffect(() => {
    fetchListingCount(selectedRange.min, selectedRange.max);
  }, [selectedRange.min, selectedRange.max, searchQuery, JSON.stringify(filters)]);

  const handleSelectRange = (min?: number, max?: number) => {
    setSelectedRange({ min, max });
    setIsCustom(false);
    setCustomMin('');
    setCustomMax('');
  };

  const handleCustomRangeChange = () => {
    const min = customMin ? parseInt(customMin) : undefined;
    const max = customMax ? parseInt(customMax) : undefined;
    setSelectedRange({ min, max });
    setIsCustom(true);
  };

  const handleApplyPrice = () => {
    setFilters({ 
      ...filters, 
      priceRange: { 
        min: selectedRange.min, 
        max: selectedRange.max 
      } 
    });
    router.back();
  };

  const isRangeSelected = (min?: number, max?: number) => {
    return selectedRange.min === min && selectedRange.max === max && !isCustom;
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Price Range"
        showBackButton
        onBackPress={() => router.back()}
      />

      {/* Search Context Banner */}
      {searchQuery && searchQuery.trim() && (
        <View style={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          backgroundColor: theme.colors.primary + '10',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <Text variant="bodySmall" color="muted">
            Filtering search results for: <Text style={{ fontWeight: '600', color: theme.colors.primary }}>'{searchQuery}'</Text>
          </Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }}>
        {/* Predefined Price Ranges as Horizontal Pills */}
        <View style={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Quick Select
          </Text>
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}>
            {PRICE_RANGES.map((range) => {
              const isSelected = isRangeSelected(range.min, range.max);
              return (
                <TouchableOpacity
                  key={`${range.min}-${range.max}`}
                  onPress={() => handleSelectRange(range.min, range.max)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.borderRadius.full,
                    borderWidth: 1,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: isSelected ? theme.colors.primary + '10' : theme.colors.background,
                    gap: theme.spacing.xs,
                  }}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <Check size={14} color={theme.colors.primary} />
                  )}
                  <Text 
                    variant="bodySmall" 
                    style={{ 
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? theme.colors.primary : theme.colors.text.primary
                    }}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Custom Price Range */}
        <View style={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          borderTopWidth: 8,
          borderTopColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Custom Range
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            {/* Min Price */}
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.xs }}>
                Min (₵)
              </Text>
              <TextInput
                value={customMin}
                onChangeText={(text) => {
                  setCustomMin(text);
                  handleCustomRangeChange();
                }}
                placeholder="0"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.surface,
                }}
                placeholderTextColor={theme.colors.text.muted}
              />
            </View>

            {/* Separator */}
            <Text variant="body" color="muted" style={{ marginTop: theme.spacing.lg }}>
              to
            </Text>

            {/* Max Price */}
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.xs }}>
                Max (₵)
              </Text>
              <TextInput
                value={customMax}
                onChangeText={(text) => {
                  setCustomMax(text);
                  handleCustomRangeChange();
                }}
                placeholder="Any"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.surface,
                }}
                placeholderTextColor={theme.colors.text.muted}
              />
            </View>
          </View>

          {isCustom && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: theme.spacing.md,
              gap: theme.spacing.sm,
            }}>
              <Check size={16} color={theme.colors.primary} />
              <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                Custom range applied
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Show Results Button */}
      <View style={{
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}>
        <Button
          variant="primary"
          size="lg"
          onPress={handleApplyPrice}
          disabled={loadingCount}
        >
          {loadingCount ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <ActivityIndicator size="small" color={theme.colors.background} />
              <Text variant="body" style={{ color: theme.colors.background, fontWeight: '600' }}>
                Loading...
              </Text>
            </View>
          ) : (
            <Text variant="body" style={{ color: theme.colors.background, fontWeight: '600' }}>
              Show {listingCount !== null ? listingCount : '...'} Results
            </Text>
          )}
        </Button>
      </View>
    </SafeAreaWrapper>
  );
}
