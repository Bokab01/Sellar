# 🔄 Admin Dashboard Schema Migration Plan

## 📋 Executive Summary

This document outlines the systematic migration of the Sellar Admin Dashboard from the old schema to the new mobile app schema. The migration involves updating database connections, modifying data models, updating API endpoints, and ensuring all moderation features work with the new schema structure.

## 🎯 Migration Objectives

- **Maintain Functionality**: Preserve all existing moderation capabilities
- **Adapt to New Schema**: Update all references to work with new table structures
- **Enhance Features**: Add support for new mobile app features
- **Ensure Compatibility**: Maintain backward compatibility where possible
- **Improve Performance**: Optimize queries for the new schema

## 📊 Schema Comparison Analysis

### 🔍 Key Differences Overview

| Category | Old Schema Tables | New Schema Tables | Status |
|----------|------------------|-------------------|---------|
| **Core Tables** | 124 tables | 70 tables | ✅ Simplified |
| **User Management** | profiles, user_* (15 tables) | profiles, user_* (8 tables) | 🔄 Consolidated |
| **Content Moderation** | 8 moderation tables | 4 moderation tables | 🔄 Streamlined |
| **Messaging** | chat_messages, chats, conversations | messages, conversations | 🔄 Simplified |
| **Analytics** | 12 analytics tables | 0 dedicated tables | ❌ Removed |
| **Business Features** | 8 business tables | 3 business tables | 🔄 Reduced |

### 📋 Detailed Table Mapping

#### ✅ Direct Mappings (Same Structure)
```
Old Schema → New Schema
├── categories → categories (✅ Compatible)
├── favorites → favorites (✅ Compatible)
├── comment_likes → comment_likes (✅ Compatible)
├── community_rewards → community_rewards (✅ Compatible)
├── credit_purchases → credit_purchases (🔄 Modified)
├── credit_transactions → credit_transactions (🔄 Modified)
├── user_credits → user_credits (🔄 Modified)
└── notifications → notifications (🔄 Modified)
```

#### 🔄 Modified Mappings (Structure Changes)
```
Old Schema → New Schema (Changes Required)
├── profiles → profiles (🔄 Major changes in columns)
├── listings → listings (🔄 Significant restructuring)
├── conversations → conversations (🔄 Participant structure changed)
├── chat_messages → messages (🔄 Table renamed, structure changed)
├── reviews → reviews (🔄 Column changes)
├── offers → offers (🔄 Structure modified)
├── posts → posts (🔄 Simplified structure)
├── support_tickets → support_tickets (🔄 Enhanced structure)
└── reports → reports (🔄 Consolidated reporting)
```

#### ❌ Removed Tables (No Equivalent)
```
Tables Removed in New Schema:
├── admin_audit_logs ❌
├── admin_flagged_conversations ❌
├── admin_flagged_messages ❌
├── admin_settings ❌
├── analytics_* (12 tables) ❌
├── business_seller_status ❌
├── business_subscriber_activity ❌
├── boost_tracking ❌
├── monetization_* (6 tables) ❌
├── paystack_* (4 tables) ❌
└── subscription_* (2 tables) ❌
```

#### ➕ New Tables (Added in New Schema)
```
New Tables to Support:
├── app_settings ➕
├── business_categories ➕
├── business_hours ➕
├── callback_requests ➕
├── consent_history ➕
├── data_breach_incidents ➕
├── data_deletion_requests ➕
├── data_export_requests ➕
├── data_processing_logs ➕
├── device_tokens ➕
├── faq_categories ➕
├── faq_items ➕
├── hashtags ➕
├── kb_articles ➕
├── plan_entitlements ➕
├── user_privacy_settings ➕
└── verification_* (4 tables) ➕
```

## 🛠️ Migration Implementation Plan

### Phase 1: Database Connection & Core Models (Week 1)

#### 1.1 Update Database Configuration
```typescript
// lib/database/config.ts
export const DATABASE_CONFIG = {
  host: process.env.SUPABASE_URL,
  apiKey: process.env.SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  schema: 'public'
};

// Update connection to use new Supabase credentials
```

#### 1.2 Core Model Updates

**User/Profile Model Updates**
```typescript
// models/User.ts - OLD STRUCTURE
interface OldProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  bio?: string;
  rating?: number;
  total_reviews: number;
  is_verified: boolean;
  membership_tier?: string;
  // ... 40+ more fields
}

// models/User.ts - NEW STRUCTURE
interface NewProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  location?: string;
  bio?: string;
  rating?: number;
  total_sales: number;
  total_reviews: number;
  credit_balance?: number;
  is_verified: boolean;
  is_online: boolean;
  last_seen?: string;
  response_time?: string;
  // ... business fields
  account_type?: string;
  business_name?: string;
  verification_status?: string;
  phone_visibility?: string;
  // ... verification fields
}

// Migration mapping function
export function mapOldProfileToNew(oldProfile: OldProfile): NewProfile {
  const [firstName, ...lastNameParts] = (oldProfile.full_name || '').split(' ');
  
  return {
    id: oldProfile.id,
    first_name: firstName || '',
    last_name: lastNameParts.join(' ') || '',
    phone: oldProfile.phone,
    avatar_url: oldProfile.avatar_url,
    location: oldProfile.location,
    bio: oldProfile.bio,
    rating: oldProfile.rating,
    total_reviews: oldProfile.total_reviews,
    is_verified: oldProfile.is_verified,
    // Map other fields with defaults
    total_sales: 0,
    credit_balance: 0,
    is_online: false,
    response_time: 'within hours',
    account_type: 'individual',
    verification_status: oldProfile.is_verified ? 'verified' : 'unverified',
    phone_visibility: 'contacts_only'
  };
}
```

**Listing Model Updates**
```typescript
// models/Listing.ts - OLD STRUCTURE
interface OldListing {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: string;
  location_id?: string;
  status: string;
  is_featured: boolean;
  view_count: number;
  favorite_count: number;
  // ... 50+ more fields
}

// models/Listing.ts - NEW STRUCTURE
interface NewListing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category_id: string;
  condition: string;
  quantity: number;
  location: string;
  images: any; // JSONB
  accept_offers: boolean;
  status: string;
  views: number;
  featured: boolean;
  featured_until?: string;
  boost_level: number;
  boost_until?: string;
  metadata: any; // JSONB
  category_attributes?: any; // JSONB
  seo_title?: string;
  keywords?: string[];
}

// Migration mapping function
export function mapOldListingToNew(oldListing: OldListing): NewListing {
  return {
    id: oldListing.id,
    user_id: oldListing.user_id,
    title: oldListing.title,
    description: oldListing.description,
    price: oldListing.price,
    currency: oldListing.currency || 'GHS',
    category_id: oldListing.category_id,
    condition: oldListing.condition,
    quantity: 1, // Default
    location: oldListing.location || '',
    images: [], // Will need to fetch from listing_images table
    accept_offers: oldListing.is_negotiable || false,
    status: oldListing.status,
    views: oldListing.view_count || 0,
    featured: oldListing.is_featured || false,
    featured_until: oldListing.featured_until,
    boost_level: oldListing.is_boosted ? 1 : 0,
    boost_until: oldListing.boosted_until,
    metadata: {},
    category_attributes: null,
    seo_title: null,
    keywords: []
  };
}
```

#### 1.3 Conversation/Message Model Updates
```typescript
// models/Conversation.ts - OLD STRUCTURE
interface OldConversation {
  id: string;
  listing_id: string;
  participant_1: string;
  participant_2: string;
  last_message_content?: string;
  last_message_at?: string;
  // ... complex participant structure
}

// models/Conversation.ts - NEW STRUCTURE
interface NewConversation {
  id: string;
  listing_id: string;
  participant_1: string;
  participant_2: string;
  last_message_at?: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  last_message_content?: string;
  buyer_unread_count: number;
  seller_unread_count: number;
}

// models/Message.ts - OLD vs NEW
interface OldChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachments?: any;
  // ... complex structure
}

interface NewMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  images?: any; // JSONB
  offer_data?: any; // JSONB
  status: string;
  reply_to?: string;
  attachments?: any; // JSONB
  is_read: boolean;
}
```

### Phase 2: API Endpoints & Services (Week 2)

#### 2.1 Update API Routes

**User Management APIs**
```typescript
// pages/api/users/index.ts - UPDATE
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // OLD QUERY
    // const { data } = await supabase.from('profiles').select('*');
    
    // NEW QUERY - Updated field mapping
    const { data } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        avatar_url,
        location,
        bio,
        rating,
        total_sales,
        total_reviews,
        credit_balance,
        is_verified,
        is_online,
        last_seen,
        account_type,
        business_name,
        verification_status,
        created_at,
        updated_at
      `);
    
    // Transform data for dashboard compatibility
    const transformedData = data?.map(profile => ({
      ...profile,
      full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      email: profile.email || 'N/A', // Handle missing email
      membership_tier: profile.account_type === 'business' ? 'business' : 'individual'
    }));
    
    res.json(transformedData);
  }
}
```

**Listing Management APIs**
```typescript
// pages/api/listings/index.ts - UPDATE
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data } = await supabase
      .from('listings')
      .select(`
        *,
        profiles!listings_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url,
          account_type
        ),
        categories!listings_category_id_fkey (
          id,
          name,
          slug
        )
      `);
    
    // Transform for dashboard compatibility
    const transformedData = data?.map(listing => ({
      ...listing,
      user: {
        id: listing.profiles?.id,
        full_name: `${listing.profiles?.first_name || ''} ${listing.profiles?.last_name || ''}`.trim(),
        avatar_url: listing.profiles?.avatar_url,
        account_type: listing.profiles?.account_type
      },
      category: listing.categories,
      view_count: listing.views,
      favorite_count: 0, // Will need separate query
      is_featured: listing.featured,
      is_boosted: listing.boost_level > 0
    }));
    
    res.json(transformedData);
  }
}
```

**Moderation APIs**
```typescript
// pages/api/moderation/queue.ts - UPDATE
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // NEW SCHEMA - Use moderation_queue table
    const { data } = await supabase
      .from('moderation_queue')
      .select(`
        *,
        profiles!moderation_queue_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });
    
    res.json(data);
  }
}

// pages/api/moderation/reports.ts - UPDATE
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // NEW SCHEMA - Use reports table
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        reported_user:profiles!reports_reported_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        reported_listing:listings!reports_reported_listing_id_fkey (
          id,
          title,
          price
        )
      `)
      .order('created_at', { ascending: false });
    
    res.json(data);
  }
}
```

#### 2.2 Update Service Functions

**User Service Updates**
```typescript
// services/userService.ts
export class UserService {
  // OLD METHOD
  // static async getUsers() {
  //   return supabase.from('profiles').select('*');
  // }
  
  // NEW METHOD - Updated for new schema
  static async getUsers(filters?: {
    search?: string;
    account_type?: string;
    verification_status?: string;
    is_online?: boolean;
  }) {
    let query = supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        avatar_url,
        location,
        bio,
        rating,
        total_sales,
        total_reviews,
        credit_balance,
        is_verified,
        is_online,
        last_seen,
        account_type,
        business_name,
        verification_status,
        phone_visibility,
        created_at,
        updated_at
      `);
    
    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,business_name.ilike.%${filters.search}%`);
    }
    
    if (filters?.account_type) {
      query = query.eq('account_type', filters.account_type);
    }
    
    if (filters?.verification_status) {
      query = query.eq('verification_status', filters.verification_status);
    }
    
    if (filters?.is_online !== undefined) {
      query = query.eq('is_online', filters.is_online);
    }
    
    return query.order('created_at', { ascending: false });
  }
  
  static async getUserById(id: string) {
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
  }
  
  static async updateUser(id: string, updates: Partial<NewProfile>) {
    return supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);
  }
  
  static async suspendUser(id: string, reason: string) {
    return supabase
      .from('profiles')
      .update({
        is_suspended: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  }
}
```

**Listing Service Updates**
```typescript
// services/listingService.ts
export class ListingService {
  static async getListings(filters?: {
    status?: string;
    category_id?: string;
    user_id?: string;
    featured?: boolean;
    search?: string;
  }) {
    let query = supabase
      .from('listings')
      .select(`
        *,
        profiles!listings_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url,
          account_type,
          business_name
        ),
        categories!listings_category_id_fkey (
          id,
          name,
          slug
        )
      `);
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    if (filters?.featured !== undefined) {
      query = query.eq('featured', filters.featured);
    }
    
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    return query.order('created_at', { ascending: false });
  }
  
  static async updateListingStatus(id: string, status: string, reason?: string) {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // Log moderation action
    if (reason) {
      await supabase.from('moderation_queue').insert({
        content_type: 'listing',
        content_id: id,
        status: 'resolved',
        review_notes: reason,
        reviewed_at: new Date().toISOString()
      });
    }
    
    return supabase
      .from('listings')
      .update(updates)
      .eq('id', id);
  }
}
```

### Phase 3: Dashboard UI Components (Week 3)

#### 3.1 Update Dashboard Components

**User Management Dashboard**
```typescript
// components/users/UserTable.tsx - UPDATE
interface UserTableProps {
  users: NewProfile[];
  onUserAction: (userId: string, action: string) => void;
}

export function UserTable({ users, onUserAction }: UserTableProps) {
  const columns = [
    {
      key: 'avatar',
      title: 'Avatar',
      render: (user: NewProfile) => (
        <Avatar 
          src={user.avatar_url} 
          alt={`${user.first_name} ${user.last_name}`}
          size="sm"
        />
      )
    },
    {
      key: 'name',
      title: 'Name',
      render: (user: NewProfile) => (
        <div>
          <div className="font-medium">
            {user.first_name} {user.last_name}
          </div>
          {user.business_name && (
            <div className="text-sm text-gray-500">
              {user.business_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'account_type',
      title: 'Type',
      render: (user: NewProfile) => (
        <Badge 
          variant={user.account_type === 'business' ? 'primary' : 'secondary'}
        >
          {user.account_type}
        </Badge>
      )
    },
    {
      key: 'verification',
      title: 'Verification',
      render: (user: NewProfile) => (
        <Badge 
          variant={user.is_verified ? 'success' : 'warning'}
        >
          {user.verification_status}
        </Badge>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (user: NewProfile) => (
        <div className="flex items-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              user.is_online ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          {user.is_online ? 'Online' : 'Offline'}
        </div>
      )
    },
    {
      key: 'stats',
      title: 'Stats',
      render: (user: NewProfile) => (
        <div className="text-sm">
          <div>Sales: {user.total_sales || 0}</div>
          <div>Reviews: {user.total_reviews || 0}</div>
          <div>Credits: {user.credit_balance || 0}</div>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (user: NewProfile) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onUserAction(user.id, 'view')}
          >
            View
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onUserAction(user.id, 'edit')}
          >
            Edit
          </Button>
          {!user.is_suspended && (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onUserAction(user.id, 'suspend')}
            >
              Suspend
            </Button>
          )}
        </div>
      )
    }
  ];
  
  return <DataTable columns={columns} data={users} />;
}
```

**Listing Management Dashboard**
```typescript
// components/listings/ListingTable.tsx - UPDATE
interface ListingTableProps {
  listings: NewListing[];
  onListingAction: (listingId: string, action: string) => void;
}

export function ListingTable({ listings, onListingAction }: ListingTableProps) {
  const columns = [
    {
      key: 'image',
      title: 'Image',
      render: (listing: NewListing) => (
        <img 
          src={listing.images?.[0] || '/placeholder.jpg'} 
          alt={listing.title}
          className="w-16 h-16 object-cover rounded"
        />
      )
    },
    {
      key: 'title',
      title: 'Title',
      render: (listing: NewListing) => (
        <div>
          <div className="font-medium">{listing.title}</div>
          <div className="text-sm text-gray-500">
            {listing.price} {listing.currency}
          </div>
        </div>
      )
    },
    {
      key: 'seller',
      title: 'Seller',
      render: (listing: NewListing & { profiles?: NewProfile }) => (
        <div>
          <div className="font-medium">
            {listing.profiles?.first_name} {listing.profiles?.last_name}
          </div>
          {listing.profiles?.business_name && (
            <div className="text-sm text-gray-500">
              {listing.profiles.business_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      render: (listing: NewListing & { categories?: any }) => (
        <Badge variant="secondary">
          {listing.categories?.name || 'Uncategorized'}
        </Badge>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (listing: NewListing) => (
        <Badge 
          variant={
            listing.status === 'active' ? 'success' :
            listing.status === 'pending' ? 'warning' :
            listing.status === 'rejected' ? 'destructive' : 'secondary'
          }
        >
          {listing.status}
        </Badge>
      )
    },
    {
      key: 'features',
      title: 'Features',
      render: (listing: NewListing) => (
        <div className="flex gap-1">
          {listing.featured && (
            <Badge variant="primary" size="sm">Featured</Badge>
          )}
          {listing.boost_level > 0 && (
            <Badge variant="warning" size="sm">Boosted</Badge>
          )}
          {listing.accept_offers && (
            <Badge variant="info" size="sm">Offers</Badge>
          )}
        </div>
      )
    },
    {
      key: 'stats',
      title: 'Stats',
      render: (listing: NewListing) => (
        <div className="text-sm">
          <div>Views: {listing.views || 0}</div>
          <div>Qty: {listing.quantity || 1}</div>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (listing: NewListing) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onListingAction(listing.id, 'view')}
          >
            View
          </Button>
          {listing.status === 'pending' && (
            <>
              <Button 
                size="sm" 
                variant="success"
                onClick={() => onListingAction(listing.id, 'approve')}
              >
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => onListingAction(listing.id, 'reject')}
              >
                Reject
              </Button>
            </>
          )}
          {listing.status === 'active' && (
            <Button 
              size="sm" 
              variant="warning"
              onClick={() => onListingAction(listing.id, 'suspend')}
            >
              Suspend
            </Button>
          )}
        </div>
      )
    }
  ];
  
  return <DataTable columns={columns} data={listings} />;
}
```

#### 3.2 Update Moderation Components

**Moderation Queue Dashboard**
```typescript
// components/moderation/ModerationQueue.tsx - UPDATE
interface ModerationQueueProps {
  items: ModerationQueueItem[];
  onModerationAction: (itemId: string, action: string, notes?: string) => void;
}

interface ModerationQueueItem {
  id: string;
  content_type: string;
  content_id: string;
  user_id: string;
  content_text?: string;
  content_images?: string[];
  flagged_reason?: string[];
  auto_flagged: boolean;
  manual_review_required: boolean;
  priority_level: number;
  status: string;
  created_at: string;
  profiles?: NewProfile;
}

export function ModerationQueue({ items, onModerationAction }: ModerationQueueProps) {
  const getPriorityColor = (level: number) => {
    switch (level) {
      case 5: return 'bg-red-500';
      case 4: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 2: return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getPriorityLabel = (level: number) => {
    switch (level) {
      case 5: return 'Critical';
      case 4: return 'High';
      case 3: return 'Medium';
      case 2: return 'Low';
      default: return 'Normal';
    }
  };
  
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div 
                className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority_level)}`}
                title={`Priority: ${getPriorityLabel(item.priority_level)}`}
              />
              <div>
                <div className="font-medium">
                  {item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1)} Review
                </div>
                <div className="text-sm text-gray-500">
                  Reported by: {item.profiles?.first_name} {item.profiles?.last_name}
                </div>
              </div>
              {item.auto_flagged && (
                <Badge variant="warning" size="sm">Auto-flagged</Badge>
              )}
              {item.manual_review_required && (
                <Badge variant="destructive" size="sm">Manual Review Required</Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(item.created_at).toLocaleDateString()}
            </div>
          </div>
          
          {item.content_text && (
            <div className="mb-3">
              <div className="text-sm font-medium mb-1">Content:</div>
              <div className="text-sm bg-gray-50 p-2 rounded">
                {item.content_text}
              </div>
            </div>
          )}
          
          {item.content_images && item.content_images.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium mb-1">Images:</div>
              <div className="flex gap-2">
                {item.content_images.map((image, index) => (
                  <img 
                    key={index}
                    src={image} 
                    alt={`Content ${index + 1}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}
          
          {item.flagged_reason && item.flagged_reason.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium mb-1">Flagged for:</div>
              <div className="flex gap-1 flex-wrap">
                {item.flagged_reason.map((reason, index) => (
                  <Badge key={index} variant="outline" size="sm">
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="success"
              onClick={() => onModerationAction(item.id, 'approve')}
            >
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onModerationAction(item.id, 'reject')}
            >
              Reject
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onModerationAction(item.id, 'escalate')}
            >
              Escalate
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onModerationAction(item.id, 'view_details')}
            >
              View Details
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Phase 4: Analytics & Reporting (Week 4)

#### 4.1 Create New Analytics System

Since the new schema doesn't have dedicated analytics tables, we'll need to create computed analytics:

```typescript
// services/analyticsService.ts - NEW
export class AnalyticsService {
  // User Analytics
  static async getUserStats(dateRange?: { start: Date; end: Date }) {
    const { data: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' });
    
    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('is_online', true);
    
    const { data: verifiedUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('is_verified', true);
    
    const { data: businessUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('account_type', 'business');
    
    return {
      total: totalUsers?.length || 0,
      active: activeUsers?.length || 0,
      verified: verifiedUsers?.length || 0,
      business: businessUsers?.length || 0
    };
  }
  
  // Listing Analytics
  static async getListingStats(dateRange?: { start: Date; end: Date }) {
    const { data: totalListings } = await supabase
      .from('listings')
      .select('id', { count: 'exact' });
    
    const { data: activeListings } = await supabase
      .from('listings')
      .select('id', { count: 'exact' })
      .eq('status', 'active');
    
    const { data: featuredListings } = await supabase
      .from('listings')
      .select('id', { count: 'exact' })
      .eq('featured', true);
    
    const { data: pendingListings } = await supabase
      .from('listings')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');
    
    return {
      total: totalListings?.length || 0,
      active: activeListings?.length || 0,
      featured: featuredListings?.length || 0,
      pending: pendingListings?.length || 0
    };
  }
  
  // Moderation Analytics
  static async getModerationStats(dateRange?: { start: Date; end: Date }) {
    const { data: totalReports } = await supabase
      .from('reports')
      .select('id', { count: 'exact' });
    
    const { data: pendingReports } = await supabase
      .from('reports')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');
    
    const { data: queueItems } = await supabase
      .from('moderation_queue')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');
    
    return {
      totalReports: totalReports?.length || 0,
      pendingReports: pendingReports?.length || 0,
      queueItems: queueItems?.length || 0
    };
  }
  
  // Revenue Analytics (from transactions)
  static async getRevenueStats(dateRange?: { start: Date; end: Date }) {
    let query = supabase
      .from('transactions')
      .select('amount, currency, type, created_at')
      .eq('status', 'completed');
    
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }
    
    const { data: transactions } = await query;
    
    const revenue = transactions?.reduce((total, transaction) => {
      if (transaction.type === 'credit_purchase' || transaction.type === 'feature_purchase') {
        return total + (transaction.amount || 0);
      }
      return total;
    }, 0) || 0;
    
    return {
      totalRevenue: revenue,
      transactionCount: transactions?.length || 0,
      averageTransaction: transactions?.length ? revenue / transactions.length : 0
    };
  }
}
```

#### 4.2 Dashboard Overview Component

```typescript
// components/dashboard/DashboardOverview.tsx - NEW
export function DashboardOverview() {
  const [stats, setStats] = useState({
    users: { total: 0, active: 0, verified: 0, business: 0 },
    listings: { total: 0, active: 0, featured: 0, pending: 0 },
    moderation: { totalReports: 0, pendingReports: 0, queueItems: 0 },
    revenue: { totalRevenue: 0, transactionCount: 0, averageTransaction: 0 }
  });
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [userStats, listingStats, moderationStats, revenueStats] = await Promise.all([
          AnalyticsService.getUserStats(),
          AnalyticsService.getListingStats(),
          AnalyticsService.getModerationStats(),
          AnalyticsService.getRevenueStats()
        ]);
        
        setStats({
          users: userStats,
          listings: listingStats,
          moderation: moderationStats,
          revenue: revenueStats
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  if (loading) {
    return <div>Loading dashboard...</div>;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* User Stats */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Users</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-medium">{stats.users.total}</span>
          </div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span className="font-medium text-green-600">{stats.users.active}</span>
          </div>
          <div className="flex justify-between">
            <span>Verified:</span>
            <span className="font-medium text-blue-600">{stats.users.verified}</span>
          </div>
          <div className="flex justify-between">
            <span>Business:</span>
            <span className="font-medium text-purple-600">{stats.users.business}</span>
          </div>
        </div>
      </div>
      
      {/* Listing Stats */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Listings</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-medium">{stats.listings.total}</span>
          </div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span className="font-medium text-green-600">{stats.listings.active}</span>
          </div>
          <div className="flex justify-between">
            <span>Featured:</span>
            <span className="font-medium text-yellow-600">{stats.listings.featured}</span>
          </div>
          <div className="flex justify-between">
            <span>Pending:</span>
            <span className="font-medium text-orange-600">{stats.listings.pending}</span>
          </div>
        </div>
      </div>
      
      {/* Moderation Stats */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Moderation</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total Reports:</span>
            <span className="font-medium">{stats.moderation.totalReports}</span>
          </div>
          <div className="flex justify-between">
            <span>Pending Reports:</span>
            <span className="font-medium text-red-600">{stats.moderation.pendingReports}</span>
          </div>
          <div className="flex justify-between">
            <span>Queue Items:</span>
            <span className="font-medium text-orange-600">{stats.moderation.queueItems}</span>
          </div>
        </div>
      </div>
      
      {/* Revenue Stats */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Revenue</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-medium text-green-600">
              GH₵ {stats.revenue.totalRevenue.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Transactions:</span>
            <span className="font-medium">{stats.revenue.transactionCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Average:</span>
            <span className="font-medium">
              GH₵ {stats.revenue.averageTransaction.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 🧪 Testing Strategy

### 4.1 Database Connection Testing
```typescript
// tests/database.test.ts
describe('Database Connection', () => {
  test('should connect to new Supabase instance', async () => {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
  
  test('should handle authentication', async () => {
    // Test service role key access
    const { data, error } = await supabase.from('moderation_queue').select('*').limit(1);
    expect(error).toBeNull();
  });
});
```

### 4.2 API Endpoint Testing
```typescript
// tests/api.test.ts
describe('API Endpoints', () => {
  test('GET /api/users should return transformed user data', async () => {
    const response = await fetch('/api/users');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data[0]).toHaveProperty('full_name');
    expect(data[0]).toHaveProperty('membership_tier');
  });
  
  test('GET /api/listings should return transformed listing data', async () => {
    const response = await fetch('/api/listings');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data[0]).toHaveProperty('view_count');
    expect(data[0]).toHaveProperty('is_featured');
  });
});
```

## 📋 Migration Checklist

### ✅ Phase 1: Database & Models (Week 1)
- [ ] Update Supabase connection configuration
- [ ] Create new data models for all tables
- [ ] Implement data transformation functions
- [ ] Test database connectivity
- [ ] Verify data mapping accuracy

### ✅ Phase 2: API & Services (Week 2)
- [ ] Update all API endpoints
- [ ] Modify service functions
- [ ] Implement new query patterns
- [ ] Add error handling for missing tables
- [ ] Test API functionality

### ✅ Phase 3: UI Components (Week 3)
- [ ] Update user management components
- [ ] Modify listing management interface
- [ ] Enhance moderation components
- [ ] Update dashboard layouts
- [ ] Test UI functionality

### ✅ Phase 4: Analytics & Testing (Week 4)
- [ ] Implement new analytics system
- [ ] Create dashboard overview
- [ ] Write comprehensive tests
- [ ] Performance optimization
- [ ] Documentation updates

## 🚀 Deployment Plan

### Pre-Deployment
1. **Backup Current Dashboard**: Create full backup of existing admin dashboard
2. **Environment Setup**: Configure new Supabase credentials in staging
3. **Data Validation**: Verify data integrity in new schema
4. **Testing**: Run comprehensive test suite

### Deployment Steps
1. **Deploy to Staging**: Test all functionality in staging environment
2. **User Acceptance Testing**: Have admin users test key workflows
3. **Performance Testing**: Verify dashboard performance with real data
4. **Production Deployment**: Deploy to production with rollback plan

### Post-Deployment
1. **Monitor Performance**: Track dashboard response times and errors
2. **User Training**: Train admin users on any interface changes
3. **Documentation**: Update admin documentation
4. **Feedback Collection**: Gather feedback for future improvements

## 📞 Support & Maintenance

### Ongoing Tasks
- Monitor dashboard performance and errors
- Update data models as mobile app schema evolves
- Add new features as requested by admin users
- Maintain compatibility with mobile app updates

### Documentation
- API documentation for new endpoints
- User guide for updated dashboard features
- Technical documentation for future developers
- Troubleshooting guide for common issues

---

This migration plan provides a systematic approach to updating the admin dashboard for the new mobile app schema while maintaining all existing functionality and adding support for new features.
