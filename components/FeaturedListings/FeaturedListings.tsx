import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { PremiumProductCard } from '@/components/PremiumProductCard/PremiumProductCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { BusinessBadge } from '@/components/BusinessBadge/BusinessBadge';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Crown, Star, ArrowRight, Zap } from 'lucide-react-native';

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

interface FeaturedListingsProps {
  maxItems?: number;
  showHeader?: boolean;
  layout?: 'horizontal' | 'grid';
  onViewAll?: () => void;
}

export function FeaturedListings({
  maxItems = 6,
  showHeader = true,
  layout = 'horizontal',
  onViewAll,
}: FeaturedListingsProps) {
  const { theme } = useTheme();
  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeaturedListings = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch business user listings with priority placement
      // First get business users, then get their listings
      const { data: businessUsers, error: businessError } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          profiles!user_id (
            id,
            first_name,
            last_name,
            avatar_url,
            rating
          )
        `)
        .eq('status', 'active');

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
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (listingsError) throw listingsError;

      // Transform data to match our interface
      const transformedListings: FeaturedListing[] = listingsData?.map(listing => {
        // Find the corresponding business user data
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
            name: `${(profile as any)?.first_name || ''} ${(profile as any)?.last_name || ''}`.trim() || 'Business User',
            avatar: (profile as any)?.avatar_url,
            rating: (profile as any)?.rating,
            isBusinessUser: true, // All these listings are from business users
          },
          isBoosted: listing.id.length % 2 === 0, // Stable pseudo-random based on ID
          isSponsored: listing.id.length % 3 === 0, // Stable pseudo-random based on ID
          isPriority: true, // All featured listings are priority
          viewCount: listing.views_count || 0,
          createdAt: listing.created_at,
        };
      }) || [];

      setListings(transformedListings);
    } catch (err) {
      console.error('Error fetching featured listings:', err);
      setError('Failed to load featured listings');
    } finally {
      setLoading(false);
    }
  }, [maxItems]); // Add maxItems as dependency since it affects the query

  useEffect(() => {
    fetchFeaturedListings();
  }, [fetchFeaturedListings]);

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
      router.push('/(tabs)/home?filter=business');
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
              <View key={index} style={{ width: 280 }}>
                <LoadingSkeleton width="100%" height={200} />
                <LoadingSkeleton width="100%" height={16} style={{ marginTop: theme.spacing.sm }} />
                <LoadingSkeleton width="60%" height={16} style={{ marginTop: theme.spacing.xs }} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error || listings.length === 0) {
    return (
      <View style={{ padding: theme.spacing.lg }}>
        {showHeader && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
          }}>
            <View>
              <Text variant="h3" style={{ fontWeight: '600' }}>
                Featured Sellar Pro Listings
              </Text>
              <Text variant="bodySmall" color="muted">
                Premium listings from Pro sellers
              </Text>
            </View>
          </View>
        )}
        <EmptyState
          icon={<Crown size={48} color={theme.colors.text.muted} />}
          title="No Featured Listings"
          description="Check back soon for premium business listings"
        />
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
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <Crown size={20} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
            <Text variant="h3" style={{ fontWeight: '600' }}>
              Featured Sellar Pro Listings
            </Text>
          </View>
          <Text variant="bodySmall" color="muted">
            Premium listings from Pro sellers
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleViewAll}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.primary + '10',
            borderRadius: theme.borderRadius.md,
          }}
        >
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.primary,
              fontWeight: '600',
              marginRight: theme.spacing.xs,
            }}
          >
            View All
          </Text>
          <ArrowRight size={14} color={theme.colors.primary} />
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
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
        }}>
          {listings.map((listing) => (
            <PremiumProductCard
              key={listing.id}
              image={listing.images}
              title={listing.title}
              price={listing.price}
              currency={listing.currency}
              seller={listing.seller}
              location={listing.location}
              layout="grid"
              isBoosted={listing.isBoosted}
              isSponsored={listing.isSponsored}
              isPriority={listing.isPriority}
              viewCount={listing.viewCount}
              onPress={() => handleListingPress(listing.id)}
              onSellerPress={() => handleSellerPress(listing.seller.id)}
            />
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
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        {listings.map((listing) => (
          <View key={listing.id} style={{ width: 280 }}>
            <PremiumProductCard
              image={listing.images}
              title={listing.title}
              price={listing.price}
              currency={listing.currency}
              seller={listing.seller}
              location={listing.location}
              layout="default"
              fullWidth
              isBoosted={listing.isBoosted}
              isSponsored={listing.isSponsored}
              isPriority={listing.isPriority}
              viewCount={listing.viewCount}
              onPress={() => handleListingPress(listing.id)}
              onSellerPress={() => handleSellerPress(listing.seller.id)}
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

/**
 * Compact featured listings for smaller spaces
 */
interface CompactFeaturedListingsProps {
  maxItems?: number;
  onViewAll?: () => void;
}

export function CompactFeaturedListings({
  maxItems = 3,
  onViewAll,
}: CompactFeaturedListingsProps) {
  const { theme } = useTheme();
  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simplified fetch for compact version
    const fetchCompactListings = async () => {
      try {
        setLoading(true);
        // Mock data for now
        const mockListings: FeaturedListing[] = [
          {
            id: '1',
            title: 'Premium iPhone 15 Pro',
            price: 8500,
            currency: 'GHS',
            images: ['https://example.com/iphone.jpg'],
            location: 'Accra, Ghana',
            seller: {
              id: '1',
              name: 'TechHub Ghana',
              isBusinessUser: true,
              rating: 4.8,
            },
            isBoosted: true,
            isSponsored: false,
            isPriority: true,
            viewCount: 245,
            createdAt: new Date().toISOString(),
          },
        ];
        setListings(mockListings.slice(0, maxItems));
      } catch (error) {
        console.error('Error fetching compact listings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompactListings();
  }, [maxItems]);

  if (loading) {
    return (
      <View style={{ gap: theme.spacing.md }}>
        {Array.from({ length: maxItems }).map((_, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <LoadingSkeleton width={80} height={80} />
            <View style={{ flex: 1 }}>
              <LoadingSkeleton width="100%" height={16} />
              <LoadingSkeleton width="60%" height={14} style={{ marginTop: theme.spacing.xs }} />
              <LoadingSkeleton width="40%" height={12} style={{ marginTop: theme.spacing.xs }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
      }}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          Featured Sellar Pro
        </Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              View All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        {listings.map((listing) => (
          <TouchableOpacity
            key={listing.id}
            onPress={() => router.push(`/(tabs)/home/${listing.id}`)}
            style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              borderColor: theme.colors.primary + '20',
            }}
          >
            <View style={{ width: 80, height: 80, position: 'relative' }}>
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.sm,
              }} />
              {listing.isBoosted && (
                <View style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: theme.colors.warning,
                  borderRadius: theme.borderRadius.xs,
                  padding: 2,
                }}>
                  <Zap size={8} color="white" />
                </View>
              )}
            </View>
            
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600' }} numberOfLines={1}>
                {listing.title}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                {listing.currency} {listing.price.toLocaleString()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
                <BusinessBadge type="business" size="small" variant="minimal" />
                <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.sm }}>
                  {listing.viewCount} views
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
