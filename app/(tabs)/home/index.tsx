import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Alert, Animated, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { useBottomTabBarSpacing } from '@/hooks/useBottomTabBarSpacing';
import { useListings } from '@/hooks/useListings';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useProfile } from '@/hooks/useProfile';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useAppResume } from '@/hooks/useAppResume';
import { useFavoritesStore } from '@/store/useFavoritesStore';
// Temporarily disabled performance hooks to debug infinite re-render
// import { useOfflineListings, useOfflineSync } from '@/hooks/useOfflineSync';
// import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
// import { useMemoryManager } from '@/utils/memoryManager';
import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/hooks/useDisplayName';
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
  EnhancedSearchHeader,
  SafeAreaWrapper,
} from '@/components';
import { VirtualizedList } from '@/components/VirtualizedList/VirtualizedList';
import { HomeScreenSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
// Advanced code splitting for better performance
import { CodeSplitting } from '@/lib/codeSplitting';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { useRecommendations } from '@/hooks/useRecommendations';
import { navigation } from '@/lib/navigation';
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
  ListFilterPlus,
  ChevronUp,
  Grid2X2,
  House
} from 'lucide-react-native';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const { trackInteraction } = useRecommendations();
  const { preloadComponents, trackComponentLoad } = usePerformanceOptimization();
  const { contentBottomPadding } = useBottomTabBarSpacing();
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
  const { unreadCount, fetchNotifications } = useNotificationStore();

  // App resume handling - will be defined after useListings hook

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
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);
  const [categoryScrollViewWidth, setCategoryScrollViewWidth] = useState(0);
  const categoryScrollX = useRef(new Animated.Value(0)).current;
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;

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
  
  // Animated values for floating search input
  const floatingSearchTranslateY = useRef(new Animated.Value(0)).current;
  const floatingSearchOpacity = useRef(new Animated.Value(1)).current;
  
  // Scroll-to-top FAB state
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;
  const scrollToTopScale = useRef(new Animated.Value(0.8)).current;
  const mainScrollViewRef = useRef<any>(null);

  // Category counts from database
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [categoryCountsLoading, setCategoryCountsLoading] = useState(true);
  const [categoryIdMap, setCategoryIdMap] = useState<Record<string, string>>({});

  // Smart search modal removed - now using dedicated screen

  // Scroll to top function
  const scrollToTop = () => {
    if (mainScrollViewRef.current) {
      mainScrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Handle listing press with interaction tracking
  const handleListingPress = async (listingId: string) => {
    if (user) {
      // Track view interaction
      await trackInteraction(listingId, 'view', {
        source: 'home',
        timeSpent: 0
      });
    }
    router.push(`/(tabs)/home/${listingId}`);
  };

  // Handle scroll animations
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        // Show/hide scroll-to-top FAB
        if (currentScrollY > 300) {
          if (!showScrollToTop) {
            setShowScrollToTop(true);
            Animated.parallel([
              Animated.timing(scrollToTopOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.spring(scrollToTopScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }),
            ]).start();
          }
        } else {
          if (showScrollToTop) {
            setShowScrollToTop(false);
            Animated.parallel([
              Animated.timing(scrollToTopOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(scrollToTopScale, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }

        // Determine scroll direction
        if (diff > 0 && currentScrollY > 50) {
          // Scrolling down
          if (scrollDirection.current !== 'down') {
            scrollDirection.current = 'down';
            // Hide header, show sticky search, hide floating search
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
              // Hide floating search input
              Animated.timing(floatingSearchTranslateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(floatingSearchOpacity, {
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
            // Show header, hide sticky search, show floating search
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
              // Show floating search input
              Animated.timing(floatingSearchTranslateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(floatingSearchOpacity, {
                toValue: 1,
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

  // Fetch user credit balance and notifications on mount
  useEffect(() => {
    fetchUserCredit();
    fetchNotifications();
  }, [user?.id]); // Removed fetchNotifications from dependencies as Zustand functions are stable

  // Sync location from profile to app store
  useEffect(() => {
    if (profile?.location && profile.location !== currentLocation) {
      setCurrentLocation(profile.location);
    }
  }, [profile?.location, currentLocation, setCurrentLocation]);


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
   /*  { 
      id: 'all', 
      label: 'All', 
      icon: <Grid3X3 size={24} color={theme.colors.primary} />, 
      count: categoryCounts.total || 0
    }, */
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
      icon: <House size={24} color={theme.colors.primary} />, 
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
      icon: <Grid2X2 size={24} color={theme.colors.primary} />, 
      count: categoryCounts.other || 0 
    },
  ];

  // Home screen shows all listings without category filtering
  // Category filtering is now handled by navigation to search screen

  // Memoize useListings options to prevent infinite re-renders
  const listingsOptions = useMemo(() => ({
    search: searchQuery,
    // Remove category filtering - home screen shows all listings
    location: filters.location, // Only apply location filter if explicitly set by user
    priceMin: filters.priceRange.min,
    priceMax: filters.priceRange.max,
    condition: filters.condition,
  }), [searchQuery, filters.location, filters.priceRange.min, filters.priceRange.max, filters.condition]);

  const { 
    listings: products, 
    loading, 
    error, 
    refreshing, 
    refresh 
  } = useListings(listingsOptions);

  // App resume handling - refresh listings when app comes back from background
  const onResumeCallback = React.useCallback(async () => {
    console.log('📱 Home screen: App resumed, refreshing listings...');
    await refresh();
    // Also refresh user credit and notifications
    await fetchUserCredit();
    await fetchNotifications();
  }, [refresh]); // Removed fetchUserCredit and fetchNotifications as they are stable functions

  const { isRefreshing, isReconnecting } = useAppResume({
    onResume: onResumeCallback,
    debug: true,
  });

  // Real-time updates should handle new listings automatically
  // Removed useFocusEffect to prevent blinking - relying on enhanced real-time updates

  // Transform database listings to component format with professional styling
  const transformedProducts = useMemo(() => products.map((listing: any) => {
    // Handle both joined and simple listing data
    const seller = listing.profiles || null;
    
    // Determine the highest priority badge (only show ONE badge per listing)
    let primaryBadge = null;
    
    // Priority order: Urgent > Spotlight > Boosted > Business > Verified
    if (listing.urgent_until && new Date(listing.urgent_until) > new Date()) {
      primaryBadge = { text: 'Urgent Sale', variant: 'urgent' as const };
    } else if (listing.spotlight_until && new Date(listing.spotlight_until) > new Date()) {
      primaryBadge = { text: 'Spotlight', variant: 'spotlight' as const };
    } else if (listing.boost_until && new Date(listing.boost_until) > new Date()) {
      primaryBadge = { text: 'Boosted', variant: 'featured' as const };
    } else if (seller?.account_type === 'business') {
      primaryBadge = { text: 'Business', variant: 'info' as const };
    } else if (seller?.verification_status === 'verified') {
      primaryBadge = { text: 'Verified', variant: 'success' as const };
    }

    // Check if listing is highlighted
    const isHighlighted = listing.highlight_until && new Date(listing.highlight_until) > new Date();
    
    return {
      id: listing.id,
      isHighlighted, // Add highlight flag
      image: listing.images || ['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
      title: listing.title,
      price: listing.price,
      seller: {
        id: seller?.id || listing.user_id,
        name: seller ? getDisplayName(seller, false).displayName : 'Anonymous User',
        avatar: seller?.avatar_url || null,
        rating: seller?.rating || 0,
        badges: seller?.account_type === 'business' ? ['business'] : [],
      },
      badge: primaryBadge || undefined, // Convert null to undefined
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
  const { favorites: hookFavorites, viewCounts, refreshStats } = useMultipleListingStats({ 
    listingIds 
  });
  
  // Get favorites count for header
  const { incrementFavoritesCount, decrementFavoritesCount, fetchFavoritesCount } = useFavoritesStore();
  
  // Local state for optimistic updates
  const [optimisticFavorites, setOptimisticFavorites] = useState<Record<string, boolean>>({});
  const [optimisticFavoritesCount, setOptimisticFavoritesCount] = useState<Record<string, number>>({});
  
  // Merge hook favorites with optimistic updates
  const favorites = useMemo(() => ({
    ...hookFavorites,
    ...optimisticFavorites
  }), [hookFavorites, optimisticFavorites]);
  
  // Update transformed products with optimistic favorites count
  const transformedProductsWithOptimisticCounts = useMemo(() => {
    return transformedProducts.map(product => ({
      ...product,
      favorites: optimisticFavoritesCount[product.id] !== undefined 
        ? optimisticFavoritesCount[product.id] 
        : product.favorites
    }));
  }, [transformedProducts, optimisticFavoritesCount]);

  // Initialize favorites count when component mounts
  useEffect(() => {
    fetchFavoritesCount();
  }, [fetchFavoritesCount]);

  // Refresh data when screen comes into focus (e.g., returning from favorites screen)
  useFocusEffect(
    React.useCallback(() => {
      // Clear any optimistic updates when returning to home screen
      setOptimisticFavorites({});
      setOptimisticFavoritesCount({});
      
      // Refresh stats to get latest data from database
      refreshStats();
      fetchFavoritesCount();
    }, [refreshStats, fetchFavoritesCount])
  );

  const handleCategoryToggle = (categoryId: string) => {
    if (categoryId === 'all') {
      // If "All" is selected, clear all categories and stay on home screen
      setSelectedCategories([]);
    } else {
      // Navigate to search results screen with the selected category
      const categoryName = categories.find(cat => cat.id === categoryId)?.label;
      
      // Map category slugs to actual database UUIDs
      const categoryIdMap: Record<string, string> = {
        'electronics': '00000000-0000-4000-8000-000000000001', // Electronics & Technology
        'fashion': '00000000-0000-4000-8000-000000000002', // Fashion
        'vehicles': '00000000-0000-4000-8000-000000000003', // Vehicles
        'sports': '00000000-0000-4000-8000-000000000005', // Sports & Fitness
        'books': '00000000-0000-4000-8000-000000000007', // Books & Media
        'beauty': '00000000-0000-4000-8000-000000000012', // Beauty & Health
        'health': '00000000-0000-4000-8000-000000000012', // Beauty & Health (same as beauty)
        'home': '00000000-0000-4000-8000-000000000004', // Home & Garden
        'services': '00000000-0000-4000-8000-000000000010', // Services
        'other': '00000000-0000-4000-8000-000000000000' // Other
      };
      
      const mappedCategoryId = categoryIdMap[categoryId];
      
      if (mappedCategoryId && categoryName) {
        router.push({
          pathname: '/search',
          params: { 
            category: mappedCategoryId,
            categoryName: categoryName
          }
        });
      }
    }
  };

  const firstName = profile?.first_name || user?.user_metadata?.first_name || 'User';
  const lastName = profile?.last_name || user?.user_metadata?.last_name || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <SafeAreaWrapper>
      {/* Enhanced Search Header - Floating */}
      <Animated.View style={{ 
        position: 'absolute',
        top: theme.spacing['3xl'],
        left: 0,
        right: 0,
        zIndex: 12,
        transform: [{ translateY: floatingSearchTranslateY }],
        opacity: floatingSearchOpacity,
      }}>
        <EnhancedSearchHeader
          searchQuery={searchQuery}
          onSearchPress={() => router.push('/smart-search')}
          onFilterPress={() => setShowFilters(true)}
          onAvatarPress={() => router.push('/(tabs)/more')}
          placeholder= 'Search here...'
        />
      </Animated.View>

      {/* Main Content Container */}
      <View style={{ 
        flex: 1,
      }}>

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
            <HomeScreenSkeleton />
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
              ref={mainScrollViewRef}
              showsVerticalScrollIndicator={false}
              style={{ zIndex: 10 }}
              contentContainerStyle={{
                // Full-bleed implementation: no horizontal padding on container
                paddingTop: 100, // Add top padding to account for floating search input
                paddingBottom: contentBottomPadding,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={async () => {
                    console.log('🔄 Pull to refresh triggered');
                    await refresh();
                  }}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                  progressBackgroundColor={theme.colors.background}
                />
              }
              onScroll={handleScroll}
              scrollEventThrottle={16}
              // Performance optimizations for smoother scrolling
              removeClippedSubviews={true}
              decelerationRate="fast"
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
            {/*   <TouchableOpacity
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
              </TouchableOpacity> */}

              {/* Enhanced Categories with Icons and Scroll Indicator */}
              <View style={{ paddingVertical: theme.spacing.md, position: 'relative' }}>
                {/* Professional Scroll Indicator - Top Right */}
                {categoryContentWidth > categoryScrollViewWidth && (
                  <Animated.View
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
                      opacity: scrollIndicatorOpacity,
                    }}
                  >
                    <Animated.View
                      style={{
                        height: '100%',
                        backgroundColor: theme.colors.primary,
                        borderRadius: 1.5,
                        width: `${Math.min(100, (categoryScrollViewWidth / categoryContentWidth) * 100)}%`,
                        transform: [
                          {
                            translateX: categoryScrollX.interpolate({
                              inputRange: [0, Math.max(1, categoryContentWidth - categoryScrollViewWidth)],
                              outputRange: [0, Math.max(0, (screenWidth / 3) - ((screenWidth / 3) * (categoryScrollViewWidth / categoryContentWidth)))],
                              extrapolate: 'clamp',
                            }),
                          },
                        ],
                      }}
                    />
                  </Animated.View>
                )}
                
                <ScrollView
                  ref={categoryScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  scrollEventThrottle={16}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: categoryScrollX } } }],
                    { useNativeDriver: false }
                  )}
                  onMomentumScrollEnd={() => {
                    // Add subtle bounce effect when scroll ends
                    Animated.sequence([
                      Animated.timing(scrollIndicatorOpacity, {
                        toValue: 0.7,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(scrollIndicatorOpacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                      }),
                    ]).start();
                  }}
                  onContentSizeChange={(width) => {
                    setCategoryContentWidth(width);
                    // Fade in scroll indicator when content is wider than view
                    if (width > categoryScrollViewWidth) {
                      Animated.spring(scrollIndicatorOpacity, {
                        toValue: 1,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8,
                      }).start();
                    }
                  }}
                  onLayout={(event) => {
                    setCategoryScrollViewWidth(event.nativeEvent.layout.width);
                  }}
                  contentContainerStyle={{
                    paddingHorizontal: theme.spacing.md,
                    marginVertical: theme.spacing.sm,
                    gap: theme.spacing.sm,
                    alignItems: 'center',
                    paddingTop: theme.spacing.md, // Add top padding to account for indicator
                  }}
                >
                  {categories.map((category) => {
                    // Remove selection state since we navigate to search screen
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
                          backgroundColor: theme.colors.surface,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          gap: theme.spacing.sm,
                          minHeight: 48,
                          shadowColor: theme.colors.text.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 2,
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
                            color: theme.colors.primary,
                          } as any)}
                        </View>
                        
                        {/* Category Label */}
                        <Text
                          variant="body"
                          style={{
                            color: theme.colors.text.primary,
                            fontWeight: '700',
                            fontSize: 13,
                          }}
                        >
                          {category.label}
                        </Text>
                        
                        {/* Category Count Badge */}
                        <View
                          style={{
                            backgroundColor: theme.colors.primary + '15',
                            borderRadius: theme.borderRadius.full,
                            paddingHorizontal: theme.spacing.sm,
                            paddingVertical: theme.spacing.xs,
                            minWidth: 24,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.primary + '20',
                          }}
                        >
                          <Text
                            variant="caption"
                            style={{
                              color: theme.colors.primary,
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

              {/* Featured Business Listings - USING WORKING MINIMAL VERSION */}
              <Suspense fallback={<LoadingSkeleton width="100%" height={200} />}>
                <CodeSplitting.FixedFeaturedListings
                  maxItems={10}
                  layout="horizontal"
                  onViewAll={() => {
                    navigation.home.goToBusinessListings();
                  }}
                />
              </Suspense>

              {/* Recommendation Feed */}
              {user && (
                <Suspense fallback={<LoadingSkeleton width="100%" height={300} />}>
                  <CodeSplitting.RecommendationFeed
                    onListingPress={handleListingPress}
                  onViewAllPersonalized={() => navigation.recommendations.goToPersonalized()}
                  onViewAllTrending={() => navigation.recommendations.goToTrending()}
                  onViewAllRecentlyViewed={() => navigation.recommendations.goToRecent()}
                  />
                </Suspense>
              )}

              {/* All Listings Section */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg
              }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <Text variant="h3">More Listings From Sellers</Text>
                  </View>
                  <Text variant="bodySmall" color="muted" style={{ marginTop: theme.spacing.xs }}>
                    Browse all available items
                  </Text>
                </View>
              </View>

              {/* Enhanced ProductCard Grid with Professional Badges */}
              <Grid columns={2} spacing={4}>
                {transformedProductsWithOptimisticCounts.map((product) => (
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
                      favoritesCount={product.favorites || 0}
                      isHighlighted={product.isHighlighted}
                      onPress={() => handleListingPress(product.id)}
                      onFavoritePress={user?.id !== product.seller.id ? () => {
                        // Handle favorite toggle - only show for other users' listings
                        import('@/lib/favoritesAndViews').then(({ toggleFavorite }) => {
                          // Optimistic update - immediately update local state
                          const currentFavorite = favorites[product.id] || false;
                          const currentFavoritesCount = product.favorites || 0;
                          const newFavoritesCount = currentFavorite 
                            ? currentFavoritesCount - 1 
                            : currentFavoritesCount + 1;
                          
                          // Update both favorite state and count optimistically
                          setOptimisticFavorites(prev => ({
                            ...prev,
                            [product.id]: !currentFavorite
                          }));
                          
                          setOptimisticFavoritesCount(prev => ({
                            ...prev,
                            [product.id]: newFavoritesCount
                          }));
                          
                          // Update header favorites count
                          if (currentFavorite) {
                            decrementFavoritesCount();
                          } else {
                            incrementFavoritesCount();
                          }
                          
                          toggleFavorite(product.id).then((result) => {
                            if (result.error) {
                              // Revert optimistic updates on error
                              setOptimisticFavorites(prev => ({
                                ...prev,
                                [product.id]: currentFavorite
                              }));
                              setOptimisticFavoritesCount(prev => ({
                                ...prev,
                                [product.id]: currentFavoritesCount
                              }));
                              
                              // Revert header favorites count
                              if (currentFavorite) {
                                incrementFavoritesCount();
                              } else {
                                decrementFavoritesCount();
                              }
                            } else {
                              // Keep optimistic updates until next data refresh
                              // The optimistic state will be cleared when the component re-renders with fresh data
                              // No need to clear immediately as it causes flickering
                            }
                          });
                        });
                      } : undefined}
                      onViewPress={() => {
                        // Navigate to listing detail to see more details
                        router.push(`/(tabs)/home/${product.id}`);
                      }}
                    />
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

      {/* Scroll to Top FAB */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: theme.spacing.xl,
          right: theme.spacing.lg,
          zIndex: 1000,
          opacity: scrollToTopOpacity,
          transform: [{ scale: scrollToTopScale }],
        }}
      >
        <TouchableOpacity
          onPress={scrollToTop}
          style={{
            backgroundColor: theme.colors.primary,
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            ...theme.shadows.lg,
            elevation: 8,
          }}
          activeOpacity={0.8}
        >
          <ChevronUp size={24} color={theme.colors.primaryForeground} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaWrapper>
  );
}
