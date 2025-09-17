import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { MinimalPremiumProductCard } from '@/components/PremiumProductCard/MinimalPremiumProductCard';
import { Grid } from '@/components/Grid/Grid';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { ArrowLeft, Building2 } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useDisplayName } from '@/hooks/useDisplayName';

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

export default function BusinessListingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      // Fetch all business user listings
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

      if (businessError) throw businessError;

      if (!businessUsers || businessUsers.length === 0) {
        setListings([]);
        return;
      }

      const businessUserIds = businessUsers.map(sub => sub.user_id);

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


      // Transform data
      const transformedListings: BusinessListing[] = listingsData?.map(listing => {
        const businessUser = businessUsers.find(user => user.user_id === listing.user_id);
        const profile = businessUser?.profiles;

        return {
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
        };
      }) || [];

      setListings(transformedListings);
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

  const handleListingPress = (listingId: string) => {
    router.push(`/(tabs)/home/${listingId}`);
  };

  const handleRefresh = () => {
    fetchBusinessListings(true);
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={{ 
          flex: 1, 
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                padding: theme.spacing.sm,
                marginRight: theme.spacing.sm,
              }}
            >
              <ArrowLeft size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <LoadingSkeleton width="60%" height={24} />
          </View>

           {/* Loading Content */}
           <ScrollView style={{ flex: 1 }}>
             <Grid columns={2} spacing={4}>
               {Array.from({ length: 6 }).map((_, index) => (
                 <LoadingSkeleton
                   key={index}
                   width="100%"
                   height={280}
                   style={{ borderRadius: theme.borderRadius.lg }}
                 />
               ))}
             </Grid>
           </ScrollView>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
      }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Building2 size={24} color={theme.colors.primary} />
              <Text variant="h3">Business Listings</Text>
            </View>
            <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {listings.length} premium listings from verified businesses
            </Text>
          </View>
        </View>

         {error ? (
           <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
             <EmptyState
               title="Failed to Load"
               description={error}
               actionText="Try Again"
               onActionPress={() => fetchBusinessListings()}
             />
           </View>
         ) : listings.length === 0 ? (
           <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
             <EmptyState
               title="No Business Listings"
               description="There are currently no active business listings available."
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
            <Grid columns={2} spacing={4}>
              {listings.map((listing) => (
                <MinimalPremiumProductCard
                  key={listing.id}
                  image={listing.images}
                  title={listing.title}
                  price={listing.price}
                  currency={listing.currency}
                  seller={listing.seller}
                  onPress={() => handleListingPress(listing.id)}
                />
              ))}
            </Grid>
          </ScrollView>
        )}
      </View>
    </SafeAreaWrapper>
  );
}
