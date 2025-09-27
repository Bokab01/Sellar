# Comprehensive Search and Recommendation System

This document provides a complete guide to implementing and using the recommendation system for the Sellar mobile marketplace app.

## 🏗️ System Architecture

The recommendation system consists of several key components:

### Database Schema
- **user_interactions**: Tracks all user interactions with listings
- **user_preferences**: Calculated user preferences based on behavior
- **listing_popularity**: Cached popularity and trending scores
- **listing_co_interactions**: Collaborative filtering data
- **recently_viewed**: Quick access to recently viewed items
- **boosted_listings**: Sponsored/boosted listings
- **search_history**: User search queries for personalization

### Core Functions
- **track_user_interaction**: Records user interactions and updates preferences
- **get_personalized_recommendations**: AI-powered personalized feed
- **get_trending_near_user**: Location-based trending items
- **get_category_recommendations**: Category-based suggestions
- **get_collaborative_recommendations**: "People also viewed" recommendations
- **get_boosted_listings**: Sponsored content management

## 🚀 Quick Start

### 1. Database Setup

Run the database migrations:

```sql
-- Run these in your Supabase SQL editor
\i supabase/recommendation-system-schema.sql
\i supabase/recommendation-system-functions.sql
```

### 2. Basic Integration

```typescript
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationFeed } from '@/components/Recommendations';

// In your component
const { trackInteraction, getPersonalizedRecommendations } = useRecommendations();

// Track user interaction
await trackInteraction(listingId, 'view', { 
  source: 'home', 
  timeSpent: 30 
});

// Get recommendations
const recommendations = await getPersonalizedRecommendations({ limit: 10 });
```

## 📱 Component Usage

### Recommendation Feed

```typescript
import { RecommendationFeed } from '@/components/Recommendations';

<RecommendationFeed
  onListingPress={(listingId) => router.push(`/home/${listingId}`)}
  onViewAllPersonalized={() => router.push('/recommendations/personalized')}
  onViewAllTrending={() => router.push('/recommendations/trending')}
/>
```

### Listing Detail Recommendations

```typescript
import { ListingRecommendations } from '@/components/Recommendations';

<ListingRecommendations
  listingId={listing.id}
  onListingPress={(listingId) => router.push(`/home/${listingId}`)}
/>
```

### Enhanced Search

```typescript
import { EnhancedSearchBar } from '@/components/Search/EnhancedSearchBar';

<EnhancedSearchBar
  onSearch={(query, filters) => handleSearch(query, filters)}
  onSuggestionPress={(suggestion) => setQuery(suggestion)}
/>
```

## 🎯 Recommendation Types

### 1. Personalized Feed ("Recommended for You")

**Algorithm**: Combines user preferences, interaction history, and trending data
**Weighting**:
- User preferences: 40%
- Listing popularity: 30%
- Trending score: 20%
- Boost weight: 10%

```typescript
const recommendations = await getPersonalizedRecommendations({
  limit: 20,
  offset: 0
});
```

### 2. Trending Near You

**Algorithm**: Location-based trending with recency weighting
**Features**:
- Distance-based ranking
- Recent activity weighting (24h, 7d, 30d)
- Boost integration

```typescript
const trending = await getTrendingNearUser({
  userLocation: 'Accra, Ghana',
  limit: 20
});
```

### 3. Category-Based Recommendations

**Algorithm**: Similarity scoring based on category/subcategory matching
**Scoring**:
- Same subcategory: 3.0x
- Same category: 2.0x
- Boost multiplier applied

```typescript
const similar = await getCategoryRecommendations(listingId, {
  limit: 10
});
```

### 4. Recently Viewed

**Algorithm**: Reverse chronological order with view duration tracking
**Features**:
- Automatic cleanup of old views
- View duration tracking
- Quick access for users

```typescript
const recent = await getRecentlyViewed({
  limit: 20
});
```

### 5. Collaborative Filtering

**Algorithm**: "People who viewed this also viewed" pattern matching
**Features**:
- Co-interaction frequency scoring
- Boost integration
- Real-time updates

```typescript
const collaborative = await getCollaborativeRecommendations(listingId, {
  limit: 10
});
```

### 6. Boosted/Sponsored Listings

**Types**:
- `featured`: General featured listings
- `trending`: Trending boost
- `category_spotlight`: Category-specific boost
- `search_boost`: Search result boost

```typescript
const boosted = await getBoostedListings({
  boostType: 'featured',
  limit: 20
});
```

## 🔧 Integration Examples

### Home Screen Integration

```typescript
// app/(tabs)/home/index.tsx
import { RecommendationFeed } from '@/components/Recommendations';
import { useRecommendations } from '@/hooks/useRecommendations';

export default function HomeScreen() {
  const { trackInteraction } = useRecommendations();

  const handleListingPress = async (listingId: string) => {
    // Track view interaction
    await trackInteraction(listingId, 'view', {
      source: 'home',
      timeSpent: 0
    });
    
    // Navigate to listing
    router.push(`/home/${listingId}`);
  };

  return (
    <ScrollView>
      {/* Featured/Boosted Listings */}
      <RecommendationSection
        title="Featured Listings"
        type="boosted"
        boostType="featured"
        onListingPress={handleListingPress}
      />
      
      {/* Personalized Recommendations */}
      <RecommendationFeed
        onListingPress={handleListingPress}
      />
    </ScrollView>
  );
}
```

### Listing Detail Integration

```typescript
// app/(tabs)/home/[id].tsx
import { ListingRecommendations } from '@/components/Recommendations';
import { RecommendationService } from '@/lib/recommendationService';

export default function ListingDetailScreen() {
  const { user } = useAuthStore();
  const [listing, setListing] = useState(null);

  useEffect(() => {
    if (listing && user) {
      // Track view with metadata
      RecommendationService.trackView(user.id, listing.id, {
        source: 'listing_detail',
        timeSpent: 0
      });
    }
  }, [listing, user]);

  const handleFavorite = async () => {
    if (user && listing) {
      await RecommendationService.trackFavorite(user.id, listing.id, {
        source: 'listing_detail'
      });
    }
  };

  return (
    <ScrollView>
      {/* Listing content */}
      
      {/* Recommendations */}
      <ListingRecommendations
        listingId={listing.id}
        onListingPress={(id) => router.push(`/home/${id}`)}
      />
    </ScrollView>
  );
}
```

### Search Integration

```typescript
// app/(tabs)/search/index.tsx
import { EnhancedSearchBar } from '@/components/Search/EnhancedSearchBar';
import { RecommendationService } from '@/lib/recommendationService';

export default function SearchScreen() {
  const { user } = useAuthStore();

  const handleSearch = async (query: string, filters: Record<string, any>) => {
    // Record search history
    if (user) {
      await RecommendationService.recordSearch(
        user.id,
        query,
        filters,
        results.length
      );
    }
    
    // Perform search
    const results = await performSearch(query, filters);
    setSearchResults(results);
  };

  return (
    <View>
      <EnhancedSearchBar
        onSearch={handleSearch}
        onSuggestionPress={(suggestion) => setQuery(suggestion)}
      />
      
      {/* Search results */}
    </View>
  );
}
```

## 📊 Analytics and Monitoring

### User Interaction Tracking

```typescript
// Track different types of interactions
await RecommendationService.trackView(userId, listingId, {
  source: 'home',
  timeSpent: 30,
  deviceType: 'mobile'
});

await RecommendationService.trackFavorite(userId, listingId, {
  source: 'listing_detail'
});

await RecommendationService.trackOffer(userId, listingId, {
  source: 'chat',
  offerAmount: 500
});
```

### Analytics Dashboard

```typescript
// Get recommendation analytics
const analytics = await RecommendationService.getRecommendationAnalytics();

console.log('Total interactions:', analytics.data.totalInteractions);
console.log('Total searches:', analytics.data.totalSearches);
console.log('Popular categories:', analytics.data.popularCategories);
console.log('Trending listings:', analytics.data.trendingListings);
```

## 🎨 Customization

### Custom Recommendation Sections

```typescript
<RecommendationSection
  title="Custom Section"
  subtitle="Based on your preferences"
  icon={<CustomIcon />}
  type="personalized"
  limit={8}
  showViewAll={true}
  onViewAll={() => router.push('/custom-recommendations')}
  onListingPress={handleListingPress}
/>
```

### Custom Styling

```typescript
<RecommendationFeed
  style={{
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg
  }}
  onListingPress={handleListingPress}
/>
```

## 🔒 Privacy and Data Management

### Clear User Data

```typescript
// Clear recently viewed items
await RecommendationService.clearRecentlyViewed(userId);

// Clear search history
await RecommendationService.clearSearchHistory(userId);
```

### Data Export

```typescript
// Get user's interaction history
const interactions = await RecommendationService.getUserInteractions(userId);

// Get user's preferences
const preferences = await RecommendationService.getUserPreferences(userId);
```

## 🚀 Performance Optimization

### Caching Strategy

The system uses several caching mechanisms:

1. **Listing Popularity**: Cached scores updated periodically
2. **User Preferences**: Calculated and cached based on interactions
3. **Co-interactions**: Pre-calculated and updated in real-time
4. **Recently Viewed**: In-memory cache with database persistence

### Database Optimization

- Indexed columns for fast queries
- Partitioned tables for large datasets
- Materialized views for complex aggregations
- Connection pooling for high concurrency

## 📈 Scaling Considerations

### Horizontal Scaling

- Database read replicas for recommendation queries
- Redis caching for frequently accessed data
- CDN for static recommendation assets
- Load balancing for API endpoints

### Data Volume Management

- Automated cleanup of old interactions
- Archiving of historical data
- Compression of large datasets
- Partitioning by date ranges

## 🧪 Testing

### Unit Tests

```typescript
// Test recommendation functions
describe('RecommendationService', () => {
  it('should track user interactions', async () => {
    const result = await RecommendationService.trackView(
      'user-id',
      'listing-id',
      { source: 'test' }
    );
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

```typescript
// Test recommendation components
describe('RecommendationFeed', () => {
  it('should render personalized recommendations', () => {
    render(<RecommendationFeed />);
    expect(screen.getByText('Recommended for You')).toBeInTheDocument();
  });
});
```

## 🔧 Maintenance

### Regular Tasks

1. **Database Cleanup**: Remove old interactions and search history
2. **Score Recalculation**: Update popularity and trending scores
3. **Performance Monitoring**: Monitor query performance and optimize
4. **A/B Testing**: Test different recommendation algorithms

### Monitoring

- Track recommendation click-through rates
- Monitor user engagement metrics
- Analyze search success rates
- Measure conversion rates from recommendations

## 📚 API Reference

### Hooks

- `useRecommendations()`: Main recommendation hook
- `trackInteraction()`: Track user interactions
- `getPersonalizedRecommendations()`: Get personalized feed
- `getTrendingNearUser()`: Get trending items
- `getCategoryRecommendations()`: Get category-based suggestions
- `getRecentlyViewed()`: Get recently viewed items
- `getCollaborativeRecommendations()`: Get collaborative filtering
- `getBoostedListings()`: Get sponsored content

### Components

- `RecommendationFeed`: Complete recommendation feed
- `RecommendationSection`: Individual recommendation section
- `ListingRecommendations`: Listing detail recommendations
- `EnhancedSearchBar`: Search with suggestions

### Services

- `RecommendationService`: Core recommendation service
- `trackInteraction()`: Track user interactions
- `recordSearch()`: Record search history
- `getAnalytics()`: Get recommendation analytics

This comprehensive system provides a robust foundation for personalized recommendations, trending content, and enhanced user experience in your mobile marketplace app.
