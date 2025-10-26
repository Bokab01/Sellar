import React, { useState, useEffect, useRef, useMemo, lazy, Suspense, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Pressable, FlatList, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  Grid2X2,
  House,
  Wifi,
  WifiOff,
  // Additional icons for unique category mapping
  Armchair,
  Baby,
  Utensils,
  Heart as HeartIcon,
  Ticket,
  Laptop,
  Palette,
  Grid,
  Wrench,
  Scissors,
  Trophy,
  Gamepad2,
  Music,
  Film,
  GraduationCap,
  Pencil,
  Calendar,
  HeartPulse,
  Sparkles,
  Clock,
  ShoppingBasket,
  Coffee,
  Leaf,
  Tractor,
  Bone,
  Printer,
  Cog,
  HardHat,
  Boxes,
  ShoppingCart,
  Plane,
  Map,
  Star,
  Building,
  Package,
  File,
  Gift,
  Puzzle,
  Repeat
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

  // No cleanup needed for simple scroll handler
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
  
  // ✅ Category scroll indicator state
  const [categoryScrollProgress, setCategoryScrollProgress] = useState(0);
  const [categoryScrollMax, setCategoryScrollMax] = useState(0);

  // Scroll state (no animations)
  const mainScrollViewRef = useRef<any>(null);

  // ✅ Search header animation state
  const searchHeaderTranslateY = useRef(new Animated.Value(0)).current;
  const searchHeaderOpacity = useRef(new Animated.Value(1)).current;
  const [isSearchHeaderVisible, setIsSearchHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down' | null>(null);

  // Category counts removed - no longer displayed in UI for better performance

  // Smart search modal removed - now using dedicated screen

  // Scroll to top function removed - no FAB needed

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

  // ✅ Enhanced scroll handler with scroll direction detection
  const handleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const scrollThreshold = 50; // Hide after scrolling 50px down
    const scrollDelta = currentOffset - lastScrollY.current;
    
    // Determine scroll direction
    if (Math.abs(scrollDelta) > 5) { // Minimum scroll distance to avoid jitter
      scrollDirection.current = scrollDelta > 0 ? 'down' : 'up';
    }
    
    // Update last scroll position
    lastScrollY.current = currentOffset;
    
    // Show search header when scrolling up (regardless of position)
    if (scrollDirection.current === 'up' && !isSearchHeaderVisible) {
      setIsSearchHeaderVisible(true);
      Animated.parallel([
        Animated.timing(searchHeaderTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(searchHeaderOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // Hide search header when scrolling down past threshold
    else if (scrollDirection.current === 'down' && currentOffset > scrollThreshold && isSearchHeaderVisible) {
      setIsSearchHeaderVisible(false);
      Animated.parallel([
        Animated.timing(searchHeaderTranslateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(searchHeaderOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // Show search header when at the top
    else if (currentOffset <= scrollThreshold && !isSearchHeaderVisible) {
      setIsSearchHeaderVisible(true);
      Animated.parallel([
        Animated.timing(searchHeaderTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(searchHeaderOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSearchHeaderVisible, searchHeaderTranslateY, searchHeaderOpacity]);

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
        
        // Map categories with icons - using unique icons for each category
        const categoriesWithIcons = mainCategories.map((cat) => {
          // Map icon names to actual icon components with unique icons
          let icon;
          switch (cat.icon?.toLowerCase()) {
            // Electronics & Gadgets
            case 'smartphone':
              icon = <Smartphone size={24} color={theme.colors.primary} />;
              break;
            // Vehicles
            case 'car':
              icon = <Car size={24} color={theme.colors.primary} />;
              break;
            // Real Estate & Property
            case 'home':
              icon = <House size={24} color={theme.colors.primary} />;
              break;
            // Fashion & Clothing
            case 'shirt':
              icon = <Shirt size={24} color={theme.colors.primary} />;
              break;
            // Home & Furniture
            case 'armchair':
              icon = <Armchair size={24} color={theme.colors.primary} />;
              break;
            // Health & Beauty
            case 'heart':
              icon = <HeartIcon size={24} color={theme.colors.primary} />;
              break;
            // Sports & Outdoors
            case 'dumbbell':
              icon = <Dumbbell size={24} color={theme.colors.primary} />;
              break;
            // Baby, Kids & Toys
            case 'baby':
              icon = <Baby size={24} color={theme.colors.primary} />;
              break;
            // Books, Media & Education
            case 'book':
              icon = <Book size={24} color={theme.colors.primary} />;
              break;
            // Services
            case 'briefcase':
              icon = <Briefcase size={24} color={theme.colors.primary} />;
              break;
            // Jobs & Freelance
            case 'clock':
              icon = <Clock size={24} color={theme.colors.primary} />;
              break;
            // Food & Agriculture
            case 'utensils':
              icon = <Utensils size={24} color={theme.colors.primary} />;
              break;
            // Pets & Animals
            case 'bone':
              icon = <Bone size={24} color={theme.colors.primary} />;
              break;
            // Industrial & Business
            case 'cog':
              icon = <Cog size={24} color={theme.colors.primary} />;
              break;
            // Tickets & Events
            case 'ticket':
              icon = <Ticket size={24} color={theme.colors.primary} />;
              break;
            // Digital Products & Software
            case 'laptop':
              icon = <Laptop size={24} color={theme.colors.primary} />;
              break;
            // Collectibles & Hobbies
            case 'palette':
              icon = <Palette size={24} color={theme.colors.primary} />;
              break;
            // Miscellaneous
            case 'grid':
              icon = <Grid size={24} color={theme.colors.primary} />;
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
  }, [toggleGlobalFavorite, incrementListingFavoriteCount, decrementListingFavoriteCount, refreshStats]);
  
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

  // ✅ Optimized category items with lazy loading
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  const categoryItems = useMemo(() => {
    const processedCategories = categories.map((category) => {
      const isSelected = filters.categories?.includes(category.label);
      return {
        ...category,
        isSelected,
      };
    });
    
    // Show only first 8 categories initially for better performance
    return showAllCategories ? processedCategories : processedCategories.slice(0, 8);
  }, [categories, filters.categories, showAllCategories]);

  // ✅ Load more categories after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAllCategories(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Initialize scroll indicator when categories change
  useEffect(() => {
    if (categoryItems.length > 0 && categoryScrollRef.current) {
      // Force a scroll event to initialize the indicator
      setTimeout(() => {
        categoryScrollRef.current?.scrollTo({ x: 0, animated: false });
      }, 100);
    }
  }, [categoryItems.length]);

  // ✅ Category scroll handler for indicator
  const handleCategoryScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const maxScrollX = contentSize.width - layoutMeasurement.width;
    
    // Always update progress, even if maxScrollX is 0
    const progress = maxScrollX > 0 ? Math.min(scrollX / maxScrollX, 1) : 0;
    setCategoryScrollProgress(progress);
    setCategoryScrollMax(maxScrollX);
    
  }, []);

  // Get unique background color for each category using theme colors
  const getCategoryBackgroundColor = useCallback((categoryName: string) => {
    // Use theme color palette for consistent design
    const themeColors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.success,
      theme.colors.warning,
      theme.colors.error,
      // Use color palette variations for more variety
      '#8000ff', // Primary 500
      '#0000ff', // Secondary 500
      '#00ff00', // Success 500
      '#ff6600', // Warning 500
      '#ff0000', // Error 500
      '#7c3aed', // Primary 600
      '#2563eb', // Secondary 600
      '#16a34a', // Success 600
      '#ea580c', // Warning 600
      '#dc2626', // Error 600
      '#a855f7', // Primary 400
      '#60a5fa', // Secondary 400
      '#4ade80', // Success 400
      '#fb923c', // Warning 400
      '#f87171', // Error 400
      '#c084fc', // Primary 300
      '#93c5fd', // Secondary 300
    ];
    
    // Use category name to get consistent color
    const hash = categoryName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return themeColors[Math.abs(hash) % themeColors.length];
  }, [theme.colors]);

  // ✅ Optimized category render item
  const renderCategoryItem = useCallback((category: any) => {
    const iconBackgroundColor = getCategoryBackgroundColor(category.label);
    
    return (
      <Pressable
        key={category.id}
        onPress={() => handleCategoryToggle(category.id)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.full,
          backgroundColor: category.isSelected ? theme.colors.primary : theme.colors.surface,
          borderWidth: 1,
          borderColor: category.isSelected ? theme.colors.primary : theme.colors.border,
          gap: theme.spacing.sm,
          minHeight: 40,
          /* shadowColor: theme.colors.text.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: category.isSelected ? 0.2 : 0.1,
          shadowRadius: pressed ? 8 : 4,
          elevation: pressed ? 4 : 2, */
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <View style={{ 
          width: 41, 
          height: 41,
          position: 'absolute',
          left: 0, // Extend beyond the pill's left padding
          
         // Half of icon container height (32/2)
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: category.isSelected ? `${theme.colors.primaryForeground}20` : iconBackgroundColor,
          borderRadius: 20,
          shadowColor: iconBackgroundColor,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        }}>
          {React.cloneElement(category.icon as React.ReactElement, {
            size: 18,
            color: category.isSelected ? theme.colors.primaryForeground : theme.colors.text.inverse,
          } as any)}
        </View>
        
        <Text
          variant="body"
          style={{
            color: category.isSelected ? theme.colors.primaryForeground : theme.colors.text.primary,
            fontWeight: '700',
            fontSize: 13,
            marginLeft: 35, // Space for overlapping icon
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

  // ✅ Memoized location display component
  const LocationDisplay = useMemo(() => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing['2xl'] + theme.spacing['3xl'],
        marginBottom: theme.spacing.md,
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
  ), [theme, currentLocation]);

  // ✅ Memoized categories section - now sticky
  const CategoriesSection = useMemo(() => (
    <View style={{ 
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    }}>
      <ScrollView
        ref={categoryScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleCategoryScroll}
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
  ), [theme, categoryItems, renderCategoryItem, handleCategoryScroll]);

  // ✅ Memoized dynamic title section
  const DynamicTitleSection = useMemo(() => {
    const title = filters.categories?.length > 0 
      ? `${filters.categories[0]} Listings`
      : searchQuery 
      ? 'Search Results'
      : 'More Listings From Sellers';

    const subtitle = filters.categories?.length > 0 
      ? `${transformedProducts.length} ${transformedProducts.length === 1 ? 'item' : 'items'} found in ${filters.categories[0]}`
      : searchQuery 
      ? `${transformedProducts.length} ${transformedProducts.length === 1 ? 'result' : 'results'} for "${searchQuery}"`
      : 'Browse all available items';

    const hasActiveFilters = filters.categories?.length > 0 || searchQuery || filters.location || filters.condition?.length > 0;

    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="h3">{title}</Text>
          </View>
          <Text variant="bodySmall" color="muted" style={{ marginTop: theme.spacing.xs }}>
            {subtitle}
          </Text>
        </View>

        {/* Clear Filter Button - Show when filters are active */}
        {hasActiveFilters && (
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
    );
  }, [theme, filters, searchQuery, transformedProducts.length, setSearchQuery, setFilters]);

  // ✅ Lazy loading state for heavy sections
  const [showHeavySections, setShowHeavySections] = useState(false);

  // ✅ Progressive loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHeavySections(true);
    }, 100); // Small delay to improve initial render

    return () => clearTimeout(timer);
  }, []);

  // ✅ Memoized heavy components with lazy loading
  const FeaturedListingsSection = useMemo(() => {
    if (!showHeavySections || searchQuery || filters.categories?.length || filters.location || filters.condition?.length || filters.priceRange.min || filters.priceRange.max) {
      return null;
    }
    
    return (
      <Suspense fallback={<LoadingSkeleton width="100%" height={200} />}>
        <CodeSplitting.FixedFeaturedListings
          maxItems={8} // Reduced from 10 for better performance
          layout="horizontal"
          onViewAll={() => {
            navigation.home.goToBusinessListings();
          }}
        />
      </Suspense>
    );
  }, [showHeavySections, searchQuery, filters.categories, filters.location, filters.condition, filters.priceRange.min, filters.priceRange.max, theme.spacing.lg]);

  // const RecommendationSection = useMemo(() => {
  //   if (!showHeavySections || !user || searchQuery || filters.categories?.length || filters.location || filters.condition?.length || filters.priceRange.min || filters.priceRange.max) {
  //     return null;
  //   }
    
  //   return (
  //     <View style={{ minHeight: 200 }}> {/* Reduced from 250 */}
  //       <Suspense fallback={<LoadingSkeleton width="100%" height={200} />}>
  //         <CodeSplitting.RecommendationFeed
  //           onListingPress={handleListingPress}
  //           onViewAllPersonalized={() => navigation.recommendations.goToPersonalized()}
  //           onViewAllTrending={() => navigation.recommendations.goToTrending()}
  //           onViewAllRecentlyViewed={() => navigation.recommendations.goToRecent()}
  //         />
  //       </Suspense>
  //     </View>
  //   );
  // }, [showHeavySections, user, searchQuery, filters.categories, filters.location, filters.condition, filters.priceRange.min, filters.priceRange.max, handleListingPress]);

  // ✅ Optimized header component with memoized sub-components
  const ListHeader = useMemo(() => (
    <View>
      {/* Location Display - Memoized */}
      {LocationDisplay}

      {/* Featured Business Listings - Memoized for better performance */}
      {FeaturedListingsSection}

      {/* Recommendation Feed - Memoized for better performance */}
      {/* {RecommendationSection} */}

      {/* Dynamic Title Section - Memoized */}
      {DynamicTitleSection}
    </View>
  ), [
    // ✅ Minimal dependencies for maximum performance
    LocationDisplay,
    FeaturedListingsSection,
    // RecommendationSection,
    DynamicTitleSection,
  ]);

  return (
    <SafeAreaWrapper>
      {/* ✅ Enhanced Search Header - Animated Hide/Show */}
      <Animated.View style={{ 
        position: 'absolute',
        top: theme.spacing['3xl'],
        left: 0,
        right: 0,
        zIndex: 12,
        paddingVertical: theme.spacing.sm,
        transform: [{ translateY: searchHeaderTranslateY }],
        opacity: searchHeaderOpacity,
      }}>
        <EnhancedSearchHeader
          searchQuery={searchQuery}
          onSearchPress={() => router.push('/smart-search')}
          onFilterPress={() => router.push('/filter-products')}
          onAvatarPress={() => router.push('/(tabs)/more')}
          placeholder= 'Search here...'
        />
      </Animated.View>

      {/* ✅ Sticky Categories Section - Animated to follow search header */}
      <Animated.View style={{
        position: 'absolute',
        top: 100, // Position below search header
        left: 0,
        right: 0,
        zIndex: 11,
        transform: [{ translateY: searchHeaderTranslateY }],
      }}>
        {CategoriesSection}
      </Animated.View>

      {/* Main Content Container */}
      <Animated.View style={{ 
        flex: 1,
        paddingTop: 60, // Reduced padding since categories move up with search header
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
            <FlatList
              ref={mainScrollViewRef as any}
              data={transformedProductsWithOptimisticCounts}
              numColumns={2}
              key="home-listings-grid"
              showsVerticalScrollIndicator={false}
              style={{ zIndex: 10 }}
              contentContainerStyle={{
                paddingTop: 20, // Reduced padding since categories are now sticky
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
                length: 330, // Approximate card height + padding (increased from 290)
                offset: 330 * Math.floor(index / 2), // Account for 2 columns
                index,
              })}
            />
          )}
        </View>

      </Animated.View>



      {/* FAB removed for cleaner UI */}
    </SafeAreaWrapper>
  );
}

