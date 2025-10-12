import React, { memo, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { ProductCard } from '@/components/Card/Card';
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

const BusinessListings = memo(function BusinessListings({
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

  const handleListingPress = useCallback((listingId: string) => {
    if (onListingPress) {
      onListingPress(listingId);
    } else {
      router.push(`/(tabs)/home/${listingId}`);
    }
  }, [onListingPress]);

  const handleSeeAllPress = useCallback(() => {
    if (onSeeAllPress) {
      onSeeAllPress();
    } else {
      router.push(`/profile/${businessId}`);
    }
  }, [onSeeAllPress, businessId]);

  // Memoize display listings to prevent unnecessary recalculations
  const displayListings = useMemo(() => listings.slice(0, 10), [listings]);
  const hasMoreListings = useMemo(() => listings.length > 10, [listings.length]);

  // Memoize the render item function to prevent re-renders
  const renderListing = useCallback(({ item: listing }: { item: BusinessListing }) => (
    <View style={{ width: 190, marginBottom: theme.spacing.md }}>
      <ProductCard
        variant="compact"
        width={190}
        shadowSize="sm"
        layout="grid"
        image={listing.images}
        title={listing.title}
        price={listing.price}
        currency={listing.currency}
        seller={listing.seller}
        location={listing.location}
        onPress={() => handleListingPress(listing.id)}
        viewCount={listing.viewCount}
        isFavorited={favorites[listing.id] || false}
        onFavoritePress={currentUserId !== listing.seller.id ? () => onFavoritePress?.(listing.id) : undefined}
        listingId={listing.id}
      />
    </View>
  ), [handleListingPress, favorites, currentUserId, onFavoritePress, theme.spacing.md]);

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <FlatList
        data={displayListings}
        renderItem={renderListing}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.sm,
        }}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={3}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 190,
          offset: 190 * index,
          index,
        })}
        ListFooterComponent={
          hasMoreListings ? (
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
          ) : null
        }
      />
    </View>
  );
});

export { BusinessListings };
