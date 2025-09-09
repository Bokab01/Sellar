# Business Plan Developer Guide

## Quick Reference for Developers

This guide provides essential information for developers working with Sellar Business Plan features.

## Table of Contents

1. [Quick Setup](#quick-setup)
2. [Core Hooks & Services](#core-hooks--services)
3. [Component Usage](#component-usage)
4. [Database Queries](#database-queries)
5. [Feature Gating](#feature-gating)
6. [Testing](#testing)

---

## Quick Setup

### Check if User is Business User
```typescript
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';

function MyComponent() {
  const { isBusinessUser, loading } = useBusinessFeatures();
  
  if (loading) return <LoadingSkeleton />;
  
  return (
    <div>
      {isBusinessUser ? (
        <BusinessFeature />
      ) : (
        <UpgradePrompt />
      )}
    </div>
  );
}
```

### Apply Premium Styling
```typescript
import { usePremiumBranding } from '@/lib/premiumBrandingService';

function ProductCard({ listing, seller }) {
  const { getCardStyles, getBadgeConfig } = usePremiumBranding();
  
  const cardStyles = getCardStyles();
  const badgeConfig = getBadgeConfig();
  
  return (
    <View style={cardStyles}>
      {badgeConfig && <BusinessBadge {...badgeConfig} />}
      {/* Card content */}
    </View>
  );
}
```

---

## Core Hooks & Services

### useBusinessFeatures Hook
```typescript
const {
  isBusinessUser,           // boolean: Has active business subscription
  hasAnalytics,            // boolean: Can access analytics dashboard
  hasAutoBoost,            // boolean: Can use auto-boost features
  hasPrioritySupport,      // boolean: Gets priority support
  hasUnlimitedListings,    // boolean: No listing limits
  hasHomepagePlacement,    // boolean: Featured in homepage
  hasPremiumBranding,      // boolean: Gets premium styling
  hasSponsoredPosts,       // boolean: Can create sponsored posts
  hasBulkOperations,       // boolean: Can use bulk tools
  loading                  // boolean: Loading state
} = useBusinessFeatures();
```

### useAnalytics Hook
```typescript
const {
  getQuickStats,           // Function: Get dashboard quick stats
  getBusinessAnalytics,    // Function: Get comprehensive analytics
  loading,                 // boolean: Loading state
  error                    // string | null: Error message
} = useAnalytics();

// Usage
const quickStats = await getQuickStats();
const analytics = await getBusinessAnalytics();
```

### usePremiumBranding Hook
```typescript
const {
  isBusinessUser,          // boolean: Business user status
  getCardStyles,           // Function: Get premium card styling
  getBadgeConfig,          // Function: Get business badge config
  getRibbonStyles,         // Function: Get ribbon banner styles
  getSellerStyles,         // Function: Get enhanced seller styling
  getPriorityIndicator,    // Function: Get priority indicator
  getImageStyles,          // Function: Get premium image styling
  getUserProfile           // Function: Get business user profile
} = usePremiumBranding();
```

---

## Component Usage

### Business Badges
```typescript
import { BusinessBadge, BusinessBadges } from '@/components';

// Single badge
<BusinessBadge 
  type="business" 
  size="medium" 
  variant="default" 
/>

// Multiple badges
<BusinessBadges 
  badges={['business', 'priority_seller', 'premium']}
  size="small"
  variant="compact"
  maxVisible={3}
/>
```

### Premium Product Card
```typescript
import { PremiumProductCard } from '@/components';

<PremiumProductCard
  image={listing.images}
  title={listing.title}
  price={listing.price}
  seller={{
    ...listing.seller,
    isBusinessUser: true
  }}
  isBoosted={listing.isBoosted}
  isSponsored={listing.isSponsored}
  isPriority={listing.isPriority}
  onPress={() => handleListingPress(listing.id)}
/>
```

### Featured Listings
```typescript
import { FeaturedListings } from '@/components';

<FeaturedListings
  maxItems={6}
  layout="horizontal"
  onViewAll={() => router.push('/business-listings')}
/>
```

### Sponsored Posts
```typescript
import { SponsoredPost, SponsoredPostManager } from '@/components';

// Display sponsored post
<SponsoredPost
  id={post.id}
  content={post.content}
  author={post.author}
  engagement={post.engagement}
  sponsorship={post.sponsorship}
  onLike={handleLike}
  onComment={handleComment}
  onShare={handleShare}
/>

// Manage sponsored post
<SponsoredPostManager
  postId={post.id}
  onClose={handleClose}
  onSuccess={handleSuccess}
/>
```

---

## Database Queries

### Check Business Subscription
```sql
-- Check if user has active business subscription
SELECT EXISTS(
  SELECT 1 FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = $1 
    AND us.status = 'active'
    AND sp.name = 'Sellar Business'
) as is_business_user;
```

### Get Business Analytics Data
```sql
-- Get user's listing analytics
SELECT 
  COUNT(*) as total_listings,
  SUM(view_count) as total_views,
  AVG(view_count) as avg_views_per_listing
FROM listings 
WHERE user_id = $1 AND status = 'active';
```

### Get Featured Listings
```sql
-- Get business user listings for featured section
SELECT l.*, p.first_name, p.last_name, p.avatar_url
FROM listings l
JOIN profiles p ON l.user_id = p.id
JOIN user_subscriptions us ON l.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE l.status = 'active'
  AND us.status = 'active'
  AND sp.name = 'Sellar Business'
ORDER BY l.created_at DESC
LIMIT $1;
```

---

## Feature Gating

### Component-Level Gating
```typescript
function BusinessOnlyFeature() {
  const { isBusinessUser } = useBusinessFeatures();
  
  if (!isBusinessUser) {
    return (
      <UpgradePrompt 
        title="Business Plan Required"
        description="This feature is available for Sellar Business subscribers."
        onUpgrade={() => router.push('/subscription-plans')}
      />
    );
  }
  
  return <ActualFeature />;
}
```

### Hook-Level Gating
```typescript
function useBusinessOnlyFeature() {
  const { isBusinessUser } = useBusinessFeatures();
  
  const performBusinessAction = useCallback(async () => {
    if (!isBusinessUser) {
      throw new Error('Business plan required');
    }
    
    // Perform action
  }, [isBusinessUser]);
  
  return { performBusinessAction, isBusinessUser };
}
```

### Route-Level Gating
```typescript
// In your route component
export default function BusinessDashboard() {
  const { isBusinessUser, loading } = useBusinessFeatures();
  
  if (loading) return <LoadingSkeleton />;
  
  if (!isBusinessUser) {
    return <Redirect href="/subscription-plans" />;
  }
  
  return <DashboardContent />;
}
```

---

## Testing

### Mock Business User
```typescript
// In your test setup
const mockBusinessFeatures = {
  isBusinessUser: true,
  hasAnalytics: true,
  hasAutoBoost: true,
  hasPrioritySupport: true,
  hasUnlimitedListings: true,
  hasHomepagePlacement: true,
  hasPremiumBranding: true,
  hasSponsoredPosts: true,
  hasBulkOperations: true,
  loading: false
};

jest.mock('@/hooks/useBusinessFeatures', () => ({
  useBusinessFeatures: () => mockBusinessFeatures
}));
```

### Test Premium Styling
```typescript
import { render } from '@testing-library/react-native';
import { PremiumProductCard } from '@/components';

test('applies premium styling for business users', () => {
  const { getByTestId } = render(
    <PremiumProductCard
      seller={{ isBusinessUser: true }}
      // ... other props
    />
  );
  
  const card = getByTestId('product-card');
  expect(card).toHaveStyle({
    borderWidth: 2,
    shadowOpacity: 0.3
  });
});
```

### Test Feature Gating
```typescript
test('shows upgrade prompt for non-business users', () => {
  // Mock non-business user
  jest.mocked(useBusinessFeatures).mockReturnValue({
    isBusinessUser: false,
    loading: false,
    // ... other features as false
  });
  
  const { getByText } = render(<BusinessOnlyComponent />);
  expect(getByText('Business Plan Required')).toBeTruthy();
});
```

---

## Common Patterns

### Conditional Rendering
```typescript
// Pattern 1: Simple conditional
{isBusinessUser && <BusinessFeature />}

// Pattern 2: With fallback
{isBusinessUser ? <BusinessFeature /> : <UpgradePrompt />}

// Pattern 3: Multiple conditions
{isBusinessUser && hasAnalytics && <AnalyticsDashboard />}
```

### Premium Styling Application
```typescript
// Pattern 1: Direct style application
const cardStyle = [
  baseStyles,
  isBusinessUser && premiumStyles
];

// Pattern 2: Using premium branding service
const { getCardStyles } = usePremiumBranding();
const cardStyle = getCardStyles();

// Pattern 3: Conditional style objects
const cardStyle = {
  ...baseStyles,
  ...(isBusinessUser && {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowOpacity: 0.3
  })
};
```

### Error Handling
```typescript
try {
  const analytics = await getBusinessAnalytics();
  setAnalyticsData(analytics);
} catch (error) {
  if (error.message.includes('Business plan required')) {
    // Show upgrade prompt
    setShowUpgradeModal(true);
  } else {
    // Handle other errors
    setError('Failed to load analytics');
  }
}
```

---

## Performance Tips

### Lazy Loading Business Features
```typescript
const BusinessDashboard = lazy(() => import('./BusinessDashboard'));

function App() {
  const { isBusinessUser } = useBusinessFeatures();
  
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      {isBusinessUser && <BusinessDashboard />}
    </Suspense>
  );
}
```

### Memoized Premium Styles
```typescript
const premiumStyles = useMemo(() => {
  if (!isBusinessUser) return {};
  
  return premiumBrandingService.getPremiumCardStyles(isBusinessUser, theme);
}, [isBusinessUser, theme]);
```

### Optimized Feature Checks
```typescript
// Cache business status to avoid repeated API calls
const { isBusinessUser } = useBusinessFeatures();

// Use the cached value throughout component lifecycle
const handleAction = useCallback(() => {
  if (isBusinessUser) {
    // Perform business action
  }
}, [isBusinessUser]);
```

---

## Debugging

### Common Issues

1. **Business features not showing**: Check subscription status in database
2. **Premium styling not applied**: Verify `isBusinessUser` is true
3. **Analytics not loading**: Check user has active listings and data
4. **Auto-boost not working**: Verify credit balance and settings

### Debug Helpers
```typescript
// Add to component for debugging
console.log('Business Features:', {
  isBusinessUser,
  hasAnalytics,
  hasAutoBoost,
  // ... other features
});

// Check subscription in database
const debugSubscription = async (userId) => {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', userId)
    .eq('status', 'active');
  
  console.log('User subscription:', data);
};
```

---

*Last Updated: December 2024*  
*For technical support: tech-support@sellar.app*
