import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, SafeAreaWrapper, AppHeader, Button } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { fetchMainCategories, fetchSubcategories } from '@/utils/categoryUtils';
import { supabase } from '@/lib/supabase';
import { ChevronRight } from 'lucide-react-native';

interface FilterOptions {
  categories: string[];
  priceRange: { min?: number; max?: number };
  condition: string[];
  location: string;
  sortBy: string;
  attributeFilters?: Record<string, any>;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

interface CategoryAttribute {
  id: string;
  name: string;
  field_type: string;
  options?: any[];
}

export default function FilterProductsScreen() {
  const { theme } = useTheme();
  const { filters, setFilters } = useAppStore();
  
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Fetch listing count based on current filters
  const fetchListingCount = async (filterOptions: FilterOptions) => {
    try {
      setLoadingCount(true);
      
      let query = supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      // Apply category filter
      if (filterOptions.categories && filterOptions.categories.length > 0) {
        // For now, just use the category name directly if it's a string
        // Otherwise use the last item in the array as the category ID
        const categoryIdentifier = Array.isArray(filterOptions.categories) 
          ? filterOptions.categories[filterOptions.categories.length - 1]
          : filterOptions.categories;
        
        // Try to find category by name first
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('name', categoryIdentifier)
          .single();
        
        if (categoryData) {
          // Fetch all subcategory IDs under the selected category
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

      // Apply price range filter
      if (filterOptions.priceRange.min) {
        query = query.gte('price', filterOptions.priceRange.min);
      }
      if (filterOptions.priceRange.max) {
        query = query.lte('price', filterOptions.priceRange.max);
      }

      // Apply location filter
      if (filterOptions.location) {
        // Skip filtering if "All Regions" is selected
        if (filterOptions.location === 'All Regions') {
          // Don't apply any location filter - show all listings
        }
        // Handle "All [Region]" selections (e.g., "All Ashanti", "All Greater Accra")
        else if (filterOptions.location.startsWith('All ')) {
          const regionName = filterOptions.location.replace('All ', '');
          query = query.ilike('location', `%${regionName}%`);
        }
        // Normal city filtering (e.g., "Kumasi, Ashanti")
        else {
          query = query.ilike('location', `%${filterOptions.location}%`);
        }
      }

      // Apply attribute filters (including condition)
      if (filterOptions.attributeFilters && Object.keys(filterOptions.attributeFilters).length > 0) {
        Object.entries(filterOptions.attributeFilters).forEach(([key, value]) => {
          if (value) {
            if (Array.isArray(value) && value.length > 0) {
              // For array values, we need to check if any value matches
              // Build OR conditions for each value
              const orConditions = value.map(v => `attributes->>${key}.eq.${v}`).join(',');
              query = query.or(orConditions);
            } else {
              // For single values, use the ->> operator to extract text value
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
      setListingCount(null);
    } finally {
      setLoadingCount(false);
    }
  };

  // Load category attributes
  const loadCategoryAttributes = async (categoryId: string) => {
    try {
      setLoadingAttributes(true);
      const { data, error } = await supabase
        .from('category_attributes')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      
      setCategoryAttributes(data || []);
    } catch (error) {
      console.error('Error loading category attributes:', error);
      setCategoryAttributes([]);
    } finally {
      setLoadingAttributes(false);
    }
  };

  // Load subcategories and attributes
  const loadSubcategoriesAndAttributes = async (parentId: string, subcategoryName?: string) => {
    try {
      const subs = await fetchSubcategories(parentId);
      setSubcategories(subs);
      
      if (subs.length === 0) {
        // No subcategories, load attributes for main category
        setSelectedSubcategory(null);
        await loadCategoryAttributes(parentId);
      } else if (subcategoryName) {
        // Find and set the subcategory, then load its attributes
        const subcategory = subs.find(s => s.name === subcategoryName);
        if (subcategory) {
          setSelectedSubcategory(subcategory);
          await loadCategoryAttributes(subcategory.id);
        } else {
          // Subcategory not found, clear attributes
          setSelectedSubcategory(null);
          setCategoryAttributes([]);
        }
      } else {
        // Has subcategories but none selected, don't load attributes yet
        setSelectedSubcategory(null);
        setCategoryAttributes([]);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
      setSubcategories([]);
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const mainCategories = await fetchMainCategories();
        setCategories(mainCategories);
        
        // If there's a selected category in filters, load it
        if (localFilters.categories && localFilters.categories.length > 0) {
          const categoryName = localFilters.categories[0];
          const category = mainCategories.find(c => c.name === categoryName);
          if (category) {
            setSelectedCategory(category);
            // Load subcategories and attributes
            await loadSubcategoriesAndAttributes(category.id, localFilters.categories[1]);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    loadCategories();
  }, []);

  // Fetch listing count whenever filters change
  useEffect(() => {
    fetchListingCount(localFilters);
  }, [
    JSON.stringify(localFilters.categories),
    localFilters.priceRange.min,
    localFilters.priceRange.max,
    localFilters.location,
    JSON.stringify(localFilters.attributeFilters),
  ]);

  // Use refs to track previous values and prevent infinite loops
  const prevCategoryRef = useRef<string>('');
  const prevSubcategoryRef = useRef<string>('');
  const prevFiltersRef = useRef<string>('');

  // Sync local filters and selected category when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Update local filters from global store
      const filtersString = JSON.stringify(filters);
      
      // Check if filters actually changed
      if (filtersString !== prevFiltersRef.current) {
        prevFiltersRef.current = filtersString;
        setLocalFilters(filters);
        setRefreshKey(prev => prev + 1); // Force re-render
      }
      
      // Update selected category based on filters
      if (filters.categories && filters.categories.length > 0 && categories.length > 0) {
        const categoryPath = filters.categories.join(' > ');
        
        // Only update if category path actually changed
        if (categoryPath !== prevCategoryRef.current) {
          prevCategoryRef.current = categoryPath;
          
          // Find the deepest category in the path to load its attributes
          const loadDeepestCategory = async () => {
            let currentId = '';
            
            // Navigate through the category path to find the deepest category ID
            for (let i = 0; i < filters.categories.length; i++) {
              const categoryName = filters.categories[i];
              
              if (i === 0) {
                // Main category
                const mainCat = categories.find(c => c.name === categoryName);
                if (mainCat) {
                  currentId = mainCat.id;
                  setSelectedCategory(mainCat);
                }
              } else {
                // Subcategory - need to fetch
                try {
                  const subs = await fetchSubcategories(currentId);
                  const sub = subs.find(s => s.name === categoryName);
                  if (sub) {
                    currentId = sub.id;
                    if (i === filters.categories.length - 1) {
                      // This is the deepest category
                      setSelectedSubcategory(sub);
                    }
                  }
                } catch (error) {
                  console.error('Error fetching subcategories:', error);
                  break;
                }
              }
            }
            
            // Load attributes for the deepest category
            if (currentId) {
              await loadCategoryAttributes(currentId);
            }
          };
          
          loadDeepestCategory();
        }
      } else if (filters.categories?.length === 0 && prevCategoryRef.current !== '') {
        // Clear everything
        prevCategoryRef.current = '';
        prevSubcategoryRef.current = '';
        setSelectedCategory(null);
        setSubcategories([]);
        setSelectedSubcategory(null);
        setCategoryAttributes([]);
      }
    }, [filters, categories])
  );

  const handleApply = () => {
    setFilters(localFilters);
    router.back();
  };

  const handleClearAll = () => {
    const clearedFilters: FilterOptions = {
      categories: [],
      priceRange: { min: undefined, max: undefined },
      condition: [],
      location: '',
      sortBy: 'newest',
      attributeFilters: {},
    };
    setLocalFilters(clearedFilters);
    setSelectedCategory(null);
    setCategoryAttributes([]);
  };

  const handleCategorySelect = async (category: Category) => {
    setSelectedCategory(category);
    setLocalFilters({ 
      ...localFilters, 
      categories: [category.name],
      attributeFilters: {} // Clear attribute filters when changing category
    });
    await loadCategoryAttributes(category.id);
  };

  // Transform snake_case to Title Case for display
  const formatLabel = (value: string): string => {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getFilterValue = (key: string): { text: string; count?: number } => {
    switch (key) {
      case 'sortBy':
        const sortOption = SORT_OPTIONS.find(opt => opt.value === localFilters.sortBy);
        return { text: sortOption?.label || 'Newest first' };
      case 'category':
        // Show full category path
        if (localFilters.categories && localFilters.categories.length > 0) {
          return { text: localFilters.categories.join(' > ') };
        }
        return { text: 'All' };
      case 'price':
        if (localFilters.priceRange.min || localFilters.priceRange.max) {
          return { text: `GHS ${localFilters.priceRange.min || 0} - ${localFilters.priceRange.max || '∞'}` };
        }
        return { text: 'All' };
      case 'location':
        return { text: localFilters.location || 'All' };
      default:
        // Check attribute filters (including condition when it's a dynamic attribute)
        if (localFilters.attributeFilters && localFilters.attributeFilters[key]) {
          const value = localFilters.attributeFilters[key];
          
          if (Array.isArray(value) && value.length > 0) {
            // For multiple selections, show first 2 items + count
            if (value.length === 1) {
              return { text: formatLabel(value[0]) };
            } else if (value.length === 2) {
              return { text: `${formatLabel(value[0])}, ${formatLabel(value[1])}` };
            } else {
              // Show first 2 items + count of remaining
              return { 
                text: `${formatLabel(value[0])}, ${formatLabel(value[1])}`, 
                count: value.length 
              };
            }
          }
          // Transform single value
          return { text: formatLabel(value) };
        }
        return { text: 'All' };
    }
  };

  const renderFilterRow = (label: string, valueObj: { text: string; count?: number }, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
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
      <Text variant="body" style={{ fontWeight: '500', flex: 0, flexShrink: 0 }}>
        {label}
      </Text>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: theme.spacing.sm,
        flex: 1,
        justifyContent: 'flex-end',
        marginLeft: theme.spacing.md,
      }}>
        <Text 
          variant="body" 
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ 
            color: valueObj.text !== 'All' ? theme.colors.primary : theme.colors.text.secondary,
            flexShrink: 1,
            textAlign: 'right',
          }}
        >
          {valueObj.text}
        </Text>
        {valueObj.count && valueObj.count > 2 && (
          <View style={{
            backgroundColor: theme.colors.primary,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 2,
            minWidth: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text 
              variant="caption" 
              style={{ 
                color: theme.colors.primaryForeground,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              +{valueObj.count - 2}
            </Text>
          </View>
        )}
        <ChevronRight size={20} color={theme.colors.text.secondary} style={{ flexShrink: 0 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Filter"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <TouchableOpacity
            key="clear"
            onPress={handleClearAll}
            style={{ paddingHorizontal: theme.spacing.md }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              CLEAR ALL
            </Text>
          </TouchableOpacity>
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sort By */}
        {renderFilterRow('Sort by', getFilterValue('sortBy'), () => {
          // Navigate to sort options screen (to be implemented)
          router.push('/filter-sort');
        })}

        {/* Category */}
        {renderFilterRow(
          'Category', 
          getFilterValue('category'),
          () => {
            // Navigate to category selection screen
            router.push('/filter-category');
          }
        )}

        {/* Dynamic Category Attributes */}
        {categoryAttributes
          .filter(attribute => {
            // Only show attributes that have options (select type)
            // Hide text/number type attributes as they need direct input
            return attribute.field_type === 'select' && 
                   attribute.options && 
                   Array.isArray(attribute.options) && 
                   attribute.options.length > 0;
          })
          .map((attribute) => {
            const attributeKey = attribute.name.toLowerCase();
            const filterValue = getFilterValue(attributeKey);
            
            return (
              <View key={`${attribute.id}-${refreshKey}`}>
                {renderFilterRow(
                  attribute.name,
                  filterValue,
                  () => {
                    // Navigate to attribute selection screen
                    router.push({
                      pathname: '/filter-attribute',
                      params: {
                        attributeId: attribute.id,
                        attributeName: attribute.name,
                        attributeType: attribute.field_type,
                        options: JSON.stringify(attribute.options || []),
                      },
                    });
                  }
                )}
              </View>
            );
          })}

        {/* Price */}
        {renderFilterRow('Price', getFilterValue('price'), () => {
          // Navigate to price range screen (to be implemented)
          router.push('/filter-price');
        })}

        {/* Location */}
        {renderFilterRow('Location', getFilterValue('location'), () => {
          // Navigate to location selection screen (to be implemented)
          router.push('/filter-location');
        })}
      </ScrollView>

      {/* Show Results Button */}
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
          loading={loadingCount}
        >
          {loadingCount 
            ? 'Loading...' 
            : listingCount !== null 
              ? `Show results (${listingCount})` 
              : 'Show results'}
        </Button>
      </View>
    </SafeAreaWrapper>
  );
}