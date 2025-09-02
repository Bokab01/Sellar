import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { useListings } from '@/hooks/useListings';
import { useNotifications } from '@/hooks/useNotifications';
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
  Zap
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

  // Use real listings from database
  const { 
    listings: products, 
    loading, 
    error, 
    refreshing, 
    refresh 
  } = useListings({
    search: searchQuery,
    category: selectedCategories[0], // Use first selected category
    location: filters.location || currentLocation,
    priceMin: filters.priceRange.min,
    priceMax: filters.priceRange.max,
    condition: filters.condition,
  });

  // Get notifications for badge
  const { unreadCount } = useNotifications();

  // Real user credit from database
  const [userCredit, setUserCredit] = useState<number>(0);
  const [creditLoading, setCreditLoading] = useState(true);

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

  const categories = [
    { id: 'electronics', label: 'Electronics', icon: <Smartphone size={24} color={theme.colors.primary} />, count: 1250 },
    { id: 'vehicles', label: 'Vehicles', icon: <Car size={24} color={theme.colors.primary} />, count: 890 },
    { id: 'home', label: 'Home & Garden', icon: <HomeIcon size={24} color={theme.colors.primary} />, count: 650 },
    { id: 'fashion', label: 'Fashion', icon: <Shirt size={24} color={theme.colors.primary} />, count: 2100 },
    { id: 'books', label: 'Books & Media', icon: <Book size={24} color={theme.colors.primary} />, count: 340 },
    { id: 'sports', label: 'Sports', icon: <Dumbbell size={24} color={theme.colors.primary} />, count: 180 },
    { id: 'services', label: 'Services', icon: <Briefcase size={24} color={theme.colors.primary} />, count: 420 },
    { id: 'other', label: 'Other', icon: <MoreHorizontal size={24} color={theme.colors.primary} />, count: 95 },
  ];

  // Transform database listings to component format with full-bleed styling
  const transformedProducts = products.map((listing: any) => {
    const seller = listing.profiles;
    const badges = [];
    
    // Add boost badge if listing is boosted
    if (listing.boost_expires_at && new Date(listing.boost_expires_at) > new Date()) {
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
      image: listing.images?.[0] || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg',
      title: listing.title,
      price: listing.price,
      seller: {
        name: `${seller?.first_name} ${seller?.last_name}`,
        avatar: seller?.avatar_url,
        rating: seller?.rating || 0,
        badges: seller?.account_type === 'business' ? ['business'] : [],
      },
      badge: badges[0], // Show first badge
      location: listing.location,
      views: listing.views_count || 0,
      favorites: listing.favorites_count || 0,
      isBoosted: listing.boost_expires_at && new Date(listing.boost_expires_at) > new Date(),
    };
  });

  const handleCategoryToggle = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId);
    if (isSelected) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
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
                router.push('/(tabs)/wallet');
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
                onPress={() => router.push('/(tabs)/notifications')}
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
                onPress={() => router.push('/(tabs)/favorites')}
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

        {/* Categories */}
        <View style={{ paddingVertical: theme.spacing.md }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              gap: theme.spacing.md,
            }}
          >
            {categories.map((category) => (
              <Chip
                key={category.id}
                text={category.label}
                variant="filter"
                selected={selectedCategories.includes(category.id)}
                onPress={() => handleCategoryToggle(category.id)}
              />
            ))}
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
              {/* Custom Grid for Full-Bleed Cards */}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  paddingHorizontal: theme.spacing.md, // Minimal edge margin
                }}
              >
                {transformedProducts.map((product, index) => {
                  const cardWidth = (screenWidth - (theme.spacing.md * 4)) / 2; // Account for edge margins and gap
                  
                  return (
                    <View
                      key={product.id}
                      style={{
                        width: cardWidth,
                        marginRight: index % 2 === 0 ? theme.spacing.md : 0,
                        marginBottom: theme.spacing.md,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => router.push(`/(tabs)/home/${product.id}`)}
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderRadius: theme.borderRadius.lg,
                          overflow: 'hidden',
                          ...theme.shadows.md,
                          position: 'relative',
                        }}
                        activeOpacity={0.95}
                      >
                        {/* Boost Indicator */}
                        {product.isBoosted && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: 3,
                              backgroundColor: theme.colors.warning,
                              zIndex: 10,
                            }}
                          />
                        )}

                        {/* Image */}
                        <View style={{ position: 'relative' }}>
                          <Image
                            source={{ uri: product.image }}
                            style={{
                              width: '100%',
                              height: 140,
                              backgroundColor: theme.colors.surfaceVariant,
                            }}
                            resizeMode="cover"
                          />
                          
                          {/* Badge Overlay */}
                          {product.badge && (
                            <View style={{
                              position: 'absolute',
                              top: theme.spacing.sm,
                              left: theme.spacing.sm,
                            }}>
                              <Badge 
                                variant={product.badge.variant} 
                                text={product.badge.text} 
                                size="sm"
                              />
                            </View>
                          )}

                          {/* Boost Badge */}
                          {product.isBoosted && (
                            <View style={{
                              position: 'absolute',
                              top: theme.spacing.sm,
                              right: theme.spacing.sm,
                            }}>
                              <View
                                style={{
                                  backgroundColor: theme.colors.warning,
                                  borderRadius: theme.borderRadius.sm,
                                  paddingHorizontal: theme.spacing.sm,
                                  paddingVertical: theme.spacing.xs,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: theme.spacing.xs,
                                }}
                              >
                                <Zap size={12} color={theme.colors.warningForeground} />
                                <Text
                                  variant="caption"
                                  style={{
                                    color: theme.colors.warningForeground,
                                    fontSize: 10,
                                    fontWeight: '600',
                                  }}
                                >
                                  BOOSTED
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* Content */}
                        <View style={{ padding: theme.spacing.md }}>
                          <Text 
                            variant="body" 
                            numberOfLines={2}
                            style={{ 
                              marginBottom: theme.spacing.sm,
                              fontSize: 14,
                              fontWeight: '600',
                              lineHeight: 18,
                            }}
                          >
                            {product.title}
                          </Text>

                          <PriceDisplay 
                            amount={product.price} 
                            currency="GHS"
                            size="md"
                            style={{ marginBottom: theme.spacing.sm }}
                          />

                          {/* Seller Info with Business Badge */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                            <Text 
                              variant="caption" 
                              color="secondary" 
                              numberOfLines={1}
                              style={{ flex: 1 }}
                            >
                              {product.seller.name}
                            </Text>
                            
                            {product.seller.badges?.includes('business') && (
                              <BusinessBadge type="business" size="sm" showIcon={false} />
                            )}
                          </View>

                          {/* Stats */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text variant="caption" color="muted">
                              👁️ {product.views}
                            </Text>
                            <Text variant="caption" color="muted">
                              ❤️ {product.favorites}
                            </Text>
                            {product.seller.rating > 0 && (
                              <Text variant="caption" color="muted">
                                ⭐ {product.seller.rating.toFixed(1)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
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