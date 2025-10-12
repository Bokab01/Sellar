import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { ProductCard } from '@/components/Card/Card';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useAuthStore } from '@/store/useAuthStore';

interface FeaturedListing {
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
  isBoosted: boolean;
  isSponsored: boolean;
  isPriority: boolean;
  viewCount: number;
  createdAt: string;
}

interface FixedFeaturedListingsProps {
  maxItems?: number;
  showHeader?: boolean;
  layout?: 'horizontal' | 'grid';
  onViewAll?: () => void;
}

export function FixedFeaturedListings({
  maxItems = 6,
  showHeader = true,
  layout = 'horizontal',
  onViewAll,
}: FixedFeaturedListingsProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Get listing IDs for stats and favorites
  const listingIds = React.useMemo(() => listings.map(l => l.id), [listings]);
  const { viewCounts, refreshStats } = useMultipleListingStats({ listingIds });
  const { 
    favorites, 
    listingFavoriteCounts, 
    toggleFavorite: toggleGlobalFavorite,
    incrementListingFavoriteCount,
    decrementListingFavoriteCount
  } = useFavoritesStore();

  // Helper function to get display name based on business settings
  const getDisplayName = (profile: any) => {
    if (!profile) return 'Business User';
    
    const hasBusinessName = profile.is_business && profile.business_name;
    const canDisplayBusinessName = hasBusinessName && profile.display_business_name;
    
    if (canDisplayBusinessName) {
      switch (profile.business_name_priority) {
        case 'primary':
          return profile.business_name;
        case 'secondary':
          return `${profile.full_name || `${profile.first_name} ${profile.last_name}`.trim()} • ${profile.business_name}`;
        case 'hidden':
        default:
          return profile.full_name || `${profile.first_name} ${profile.last_name}`.trim() || 'Business User';
      }
    }
    
    return profile.full_name || `${profile.first_name} ${profile.last_name}`.trim() || 'Business User';
  };

  // Stable data fetching function - no dependencies that could change
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    const fetchFeaturedListings = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 [FixedFeaturedListings] Starting fetch...');

        // Fetch featured listings - mix of business users and regular users with boosted listings
        const { data: businessUsers, error: businessError } = await supabase
          .from('user_subscriptions')
          .select(`
            user_id,
            status,
            current_period_end,
            subscription_plans!user_subscriptions_plan_id_fkey (
              id,
              name,
              description
            ),
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
              business_name_priority
            )
          `)
          .in('status', ['active', 'trialing', 'cancelled']); // ✅ FIX: Include 'trialing' for free trial users

        console.log('🔍 [FixedFeaturedListings] Subscription query result:', {
          error: businessError,
          count: businessUsers?.length || 0,
          users: businessUsers?.map(u => ({ id: u.user_id, status: u.status }))
        });

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
              business_name_priority
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
              business_name_priority
            `)
            .eq('is_business', true);

          if (businessProfileError) {
            console.warn('Error fetching business profile users:', businessProfileError);
          } else {
            businessProfileUsers = profileUsers || [];
          }
        }

        if (businessError) throw businessError;

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
            status: 'profile_business',
            current_period_end: null,
            profiles: profile
          }))
        ];

        const businessUserIds = allBusinessUsers.map(user => user.user_id);

        console.log('📊 Featured Listings - Found business users:', {
          subscriptionUsers: businessUsers?.length || 0,
          profileBusinessUsers: businessProfileUsers?.length || 0,
          totalBusinessUsers: allBusinessUsers.length,
          businessUserIds: businessUserIds.length
        });

        // ✅ FIX: If no business users found, return empty array instead of running invalid query
        if (businessUserIds.length === 0) {
          console.log('⚠️ No business users found for featured listings');
          if (isMounted) {
            setListings([]);
          }
          return;
        }

        // Fetch listings ONLY from Sellar Pro (business) users
        const { data: businessListings, error: businessListingsError } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            price,
            currency,
            images,
            location,
            views_count,
            created_at,
            user_id
          `)
          .eq('status', 'active')
          .in('user_id', businessUserIds)
          .order('created_at', { ascending: false })
          .limit(maxItems); // Show only Pro user listings

        if (businessListingsError) throw businessListingsError;

        console.log('📊 Featured Listings - Query result:', {
          listingsFound: businessListings?.length || 0,
          listings: businessListings?.map(l => ({ id: l.id, title: l.title, user_id: l.user_id }))
        });

        // Use only business listings - no regular users in "Featured Sellar Pro"
        const allListings = businessListings || [];

        if (allListings.length === 0) {
          console.log('⚠️ No listings found for business users');
        }

        // Get unique user IDs for profile fetching
        const allUserIds = [...new Set(allListings.map(listing => listing.user_id))];
        const businessUserIdsSet = new Set(businessUserIds);
        const regularUserIds = allUserIds.filter(id => !businessUserIdsSet.has(id));

        // Fetch profiles for regular users
        let regularUserProfiles: any[] = [];
        if (regularUserIds.length > 0) {
          const { data: regularProfiles, error: regularProfilesError } = await supabase
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
              business_name_priority
            `)
            .in('id', regularUserIds);

          if (regularProfilesError) {
            console.warn('Error fetching regular user profiles:', regularProfilesError);
          } else {
            regularUserProfiles = regularProfiles || [];
          }
        }

        // ✅ FIX: Fetch profiles for any listings where we don't have profile data yet
        const missingProfileUserIds = allListings
          .filter(listing => !allBusinessUsers.find(user => user.user_id === listing.user_id))
          .map(listing => listing.user_id);

        let missingProfiles: any[] = [];
        if (missingProfileUserIds.length > 0) {
          console.log('🔍 Fetching missing profiles for:', missingProfileUserIds);
          const { data: fetchedProfiles, error: missingProfilesError } = await supabase
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
              business_name_priority
            `)
            .in('id', missingProfileUserIds);

          if (missingProfilesError) {
            console.warn('Error fetching missing profiles:', missingProfilesError);
          } else {
            missingProfiles = fetchedProfiles || [];
          }
        }

        // Transform data - all users are Sellar Pro (business) users
        const transformedListings: FeaturedListing[] = allListings?.map(listing => {
          const businessUser = allBusinessUsers?.find(user => user.user_id === listing.user_id);
          const missingProfile = missingProfiles.find(p => p.id === listing.user_id);
          
          const sellerProfile = businessUser?.profiles || missingProfile || {
            id: listing.user_id,
            first_name: 'Business',
            last_name: 'User',
            full_name: 'Business User',
            avatar_url: null,
            rating: null,
            is_business: true,
            business_name: null,
            display_business_name: false,
            business_name_priority: 'hidden'
          };

          // Use stable pseudo-random values based on listing ID
          const idHash = listing.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          
          return {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            currency: listing.currency || 'GHS',
            images: Array.isArray(listing.images) ? listing.images : [],
            location: listing.location || '',
            seller: {
              id: (sellerProfile as any)?.id || listing.user_id,
              name: getDisplayName(sellerProfile),
              avatar: (sellerProfile as any)?.avatar_url,
              rating: (sellerProfile as any)?.rating,
              isBusinessUser: true, // All featured listings are from Sellar Pro users
            },
            isBoosted: idHash % 2 === 0, // Stable based on ID hash
            isSponsored: idHash % 3 === 0, // Stable based on ID hash
            isPriority: true, // All featured listings are priority (Sellar Pro)
            viewCount: listing.views_count || 0,
            createdAt: listing.created_at,
          };
        }) || [];

        console.log('✅ [FixedFeaturedListings] Final transformed listings:', {
          count: transformedListings?.length || 0,
          listings: transformedListings?.map(l => ({ id: l.id, seller: l.seller.name }))
        });

        if (isMounted) {
          setListings(transformedListings);
        }
      } catch (err) {
        console.error('❌ [FixedFeaturedListings] Error fetching featured listings:', err);
        if (isMounted) {
          setError('Failed to load featured listings');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFeaturedListings();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [maxItems]); // Only depend on maxItems, which should be stable

  const handleListingPress = (listingId: string) => {
    router.push(`/(tabs)/home/${listingId}`);
  };

  const handleSellerPress = (sellerId: string) => {
    router.push(`/profile/${sellerId}`);
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/(tabs)/home/business-listings');
    }
  };

  // ✅ Handle favorite toggle with database sync (matches home screen implementation)
  const handleFavoriteToggle = React.useCallback((listingId: string, listingSellerId: string) => {
    // Don't allow users to favorite their own listings
    if (user?.id === listingSellerId) {
      return;
    }

    import('@/lib/favoritesAndViews').then(({ toggleFavorite }) => {
      const isFavorited = favorites[listingId] || false;
      
      // Optimistic update using global store (syncs across all instances)
      toggleGlobalFavorite(listingId);
      
      // Update the listing's favorite count optimistically
      if (isFavorited) {
        decrementListingFavoriteCount(listingId);
      } else {
        incrementListingFavoriteCount(listingId);
      }
      
      // Perform actual database toggle
      toggleFavorite(listingId).then((result) => {
        if (result.error) {
          // Revert optimistic updates on error
          toggleGlobalFavorite(listingId);
          if (isFavorited) {
            incrementListingFavoriteCount(listingId);
          } else {
            decrementListingFavoriteCount(listingId);
          }
        } else {
          // Refresh stats after successful toggle
          refreshStats();
        }
      });
    });
  }, [user, favorites, toggleGlobalFavorite, incrementListingFavoriteCount, decrementListingFavoriteCount, refreshStats]);

  if (loading) {
    return (
      <View style={{ padding: theme.spacing.lg }}>
        {showHeader && (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <LoadingSkeleton width="60%" height={24} />
            <LoadingSkeleton width="40%" height={16} style={{ marginTop: theme.spacing.sm }} />
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <LoadingSkeleton
                key={index}
                width={280}
                height={200}
                style={{ borderRadius: theme.borderRadius.lg }}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: theme.spacing.lg }}>
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View style={{ padding: theme.spacing.lg }}>
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          No featured listings available
        </Text>
      </View>
    );
  }

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
      }}>
        <View>
          <Text style={{ marginBottom: theme.spacing.xs, fontSize: 20, fontWeight: '600' }}>
            Featured Sellar Pro Listings
          </Text>
          <Text variant="bodySmall" color="secondary">
            Premium listings from business users
          </Text>
        </View>
        <TouchableOpacity onPress={handleViewAll}>
          <Text variant="button" color="primary">
            View All
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderListings = () => {
    if (layout === 'grid') {
      return (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: theme.spacing.sm,
          gap: theme.spacing.sm,
        }}>
        {listings.map((listing) => {
          const isFavorited = favorites[listing.id] || false;
          const favCount = listingFavoriteCounts[listing.id] ?? 0;
          const views = viewCounts[listing.id] || 0;
          const isOwnListing = user?.id === listing.seller.id;

          return (
            <View key={listing.id} style={{ width: '48%', marginBottom: theme.spacing.md }}>
              <ProductCard
                variant="compact"
                shadowSize="sm"
                layout="grid"
                listingId={listing.id}
                image={listing.images}
                title={listing.title}
                price={listing.price}
                currency={listing.currency}
                seller={listing.seller}
                location={listing.location}
                viewCount={views}
                favoritesCount={favCount}
                isFavorited={isFavorited}
                onFavoritePress={isOwnListing ? undefined : () => handleFavoriteToggle(listing.id, listing.seller.id)}
                onPress={() => handleListingPress(listing.id)}
                borderColor={theme.colors.primary}
              />
            </View>
          );
        })}
        </View>
      );
    }

    // Horizontal layout
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.sm,
          gap: theme.spacing.sm - 5,
        }}
      >
        {listings.map((listing) => {
          const isFavorited = favorites[listing.id] || false;
          const favCount = listingFavoriteCounts[listing.id] ?? 0;
          const views = viewCounts[listing.id] || 0;
          const isOwnListing = user?.id === listing.seller.id;

          return (
            <View key={listing.id} style={{ width: 190, marginBottom: theme.spacing.md }}>
              <ProductCard
                variant="compact"
                width={190}
                shadowSize="sm"
                layout="grid"
                listingId={listing.id}
                image={listing.images}
                title={listing.title}
                price={listing.price}
                currency={listing.currency}
                seller={listing.seller}
                location={listing.location}
                viewCount={views}
                favoritesCount={favCount}
                isFavorited={isFavorited}
                onFavoritePress={isOwnListing ? undefined : () => handleFavoriteToggle(listing.id, listing.seller.id)}
                onPress={() => handleListingPress(listing.id)}
                borderColor={theme.colors.primary}
              />
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={{ marginBottom: theme.spacing.xl }}>
      {renderHeader()}
      {renderListings()}
    </View>
  );
}
