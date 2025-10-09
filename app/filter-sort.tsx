import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader, Button } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
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
  const { filters, setFilters, searchQuery } = useAppStore();
  const [selectedSort, setSelectedSort] = useState(filters.sortBy || 'newest');
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Fetch listing count based on search query and current filters
  const fetchListingCount = async () => {
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

      // Apply existing filters (categories, price, location, etc.)
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

      if (filters.priceRange.min) {
        query = query.gte('price', filters.priceRange.min);
      }
      if (filters.priceRange.max) {
        query = query.lte('price', filters.priceRange.max);
      }

      if (filters.location && filters.location !== 'All Regions') {
        if (filters.location.startsWith('All ')) {
          const regionName = filters.location.replace('All ', '');
          query = query.ilike('location', `%${regionName}%`);
        } else {
          query = query.ilike('location', `%${filters.location}%`);
        }
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

  // Fetch count on mount
  useEffect(() => {
    fetchListingCount();
  }, [searchQuery, JSON.stringify(filters)]);

  const handleSelect = (value: string) => {
    setSelectedSort(value);
  };

  const handleApplySort = () => {
    setFilters({ ...filters, sortBy: selectedSort });
    router.back();
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Sort by"
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
            Sorting search results for: <Text style={{ fontWeight: '600', color: theme.colors.primary }}>'{searchQuery}'</Text>
          </Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }}>
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
          onPress={handleApplySort}
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
