import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader, Button, LoadingSkeleton } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { Check, MapPin, ChevronDown, ChevronRight } from 'lucide-react-native';

// Types for database locations
interface Region {
  id: string;
  name: string;
  display_order: number;
}

interface City {
  id: string;
  name: string;
  region_id: string;
  display_order: number;
}

interface LocationData {
  regions: Region[];
  cities: City[];
}

export default function FilterLocationScreen() {
  const { theme } = useTheme();
  const { filters, setFilters, searchQuery } = useAppStore();
  const [selectedLocation, setSelectedLocation] = useState(filters.location || '');
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [locationData, setLocationData] = useState<LocationData>({ regions: [], cities: [] });
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Fetch listing count based on search query and current filters
  const fetchListingCount = async (location: string) => {
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

      // Apply existing filters (categories, price, attributes, sortBy)
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

      // Apply the selected location filter
      if (location && location !== '' && location !== 'All Regions') {
        if (location.startsWith('All ')) {
          const regionName = location.replace('All ', '');
          query = query.ilike('location', `%${regionName}%`);
        } else {
          query = query.ilike('location', `%${location}%`);
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

  // Fetch regions and cities from database
  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      
      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (regionsError) throw regionsError;

      // Fetch cities
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('id, name, region_id, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (citiesError) throw citiesError;

      setLocationData({
        regions: regionsData || [],
        cities: citiesData || [],
      });
    } catch (error: any) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Fetch locations on mount
  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch count when location selection changes
  useEffect(() => {
    fetchListingCount(selectedLocation);
  }, [selectedLocation, searchQuery, JSON.stringify(filters)]);

  const handleSelect = (value: string) => {
    setSelectedLocation(value);
  };

  const handleApplyLocation = () => {
    setFilters({ ...filters, location: selectedLocation });
    router.back();
  };

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(region)) {
        newSet.delete(region);
      } else {
        newSet.add(region);
      }
      return newSet;
    });
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Location"
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
        {/* All Regions Option */}
        <TouchableOpacity
          onPress={() => handleSelect('')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <MapPin 
              size={20} 
              color={selectedLocation === '' ? theme.colors.primary : theme.colors.text.secondary} 
            />
            <Text 
              variant="body" 
              style={{ 
                fontWeight: selectedLocation === '' ? '600' : '400',
                color: selectedLocation === '' ? theme.colors.primary : theme.colors.text.primary
              }}
            >
              All Regions
            </Text>
          </View>
          {selectedLocation === '' && (
            <Check size={20} color={theme.colors.primary} />
          )}
        </TouchableOpacity>

        {/* Loading State */}
        {loadingLocations ? (
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            {Array.from({ length: 8 }).map((_, index) => (
              <LoadingSkeleton
                key={index}
                width="100%"
                height={50}
                borderRadius={theme.borderRadius.md}
              />
            ))}
          </View>
        ) : (
          <>
            {/* Collapsible Regions */}
            {locationData.regions.map((region) => {
              const isExpanded = expandedRegions.has(region.name);
              const cities = locationData.cities.filter(c => c.region_id === region.id);
              const allRegionValue = `All ${region.name}`;
              
              return (
                <View key={region.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                  {/* Region Header (Collapsible) */}
                  <TouchableOpacity
                    onPress={() => toggleRegion(region.name)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: theme.spacing.md,
                      paddingHorizontal: theme.spacing.lg,
                      backgroundColor: theme.colors.background,
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      {isExpanded ? (
                        <ChevronDown size={20} color={theme.colors.text.secondary} />
                      ) : (
                        <ChevronRight size={20} color={theme.colors.text.secondary} />
                      )}
                      <Text variant="body" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                        {region.name}
                      </Text>
                    </View>
                    <Text variant="caption" color="muted">
                      ({cities.length + 1})
                    </Text>
                  </TouchableOpacity>

              {/* Region Cities (Expanded) */}
              {isExpanded && (
                <View>
                  {/* "All [Region]" Option */}
                  <TouchableOpacity
                    onPress={() => handleSelect(allRegionValue)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: theme.spacing.md,
                      paddingHorizontal: theme.spacing.xl,
                      paddingLeft: theme.spacing.xl + theme.spacing.lg,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text 
                      variant="body" 
                      style={{ 
                        fontWeight: selectedLocation === allRegionValue ? '600' : '400',
                        color: selectedLocation === allRegionValue ? theme.colors.primary : theme.colors.text.primary
                      }}
                    >
                      All {region.name}
                    </Text>
                    {selectedLocation === allRegionValue && (
                      <Check size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>

                  {/* Individual Cities */}
                  {cities.map((city, index) => {
                    const cityValue = `${city.name}, ${region.name}`;
                    return (
                      <TouchableOpacity
                        key={city.id}
                        onPress={() => handleSelect(cityValue)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: theme.spacing.md,
                          paddingHorizontal: theme.spacing.xl,
                          paddingLeft: theme.spacing.xl + theme.spacing.lg,
                          borderBottomWidth: index < cities.length - 1 ? 1 : 0,
                          borderBottomColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text 
                          variant="body" 
                          style={{ 
                            fontWeight: selectedLocation === cityValue ? '600' : '400',
                            color: selectedLocation === cityValue ? theme.colors.primary : theme.colors.text.primary
                          }}
                        >
                          {city.name}
                        </Text>
                        {selectedLocation === cityValue && (
                          <Check size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
          </>
        )}
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
          onPress={handleApplyLocation}
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
