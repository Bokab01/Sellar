import React, { useState, useEffect, useRef, useMemo, lazy, Suspense, useCallback } from 'react';
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
import { fetchMainCategories } from '@/utils/categoryUtils';
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
    setFilters,
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
  
  // Categories state
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

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

  // Category counts removed - no longer displayed in UI for better performance

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

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const mainCategories = await fetchMainCategories();
        
        // Map categories with icons
        const categoriesWithIcons = mainCategories.map((cat) => {
          // Map icon names to actual icon components
          let icon;
          switch (cat.icon?.toLowerCase()) {
            case 'smartphone':
              icon = <Smartphone size={24} color={theme.colors.primary} />;
              break;
            case 'car':
              icon = <Car size={24} color={theme.colors.primary} />;
              break;
            case 'home':
            case 'house':
              icon = <House size={24} color={theme.colors.primary} />;
              break;
            case 'shirt':
              icon = <Shirt size={24} color={theme.colors.primary} />;
              break;
            case 'book':
              icon = <Book size={24} color={theme.colors.primary} />;
              break;
            case 'dumbbell':
              icon = <Dumbbell size={24} color={theme.colors.primary} />;
              break;
            case 'briefcase':
              icon = <Briefcase size={24} color={theme.colors.primary} />;
              break;
            default:
              icon = <Grid2X2 size={24} color={theme.colors.primary} />;
          }
          
          return {
            id: cat.id,
            label: cat.name,
            icon,
          };
        });
        
        setCategories(categoriesWithIcons);
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to empty array
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    loadCategories();
  }, [theme.colors.primary]);

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


  // Cache for listings to prevent unnecessary refetches when navigating back
  const listingsCache = useRef<{ data: any[]; timestamp: number } | null>(null);
  const LISTINGS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Handle focus effect for smooth navigation back
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      
      // Check if we have fresh cached data
      if (listingsCache.current && 
          (now - listingsCache.current.timestamp) < LISTINGS_CACHE_DURATION) {
        console.log('📱 Using cached listings data for smooth navigation back');
        return; // Don't refetch if we have fresh data
      }
    }, [])
  );

  // Categories are now loaded from database via useEffect above

  // Memoize useListings options to prevent infinite re-renders
  const listingsOptions = useMemo(() => {
    const options = {
      search: searchQuery,
      categories: filters.categories, // Apply category filter
      location: filters.location, // Only apply location filter if explicitly set by user
      priceMin: filters.priceRange.min,
      priceMax: filters.priceRange.max,
      condition: filters.condition,
    };
    return options;
  }, [searchQuery, filters.categories, filters.location, filters.priceRange.min, filters.priceRange.max, filters.condition]);

  const { 
    listings: products, 
    loading, 
    error, 
    refreshing, 
    refresh 
  } = useListings(listingsOptions);

  // Cache listings data when fetched
  useEffect(() => {
    if (products && products.length > 0) {
      listingsCache.current = {
        data: products,
        timestamp: Date.now()
      };
    }
  }, [products]);

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
    
    // ✅ Use pre-computed is_sellar_pro flag from database view (optimal performance)
    const isSellarPro = listing.is_sellar_pro === true;
    
    // Debug logging for first listing
    if (products.indexOf(listing) === 0) {
      console.log('🔍 Debug listing data:', {
        listingId: listing.id,
        userId: listing.user_id,
        isSellarPro: listing.is_sellar_pro,
        subscriptionPlan: listing.subscription_plan_name,
        subscriptionStatus: listing.subscription_status,
      });
    }
    
    // Determine the highest priority badge (only show ONE badge per listing)
    let primaryBadge = null;
    
    // Priority order: Reserved > Urgent > Spotlight > Boosted > PRO > Business > Verified
    if (listing.status === 'reserved') {
      primaryBadge = { text: 'Reserved', variant: 'warning' as const };
    } else if (listing.urgent_until && new Date(listing.urgent_until) > new Date()) {
      primaryBadge = { text: 'Urgent Sale', variant: 'urgent' as const };
    } else if (listing.spotlight_until && new Date(listing.spotlight_until) > new Date()) {
      primaryBadge = { text: 'Spotlight', variant: 'spotlight' as const };
    } else if (listing.boost_until && new Date(listing.boost_until) > new Date()) {
      primaryBadge = { text: 'Boosted', variant: 'featured' as const };
    } else if (isSellarPro) {
      primaryBadge = { text: '⭐ PRO', variant: 'primary' as const };
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
  const { 
    incrementFavoritesCount, 
    decrementFavoritesCount, 
    fetchFavoritesCount, 
    fetchFavorites,
    favorites: globalFavorites,
    listingFavoriteCounts,
    toggleFavorite: toggleGlobalFavorite,
    incrementListingFavoriteCount,
    decrementListingFavoriteCount,
    updateListingFavoriteCount
  } = useFavoritesStore();
  
  // Use global favorites from store (merged with hook favorites for backward compatibility)
  const favorites = useMemo(() => ({
    ...hookFavorites,
    ...globalFavorites
  }), [hookFavorites, globalFavorites]);
  
  // Merge transformed products with optimistic favorite counts from global store
  const transformedProductsWithOptimisticCounts = useMemo(() => {
    return transformedProducts.map(product => ({
      ...product,
      favorites: listingFavoriteCounts[product.id] !== undefined 
        ? listingFavoriteCounts[product.id] 
        : product.favorites
    }));
  }, [transformedProducts, listingFavoriteCounts]);

  // Initialize favorites count when component mounts
  useEffect(() => {
    fetchFavoritesCount();
  }, [fetchFavoritesCount]);

  // Initialize listing favorite counts when products load
  useEffect(() => {
    transformedProducts.forEach(product => {
      // Always update if the product has a favorites count and it's different from what's in store
      if (product.favorites !== undefined) {
        const currentStoreCount = listingFavoriteCounts[product.id];
        if (currentStoreCount === undefined) {
          updateListingFavoriteCount(product.id, product.favorites);
        }
      }
    });
  }, [transformedProducts]);

  // Refresh data when screen comes into focus (e.g., returning from favorites screen)
  useFocusEffect(
    React.useCallback(() => {
      // Fetch latest favorites from database
      fetchFavorites();
      
      // Refresh stats to get latest data from database
      refreshStats();
      fetchFavoritesCount();
    }, [refreshStats, fetchFavoritesCount, fetchFavorites])
  );

  const handleCategoryToggle = useCallback((categoryId: string) => {
    // Get the category name
    const categoryName = categories.find(cat => cat.id === categoryId)?.label;
    
    if (categoryName) {
      // Toggle category filter - if already selected, remove it; otherwise, set it as the only category
      const currentCategories = filters.categories || [];
      const isSelected = currentCategories.includes(categoryName);
      
      if (isSelected) {
        // Remove this category
        setFilters({
          ...filters,
          categories: currentCategories.filter(c => c !== categoryName),
        });
      } else {
        // Set this as the only category (single selection)
        setFilters({
          ...filters,
          categories: [categoryName],
        });
      }
    }
  }, [categories, filters, setFilters]);

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
        paddingVertical:theme.spacing.sm,
      }}>
        <EnhancedSearchHeader
          searchQuery={searchQuery}
          onSearchPress={() => router.push('/smart-search')}
          onFilterPress={() => router.push('/filter-products')}
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
                title="No listings found"
                description={searchQuery || filters.categories?.length > 0 || filters.location || filters.condition?.length > 0
                  ? "No listings match your current search or filters. Try adjusting your criteria or browse all listings."
                  : "Be the first to list an item! Start selling and help build our marketplace community."
                }
                action={{
                  text: searchQuery || filters.categories?.length > 0 || filters.location || filters.condition?.length > 0 ? 'Clear Filters' : 'Create Listing',
                  onPress: searchQuery || filters.categories?.length > 0 || filters.location || filters.condition?.length > 0
                    ? () => {
                        setSearchQuery('');
                        setFilters({
                          categories: [],
                          priceRange: { min: undefined, max: undefined },
                          condition: [],
                          location: '',
                          sortBy: 'newest',
                        });
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
                  onPress={() => router.push('/filter-products')}
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
                      width: screenWidth / 5, // 1/3 of screen width
                      height: 4,
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
                    // Check if this category is selected
                    const isSelected = filters.categories?.includes(category.label);
                    
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
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                          borderWidth: 1,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
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
                            color: isSelected ? theme.colors.primaryForeground : theme.colors.primary,
                          } as any)}
                        </View>
                        
                        {/* Category Label */}
                        <Text
                          variant="body"
                          style={{
                            color: isSelected ? theme.colors.primaryForeground : theme.colors.text.primary,
                            fontWeight: '700',
                            fontSize: 13,
                          }}
                        >
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Featured Business Listings - Only show when no filters are active */}
              {!searchQuery && !filters.categories?.length && !filters.location && !filters.condition?.length && (
                <Suspense fallback={<LoadingSkeleton width="100%" height={200} />}>
                  <CodeSplitting.FixedFeaturedListings
                    maxItems={10}
                layout="horizontal"
                onViewAll={() => {
                      navigation.home.goToBusinessListings();
                    }}
                  />
                </Suspense>
              )}

              {/* Recommendation Feed - Only show when no filters are active */}
              {user && !searchQuery && !filters.categories?.length && !filters.location && !filters.condition?.length && (
                <Suspense fallback={<LoadingSkeleton width="100%" height={300} />}>
                  <CodeSplitting.RecommendationFeed
                    onListingPress={handleListingPress}
                  onViewAllPersonalized={() => navigation.recommendations.goToPersonalized()}
                  onViewAllTrending={() => navigation.recommendations.goToTrending()}
                  onViewAllRecentlyViewed={() => navigation.recommendations.goToRecent()}
                  />
                </Suspense>
              )}

              {/* All Listings Section - Dynamic Title */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg
              }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <Text variant="h3">
                      {filters.categories?.length > 0 
                        ? `${filters.categories[0]} Listings`
                        : searchQuery 
                        ? 'Search Results'
                        : 'More Listings From Sellers'
                      }
                    </Text>
                  </View>
                  <Text variant="bodySmall" color="muted" style={{ marginTop: theme.spacing.xs }}>
                    {filters.categories?.length > 0 
                      ? `${transformedProducts.length} ${transformedProducts.length === 1 ? 'item' : 'items'} found in ${filters.categories[0]}`
                      : searchQuery 
                      ? `${transformedProducts.length} ${transformedProducts.length === 1 ? 'result' : 'results'} for "${searchQuery}"`
                      : 'Browse all available items'
                    }
                  </Text>
                </View>

                {/* Clear Filter Button - Show when filters are active */}
                {(filters.categories?.length > 0 || searchQuery || filters.location || filters.condition?.length > 0) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setFilters({
                        categories: [],
                        priceRange: { min: undefined, max: undefined },
                        condition: [],
                        location: '',
                        sortBy: 'newest',
                      });
                    }}
                    style={{
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
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
                      favoritesCount={listingFavoriteCounts[product.id] ?? product.favorites ?? 0}
                      isHighlighted={product.isHighlighted}
                      onPress={() => handleListingPress(product.id)}
                      onFavoritePress={user?.id !== product.seller.id ? () => {
                        // Handle favorite toggle - only show for other users' listings
                        import('@/lib/favoritesAndViews').then(({ toggleFavorite }) => {
                          const isFavorited = favorites[product.id] || false;
                          
                          // Optimistic update using global store (syncs across all instances)
                          toggleGlobalFavorite(product.id);
                          
                          // Update the listing's favorite count optimistically
                          if (isFavorited) {
                            decrementListingFavoriteCount(product.id);
                          } else {
                            incrementListingFavoriteCount(product.id);
                          }
                          
                          // Perform actual database toggle
                          toggleFavorite(product.id).then((result) => {
                            if (result.error) {
                              // Revert optimistic updates on error
                              toggleGlobalFavorite(product.id);
                              if (isFavorited) {
                                incrementListingFavoriteCount(product.id);
                              } else {
                                decrementListingFavoriteCount(product.id);
                              }
                            } else {
                              // Refresh stats after successful toggle
                              refreshStats();
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
