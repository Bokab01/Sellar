import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useListings } from '@/hooks/useListings';
import { useProfile } from '@/hooks/useProfile';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useOptimizedListingsRealtime } from '@/hooks/useOptimizedRealtime';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { 
  Text,
  ProductCard,
  SafeAreaWrapper,
  LoadingSkeleton,
} from '@/components';
import { ArrowLeft, Grid3X3, List } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { getDisplayName } from '@/hooks/useDisplayName';

export default function SellerListingsScreen() {
  const { theme } = useTheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuthStore();
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [sellerListings, setSellerListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);
  
  const { favorites, toggleFavorite } = useFavoritesStore();
  
  // Check if current user is viewing their own listings
  const isOwnListings = user?.id === userId;
  
  // Optimized realtime updates for listings
  const handleListingUpdate = useCallback((updatedListing: any) => {
    setSellerListings(prevListings => 
      prevListings.map(listing => 
        listing.id === updatedListing.id ? { ...listing, ...updatedListing } : listing
      )
    );
  }, []);

  // Use optimized realtime hook
  useOptimizedListingsRealtime(handleListingUpdate);

  // Fetch seller profile
  const fetchSellerProfile = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setSellerProfile(profile);
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      setError('Failed to load seller profile');
    }
  }, [userId]);

  // Fetch seller listings
  const fetchSellerListings = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      const { data: listings, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url,
            rating,
            is_verified
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform listings data
      const transformedListings = listings.map((listing: any) => ({
        id: listing.id,
        image: listing.images?.[0] || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg',
        title: listing.title,
        price: listing.price,
        previousPrice: listing.previous_price,
        priceChangedAt: listing.price_changed_at,
        currency: listing.currency || 'GHS',
        seller: {
          id: listing.profiles?.id,
          name: getDisplayName(listing.profiles, false).displayName,
          avatar: listing.profiles?.avatar_url,
          rating: listing.profiles?.rating || 0,
        },
        badge: listing.boost_until && new Date(listing.boost_until) > new Date() 
          ? { text: 'Boosted', variant: 'featured' as const }
          : undefined,
        location: listing.location,
        description: listing.description,
        condition: listing.condition,
        category: listing.category,
        created_at: listing.created_at,
        updated_at: listing.updated_at,
      }));

      setSellerListings(transformedListings);
    } catch (error) {
      console.error('Error fetching seller listings:', error);
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null); // Clear previous errors
    await Promise.all([
      fetchSellerProfile(),
      fetchSellerListings(),
    ]);
    setRefreshing(false);
  }, [fetchSellerProfile, fetchSellerListings]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async (listingId: string) => {
    await toggleFavorite(listingId);
  }, [toggleFavorite]);

  // Handle listing press
  const handleListingPress = useCallback((listingId: string) => {
    router.push(`/(tabs)/home/${listingId}`);
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      Promise.all([
        fetchSellerProfile(),
        fetchSellerListings(),
      ]);
    }
  }, [userId, fetchSellerProfile, fetchSellerListings]);

  // Memoized render listing item for better performance
  const renderListingItem = useCallback(({ item }: { item: any }) => (
    <View style={{ 
      flex: viewMode === 'grid' ? 0.5 : 1, 
      paddingHorizontal: viewMode === 'grid' ? 1 : 0,
      paddingVertical: viewMode === 'grid' ? 1 : 0,
      marginBottom: theme.spacing.sm,
    }}>
      <ProductCard
        image={item.image}
        title={item.title}
        price={item.price}
        previousPrice={item.previousPrice}
        priceChangedAt={item.priceChangedAt}
        currency={item.currency}
        seller={viewMode === 'grid' ? item.seller : undefined}
        badge={item.badge}
        location={item.location}
        layout={viewMode}
        fullWidth={true}
        isFavorited={favorites[item.id] || false}
        onPress={() => handleListingPress(item.id)}
        onFavoritePress={isOwnListings ? undefined : () => handleFavoriteToggle(item.id)}
        showReportButton={false}
        currentUserId={userId || ""}
      />
    </View>
  ), [viewMode, theme.spacing.sm, favorites, handleListingPress, handleFavoriteToggle, userId, isOwnListings]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  // Memoized get item layout for grid mode
  const getItemLayout = useMemo(() => {
    if (viewMode !== 'grid') return undefined;
    return (data: any, index: number) => ({
      length: 330, // Approximate card height + padding
      offset: 330 * Math.floor(index / 2), // Account for 2 columns
      index,
    });
  }, [viewMode]);

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={{ flex: 1, padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={60} style={{ marginBottom: theme.spacing.lg }} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
            <LoadingSkeleton width="50%" height={40} />
            <LoadingSkeleton width="50%" height={40} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {Array.from({ length: 6 }, (_, i) => (
              <LoadingSkeleton key={i} width="48%" height={200} />
            ))}
          </View>
        </View>
      </SafeAreaWrapper>
    );
  }

  const sellerName = sellerProfile ? getDisplayName(sellerProfile, false).displayName : 'Seller';

  return (
    <SafeAreaWrapper>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                padding: theme.spacing.sm,
                marginRight: theme.spacing.sm,
              }}
            >
              <ArrowLeft size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.xs }}>
                {sellerName}'s Items
              </Text>
              <Text variant="bodySmall" color="muted">
                {sellerListings.length} {sellerListings.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>

          {/* View Mode Toggle */}
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.sm,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            {viewMode === 'grid' ? (
              <List 
                size={20} 
                color={theme.colors.text.primary} 
              />
            ) : (
              <Grid3X3 
                size={20} 
                color={theme.colors.text.primary} 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Listings */}
        {sellerListings.length > 0 ? (
          <FlatList
            data={sellerListings}
            renderItem={renderListingItem}
            keyExtractor={keyExtractor}
            numColumns={viewMode === 'grid' ? 2 : 1}
            key={viewMode} // Force re-render when view mode changes
            contentContainerStyle={{
              paddingVertical: theme.spacing.sm,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={viewMode === 'grid' ? 4 : 6}
            updateCellsBatchingPeriod={50}
            initialNumToRender={viewMode === 'grid' ? 6 : 8}
            windowSize={viewMode === 'grid' ? 5 : 7}
            decelerationRate="fast"
            scrollEventThrottle={16}
            getItemLayout={getItemLayout}
          />
        ) : error ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
          }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.sm, textAlign: 'center' }}>
              Error Loading Items
            </Text>
            <Text variant="body" color="muted" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={{
                backgroundColor: theme.colors.primary,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
              }}
            >
              <Text variant="body" style={{ color: theme.colors.primaryForeground }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
          }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.sm, textAlign: 'center' }}>
              No Items Found
            </Text>
            <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
              {sellerName} hasn't listed any items yet.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaWrapper>
  );
}
