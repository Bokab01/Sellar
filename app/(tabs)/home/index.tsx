import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { useListings } from '@/hooks/useListings';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile } from '@/hooks/useProfile';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useAppResume } from '@/hooks/useAppResume';
// Temporarily disabled performance hooks to debug infinite re-render
// import { useOfflineListings, useOfflineSync } from '@/hooks/useOfflineSync';
// import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
// import { useMemoryManager } from '@/utils/memoryManager';
import { supabase } from '@/lib/supabase';
import {
  Text,
  ProductCard,
  SearchBar,
  Grid,
  Avatar,
  FilterSheet,
  EmptyState,
  LoadingSkeleton,
  ProfessionalBadge,
  BoostBadge,
  VerifiedBadge,
  // Temporarily disabled performance components
  // ProductVirtualizedList,
  // LazyComponent,
} from '@/components';
import { FeaturedListings } from '@/components/FeaturedListings/FeaturedListings';
// Removed SmartSearchModal import - now using dedicated screen
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
  Grid3X3,
  Search,
  Filter,
  ListFilterPlus
} from 'lucide-react-native';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const { 
    currentLocation, 
    // setCurrentLocation,
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

  // App resume handling - refresh listings when app comes back from background
  const { isRefreshing, isReconnecting } = useAppResume({
    onResume: async () => {
      console.log('📱 Home screen: App resumed, refreshing listings...');
      await refresh();
      // Also refresh user credit
      await fetchUserCredit();
    },
    debug: true,
  });

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

  // Scroll animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 160; // Approximate header height
  const searchBarHeight = 70; // Search bar height with padding
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');

  // Animated values for header and search bar
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  const searchBarTranslateY = useRef(new Animated.Value(-searchBarHeight)).current;

  // Category counts from database
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [categoryCountsLoading, setCategoryCountsLoading] = useState(true);
  const [categoryIdMap, setCategoryIdMap] = useState<Record<string, string>>({});

  // Smart search modal removed - now using dedicated screen

  // Handle scroll animations
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        // Determine scroll direction
        if (diff > 0 && currentScrollY > 50) {
          // Scrolling down
          if (scrollDirection.current !== 'down') {
            scrollDirection.current = 'down';
            // Hide header, show sticky search
            Animated.parallel([
              Animated.timing(headerTranslateY, {
                toValue: -headerHeight,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(searchBarOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(searchBarTranslateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();
          }
        } else if (diff < 0 || currentScrollY <= 50) {
          // Scrolling up or at top
          if (scrollDirection.current !== 'up') {
            scrollDirection.current = 'up';
            // Show header, hide sticky search
            Animated.parallel([
              Animated.timing(headerTranslateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(searchBarOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(searchBarTranslateY, {
                toValue: -searchBarHeight,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  // Fetch user credit balance function
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

  // Fetch user credit balance on mount
  useEffect(() => {
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
    location: filters.location, // Only apply location filter if explicitly set by user
    priceMin: filters.priceRange.min,
    priceMax: filters.priceRange.max,
    condition: filters.condition,
  });

  // Real-time updates should handle new listings automatically
  // Removed useFocusEffect to prevent blinking - relying on enhanced real-time updates

  // Transform database listings to component format with professional styling
  const transformedProducts = useMemo(() => products.map((listing: any) => {
    // Handle both joined and simple listing data
    const seller = listing.profiles || null;
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
        id: seller?.id || listing.user_id,
        name: seller ? `${seller.first_name || 'User'} ${seller.last_name || ''}`.trim() : 'Anonymous User',
        avatar: seller?.avatar_url || null,
        rating: seller?.rating || 0,
        badges: seller?.account_type === 'business' ? ['business'] : [],
      },
      badge: badges[0], // Show first badge
      location: listing.location,
      views: listing.views_count || 0,
      favorites: listing.favorites_count || 0,
      isBoosted: listing.boost_until && new Date(listing.boost_until) > new Date(),
      // Additional data for professional badges
      condition: listing.condition,
      acceptOffers: listing.accept_offers,
      isVerified: seller?.is_verified || false,
      category: listing.categories?.name || 'General',
    };
  }), [products]);

  // Get listing IDs for stats (memoized to prevent infinite re-renders)
  const listingIds = useMemo(() => 
    transformedProducts.map(product => product.id), 
    [transformedProducts]
  );
  
  // Get favorites and view counts for all listings
  const { favorites, viewCounts, refreshStats } = useMultipleListingStats({ 
    listingIds 
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

  const firstName = profile?.first_name || user?.user_metadata?.first_name || 'User';
  const lastName = profile?.last_name || user?.user_metadata?.last_name || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background,
    }}>
      {/* Sticky Search Bar - Appears when scrolling down */}
      <Animated.View
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'transparent',
          paddingHorizontal: 0, // No horizontal padding for full-width
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.md, // Add bottom padding for spacing
          borderWidth: 1,
          borderColor: 'transparent',
          opacity: searchBarOpacity,
          transform: [{ translateY: searchBarTranslateY }],
        }}
      >
        <TouchableOpacity
          onPress={() => router.push('/smart-search')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            marginHorizontal: theme.spacing.md, // Minimal margin for visual breathing room
          }}
          activeOpacity={0.7}
        >
          <Search size={20} color={theme.colors.text.secondary} />
          <Text 
            variant="body" 
            color="muted" 
            style={{ 
              flex: 1, 
              marginLeft: theme.spacing.md,
            }}
          >
            {searchQuery || "Search for anything..."}
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={{
              padding: theme.spacing.xs,
            }}
          >
            <ListFilterPlus size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Content Container */}
      <View style={{ 
        flex: 1,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}>
        {/* Animated Header */}
        <Animated.View
          style={{
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.xs,
            borderBottomLeftRadius: theme.borderRadius.xl,
            borderBottomRightRadius: theme.borderRadius.xl,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            ...theme.shadows.sm,
            transform: [{ translateY: headerTranslateY }],
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
                source={avatarUrl}
                name={`${firstName} ${lastName}`}
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
          
        </Animated.View>

        {/* Main Content Area - Scrollable */}
        <View style={{ flex: 1 }}>
          {error ? (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <EmptyState
                title="Unable to load listings"
                description="Please check your internet connection and try again."
                action={{
                  text: 'Refresh',
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
                title="No listings available"
                description={searchQuery || selectedCategories.length > 0 
                  ? "No listings match your current search or filters. Try adjusting your criteria or browse all listings."
                  : "Be the first to list an item! Start selling and help build our marketplace community."
                }
                action={{
                  text: searchQuery || selectedCategories.length > 0 ? 'Clear Filters' : 'Create Listing',
                  onPress: searchQuery || selectedCategories.length > 0 
                    ? () => {
                        setSearchQuery('');
                        setSelectedCategories([]);
                      }
                    : () => router.push('/(tabs)/create'),
                }}
              />
            </View>
          ) : (
            <Animated.ScrollView
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
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
               {/* Location Picker Trigger */}
              <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: theme.spacing.md,
              marginLeft: theme.spacing.lg,
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
              {/* Search Bar Trigger */}
              <TouchableOpacity
                onPress={() => router.push('/smart-search')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.md,
                  marginHorizontal: theme.spacing.lg,
                  marginTop: theme.spacing.md,
                  marginBottom: theme.spacing.md,
                }}
                activeOpacity={0.7}
              >
                <Search size={20} color={theme.colors.text.secondary} />
                <Text 
                  variant="body" 
                  color="muted" 
                  style={{ 
                    flex: 1, 
                    marginLeft: theme.spacing.md,
                  }}
                >
                  {searchQuery || "Search for anything..."}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFilters(true)}
                  style={{
                    padding: theme.spacing.xs,
                  }}
                >
                  <ListFilterPlus size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </TouchableOpacity>

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
                          borderRadius: theme.borderRadius.full,
                          backgroundColor: isSelected 
                            ? theme.colors.primary 
                            : theme.colors.surface,
                          borderWidth: 1,
                          borderColor: isSelected 
                            ? theme.colors.primary 
                            : theme.colors.border,
                          gap: theme.spacing.sm,
                          minHeight: 48,
                          shadowColor: isSelected ? theme.colors.primary : theme.colors.text.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isSelected ? 0.3 : 0.1,
                          shadowRadius: 4,
                          elevation: isSelected ? 4 : 2,
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
                              ? theme.colors.primaryForeground + '25' 
                              : theme.colors.primary + '15',
                            borderRadius: theme.borderRadius.full,
                            paddingHorizontal: theme.spacing.sm,
                            paddingVertical: theme.spacing.xs,
                            minWidth: 28,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isSelected 
                              ? theme.colors.primaryForeground + '30' 
                              : theme.colors.primary + '20',
                          }}
                        >
                          <Text
                            variant="caption"
                            style={{
                              color: isSelected 
                                ? theme.colors.primaryForeground 
                                : theme.colors.primary,
                              fontSize: 11,
                              fontWeight: '700',
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

              {/* Featured Business Listings */}
              <FeaturedListings
                maxItems={6}
                layout="horizontal"
                onViewAll={() => {
                  setSelectedCategories([]);
                  setSearchQuery('');
                  // Could add a business filter here in the future
                }}
              />

              {/* Enhanced ProductCard Grid with Professional Badges */}
              <Grid columns={2} spacing={4}>
                {transformedProducts.map((product) => (
                  <View key={product.id} style={{ position: 'relative' }}>
                    <ProductCard
                      image={product.image}
                      title={product.title}
                      price={product.price}
                      seller={product.seller}
                      badge={product.badge}
                      location={product.location}
                      layout="grid"
                      fullWidth={true}
                      listingId={product.id}
                      isFavorited={favorites[product.id] || false}
                      viewCount={viewCounts[product.id] || 0}
                      onPress={() => router.push(`/(tabs)/home/${product.id}`)}
                      onFavoritePress={user?.id !== product.seller.id ? () => {
                        // Handle favorite toggle - only show for other users' listings
                        import('@/lib/favoritesAndViews').then(({ toggleFavorite }) => {
                          toggleFavorite(product.id).then((result) => {
                            if (!result.error) {
                              refreshStats(); // Refresh the stats
                            }
                          });
                        });
                      } : undefined}
                      onViewPress={() => {
                        // Navigate to listing detail to see more details
                        router.push(`/(tabs)/home/${product.id}`);
                      }}
                    />
                    
                    {/* Professional Badges Overlay */}
                    <View style={{
                      position: 'absolute',
                      top: theme.spacing.sm,
                      left: theme.spacing.sm,
                      right: theme.spacing.sm,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: theme.spacing.xs,
                    }}>
                      {/* Boost Badge */}
                      {product.isBoosted && (
                        <BoostBadge size="sm" />
                      )}
                      
                      {/* Verified Seller Badge */}
                      {product.isVerified && (
                        <VerifiedBadge size="sm" />
                      )}
                    </View>
                  </View>
                ))}
              </Grid>
            </Animated.ScrollView>
          )}
        </View>

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
            priceRange: { min: undefined, max: undefined },
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
