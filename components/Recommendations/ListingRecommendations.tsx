import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { RecommendationSection } from './RecommendationSection';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Heart, Users } from 'lucide-react-native';

interface ListingRecommendationsProps {
  listingId: string;
  onListingPress?: (listingId: string) => void;
  onViewAllCategory?: () => void;
  onViewAllCollaborative?: () => void;
  style?: any;
}

export function ListingRecommendations({
  listingId,
  onListingPress,
  onViewAllCategory,
  onViewAllCollaborative,
  style
}: ListingRecommendationsProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [listingId]);

  if (loading) {
    return (
      <View style={[{ marginTop: theme.spacing.xl }, style]}>
        <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
          You may also like
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width={180}
              height={200}
              style={{ borderRadius: theme.borderRadius.md }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[{ marginTop: theme.spacing.xl }, style]}>
      {/* Category-based Recommendations */}
      <RecommendationSection
        title="You may also like"
        subtitle="Similar items in this category"
        icon={<Heart size={20} color={theme.colors.primary} />}
        type="category"
        listingId={listingId}
        limit={6}
        layout="grid"
        showViewAll={true}
        onViewAll={onViewAllCategory}
        onListingPress={onListingPress}
        style={{ marginBottom: theme.spacing.lg }}
      />

      {/* Collaborative Filtering Recommendations */}
      <RecommendationSection
        title="People who viewed this also viewed"
        subtitle="Based on user behavior patterns"
        icon={<Users size={20} color={theme.colors.primary} />}
        type="collaborative"
        listingId={listingId}
        limit={6}
        layout="grid"
        showViewAll={true}
        onViewAll={onViewAllCollaborative}
        onListingPress={onListingPress}
      />
    </View>
  );
}
