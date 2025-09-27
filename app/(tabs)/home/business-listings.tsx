import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { BusinessProfile } from '@/components/BusinessProfile/BusinessProfile';
import { BusinessListings } from '@/components/BusinessListings/BusinessListings';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import { useDisplayName } from '@/hooks/useDisplayName';
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

export default function BusinessListingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

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
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessListings = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch business users with their profiles - include both subscription-based and profile-based business users
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
            currency: listing.currency || 'GHS',
            images: Array.isArray(listing.images) ? listing.images : [],
            location: listing.location || '',
            seller: {
              id: (profile as any)?.id || listing.user_id,
              name: getDisplayName(profile),
              avatar: (profile as any)?.avatar_url,
              rating: (profile as any)?.rating,
              isBusinessUser: true,
            },
            viewCount: listing.views_count || 0,
            createdAt: listing.created_at,
          }));

          return {
            id: businessUser.user_id,
            name: getDisplayName(profile),
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
          currency: listing.currency || 'GHS',
          images: Array.isArray(listing.images) ? listing.images : [],
          location: listing.location || '',
          seller: {
            id: (profile as any)?.id || listing.user_id,
            name: getDisplayName(profile),
            avatar: (profile as any)?.avatar_url,
            rating: (profile as any)?.rating,
            isBusinessUser: true,
          },
          viewCount: listing.views_count || 0,
          createdAt: listing.created_at,
        }));

        return {
          id: businessUser.user_id,
          name: getDisplayName(profile),
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

      setBusinessUsers(businessUsersWithListings);
    } catch (err) {
      console.error('Error fetching business listings:', err);
      setError('Failed to load business listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBusinessListings();
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
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >
            {businessUsers.map((businessUser) => (
              <View key={businessUser.id}>
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
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaWrapper>
  );
}
