import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { MinimalPremiumProductCard } from '@/components/PremiumProductCard/MinimalPremiumProductCard';
import { router } from 'expo-router';

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

interface BusinessListingsProps {
  businessId: string;
  businessName: string;
  listings: BusinessListing[];
  onListingPress?: (listingId: string) => void;
  onSeeAllPress?: () => void;
  currentUserId?: string;
  favorites?: Record<string, boolean>;
  onFavoritePress?: (listingId: string) => void;
}

export function BusinessListings({
  businessId,
  businessName,
  listings,
  onListingPress,
  onSeeAllPress,
  currentUserId,
  favorites = {},
  onFavoritePress,
}: BusinessListingsProps) {
  const { theme } = useTheme();

  const handleListingPress = (listingId: string) => {
    if (onListingPress) {
      onListingPress(listingId);
    } else {
      router.push(`/(tabs)/home/${listingId}`);
    }
  };

  const handleSeeAllPress = () => {
    if (onSeeAllPress) {
      onSeeAllPress();
    } else {
      router.push(`/profile/${businessId}`);
    }
  };

  // Show up to 10 listings
  const displayListings = listings.slice(0, 10);
  const hasMoreListings = listings.length > 10;

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.sm,
        }}
      >
        {displayListings.map((listing) => (
          <View key={listing.id} style={{ width: 190 }}>
            <MinimalPremiumProductCard
              image={listing.images}
              title={listing.title}
              price={listing.price}
              currency={listing.currency}
              seller={listing.seller}
              onPress={() => handleListingPress(listing.id)}
              viewCount={listing.viewCount}
              isFavorited={favorites[listing.id] || false}
              onFavoritePress={currentUserId !== listing.seller.id ? () => onFavoritePress?.(listing.id) : undefined}
              listingId={listing.id}
            />
          </View>
        ))}

        {/* See All Items Button */}
        {hasMoreListings && (
          <TouchableOpacity
            onPress={handleSeeAllPress}
            style={{
              width: 190,
              height: 280,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              borderWidth: 2,
              borderColor: theme.colors.primary,
              borderStyle: 'dashed',
              justifyContent: 'center',
              alignItems: 'center',
              padding: theme.spacing.lg,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text 
                variant="body" 
                style={{ 
                  fontWeight: '600',
                  color: theme.colors.primary,
                  textAlign: 'center',
                  marginBottom: theme.spacing.xs,
                }}
              >
                See All Items
              </Text>
              <Text 
                variant="caption" 
                color="secondary"
                style={{ textAlign: 'center' }}
              >
                {listings.length - 10} more listings
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
