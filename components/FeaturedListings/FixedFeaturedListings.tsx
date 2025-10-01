import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { MinimalPremiumProductCard } from '@/components/PremiumProductCard/MinimalPremiumProductCard';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

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
  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          .in('status', ['active', 'cancelled']);

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

        // Fetch listings from business users first (priority)
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
          .limit(Math.ceil(maxItems * 0.7)); // 70% from business users

        if (businessListingsError) throw businessListingsError;

        // Fetch additional listings from regular users with boosted features
        const { data: boostedListings, error: boostedListingsError } = await supabase
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
          .not('user_id', 'in', `(${businessUserIds.join(',')})`)
          .order('views_count', { ascending: false })
          .limit(Math.ceil(maxItems * 0.3)); // 30% from regular users

        if (boostedListingsError) throw boostedListingsError;

        // Combine and limit results
        const allListings = [
          ...(businessListings || []),
          ...(boostedListings || [])
        ].slice(0, maxItems);

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

        // Transform data with stable values (no Math.random)
        const transformedListings: FeaturedListing[] = allListings?.map(listing => {
          const businessUser = allBusinessUsers?.find(user => user.user_id === listing.user_id);
          const isBusinessUser = !!businessUser;
          
          let sellerProfile;
          if (isBusinessUser) {
            sellerProfile = businessUser.profiles;
          } else {
            sellerProfile = regularUserProfiles.find(profile => profile.id === listing.user_id) || {
              id: listing.user_id,
              first_name: 'User',
              last_name: '',
              full_name: 'User',
              avatar_url: null,
              rating: null,
              is_business: false,
              business_name: null,
              display_business_name: false,
              business_name_priority: 'hidden'
            };
          }

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
              isBusinessUser: isBusinessUser,
            },
            isBoosted: idHash % 2 === 0, // Stable based on ID hash
            isSponsored: idHash % 3 === 0, // Stable based on ID hash
            isPriority: isBusinessUser, // Business users get priority
            viewCount: listing.views_count || 0,
            createdAt: listing.created_at,
          };
        }) || [];

        if (isMounted) {
          setListings(transformedListings);
        }
      } catch (err) {
        console.error('Error fetching featured listings:', err);
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
        {listings.map((listing) => (
          <View key={listing.id} style={{ width: '48%' }}>
            <MinimalPremiumProductCard
              image={listing.images}
              title={listing.title}
              price={listing.price}
              currency={listing.currency}
              seller={listing.seller}
              location={listing.location}
              onPress={() => handleListingPress(listing.id)}
            />
          </View>
        ))}
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
        {listings.map((listing) => (
          <View key={listing.id} style={{ width: 190 }}>
            <MinimalPremiumProductCard
              image={listing.images}
              title={listing.title}
              price={listing.price}
              currency={listing.currency}
              seller={listing.seller}
              location={listing.location}
              onPress={() => handleListingPress(listing.id)}
            />
          </View>
        ))}
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
