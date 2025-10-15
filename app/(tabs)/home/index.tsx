import React, { useState, useEffect, useRef, useMemo, lazy, Suspense, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Animated, Pressable, FlatList } from 'react-native';

// Create animated FlatList for scroll animations
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<any>);
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Removed Haptics import - not used
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
import { useNewUserDetection } from '@/hooks/useNewUserDetection';
// Temporarily disabled performance hooks to debug infinite re-render
// import { useOfflineListings, useOfflineSync } from '@/hooks/useOfflineSync';
// import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
// import { useMemoryManager } from '@/utils/memoryManager';
import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/hooks/useDisplayName';
import { 
  Text,
  ProductCard,
  EmptyState,
  LoadingSkeleton,
  EnhancedSearchHeader,
  SafeAreaWrapper,
} from '@/components';
// Removed VirtualizedList import - not used
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
  Zap,
  Grid3X3,
  Search,
  Filter,
  ListFilterPlus,
  ChevronUp,
  Grid2X2,
  House,
  Wifi,
  WifiOff
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
  
  // ✅ NEW: Check if user should see welcome screen (moved from index.tsx)
  const { isNewUser, loading: newUserLoading } = useNewUserDetection();

  // Check if user should see welcome screen after mounting
  useEffect(() => {
    if (!newUserLoading && isNewUser === true) {
      router.replace('/(auth)/welcome');
    }
  }, [isNewUser, newUserLoading]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollUpdateTimeout.current) {
        clearTimeout(scrollUpdateTimeout.current);
      }
    };
  }, []);
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
  
  // Local loading state for retry functionality
  const [isRetrying, setIsRetrying] = useState(false);
  const [creditLoading, setCreditLoading] = useState(true);
  
  // Categories state
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Category scroll reference (simplified - removed complex animations)
  const categoryScrollRef = useRef<ScrollView>(null);

  // Scroll animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 160; // Approximate header height
  const searchBarHeight = 70; // Search bar height with padding
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');

  // Animated values for header and floating search (simplified)
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const floatingSearchTranslateY = useRef(new Animated.Value(0)).current;
  const floatingSearchOpacity = useRef(new Animated.Value(1)).current;
  
  // Scroll-to-top FAB state
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;
  const scrollToTopScale = useRef(new Animated.Value(0.8)).current;
  const mainScrollViewRef = useRef<any>(null);

  // Category counts removed - no longer displayed in UI for better performance

  // Smart search modal removed - now using dedicated screen

  // Enhanced scroll to top function with smooth UX
  const scrollToTop = useCallback(() => {
    if (mainScrollViewRef.current) {
      // Smooth scroll to top with easing (FlatList uses scrollToOffset)
      mainScrollViewRef.current.scrollToOffset({ 
        offset: 0, 
        animated: true 
      });
      
      // Hide FAB immediately for better UX
      setShowScrollToTop(false);
      Animated.parallel([
        Animated.timing(scrollToTopOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scrollToTopScale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [scrollToTopOpacity, scrollToTopScale]);

  // Handle listing press with interaction tracking
  const handleListingPress = useCallback(async (listingId: string) => {
    if (user) {
      // Track view interaction
      await trackInteraction(listingId, 'view', {
        source: 'home',
        timeSpent: 0
      });
    }
    router.push(`/(tabs)/home/${listingId}`);
  }, [user, trackInteraction]);

  // ✅ Optimized favorite toggle handler - Will be defined after variables are declared

  // ✅ Optimized scroll handler with debouncing
  const scrollUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        // Throttle scroll-to-top FAB updates
        if (scrollUpdateTimeout.current) {
          clearTimeout(scrollUpdateTimeout.current);
        }
        
        scrollUpdateTimeout.current = setTimeout(() => {
          // Show/hide scroll-to-top FAB
          if (currentScrollY > 300 && !showScrollToTop) {
            setShowScrollToTop(true);
            Animated.parallel([
              Animated.timing(scrollToTopOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
              }),
              Animated.spring(scrollToTopScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 120,
                friction: 7,
                overshootClamping: true,
              }),
            ]).start();
          } else if (currentScrollY <= 300 && showScrollToTop) {
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
        }, 100); // Debounce FAB updates
        
        // Determine scroll direction with threshold to prevent jitter
        if (Math.abs(diff) > 5) { // Only trigger on significant scroll
          if (diff > 0 && currentScrollY > 50) {
            // Scrolling down
            if (scrollDirection.current !== 'down') {
              scrollDirection.current = 'down';
              // Simplified animations - hide header, show sticky search
              Animated.parallel([
                Animated.timing(headerTranslateY, {
                  toValue: -headerHeight,
                  duration: 250,
                  useNativeDriver: true,
                }),
                Animated.timing(floatingSearchTranslateY, {
                  toValue: -100,
                  duration: 250,
                  useNativeDriver: true,
                }),
                Animated.timing(floatingSearchOpacity, {
                  toValue: 0,
                  duration: 250,
                  useNativeDriver: true,
                }),
              ]).start();
            }
          } else if (diff < -5 || currentScrollY <= 50) {
            // Scrolling up or at top
            if (scrollDirection.current !== 'up') {
              scrollDirection.current = 'up';
              // Show header and floating search
              Animated.parallel([
                Animated.timing(headerTranslateY, {
                  toValue: 0,
                  duration: 250,
                  useNativeDriver: true,
                }),
                Animated.timing(floatingSearchTranslateY, {
                  toValue: 0,
                  duration: 250,
                  useNativeDriver: true,
                }),
                Animated.timing(floatingSearchOpacity, {
                  toValue: 1,
                  duration: 250,
                  useNativeDriver: true,
                }),
              ]).start();
            }
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
        // Handle error silently
        setUserCredit(0);
      } else {
        setUserCredit((creditData as any)?.balance || 0);
      }
    } catch (err) {
      // Handle error silently
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
        // Handle error silently
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
      previous_price: listing.previous_price || null,
      price_changed_at: listing.price_changed_at || null,
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

  // ✅ Optimized favorite toggle handler - Now defined after variables
  const handleFavoriteToggle = useCallback(async (productId: string, isFavorited: boolean) => {
    // Optimistic update
    toggleGlobalFavorite(productId);
    if (isFavorited) {
      decrementListingFavoriteCount(productId);
    } else {
      incrementListingFavoriteCount(productId);
    }

    // Lazy load the favorites module
    try {
      const { toggleFavorite } = await import('@/lib/favoritesAndViews');
      const result = await toggleFavorite(productId);
      
      if (result.error) {
        // Revert on error
        toggleGlobalFavorite(productId);
        if (isFavorited) {
          incrementListingFavoriteCount(productId);
        } else {
          decrementListingFavoriteCount(productId);
        }
      } else {
        refreshStats();
      }
    } catch (error) {
      // Revert on error
      toggleGlobalFavorite(productId);
      if (isFavorited) {
        incrementListingFavoriteCount(productId);
      } else {
        decrementListingFavoriteCount(productId);
      }
    }
  }, [globalFavorites, toggleGlobalFavorite, incrementListingFavoriteCount, decrementListingFavoriteCount, refreshStats]);
  
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

  // ✅ Memoize category items to prevent re-creating on every render
  const categoryItems = useMemo(() => {
    return categories.map((category) => {
      const isSelected = filters.categories?.includes(category.label);
      return {
        ...category,
        isSelected,
      };
    });
  }, [categories, filters.categories]);

  // ✅ Optimized category render item
  const renderCategoryItem = useCallback((category: any) => {
    return (
      <Pressable
        key={category.id}
        onPress={() => handleCategoryToggle(category.id)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.borderRadius.full,
          backgroundColor: category.isSelected ? theme.colors.primary : theme.colors.surface,
          borderWidth: 1,
          borderColor: category.isSelected ? theme.colors.primary : theme.colors.border,
          gap: theme.spacing.sm,
          minHeight: 48,
          shadowColor: theme.colors.text.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: category.isSelected ? 0.2 : 0.1,
          shadowRadius: pressed ? 8 : 4,
          elevation: pressed ? 4 : 2,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <View style={{ 
          width: 24, 
          height: 24, 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          {React.cloneElement(category.icon as React.ReactElement, {
            size: 20,
            color: category.isSelected ? theme.colors.primaryForeground : theme.colors.primary,
          } as any)}
        </View>
        
        <Text
          variant="body"
          style={{
            color: category.isSelected ? theme.colors.primaryForeground : theme.colors.text.primary,
            fontWeight: '700',
            fontSize: 13,
          }}
        >
          {category.label}
        </Text>
      </Pressable>
    );
  }, [theme, handleCategoryToggle]);

  // ✅ Memoized render function for list items
  const renderProductItem = useCallback(({ item: product }: { item: any }) => (
    <View style={{ flex: 0.5, padding: 2 }}>
      <ProductCard
        image={product.image}
        title={product.title}
        price={product.price}
        previousPrice={product.previous_price}
        priceChangedAt={product.price_changed_at}
        seller={product.seller}
        badge={product.badge}
        location={product.location}
        layout="grid"
        fullWidth={true}
        borderRadius={theme.borderRadius.sm}
        listingId={product.id}
        isFavorited={favorites[product.id] || false}
        viewCount={viewCounts[product.id] || 0}
        favoritesCount={listingFavoriteCounts[product.id] ?? product.favorites ?? 0}
        isHighlighted={product.isHighlighted}
        onPress={() => handleListingPress(product.id)}
        onFavoritePress={user?.id !== product.seller.id 
          ? () => handleFavoriteToggle(product.id, favorites[product.id] || false)
          : undefined
        }
        onViewPress={() => router.push(`/(tabs)/home/${product.id}`)}
      />
    </View>
  ), [theme, favorites, viewCounts, listingFavoriteCounts, user?.id, handleListingPress, handleFavoriteToggle]);

  // ✅ Create a lighter, more stable header component
  const ListHeader = useMemo(() => (
    <View>
      {/* Professional Location Display */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: theme.spacing.lg,
          marginVertical: theme.spacing.md,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.primary + '15',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.sm,
          }}
        >
          <MapPin size={16} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            variant="button"
            style={{
              color: theme.colors.text.primary,
              fontWeight: '600',
              marginTop: 2,
            }}
          >
            {currentLocation}
          </Text>
        </View>
      </View>

      {/* Enhanced Categories - Simplified without complex animations */}
      <View style={{ paddingVertical: theme.spacing.md }}>
        <ScrollView
          ref={categoryScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            marginVertical: theme.spacing.sm,
            gap: theme.spacing.sm,
            alignItems: 'center',
            paddingTop: theme.spacing.md,
          }}
        >
          {categoryItems.map(renderCategoryItem)}
        </ScrollView>
      </View>

      {/* Featured Business Listings - Removed Suspense for better performance */}
      {!searchQuery && !filters.categories?.length && !filters.location && !filters.condition?.length && !filters.priceRange.min && !filters.priceRange.max && (
        <View style={{ minHeight: 200 }}>
          <CodeSplitting.FixedFeaturedListings
            maxItems={10}
            layout="horizontal"
            onViewAll={() => {
              navigation.home.goToBusinessListings();
            }}
          />
        </View>
      )}

      {/* Recommendation Feed - Removed Suspense for better performance */}
      {user && !searchQuery && !filters.categories?.length && !filters.location && !filters.condition?.length && !filters.priceRange.min && !filters.priceRange.max && (
        <View style={{ minHeight: 250 }}>
          <CodeSplitting.RecommendationFeed
            onListingPress={handleListingPress}
            onViewAllPersonalized={() => navigation.recommendations.goToPersonalized()}
            onViewAllTrending={() => navigation.recommendations.goToTrending()}
            onViewAllRecentlyViewed={() => navigation.recommendations.goToRecent()}
          />
        </View>
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
    </View>
  ), [
    // Reduced dependencies for better performance
    categoryItems,
    renderCategoryItem,
    searchQuery,
    filters.categories,
    filters.location,
    filters.condition,
    filters.priceRange.min,
    filters.priceRange.max,
    transformedProducts.length,
    user?.id,
    theme,
    currentLocation,
  ]);

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
            <View style={{ 
              flex: 1, 
              justifyContent: 'center', 
              alignItems: 'center', 
              paddingHorizontal: theme.spacing.lg 
            }}>
              <EmptyState
                icon={<WifiOff size={48} color={theme.colors.text.muted} />}
                title="Connection Error"
                description="We're having trouble loading your marketplace. This could be due to a poor internet connection or server issues."
                action={{
                  text: 'Try Again',
                  onPress: async () => {
                    setIsRetrying(true);
                    try {
                      await refresh();
                    } finally {
                      setIsRetrying(false);
                    }
                  },
                }}
              />
            </View>
          ) : loading || refreshing || isRetrying ? (
            <HomeScreenSkeleton loadingText="Loading your marketplace..." />
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
            <AnimatedFlatList
              ref={mainScrollViewRef as any}
              data={transformedProductsWithOptimisticCounts}
              numColumns={2}
              key="home-listings-grid"
              showsVerticalScrollIndicator={false}
              style={{ zIndex: 10 }}
              contentContainerStyle={{
                paddingTop: 100, // Add top padding to account for floating search input
                paddingBottom: contentBottomPadding,
              }}
              keyExtractor={(item) => item.id}
              renderItem={renderProductItem}
              ListHeaderComponent={ListHeader}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={async () => {
                    await refresh();
                  }}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                  progressBackgroundColor={theme.colors.background}
                />
              }
              onScroll={handleScroll}
              scrollEventThrottle={32}
              // ✅ Enhanced performance optimizations for smooth scrolling
              removeClippedSubviews={true}
              maxToRenderPerBatch={6}
              windowSize={7}
              initialNumToRender={8}
              updateCellsBatchingPeriod={100}
              decelerationRate="fast"
              getItemLayout={(data, index) => ({
                length: 290, // Approximate card height + padding
                offset: 290 * Math.floor(index / 2), // Account for 2 columns
                index,
              })}
            />
          )}
        </View>

      </View>



      {/* Scroll to Top FAB */}
      <Animated.View
          style={{
            position: 'absolute',
          bottom: theme.spacing.xl + useSafeAreaInsets().bottom + contentBottomPadding,
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
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            ...theme.shadows.lg,
            elevation: 8,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            borderWidth: 2,
            borderColor: theme.colors.primaryForeground,
          }}
          activeOpacity={0.7}
          accessibilityLabel="Scroll to top"
          accessibilityHint="Double tap to scroll to the top of the page"
          accessibilityRole="button"
        >
          <ChevronUp 
            size={24} 
            color={theme.colors.primaryForeground} 
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaWrapper>
  );
}

