import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Image, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { useListings } from '@/hooks/useListings';
import { useNotifications } from '@/hooks/useNotifications';
// Temporarily disabled performance hooks to debug infinite re-render
// import { useOfflineListings, useOfflineSync } from '@/hooks/useOfflineSync';
// import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
// import { useMemoryManager } from '@/utils/memoryManager';
import { dbHelpers, supabase } from '@/lib/supabase';
import {
  Text,
  ProductCard,
  SearchBar,
  CategoryCard,
  Grid,
  Avatar,
  Button,
  Chip,
  FilterSheet,
  EmptyState,
  LoadingSkeleton,
  BusinessBadge,
  PriceDisplay,
  Badge,
  CompactUserBadges,
  // Temporarily disabled performance components
  // ProductVirtualizedList,
  // LazyComponent,
} from '@/components';
import { 
  Bell, 
  Heart, 
  Smartphone, 
  Car, 
  Chrome as HomeIcon, 
  Shirt, 
  Book, 
  Dumbbell, 
  Briefcase, 
  MoveHorizontal as MoreHorizontal, 
  MapPin, 
  ChevronDown,
  Zap,
  Grid3X3
} from 'lucide-react-native';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { 
    currentLocation, 
    setCurrentLocation,
    searchQuery, 
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,
    filters,
    showFilters,
    setShowFilters,
  } = useAppStore();

  // Temporarily disabled performance hooks to debug infinite re-render
  // const { startTimer, endTimer } = usePerformanceMonitor();
  // const { isOnline, pendingChanges } = useOfflineSync();
  // const { shouldLoadHeavyComponent, memoryUsage } = useMemoryManager();

  // Get notifications for badge
  const { unreadCount } = useNotifications();

  // Temporarily disabled offline listings
  // const { 
  //   data: offlineListings, 
  //   loading: offlineLoading, 
  //   error: offlineError, 
  //   isFromCache,
  //   refetch: refetchListings 
  // } = useOfflineListings();

  // Real user credit from database
  const [userCredit, setUserCredit] = useState<number>(0);
  const [creditLoading, setCreditLoading] = useState(true);

  // Category scroll indicator
  const categoryScrollRef = useRef<ScrollView>(null);
  const [categoryScrollX, setCategoryScrollX] = useState(0);
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);
  const [categoryScrollViewWidth, setCategoryScrollViewWidth] = useState(0);

  // Category counts from database
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [categoryCountsLoading, setCategoryCountsLoading] = useState(true);
  const [categoryIdMap, setCategoryIdMap] = useState<Record<string, string>>({});

  // Fetch user credit balance
  useEffect(() => {
    const fetchUserCredit = async () => {
      if (!user?.id) {
        setCreditLoading(false);
        return;
      }

      try {
        setCreditLoading(true);
        
        // Try to get user credits from the user_credits table
        const { data: creditData, error: creditError } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (creditError) {
          console.log('Error fetching user credits:', creditError.message);
          setUserCredit(0);
        } else {
          setUserCredit((creditData as any)?.balance || 0);
        }
      } catch (err) {
        console.log('Failed to fetch user credits:', err);
        setUserCredit(0);
      } finally {
        setCreditLoading(false);
      }
    };

    fetchUserCredit();
  }, [user?.id]);

  // Fetch category counts from database
  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        // First, get all categories from the database
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('id, slug')
          .eq('is_active', true);

        if (categoriesError) {
          console.error('Failed to fetch categories:', categoriesError);
          setCategoryCountsLoading(false);
          return;
        }

        // Create a mapping of slugs to category IDs
        const categoryMap: Record<string, string> = {};
        categories?.forEach((cat: any) => {
          // Map our frontend category names to database slugs
          const slugMapping: Record<string, string> = {
            'electronics': 'electronics',
            'vehicles': 'vehicles',
            'home': 'home-garden',
            'fashion': 'fashion',
            'books': 'education',
            'sports': 'health-sports',
            'services': 'services',
            'other': 'general'
          };
          
          Object.entries(slugMapping).forEach(([frontendKey, dbSlug]) => {
            if (cat.slug === dbSlug) {
              categoryMap[frontendKey] = cat.id;
            }
          });
        });

        // Get counts for each category using category_id
        const counts: Record<string, number> = {};
        
        // Get total count first
        const { count: totalCount, error: totalError } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if (!totalError) {
          counts['total'] = totalCount || 0;
        }

        // Get counts for each specific category
        for (const [frontendKey, categoryId] of Object.entries(categoryMap)) {
          const { count, error } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId)
            .eq('status', 'active');

          if (!error) {
            counts[frontendKey] = count || 0;
          } else {
            counts[frontendKey] = 0;
          }
        }

        // For categories not in the database, set to 0
        const allCategories = ['electronics', 'vehicles', 'home', 'fashion', 'books', 'sports', 'services', 'other'];
        allCategories.forEach(cat => {
          if (!(cat in counts)) {
            counts[cat] = 0;
          }
        });

        setCategoryCounts(counts);
        setCategoryIdMap(categoryMap);
      } catch (error) {
        console.error('Failed to fetch category counts:', error);
      } finally {
        setCategoryCountsLoading(false);
      }
    };

    fetchCategoryCounts();
  }, []);

  // This will be handled after products is defined

  const categories = [
    { 
      id: 'all', 
      label: 'All', 
      icon: <Grid3X3 size={24} color={theme.colors.primary} />, 
      count: categoryCounts.total || 0
    },
    { 
      id: 'electronics', 
      label: 'Electronics', 
      icon: <Smartphone size={24} color={theme.colors.primary} />, 
      count: categoryCounts.electronics || 0 
    },
    { 
      id: 'vehicles', 
      label: 'Vehicles', 
      icon: <Car size={24} color={theme.colors.primary} />, 
      count: categoryCounts.vehicles || 0 
    },
    { 
      id: 'home', 
      label: 'Home & Garden', 
      icon: <HomeIcon size={24} color={theme.colors.primary} />, 
      count: categoryCounts.home || 0 
    },
    { 
      id: 'fashion', 
      label: 'Fashion', 
      icon: <Shirt size={24} color={theme.colors.primary} />, 
      count: categoryCounts.fashion || 0 
    },
    { 
      id: 'books', 
      label: 'Books & Media', 
      icon: <Book size={24} color={theme.colors.primary} />, 
      count: categoryCounts.books || 0 
    },
    { 
      id: 'sports', 
      label: 'Sports', 
      icon: <Dumbbell size={24} color={theme.colors.primary} />, 
      count: categoryCounts.sports || 0 
    },
    { 
      id: 'services', 
      label: 'Services', 
      icon: <Briefcase size={24} color={theme.colors.primary} />, 
      count: categoryCounts.services || 0 
    },
    { 
      id: 'other', 
      label: 'Other', 
      icon: <MoreHorizontal size={24} color={theme.colors.primary} />, 
      count: categoryCounts.other || 0 
    },
  ];

  // Use real listings from database (after categoryIdMap is available)
  const selectedCategoryId = selectedCategories.length > 0 && selectedCategories[0] !== 'all' 
    ? categoryIdMap[selectedCategories[0]] // Use category ID instead of slug
    : undefined;

  const { 
    listings: products, 
    loading, 
    error, 
    refreshing, 
    refresh 
  } = useListings({
    search: searchQuery,
    category: selectedCategoryId,
    location: filters.location || currentLocation,
    priceMin: filters.priceRange.min,
    priceMax: filters.priceRange.max,
    condition: filters.condition,
  });

  // Debug logging - temporarily disabled to prevent infinite re-renders
  // useEffect(() => {
  //   console.log('Home screen - Selected categories:', selectedCategories);
  //   console.log('Home screen - Category ID map:', categoryIdMap);
  //   console.log('Home screen - Selected category ID:', selectedCategoryId);
  //   console.log('Home screen - Products count:', products.length);
  //   console.log('Home screen - Loading:', loading);
  //   console.log('Home screen - Error:', error);
  // }, [selectedCategories, categoryIdMap, selectedCategoryId, products.length, loading, error]);

  // Transform database listings to component format with full-bleed styling
  const transformedProducts = products.map((listing: any) => {
    const seller = listing.profiles;
    const badges = [];
    
    // Add boost badge if listing is boosted
    if (listing.boost_until && new Date(listing.boost_until) > new Date()) {
      badges.push({ text: 'Boosted', variant: 'featured' as const });
    }
    
    // Add business badges if seller has them
    if (seller?.account_type === 'business') {
      badges.push({ text: 'Business', variant: 'info' as const });
    }
    
    if (seller?.verification_status === 'verified') {
      badges.push({ text: 'Verified', variant: 'success' as const });
    }

    return {
      id: listing.id,
      image: listing.images || ['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
      title: listing.title,
      price: listing.price,
      seller: {
        id: seller?.id,
        name: `${seller?.first_name} ${seller?.last_name}`,
        avatar: seller?.avatar_url,
        rating: seller?.rating || 0,
        badges: seller?.account_type === 'business' ? ['business'] : [],
      },
      badge: badges[0], // Show first badge
      location: listing.location,
      views: listing.views_count || 0,
      favorites: listing.favorites_count || 0,
      isBoosted: listing.boost_until && new Date(listing.boost_until) > new Date(),
    };
  });

  const handleCategoryToggle = (categoryId: string) => {
    if (categoryId === 'all') {
      // If "All" is selected, clear all categories
      setSelectedCategories([]);
    } else {
      const isSelected = selectedCategories.includes(categoryId);
      if (isSelected) {
        // Remove the category
        setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
      } else {
        // Replace current selection with new category (single selection mode)
        setSelectedCategories([categoryId]);
      }
    }
  };

  const firstName = user?.user_metadata?.first_name || 'User';

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background,
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          ...theme.shadows.sm,
        }}
      >
          {/* Top Row - Profile & Actions */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}
          >
            {/* Compact Profile Section */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flex: 0.85,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing.xs,
                backgroundColor: theme.colors.primary + '10',
              }}
              onPress={() => {
                router.push('/(tabs)/more');
              }}
              activeOpacity={0.7}
            >
              <Avatar
                source={user?.user_metadata?.avatar_url}
                name={`${firstName} ${user?.user_metadata?.last_name || ''}`}
                size="sm"
                style={{ marginRight: theme.spacing.sm }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: 2 }}>
                  Hey, <Text variant='body' style={{ fontWeight: '600' }}>{firstName}</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
                    Welcome back
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary + '10',
                      borderRadius: theme.borderRadius.md,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: 1,
                    }}
                  >
                    <Zap size={10} color={theme.colors.primary} style={{ marginRight: 2 }} />
                    <Text style={{ 
                      color: theme.colors.primary, 
                      fontSize: 10, 
                      fontWeight: '700' 
                    }}>
                      {creditLoading ? '...' : `${Math.floor(userCredit)}`}
                    </Text>
                  </View>
                </View>
              </View>
              <ChevronDown size={16} color={theme.colors.text.muted} />
            </TouchableOpacity>

            {/* Compact Action Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              {/* Notifications */}
              <TouchableOpacity
                style={{
                  position: 'relative',
                  padding: theme.spacing.xs,
                }}
                onPress={() => router.push('/notifications')}
                activeOpacity={0.7}
              >
                <Bell size={20} color={theme.colors.text.primary} />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      backgroundColor: theme.colors.error,
                      borderRadius: 6,
                      minWidth: 12,
                      height: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFF',
                        fontSize: 8,
                        fontWeight: '600',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Favorites */}
              <TouchableOpacity
                style={{ padding: theme.spacing.xs }}
                onPress={() => router.push('/favorites')}
                activeOpacity={0.7}
              >
                <Heart size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Compact Location Display */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: theme.spacing.xs,
            }}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert('Coming Soon', 'Location picker will be available soon');
            }}
          >
            <MapPin size={14} color={theme.colors.text.secondary} />
            <Text
              variant="caption"
              style={{
                color: theme.colors.text.secondary,
                marginLeft: theme.spacing.xs,
                fontWeight: '500',
              }}
            >
              {currentLocation}
            </Text>
            <ChevronDown size={12} color={theme.colors.text.secondary} style={{ marginLeft: theme.spacing.xs }} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFilter={() => setShowFilters(true)}
          placeholder="Search for anything..."
        />

        {/* Enhanced Categories with Icons and Scroll Indicator */}
        <View style={{ paddingVertical: theme.spacing.md, position: 'relative' }}>
          {/* Professional Scroll Indicator - Top Right */}
          {categoryContentWidth > categoryScrollViewWidth && (
            <View
              style={{
                position: 'absolute',
                top: theme.spacing.sm,
                right: theme.spacing.lg,
                width: screenWidth / 3, // 1/3 of screen width
                height: 3,
                backgroundColor: theme.colors.border,
                borderRadius: 1.5,
                overflow: 'hidden',
                zIndex: 10,
              }}
            >
              <View
                style={{
                  height: '100%',
                  backgroundColor: theme.colors.primary,
                  borderRadius: 1.5,
                  width: `${Math.min(100, (categoryScrollViewWidth / categoryContentWidth) * 100)}%`,
                  transform: [
                    {
                      translateX: (categoryScrollX / (categoryContentWidth - categoryScrollViewWidth)) * 
                        ((screenWidth / 3) - ((screenWidth / 3) * (categoryScrollViewWidth / categoryContentWidth))),
                    },
                  ],
                }}
              />
            </View>
          )}
          
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              setCategoryScrollX(event.nativeEvent.contentOffset.x);
            }}
            onContentSizeChange={(width) => {
              setCategoryContentWidth(width);
            }}
            onLayout={(event) => {
              setCategoryScrollViewWidth(event.nativeEvent.layout.width);
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              gap: theme.spacing.sm,
              alignItems: 'center',
              paddingTop: theme.spacing.md, // Add top padding to account for indicator
            }}
          >
            {categories.map((category) => {
              const isSelected = category.id === 'all' 
                ? selectedCategories.length === 0 
                : selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => handleCategoryToggle(category.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.md,
                    borderRadius: 25, // Pill shape
                    backgroundColor: isSelected 
                      ? theme.colors.primary 
                      : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected 
                      ? theme.colors.primary 
                      : theme.colors.border,
                    gap: theme.spacing.sm,
                    minHeight: 48,
                    ...theme.shadows.sm,
                  }}
                  activeOpacity={0.7}
                >
                  {/* Category Icon */}
                  <View style={{ 
                    width: 24, 
                    height: 24, 
                    justifyContent: 'center', 
                    alignItems: 'center' 
                  }}>
                    {React.cloneElement(category.icon as React.ReactElement, {
                      size: 20,
                      color: isSelected 
                        ? theme.colors.primaryForeground 
                        : theme.colors.primary,
                    } as any)}
                  </View>
                  
                  {/* Category Label */}
                  <Text
                    variant="body"
                    style={{
                      color: isSelected 
                        ? theme.colors.primaryForeground 
                        : theme.colors.text.primary,
                      fontWeight: isSelected ? '600' : '500',
                      fontSize: 14,
                    }}
                  >
                    {category.label}
                  </Text>
                  
                  {/* Category Count Badge */}
                  <View
                    style={{
                      backgroundColor: isSelected 
                        ? theme.colors.primaryForeground + '20' 
                        : theme.colors.primary + '10',
                      borderRadius: 12,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: 2,
                      minWidth: 24,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: isSelected 
                          ? theme.colors.primaryForeground 
                          : theme.colors.primary,
                        fontSize: 11,
                        fontWeight: '600',
                      }}
                    >
                      {categoryCountsLoading 
                        ? '...' 
                        : category.count > 999 
                          ? `${Math.floor(category.count / 1000)}k` 
                          : category.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Products Grid - Full Bleed Implementation */}
        <View style={{ flex: 1 }}>
          {error ? (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <EmptyState
                title="Failed to load listings"
                description={error}
                action={{
                  text: 'Try Again',
                  onPress: refresh,
                }}
              />
            </View>
          ) : loading ? (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <Grid columns={2}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <LoadingSkeleton
                    key={index}
                    width="100%"
                    height={280}
                    borderRadius={theme.borderRadius.lg}
                  />
                ))}
              </Grid>
            </View>
          ) : transformedProducts.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg }}>
              <EmptyState
                title="No listings found"
                description="There are no active listings at the moment. Try adjusting your search or filters, or check back later."
                action={{
                  text: 'Refresh',
                  onPress: refresh,
                }}
              />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                // Full-bleed implementation: no horizontal padding on container
                paddingBottom: Math.max(theme.spacing.xl, insets.bottom + theme.spacing.md),
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              }
            >
              {/* Full-Width ProductCard Grid */}
              <Grid columns={2} spacing={4}>
                {transformedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    image={product.image}
                    title={product.title}
                    price={product.price}
                    seller={product.seller}
                    badge={product.badge}
                    location={product.location}
                    layout="grid"
                    fullWidth={true}
                    onPress={() => router.push(`/(tabs)/home/${product.id}`)}
                  />
                ))}
              </Grid>
            </ScrollView>
          )}
        </View>

        {/* Filter Sheet */}
        <FilterSheet
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onApplyFilters={(newFilters) => {
            useAppStore.getState().setFilters(newFilters);
            setShowFilters(false);
          }}
          onClearFilters={() => {
            useAppStore.getState().setFilters({
              priceRange: { min: 0, max: 10000 },
              condition: [],
              categories: [],
              location: '',
              sortBy: 'Newest First',
            });
            setSelectedCategories([]);
          }}
        />
      </View>
  );
}