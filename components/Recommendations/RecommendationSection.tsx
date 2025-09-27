import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useRecommendations, RecommendationListing } from '@/hooks/useRecommendations';
import { Text } from '@/components/Typography/Text';
import { ProductCard } from '@/components/Card/Card';
import { Grid } from '@/components/Grid/Grid';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { ChevronRight, TrendingUp, Heart, Eye, Star } from 'lucide-react-native';

interface RecommendationSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  type: 'personalized' | 'trending' | 'category' | 'recently_viewed' | 'collaborative' | 'boosted';
  listingId?: string; // Required for category and collaborative recommendations
  userLocation?: string;
  boostType?: string;
  limit?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  onListingPress?: (listingId: string) => void;
  style?: any;
  layout?: 'horizontal' | 'grid'; // New prop to control layout
}

export function RecommendationSection({
  title,
  subtitle,
  icon,
  type,
  listingId,
  userLocation,
  boostType,
  limit = 10,
  showViewAll = true,
  onViewAll,
  onListingPress,
  style,
  layout = 'horizontal'
}: RecommendationSectionProps) {
  const { theme } = useTheme();
  const {
    loading,
    error,
    getPersonalizedRecommendations,
    getTrendingNearUser,
    getCategoryRecommendations,
    getRecentlyViewed,
    getCollaborativeRecommendations,
    getBoostedListings
  } = useRecommendations();

  const [recommendations, setRecommendations] = useState<RecommendationListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = async () => {
    try {
      let data: RecommendationListing[] = [];

      // Fetch one extra item to check if there are more available
      const fetchLimit = limit + 1;

      switch (type) {
        case 'personalized':
          data = await getPersonalizedRecommendations({ limit: fetchLimit });
          break;
        case 'trending':
          data = await getTrendingNearUser({ limit: fetchLimit, userLocation });
          break;
        case 'category':
          if (listingId) {
            data = await getCategoryRecommendations(listingId, { limit: fetchLimit });
          }
          break;
        case 'recently_viewed':
          data = await getRecentlyViewed({ limit: fetchLimit });
          break;
        case 'collaborative':
          if (listingId) {
            data = await getCollaborativeRecommendations(listingId, { limit: fetchLimit });
          }
          break;
        case 'boosted':
          data = await getBoostedListings({ limit: fetchLimit, boostType });
          break;
      }

      setRecommendations(data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  useEffect(() => {
    loadRecommendations();
  }, [type, listingId, userLocation, boostType, limit]);

  const getDefaultIcon = () => {
    switch (type) {
      case 'personalized':
        return <Star size={20} color={theme.colors.primary} />;
      case 'trending':
        return <TrendingUp size={20} color={theme.colors.primary} />;
      case 'category':
        return <Heart size={20} color={theme.colors.primary} />;
      case 'recently_viewed':
        return <Eye size={20} color={theme.colors.primary} />;
      case 'collaborative':
        return <TrendingUp size={20} color={theme.colors.primary} />;
      case 'boosted':
        return <Star size={20} color={theme.colors.primary} />;
      default:
        return null;
    }
  };

  const getRecommendationReason = (item: RecommendationListing) => {
    if (item.recommendation_reason) return item.recommendation_reason;
    
    switch (type) {
      case 'trending':
        return `Trending • ${item.distance_km ? `${item.distance_km}km away` : 'Near you'}`;
      case 'category':
        return 'Similar items';
      case 'recently_viewed':
        return 'Recently viewed';
      case 'collaborative':
        return 'People also viewed';
      case 'boosted':
        return item.boost_type ? `${item.boost_type.replace('_', ' ')}` : 'Featured';
      default:
        return 'Recommended for you';
    }
  };

  if (loading && recommendations.length === 0) {
    return (
      <View style={[{ marginBottom: theme.spacing.xl }, style]}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {icon || getDefaultIcon()}
            <Text variant="h3">{title}</Text>
          </View>
        </View>
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

  if (error && recommendations.length === 0) {
    return (
      <View style={[{ marginBottom: theme.spacing.xl }, style]}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {icon || getDefaultIcon()}
            <Text variant="h3">{title}</Text>
          </View>
        </View>
        <ErrorState
          message="Failed to load recommendations"
          onRetry={loadRecommendations}
        />
      </View>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }


  return (
    <View style={[{ marginBottom: theme.spacing.xl }, style]}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {icon || getDefaultIcon()}
            <Text variant="h3">{title}</Text>
          </View>
          {subtitle && (
            <Text variant="bodySmall" color="muted" style={{ marginTop: theme.spacing.xs }}>
              {subtitle}
            </Text>
          )}
        </View>
        
        {showViewAll && onViewAll && recommendations.length > limit && (
          <TouchableOpacity
            onPress={onViewAll}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              backgroundColor: theme.colors.surfaceVariant,
            }}
            activeOpacity={0.7}
          >
            <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
              View All
            </Text>
            <ChevronRight size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Recommendations List */}
      {layout === 'grid' ? (
        <Grid columns={2} spacing={4}>
          {recommendations.slice(0, limit).map((item, index) => {
            // Ensure we have valid data before rendering
            if (!item || !item.listing_id || !item.title) {
              return null;
            }
            
            return (
              <View key={item.listing_id} style={{ position: 'relative' }}>
                <ProductCard
                  image={Array.isArray(item.images) ? item.images[0] : (item.images || '')}
                  title={item.title || 'Untitled'}
                  price={item.price || 0}
                  currency={item.currency || 'GHS'}
                  seller={{
                    id: item.user_id || '',
                    name: item.seller_name || 'Unknown',
                    avatar: item.seller_avatar || undefined,
                    rating: 0
                  }}
                  location={item.location || 'Unknown'}
                  layout="grid"
                  fullWidth={true}
                  listingId={item.listing_id}
                  onPress={() => onListingPress?.(item.listing_id)}
                  showReportButton={false}
                  currentUserId=""
                />
              </View>
            );
          })}
        </Grid>
      ) : (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {recommendations.slice(0, limit).map((item, index) => {
            // Ensure we have valid data before rendering
            if (!item || !item.listing_id || !item.title) {
              return null;
            }
            
            return (
              <View key={item.listing_id} style={{ width: 180 }}>
                <ProductCard
                  image={Array.isArray(item.images) ? item.images[0] : (item.images || '')}
                  title={item.title || 'Untitled'}
                  price={item.price || 0}
                  currency={item.currency || 'GHS'}
                  seller={{
                    id: item.user_id || '',
                    name: item.seller_name || 'Unknown',
                    avatar: item.seller_avatar || undefined,
                    rating: 0
                  }}
                  location={item.location || 'Unknown'}
                  onPress={() => onListingPress?.(item.listing_id)}
                  showReportButton={false}
                  currentUserId=""
                />
            </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
