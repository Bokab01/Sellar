import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, ScrollView, RefreshControl, FlatList } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { useBottomTabBarSpacing } from '@/hooks/useBottomTabBarSpacing';
import { AppHeader } from '@/components';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { BusinessProfile } from '@/components/BusinessProfile/BusinessProfile';
import { BusinessListings } from '@/components/BusinessListings/BusinessListings';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import { useDisplayName, getDisplayName } from '@/hooks/useDisplayName';
import { useAuthStore } from '@/store/useAuthStore';

interface BusinessListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  images: string[];
  location: string;
  seller: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    isBusinessUser: boolean;
  };
  viewCount: number;
  createdAt: string;
}

interface BusinessUser {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  location?: string;
  phone?: string;
  isBusinessUser: boolean;
  listings: BusinessListing[];
}

// Advanced cache for business listings with performance monitoring
import { listingCache } from '@/utils/AdvancedCache';

const businessListingsCache = new Map<string, { 
  data: BusinessUser[], 
  timestamp: number,
  performance: {
    loadTime: number;
    dataSize: number;
    queryCount: number;
  }
}>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const BusinessListingsScreen = memo(function BusinessListingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { contentBottomPadding } = useBottomTabBarSpacing();
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [visibleBusinesses, setVisibleBusinesses] = useState<number>(3); // Show only 3 initially

  // Helper function to get display name based on business settings
  const getBusinessDisplayName = useCallback((profile: any) => {
    if (!profile) return 'Business User';
    return getDisplayName(profile, false).displayName;
  }, []);

  const fetchBusinessListings = useCallback(async (isRefresh = false) => {
    const startTime = performance.now();
    try {
      const cacheKey = 'business_listings';
      const cached = businessListingsCache.get(cacheKey);
      
      // Return cached data if it's still fresh and not a refresh
      if (!isRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Using cached business listings data');
        setBusinessUsers(cached.data);
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Optimized query: Fetch business users with profiles in a single query
      const { data: businessUsers, error: businessError } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          status,
          current_period_end,
          profiles!user_id (
            id,
            first_name,
            last_name,
            full_name,
            avatar_url,
            rating,
            is_business,
            business_name,
            display_business_name,
            business_name_priority,
            phone,
            location
          )
        `)
        .in('status', ['active', 'cancelled'])
        .limit(20); // Limit initial fetch for performance

      // Also fetch users who have business profiles but might not have active subscriptions
      let businessProfileUsers: any[] = [];
      if (businessUsers && businessUsers.length > 0) {
        const businessUserIds = businessUsers.map(u => u.user_id);
        const { data: profileUsers, error: businessProfileError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            full_name,
            avatar_url,
            rating,
            is_business,
            business_name,
            display_business_name,
            business_name_priority,
            phone,
            location
          `)
          .eq('is_business', true)
          .not('id', 'in', `(${businessUserIds.join(',')})`);

        if (businessProfileError) {
          console.warn('Error fetching business profile users:', businessProfileError);
        } else {
          businessProfileUsers = profileUsers || [];
        }
      } else {
        // If no subscription-based business users, fetch all business profile users
        const { data: profileUsers, error: businessProfileError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            full_name,
            avatar_url,
            rating,
            is_business,
            business_name,
            display_business_name,
            business_name_priority,
            phone,
            location
          `)
          .eq('is_business', true);

        if (businessProfileError) {
          console.warn('Error fetching business profile users:', businessProfileError);
        } else {
          businessProfileUsers = profileUsers || [];
        }
      }

      if (businessError) throw businessError;

      console.log('Subscription-based business users:', businessUsers?.length || 0);
      console.log('Profile-based business users:', businessProfileUsers?.length || 0);

      // Combine subscription-based and profile-based business users
      const allBusinessUsers = [
        ...(businessUsers || []).map(sub => ({
          user_id: sub.user_id,
          status: sub.status,
          current_period_end: sub.current_period_end,
          profiles: sub.profiles
        })),
        ...(businessProfileUsers || []).map(profile => ({
          user_id: profile.id,
          status: 'profile_business', // Mark as profile-based business
          current_period_end: null,
          profiles: profile
        }))
      ];

      console.log('Total business users combined:', allBusinessUsers.length);

      if (allBusinessUsers.length === 0) {
        console.log('No business users found (subscription or profile-based)');
        
        // Final fallback: fetch all users with business profiles
        console.log('Trying final fallback: fetch all business profiles');
        const { data: allBusinessProfiles, error: allBusinessProfilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            full_name,
            avatar_url,
            rating,
            is_business,
            business_name,
            display_business_name,
            business_name_priority,
            phone,
            location
          `)
          .eq('is_business', true);

        if (allBusinessProfilesError) {
          console.error('Error fetching all business profiles:', allBusinessProfilesError);
          setBusinessUsers([]);
          return;
        }

        if (!allBusinessProfiles || allBusinessProfiles.length === 0) {
          console.log('No business profiles found at all');
          setBusinessUsers([]);
          return;
        }

        console.log('Found business profiles in fallback:', allBusinessProfiles.length);
        
        // Use the fallback business profiles
        const fallbackBusinessUsers = allBusinessProfiles.map(profile => ({
          user_id: profile.id,
          status: 'profile_business',
          current_period_end: null,
          profiles: profile
        }));

        // Fetch listings for fallback business users
        const fallbackUserIds = fallbackBusinessUsers.map(user => user.user_id);
        const { data: fallbackListings, error: fallbackListingsError } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            price,
            previous_price,
            price_changed_at,
            currency,
            images,
            location,
            views_count,
            created_at,
            user_id
          `)
          .eq('status', 'active')
          .in('user_id', fallbackUserIds)
          .order('created_at', { ascending: false });

        if (fallbackListingsError) {
          console.error('Error fetching fallback listings:', fallbackListingsError);
          setBusinessUsers([]);
          return;
        }

        // Group fallback listings by business user
        const fallbackBusinessUsersWithListings: BusinessUser[] = fallbackBusinessUsers.map(businessUser => {
          const profile = businessUser.profiles;
          const userListings = fallbackListings?.filter(listing => listing.user_id === businessUser.user_id) || [];

          const transformedListings: BusinessListing[] = userListings.map(listing => ({
            id: listing.id,
            title: listing.title,
            price: listing.price,
            previous_price: listing.previous_price || null,
            price_changed_at: listing.price_changed_at || null,
            currency: listing.currency || 'GHS',
            images: Array.isArray(listing.images) ? listing.images : [],
            location: listing.location || '',
            seller: {
              id: (profile as any)?.id || listing.user_id,
              name: getBusinessDisplayName(profile),
              avatar: (profile as any)?.avatar_url,
              rating: (profile as any)?.rating,
              isBusinessUser: true,
            },
            viewCount: listing.views_count || 0,
            createdAt: listing.created_at,
          }));

          return {
            id: businessUser.user_id,
            name: getBusinessDisplayName(profile),
            avatar: (profile as any)?.avatar_url,
            rating: (profile as any)?.rating,
            location: (profile as any)?.location,
            phone: (profile as any)?.phone,
            isBusinessUser: true,
            listings: transformedListings,
          };
        });

        console.log('Fallback business users with listings:', fallbackBusinessUsersWithListings.length);
        setBusinessUsers(fallbackBusinessUsersWithListings);
        return;
      }

      const businessUserIds = allBusinessUsers.map(user => user.user_id);

      // Fetch listings for all business users
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          price,
          previous_price,
          price_changed_at,
          currency,
          images,
          location,
          views_count,
          created_at,
          user_id
        `)
        .eq('status', 'active')
        .in('user_id', businessUserIds)
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;

      console.log('Business users found:', allBusinessUsers.length);
      console.log('Listings found:', listingsData?.length || 0);

      // Group listings by business user
      const businessUsersWithListings: BusinessUser[] = allBusinessUsers.map(businessUser => {
        const profile = businessUser.profiles;
        const userListings = listingsData?.filter(listing => listing.user_id === businessUser.user_id) || [];

        console.log(`User ${businessUser.user_id} has ${userListings.length} listings`);

        const transformedListings: BusinessListing[] = userListings.map(listing => ({
          id: listing.id,
          title: listing.title,
          price: listing.price,
          previous_price: listing.previous_price || null,
          price_changed_at: listing.price_changed_at || null,
          currency: listing.currency || 'GHS',
          images: Array.isArray(listing.images) ? listing.images : [],
          location: listing.location || '',
          seller: {
            id: (profile as any)?.id || listing.user_id,
            name: getBusinessDisplayName(profile),
            avatar: (profile as any)?.avatar_url,
            rating: (profile as any)?.rating,
            isBusinessUser: true,
          },
          viewCount: listing.views_count || 0,
          createdAt: listing.created_at,
        }));

        return {
          id: businessUser.user_id,
          name: getBusinessDisplayName(profile),
          avatar: (profile as any)?.avatar_url,
          rating: (profile as any)?.rating,
          location: (profile as any)?.location,
          phone: (profile as any)?.phone,
          isBusinessUser: true,
          listings: transformedListings,
        };
      });

      console.log('Business users with listings:', businessUsersWithListings.length);
      console.log('Business users with listings > 0:', businessUsersWithListings.filter(u => u.listings.length > 0).length);

      const endTime = performance.now();
      const loadTime = endTime - startTime;
      const dataSize = JSON.stringify(businessUsersWithListings).length;

      // Cache the result with performance metrics
      businessListingsCache.set(cacheKey, {
        data: businessUsersWithListings,
        timestamp: Date.now(),
        performance: {
          loadTime,
          dataSize,
          queryCount: 1
        }
      });

      console.log(`Business listings loaded in ${loadTime.toFixed(2)}ms, data size: ${(dataSize / 1024).toFixed(2)}KB`);
      setBusinessUsers(businessUsersWithListings);
    } catch (err) {
      console.error('Error fetching business listings:', err);
      setError('Failed to load business listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getBusinessDisplayName]);

  useEffect(() => {
    fetchBusinessListings();
    
    // Load more businesses progressively
    const timer1 = setTimeout(() => setVisibleBusinesses(5), 1000);
    const timer2 = setTimeout(() => setVisibleBusinesses(8), 2000);
    const timer3 = setTimeout(() => setVisibleBusinesses(10), 3000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);


  const handleRefresh = () => {
    fetchBusinessListings(true);
  };

  const handleFavoritePress = async (listingId: string) => {
    try {
      // Import and use the favorites function
      const { toggleFavorite } = await import('@/lib/favoritesAndViews');
      const result = await toggleFavorite(listingId);
      
      if (!result.error) {
        // Update local state
        setFavorites(prev => ({
          ...prev,
          [listingId]: !prev[listingId]
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Sellar Pro Listings"
          subtitle="Loading..."
          showBackButton={true}
          onBackPress={() => router.back()}
        />

          {/* Loading Content */}
          <ScrollView style={{ flex: 1 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={index} style={{ marginBottom: theme.spacing.lg }}>
                <LoadingSkeleton width="100%" height={80} style={{ marginBottom: theme.spacing.md }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
                    {Array.from({ length: 4 }).map((_, cardIndex) => (
                      <LoadingSkeleton
                        key={cardIndex}
                        width={190}
                        height={280}
                        style={{ borderRadius: theme.borderRadius.lg }}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}
          </ScrollView>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Sellar Pro Listings"
        subtitle={`${businessUsers.length} Sellar Pro users with premium listings`}
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {error ? (
           <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
             <EmptyState
               title="Failed to Load"
               description={error}
               actionText="Try Again"
               onActionPress={() => fetchBusinessListings()}
             />
           </View>
         ) : businessUsers.length === 0 ? (
           <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
             <EmptyState
               title="No Sellar Pro Listings"
               description="There are currently no active Sellar Pro listings available."
               actionText="Refresh"
               onActionPress={handleRefresh}
             />
           </View>
        ) : (
          <FlatList
            data={businessUsers.slice(0, visibleBusinesses)}
            keyExtractor={(item) => item.id}
            renderItem={({ item: businessUser }) => (
              <View>
                {/* Business Profile */}
                <BusinessProfile
                  business={businessUser}
                  onMessagePress={user?.id !== businessUser.id ? () => router.push(`/profile/${businessUser.id}`) : undefined}
                  onCallPress={user?.id !== businessUser.id && businessUser.phone ? () => {
                    // Handle call functionality
                    console.log('Calling:', businessUser.phone);
                  } : undefined}
                />
                
                {/* Business Listings */}
                <BusinessListings
                  businessId={businessUser.id}
                  businessName={businessUser.name}
                  listings={businessUser.listings}
                  onListingPress={(listingId) => router.push(`/(tabs)/home/${listingId}`)}
                  onSeeAllPress={() => router.push(`/profile/${businessUser.id}`)}
                  currentUserId={user?.id}
                  favorites={favorites}
                  onFavoritePress={handleFavoritePress}
                />
              </View>
            )}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: contentBottomPadding }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={3}
            updateCellsBatchingPeriod={100}
            initialNumToRender={3}
            windowSize={5}
            getItemLayout={(data, index) => ({
              length: 400, // Approximate height of each business section
              offset: 400 * index,
              index,
            })}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
});

export default BusinessListingsScreen;
