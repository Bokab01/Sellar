import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { OptimizedImage } from '@/components/OptimizedImage/OptimizedImage';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { UserDisplayName } from '@/components/UserDisplayName/UserDisplayName';
import {
  Search,
  MapPin,
  Clock,
  Eye,
  Star,
  TrendingUp,
  Zap,
  Crown
} from 'lucide-react-native';
import { SearchResult } from '@/lib/smartSearchService';
import { router } from 'expo-router';

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  refreshing?: boolean;
  hasMore: boolean;
  totalCount: number;
  searchTime: number;
  query: string;
  onRefresh?: () => void;
  onLoadMore: () => void;
  onResultPress: (result: SearchResult, index: number) => void;
  style?: any;
}

export function SearchResults({
  results,
  loading,
  refreshing = false,
  hasMore,
  totalCount,
  searchTime,
  query,
  onRefresh,
  onLoadMore,
  onResultPress,
  style,
}: SearchResultsProps) {
  const { theme } = useTheme();

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    return date.toLocaleDateString();
  };

  const renderResultItem = ({ item, index }: { item: SearchResult; index: number }) => (
    <TouchableOpacity
      onPress={() => onResultPress(item, index)}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }}
    >
      {/* Image */}
      <View style={{ position: 'relative' }}>
        <OptimizedImage
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300x200' }}
          style={{
            width: '100%',
            height: 200,
            backgroundColor: theme.colors.surfaceVariant,
          }}
          resizeMode="cover"
        />
        
        {/* Badges */}
        <View
          style={{
            position: 'absolute',
            top: theme.spacing.sm,
            left: theme.spacing.sm,
            flexDirection: 'row',
            gap: theme.spacing.xs,
          }}
        >
          {item.featured && (
            <Badge
              text="Featured"
              variant="warning"
              size="small"
              leftIcon={<Crown size={12} color={theme.colors.warning} />}
            />
          )}
          
          {item.boost_level > 0 && (
            <Badge
              text="Boosted"
              variant="success"
              size="small"
              leftIcon={<Zap size={12} color={theme.colors.success} />}
            />
          )}
        </View>

        {/* Price */}
        <View
          style={{
            position: 'absolute',
            bottom: theme.spacing.sm,
            right: theme.spacing.sm,
            backgroundColor: 'rgba(0,0,0,0.8)',
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.borderRadius.md,
          }}
        >
          <Text
            variant="bodySmall"
            style={{
              color: '#fff',
              fontWeight: '600',
            }}
          >
            {formatPrice(item.price, item.currency)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={{ padding: theme.spacing.md }}>
        {/* Title */}
        <Text
          variant="h4"
          numberOfLines={2}
          style={{
            marginBottom: theme.spacing.xs,
            fontWeight: '600',
          }}
        >
          {item.title}
        </Text>

        {/* Description */}
        <Text
          variant="body"
          color="muted"
          numberOfLines={2}
          style={{ marginBottom: theme.spacing.sm }}
        >
          {item.description}
        </Text>

        {/* Metadata */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin size={14} color={theme.colors.secondary} />
            <Text variant="caption" color="muted" style={{ marginLeft: 4 }}>
              {item.location}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Clock size={14} color={theme.colors.secondary} />
            <Text variant="caption" color="muted" style={{ marginLeft: 4 }}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>

          {item.views > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Eye size={14} color={theme.colors.secondary} />
              <Text variant="caption" color="muted" style={{ marginLeft: 4 }}>
                {item.views}
              </Text>
            </View>
          )}
        </View>

        {/* Seller Info */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {item.user && (
              <UserDisplayName
                profile={item.user as any}
                showAvatar
                avatarSize={24}
                variant="caption"
              />
            )}
          </View>

          {/* Condition Badge */}
          <Badge
            text={item.condition.replace('-', ' ')}
            variant="secondary"
            size="small"
          />
        </View>

        {/* Search Relevance (Debug) */}
        {__DEV__ && item.relevance_score && (
          <View style={{ marginTop: theme.spacing.xs }}>
            <Text variant="caption" color="muted">
              Relevance: {item.relevance_score.toFixed(1)} | Rank: {item.search_rank}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={{ marginBottom: theme.spacing.lg }}>
      {/* Search Stats */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md,
        }}
      >
        <Text variant="body" color="muted">
          {totalCount > 0 
            ? `${totalCount.toLocaleString()} results${query ? ` for "${query}"` : ''}`
            : query 
              ? `No results for "${query}"`
              : 'Browse all listings'
          }
        </Text>
        
        {searchTime > 0 && (
          <Text variant="caption" color="muted">
            {searchTime}ms
          </Text>
        )}
      </View>

      {/* Quick Filters or Suggestions could go here */}
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
        {loading ? (
          <LoadingSkeleton height={60} width={200} />
        ) : (
          <TouchableOpacity
            onPress={onLoadMore}
            style={{
              backgroundColor: theme.colors.primary,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <Text
              variant="body"
              style={{
                color: theme.colors.surface,
                fontWeight: '600',
              }}
            >
              Load More
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={{ padding: theme.spacing.lg }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={{ marginBottom: theme.spacing.lg }}>
              <LoadingSkeleton height={200} style={{ marginBottom: theme.spacing.sm }} />
              <LoadingSkeleton height={20} width="80%" style={{ marginBottom: theme.spacing.xs }} />
              <LoadingSkeleton height={16} width="60%" style={{ marginBottom: theme.spacing.xs }} />
              <LoadingSkeleton height={14} width="40%" />
            </View>
          ))}
        </View>
      );
    }

    return (
      <EmptyState
        icon={<Search size={48} color={theme.colors.secondary} />}
        title={query ? "No results found" : "Start searching"}
        description={
          query
            ? `We couldn't find anything matching "${query}". Try adjusting your search or filters.`
            : "Enter a search term to find listings, or browse by category."
        }
        action={
          query ? {
            text: "Browse All Categories",
            onPress: () => router.push('/(tabs)/browse')
          } : undefined
        }
      />
    );
  };

  if (results.length === 0) {
    return (
      <View style={[{ flex: 1 }, style]}>
        {renderHeader()}
        {renderEmpty()}
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={renderResultItem}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: theme.spacing.lg,
      }}
      style={style}
    />
  );
}
