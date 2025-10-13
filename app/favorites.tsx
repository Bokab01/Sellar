import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  ProductCard,
  Grid,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Toast,
  Button,
  Badge,
} from '@/components';
import { Heart, Trash2, ShoppingBag, LayoutGrid, List, Clock } from 'lucide-react-native';

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First, get the favorites
      const { data: favoritesData, error: fetchError } = await supabase
        .from('favorites')
        .select('id, created_at, listing_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        return;
      }

      // Get listing IDs
      const listingIds = favoritesData.map(fav => fav.listing_id);

      // Fetch listings data
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, description, price, currency, condition, location, images, status, boost_until, user_id, category_id')
        .in('id', listingIds);

      if (listingsError) {
        setError(listingsError.message);
        return;
      }

      if (!listingsData || listingsData.length === 0) {
        setFavorites([]);
        return;
      }

      // Get unique user IDs and category IDs
      const userIds = [...new Set(listingsData.map(listing => listing.user_id))];
      const categoryIds = [...new Set(listingsData.map(listing => listing.category_id).filter(Boolean))];

      // Fetch profiles for sellers
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, rating, is_verified, account_type')
        .in('id', userIds);

      // Fetch categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, icon')
        .in('id', categoryIds);

      // Create maps for easy lookup
      const listingsMap = new Map(listingsData.map(listing => [listing.id, listing]));
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const categoriesMap = new Map(categories?.map(c => [c.id, c]) || []);

      // Combine all the data
      const combinedFavorites = favoritesData.map(favorite => {
        const listing = listingsMap.get(favorite.listing_id);
        if (!listing) return null;

        return {
          ...favorite,
          listings: {
            ...listing,
            profiles: profilesMap.get(listing.user_id),
            categories: categoriesMap.get(listing.category_id),
          }
        };
      }).filter(Boolean); // Remove null entries

      setFavorites(combinedFavorites);
    } catch (err) {
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const handleToggleFavorite = async (favoriteId: string, listingTitle: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      setToastMessage('Removed from favorites');
      setShowToast(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to remove favorite');
    }
  };

  // Transform favorites to product format
  const transformedProducts = favorites.map((favorite) => {
    const listing = favorite.listings;
    const seller = listing.profiles;
    
    return {
      id: listing.id,
      favoriteId: favorite.id,
      image: listing.images || ['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
      title: listing.title,
      price: listing.price,
      seller: {
        name: `${seller?.first_name} ${seller?.last_name}`,
        avatar: seller?.avatar_url,
        rating: seller?.rating || 0,
        badges: seller?.account_type === 'business' ? ['business'] : [],
      },
      badge: listing.boost_until && new Date(listing.boost_until) > new Date() 
        ? { text: 'Boosted', variant: 'featured' as const }
        : undefined,
      location: listing.location,
      status: listing.status,
      savedAt: new Date(favorite.created_at).toLocaleDateString(),
    };
  });

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Favorites"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
          <Grid columns={2} spacing={4}>
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton
                key={index}
                width="100%"
                height={280}
                borderRadius={theme.borderRadius.lg}
              />
            ))}
          </Grid>
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  if (error) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Favorites"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          message={error}
          onRetry={fetchFavorites}
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Favorites"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={favorites.length > 0 ? [
          <Text key="favorites-count" variant="caption" color="muted" style={{ marginRight: theme.spacing.sm }}>
            {favorites.length} saved
          </Text>,
          <TouchableOpacity
            key="view-toggle"
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{
              padding: theme.spacing.xs,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.sm,
            }}
          >
            {viewMode === 'grid' ? (
              <List size={20} color={theme.colors.text.primary} />
            ) : (
              <LayoutGrid size={20} color={theme.colors.text.primary} />
            )}
          </TouchableOpacity>,
        ] : []}
      />

      <View style={{ flex: 1 }}>
        {transformedProducts.length > 0 ? (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: theme.spacing.xl,
              paddingTop: theme.spacing.sm,
              paddingHorizontal: viewMode === 'list' ? theme.spacing.lg : 0,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            {viewMode === 'grid' ? (
              <Grid columns={2} spacing={4}>
                {transformedProducts.map((product) => (
                  <View key={product.id}>
                    <View style={{ position: 'relative' }}>
                      <ProductCard
                        image={product.image}
                        title={product.title}
                        price={product.price}
                        seller={product.seller}
                        badge={product.badge}
                        location={product.location}
                        layout="grid"
                        fullWidth={false}
                        shadowSize="sm"
                        isFavorited={true}
                        onFavoritePress={() => handleToggleFavorite(product.favoriteId, product.title)}
                        onPress={() => router.push(`/(tabs)/home/${product.id}`)}
                      />

                      {/* Status Indicator */}
                      {product.status !== 'active' && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            borderRadius: theme.borderRadius.lg,
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 2,
                          }}
                        >
                          <Badge
                            text={product.status === 'sold' ? 'SOLD' : 'UNAVAILABLE'}
                            variant="error"
                          />
                        </View>
                      )}
                    </View>

                    {/* Saved Date - Below card */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: theme.spacing.sm,
                        paddingVertical: theme.spacing.xs,
                        marginTop: theme.spacing.xs,
                        backgroundColor: theme.colors.primary + '10',
                        borderRadius: theme.borderRadius.sm,
                        gap: theme.spacing.xs,
                      }}
                    >
                      <Clock size={10} color={theme.colors.primary} />
                      <Text 
                        variant="caption" 
                        style={{ 
                          color: theme.colors.primary,
                          fontWeight: '600',
                          fontSize: 10,
                        }}
                      >
                        Saved {product.savedAt}
                      </Text>
                    </View>
                  </View>
                ))}
              </Grid>
            ) : (
              <View style={{ gap: theme.spacing.sm }}>
                {transformedProducts.map((product) => (
                  <View key={product.id} style={{ marginBottom: theme.spacing.sm }}>
                    <View style={{ position: 'relative' }}>
                      <ProductCard
                        variant="list"
                        image={product.image}
                        title={product.title}
                        price={product.price}
                        seller={product.seller}
                        badge={product.badge}
                        location={product.location}
                        shadowSize="sm"
                        isFavorited={true}
                        onFavoritePress={() => handleToggleFavorite(product.favoriteId, product.title)}
                        onPress={() => router.push(`/(tabs)/home/${product.id}`)}
                      />

                      {/* Status Indicator */}
                      {product.status !== 'active' && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            borderRadius: theme.borderRadius.lg,
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 2,
                          }}
                        >
                          <Badge
                            text={product.status === 'sold' ? 'SOLD' : 'UNAVAILABLE'}
                            variant="error"
                          />
                        </View>
                      )}
                    </View>

                    {/* Saved Date - Below list card with pro styling */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        marginTop: theme.spacing.xs,
                        backgroundColor: theme.colors.primary + '10',
                        borderRadius: theme.borderRadius.sm,
                        borderLeftWidth: 2,
                        borderLeftColor: theme.colors.primary,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                        <Clock size={12} color={theme.colors.primary} />
                        <Text 
                          variant="caption" 
                          style={{ 
                            color: theme.colors.primary,
                            fontWeight: '600',
                          }}
                        >
                          Saved {product.savedAt}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: theme.colors.primary + '20',
                          paddingHorizontal: theme.spacing.sm,
                          paddingVertical: 2,
                          borderRadius: theme.borderRadius.xs,
                        }}
                      >
                      {/*   <Text
                          variant="caption"
                          style={{
                            color: theme.colors.primary,
                            fontWeight: '700',
                            fontSize: 9,
                          }}
                        >
                          FAVORITE
                        </Text> */}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<Heart size={64} color={theme.colors.text.muted} />}
            title="No favorites yet"
            description="Save listings you're interested in to see them here. Tap the heart icon on any listing to add it to your favorites."
            action={{
              text: 'Browse Products',
              onPress: () => router.push('/(tabs)/home'),
            }}
          />
        )}
      </View>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}
