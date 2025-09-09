# Sellar Business Plan Documentation

## Overview

The **Sellar Business Plan** is a comprehensive subscription service designed for serious sellers who want to maximize their success on the Sellar marketplace. For **GHS 400/month**, business subscribers get access to premium features, enhanced visibility, and professional tools that drive more sales and build stronger customer relationships.

## Table of Contents

1. [Plan Overview](#plan-overview)
2. [Features & Benefits](#features--benefits)
3. [Visual Differentiation](#visual-differentiation)
4. [Analytics & Insights](#analytics--insights)
5. [Marketing Tools](#marketing-tools)
6. [Support & Services](#support--services)
7. [Technical Implementation](#technical-implementation)
8. [User Guide](#user-guide)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## Plan Overview

### Pricing & Billing
- **Price**: GHS 400 per month
- **Billing Cycle**: Monthly recurring
- **Currency**: Ghana Cedis (GHS)
- **Payment Methods**: Mobile Money, Bank Transfer, Card Payment

### Key Value Proposition
Transform your selling experience with professional tools, premium visibility, and comprehensive analytics that help you grow your business on Sellar.

### Target Audience
- Professional sellers and businesses
- High-volume marketplace participants
- Sellers seeking premium brand positioning
- Users wanting detailed business insights

---

## Features & Benefits

### 🎯 **Core Features**

#### **1. Unlimited Listings**
- **What**: No limit on the number of items you can list
- **Benefit**: Scale your business without restrictions
- **Free Plan Limit**: 5 listings maximum

#### **2. Monthly Boost Credits (120)**
- **What**: 120 credits automatically added each month
- **Usage**: 15 credits per 3-day listing boost
- **Benefit**: Up to 8 listing boosts per month
- **Auto-renewal**: Credits refresh monthly

#### **3. Auto-Boost System**
- **What**: Automatically boost your listings for maximum visibility
- **Duration**: 3-day boost periods
- **Management**: Smart scheduling and budget control
- **ROI Tracking**: Performance analytics for each boost

#### **4. Comprehensive Analytics**
- **Dashboard**: Professional business analytics interface
- **Metrics**: Views, conversion rates, engagement, revenue
- **Insights**: Top-performing listings and optimization suggestions
- **Reporting**: Weekly and monthly performance summaries

#### **5. Priority Support**
- **Response Time**: 2-hour response guarantee
- **Channels**: Dedicated business support line
- **Account Manager**: Personal business relationship manager
- **Priority Queue**: Skip regular support queues

### 🌟 **Premium Features**

#### **6. Homepage Placement**
- **Featured Section**: Dedicated space on homepage
- **Priority Positioning**: Appear before regular listings
- **Enhanced Visibility**: Reach more potential customers
- **Premium Showcase**: Horizontal scrolling featured area

#### **7. Premium Branding**
- **Visual Differentiation**: Enhanced listing card styling
- **Business Badges**: Professional identification across app
- **Gradient Borders**: Subtle premium visual effects
- **Priority Indicators**: Top-of-card placement bars

#### **8. Sponsored Posts**
- **Community Promotion**: Promote posts in community feed
- **Budget Control**: Flexible promotion budgets (GHS 25-200)
- **Targeting**: Reach specific audience segments
- **Performance Tracking**: Impressions, clicks, engagement

#### **9. Bulk Operations**
- **Mass Listing Management**: Edit multiple listings at once
- **Batch Price Updates**: Update prices across categories
- **Inventory Sync**: Bulk inventory management tools
- **Export/Import**: CSV-based listing management

---

## Visual Differentiation

### Business User Identification

#### **Business Badges**
Business users are identified throughout the app with professional badges:

```typescript
// Badge Types Available
- 'business'        // Primary business identifier
- 'priority_seller' // High-performance seller
- 'premium'         // Premium service provider
- 'verified'        // Verified business account
- 'boosted'         // Currently boosted listing
```

#### **Badge Variants**
```typescript
// Display Options
- 'default'   // Full badge with border and shadow
- 'compact'   // Smaller badge with background
- 'minimal'   // Icon and text only
```

### Enhanced Listing Cards

#### **Premium Styling Features**
- **Gradient Borders**: Subtle color gradients around listing cards
- **Enhanced Shadows**: Professional depth and elevation effects
- **Priority Indicators**: Colored bars at top of premium listings
- **Business Seller Info**: Enhanced seller section with business branding

#### **Premium Indicators**
```typescript
// Available Indicators
- isBoosted: boolean    // Shows "BOOSTED" badge with lightning icon
- isSponsored: boolean  // Shows "SPONSORED" badge with star icon
- isPriority: boolean   // Shows "PRIORITY" badge with crown icon
```

### Homepage Featured Section

#### **Featured Listings Display**
- **Location**: Between categories and regular listings
- **Layout**: Horizontal scrolling showcase
- **Content**: Business user listings only
- **Styling**: Premium card styling with enhanced visibility

---

## Analytics & Insights

### Dashboard Overview

#### **Quick Stats**
- **Profile Views**: Total profile page visits
- **Total Messages**: Messages received from buyers
- **Total Reviews**: Customer reviews and ratings
- **Average Rating**: Overall seller rating

#### **Business Analytics**
- **Total Views**: Cumulative listing views
- **Weekly Trends**: This week vs last week performance
- **Conversion Rate**: Views to messages ratio
- **Active Listings**: Currently published listings count

#### **Top Performing Listings**
- **Performance Metrics**: Views, messages, offers per listing
- **Ranking**: Sorted by engagement and conversion
- **Insights**: Identify your best-performing products

### Analytics Implementation

```typescript
// Analytics Service Usage
const { getQuickStats, getBusinessAnalytics } = useAnalytics();

// Quick Stats Structure
interface QuickStats {
  profileViews: number;
  totalMessages: number;
  totalReviews: number;
  averageRating: number;
}

// Business Analytics Structure
interface AnalyticsData {
  totalViews: number;
  viewsThisWeek: number;
  viewsLastWeek: number;
  totalMessages: number;
  totalOffers: number;
  conversionRate: number;
  activeListings: number;
  topPerformingListings: TopListing[];
}
```

---

## Marketing Tools

### Auto-Boost Management

#### **Boost Configuration**
- **Duration**: 3 days per boost
- **Credits**: 15 credits per boost
- **Monthly Limit**: 8 boosts (120 credits ÷ 15)
- **Scheduling**: Automatic or manual boost timing

#### **Boost Performance Tracking**
```typescript
interface AutoBoostSettings {
  enabled: boolean;
  boostDuration: number;        // 3 days
  maxBoostsPerMonth: number;    // 8 boosts
  boostCreditsUsed: number;     // Current month usage
  activeBoosts: ActiveBoost[];  // Currently boosted listings
}
```

### Sponsored Posts System

#### **Post Promotion**
- **Budget Range**: GHS 25 - GHS 200 per campaign
- **Duration Options**: 3, 7, 14, or 30 days
- **Estimated Reach**: Budget × Duration × 10-25 people
- **Performance Metrics**: Impressions, clicks, engagement

#### **Sponsored Post Features**
- **Enhanced Styling**: Premium post appearance with sponsored badge
- **Listing Integration**: Direct promotion of specific products
- **Engagement Tracking**: Likes, comments, shares, views
- **Budget Management**: Real-time spend tracking and controls

---

## Support & Services

### Priority Support

#### **Response Times**
- **Business Users**: 2-hour response guarantee
- **Support Channels**: Dedicated business support line
- **Operating Hours**: 24/7 for critical issues, 8AM-8PM for general support

#### **Account Management**
- **Dedicated Manager**: Personal business relationship manager
- **Monthly Check-ins**: Performance reviews and optimization suggestions
- **Growth Consulting**: Business development advice and strategies

#### **Support Features**
```typescript
interface SupportTicket {
  ticketNumber: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'high' | 'medium' | 'low';
  responseTime: string;
}
```

---

## Technical Implementation

### Business Feature Detection

#### **useBusinessFeatures Hook**
```typescript
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';

const {
  isBusinessUser,
  hasAnalytics,
  hasAutoBoost,
  hasPrioritySupport,
  hasUnlimitedListings,
  hasHomepagePlacement,
  hasPremiumBranding,
  hasSponsoredPosts,
  hasBulkOperations,
  loading
} = useBusinessFeatures();
```

#### **Premium Branding Service**
```typescript
import { usePremiumBranding } from '@/lib/premiumBrandingService';

const {
  isBusinessUser,
  getCardStyles,
  getBadgeConfig,
  getRibbonStyles,
  getSellerStyles,
  getPriorityIndicator,
  getImageStyles,
  getUserProfile
} = usePremiumBranding();
```

### Database Schema

#### **Subscription Plans Table**
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    billing_cycle TEXT DEFAULT 'monthly',
    features JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **User Subscriptions Table**
```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT DEFAULT 'active',
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Feature Entitlements

#### **Business Entitlements Function**
```sql
CREATE FUNCTION get_user_business_entitlements(user_id_param UUID)
RETURNS TABLE (
    is_business_user BOOLEAN,
    max_listings INTEGER,
    monthly_credits INTEGER,
    has_analytics BOOLEAN,
    has_auto_boost BOOLEAN,
    has_priority_support BOOLEAN,
    has_homepage_placement BOOLEAN,
    has_premium_branding BOOLEAN,
    has_sponsored_posts BOOLEAN,
    has_bulk_operations BOOLEAN
)
```

---

## User Guide

### Getting Started

#### **1. Subscribe to Business Plan**
1. Navigate to **More Tab** → **Wallet** → **Business Plan**
2. Review plan features and pricing
3. Tap **Subscribe Now** (GHS 400/month)
4. Complete payment via Mobile Money or Card
5. Instant activation upon successful payment

#### **2. Access Business Dashboard**
1. Go to **More Tab** → **Dashboard**
2. View your business analytics and performance
3. Explore available tabs:
   - **Overview**: Quick stats and analytics overview
   - **Analytics**: Comprehensive business insights
   - **Auto-boost**: Manage listing boosts
   - **Priority Support**: Access support services
   - **Business Features**: Manage premium features

#### **3. Optimize Your Listings**
1. **Premium Styling**: Your listings automatically get premium appearance
2. **Business Badges**: Your profile shows business badges
3. **Featured Placement**: Listings appear in homepage featured section
4. **Auto-boost**: Enable automatic listing promotion

### Using Key Features

#### **Auto-Boost Management**
1. **Enable Auto-boost**: Dashboard → Auto-boost → Toggle ON
2. **Set Preferences**: Choose which listings to auto-boost
3. **Monitor Usage**: Track credit consumption and performance
4. **Optimize Timing**: Schedule boosts for peak hours

#### **Analytics Dashboard**
1. **View Performance**: Monitor views, conversion rates, engagement
2. **Track Trends**: Compare weekly and monthly performance
3. **Identify Top Listings**: See which products perform best
4. **Export Data**: Download reports for external analysis

#### **Sponsored Posts**
1. **Create Post**: Community → Create Post → Add content
2. **Promote Post**: Tap "Promote" → Set budget and duration
3. **Monitor Performance**: Track impressions and engagement
4. **Optimize Content**: Use insights to improve future posts

#### **Priority Support**
1. **Access Support**: Dashboard → Priority Support
2. **Create Ticket**: Describe your issue or question
3. **Fast Response**: Receive reply within 2 hours
4. **Account Manager**: Schedule calls with your dedicated manager

---

## API Reference

### Business Features API

#### **Check Business Status**
```typescript
// Check if user has active business subscription
const isBusinessUser = await subscriptionEntitlements.isBusinessUser(userId);

// Get comprehensive business features
const features = await subscriptionEntitlements.getBusinessFeatures(userId);
```

#### **Analytics API**
```typescript
// Get quick stats for dashboard
const quickStats = await analyticsService.getQuickStats();

// Get comprehensive business analytics
const analytics = await analyticsService.getBusinessAnalytics();
```

#### **Auto-boost API**
```typescript
// Get auto-boost settings
const settings = await autoBoostService.getSettings(userId);

// Enable/disable auto-boost
await autoBoostService.updateSettings(userId, { enabled: true });

// Get active boosts
const activeBoosts = await autoBoostService.getActiveBoosts(userId);
```

### Premium Branding API

#### **Get Premium Styling**
```typescript
// Get premium card styles for business user
const cardStyles = premiumBrandingService.getPremiumCardStyles(isBusinessUser, theme);

// Get business badge configuration
const badgeConfig = premiumBrandingService.getPremiumBadgeConfig(isBusinessUser, theme);

// Get enhanced seller styling
const sellerStyles = premiumBrandingService.getPremiumSellerStyles(isBusinessUser, theme);
```

---

## Troubleshooting

### Common Issues

#### **Subscription Not Activating**
**Problem**: Business features not available after payment
**Solutions**:
1. Check payment status in wallet
2. Refresh app and check dashboard
3. Contact priority support if issue persists
4. Verify payment method and retry

#### **Analytics Not Loading**
**Problem**: Dashboard shows no analytics data
**Solutions**:
1. Ensure you have active listings
2. Wait 24-48 hours for data collection
3. Check internet connection
4. Clear app cache and restart

#### **Auto-boost Not Working**
**Problem**: Listings not getting automatically boosted
**Solutions**:
1. Verify auto-boost is enabled in dashboard
2. Check available credit balance (need 15+ credits)
3. Ensure listings are active and published
4. Review auto-boost settings and preferences

#### **Premium Styling Not Showing**
**Problem**: Listings don't have premium appearance
**Solutions**:
1. Confirm business subscription is active
2. Force refresh the listings page
3. Check if seller profile is marked as business user
4. Contact support if styling issues persist

### Support Contacts

#### **Business Support**
- **Email**: business-support@sellar.app
- **Phone**: +233 XXX XXX XXX
- **Hours**: 24/7 for critical issues, 8AM-8PM for general support
- **Response Time**: 2 hours guaranteed for business users

#### **Technical Support**
- **Email**: tech-support@sellar.app
- **Developer Portal**: docs.sellar.app
- **API Issues**: api-support@sellar.app

---

## Appendix

### Feature Comparison

| Feature | Free Plan | Business Plan |
|---------|-----------|---------------|
| **Listings** | 5 maximum | Unlimited |
| **Boost Credits** | Pay per use | 120 monthly |
| **Analytics** | Basic views | Comprehensive dashboard |
| **Support** | Standard (24-48h) | Priority (2h guarantee) |
| **Branding** | Standard styling | Premium visual effects |
| **Homepage** | Regular placement | Featured section |
| **Community** | Standard posts | Sponsored posts |
| **Bulk Operations** | ❌ | ✅ |
| **Account Manager** | ❌ | ✅ |
| **Auto-boost** | ❌ | ✅ |

### Migration Guide

#### **Upgrading from Free to Business**
1. **Immediate Benefits**: Premium styling, business badges, featured placement
2. **Credit Allocation**: 120 boost credits added to account
3. **Dashboard Access**: Full analytics and management tools unlocked
4. **Support Upgrade**: Priority support queue activation
5. **Data Migration**: Historical data enhanced with business insights

#### **Downgrading from Business to Free**
1. **Feature Loss**: Premium features disabled immediately
2. **Credit Handling**: Unused credits remain until expiration
3. **Data Retention**: Analytics data preserved but not accessible
4. **Listing Limits**: Excess listings marked as inactive
5. **Support Change**: Return to standard support queue

---

## Changelog

### Version 1.0.0 (Current)
- **Initial Release**: Unified business plan launch
- **Premium Branding**: Enhanced visual differentiation system
- **Homepage Placement**: Featured listings section
- **Sponsored Posts**: Community promotion tools
- **Analytics Dashboard**: Comprehensive business insights
- **Auto-boost System**: Automated listing promotion
- **Priority Support**: Dedicated business support services

### Planned Updates

#### **Version 1.1.0** (Coming Soon)
- **Advanced Analytics**: Revenue tracking and profit analysis
- **A/B Testing**: Listing optimization tools
- **Inventory Management**: Stock tracking and alerts
- **Multi-channel Integration**: Cross-platform selling tools

#### **Version 1.2.0** (Future)
- **API Access**: Developer tools for business integrations
- **White-label Options**: Custom branding for large businesses
- **Advanced Automation**: Smart pricing and inventory management
- **Enterprise Features**: Team management and role-based access

---

*Last Updated: December 2024*  
*Version: 1.0.0*  
*Contact: business-support@sellar.app*
