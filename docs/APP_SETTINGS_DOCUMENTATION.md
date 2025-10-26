# App Settings - Database-Driven Configuration

## 🎯 Overview

The **App Settings** system allows you to configure business rules, feature flags, and app-wide settings without deploying new app versions. All settings are stored in the database and can be updated via the admin dashboard.

---

## 📊 Database Schema

### **Table: `app_settings`**

| Column | Type | Description |
|--------|------|-------------|
| `key` | VARCHAR(100) | Unique setting identifier (PRIMARY KEY) |
| `value` | JSONB | Setting value (flexible type) |
| `value_type` | VARCHAR(20) | Type hint: `string`, `number`, `boolean`, `json`, `array` |
| `category` | VARCHAR(50) | Grouping: `business_rules`, `feature_flags`, etc. |
| `description` | TEXT | Human-readable description |
| `is_public` | BOOLEAN | If true, accessible without authentication |
| `is_active` | BOOLEAN | Enable/disable setting |
| `updated_at` | TIMESTAMP | Last update time |
| `updated_by` | UUID | Admin who made the change |

---

## 📋 Setting Categories

### **1. Business Rules** (`business_rules`)
Settings that control business logic and limits.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `max_listing_images` | number | 8 | Max images for regular users |
| `max_listing_images_pro` | number | 15 | Max images for Pro users |
| `max_free_listings` | number | 5 | Max active listings for free users |
| `additional_listing_fee` | number | 5 | Fee in credits for extra listings |
| `listing_expiry_days` | number | 90 | Days before listing expires |
| `auto_refresh_interval_hours` | number | 2 | Auto-refresh interval for Pro users |

### **2. Feature Flags** (`feature_flags`)
Enable/disable features remotely.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enable_video_uploads` | boolean | true | Enable video uploads for Pro users |
| `enable_chat` | boolean | true | Enable chat feature |
| `enable_offers` | boolean | true | Enable offer/negotiation feature |
| `enable_reservations` | boolean | true | Enable item reservation |
| `enable_events` | boolean | true | Enable events feature |
| `enable_community` | boolean | true | Enable community/social features |

### **3. Payments** (`payments`)
Payment and credit configuration.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `min_withdrawal_amount` | number | 50 | Minimum withdrawal in GHS |
| `platform_commission_rate` | number | 0.10 | Commission rate (10%) |
| `credit_to_ghs_rate` | number | 0.167 | Credit to GHS conversion |

### **4. Discovery** (`discovery`)
Search and content discovery settings.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `featured_listings_count` | number | 10 | Featured listings on homepage |
| `trending_threshold_hours` | number | 24 | Hours for trending calculation |
| `search_results_per_page` | number | 20 | Search results per page |

### **5. Limits** (`limits`)
User action limits.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `max_chat_messages_per_day` | number | 100 | Max messages for free users |
| `max_offers_per_listing` | number | 5 | Max active offers per listing |
| `max_favorites` | number | 500 | Max favorites per user |
| `max_profile_bio_length` | number | 500 | Max bio characters |

### **6. Moderation** (`moderation`)
Content moderation rules.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `auto_moderation_enabled` | boolean | true | Enable auto-moderation |
| `profanity_filter_enabled` | boolean | true | Enable profanity filter |
| `min_listing_title_length` | number | 5 | Min title length |
| `max_listing_title_length` | number | 100 | Max title length |
| `min_listing_price` | number | 1 | Min price in GHS |

### **7. Notifications** (`notifications`)
Notification configuration.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enable_push_notifications` | boolean | true | Enable push notifications |
| `enable_email_notifications` | boolean | true | Enable email notifications |
| `notification_batch_interval_minutes` | number | 5 | Batch interval in minutes |

### **8. UI Configuration** (`ui_config`)
UI element visibility.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `show_trending_section` | boolean | true | Show trending on homepage |
| `show_recommended_section` | boolean | true | Show recommended section |
| `show_business_listings` | boolean | true | Show business listings |
| `homepage_banner_enabled` | boolean | false | Enable promo banner |

### **9. System** (`system`)
App maintenance and version control.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `maintenance_mode` | boolean | false | Enable maintenance mode |
| `maintenance_message` | string | "We are..." | Maintenance message |
| `min_app_version_android` | string | "1.0.0" | Min required Android version |
| `min_app_version_ios` | string | "1.0.0" | Min required iOS version |
| `force_update_android` | boolean | false | Force Android update |
| `force_update_ios` | boolean | false | Force iOS update |

---

## 🔧 Usage in React Native

### **Import the Hook**
```typescript
import { useAppSettings, useAppSetting } from '@/hooks/useAppSettings';
```

### **Example 1: Get All Settings**
```typescript
function MyComponent() {
  const { settings, loading, getSetting } = useAppSettings();

  if (loading) return <LoadingSpinner />;

  const maxImages = getSetting<number>('max_listing_images', 8);
  const enableChat = getSetting<boolean>('enable_chat', true);

  return (
    <View>
      <Text>Max Images: {maxImages}</Text>
      <Text>Chat Enabled: {enableChat ? 'Yes' : 'No'}</Text>
    </View>
  );
}
```

### **Example 2: Get Settings by Category**
```typescript
function FeatureFlagsScreen() {
  const { settings, loading } = useAppSettings('feature_flags');

  if (loading) return <LoadingSpinner />;

  return (
    <View>
      <Text>Video Uploads: {settings.enable_video_uploads ? '✓' : '✗'}</Text>
      <Text>Chat: {settings.enable_chat ? '✓' : '✗'}</Text>
      <Text>Offers: {settings.enable_offers ? '✓' : '✗'}</Text>
    </View>
  );
}
```

### **Example 3: Get Single Setting**
```typescript
function ListingUpload() {
  const { value: maxImages, loading } = useAppSetting<number>(
    'max_listing_images',
    8  // default value
  );

  if (loading) return <LoadingSpinner />;

  return (
    <Text>You can upload up to {maxImages} images</Text>
  );
}
```

### **Example 4: Feature Flag Check**
```typescript
function ChatButton() {
  const { value: chatEnabled } = useAppSetting<boolean>('enable_chat', true);

  if (!chatEnabled) return null;

  return <Button>Open Chat</Button>;
}
```

### **Example 5: Refresh Settings**
```typescript
function SettingsScreen() {
  const { settings, loading, refreshSettings } = useAppSettings();

  const handleRefresh = async () => {
    await refreshSettings();
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
      }
    >
      {/* Settings content */}
    </ScrollView>
  );
}
```

---

## 🗄️ Database Helper Functions

### **Get Single Setting**
```sql
SELECT get_app_setting('max_listing_images');
-- Returns: 8
```

### **Get Settings by Category**
```sql
SELECT * FROM get_app_settings_by_category('feature_flags');
-- Returns all feature flag settings
```

### **Get Typed Values**
```sql
SELECT * FROM app_settings_typed WHERE category = 'business_rules';
-- Returns settings with properly typed columns
```

---

## 🎛️ Admin Dashboard Operations

### **Update a Setting**
```typescript
// Using service role key
await supabase
  .from('app_settings')
  .update({
    value: 10,
    updated_by: adminUserId
  })
  .eq('key', 'max_listing_images');
```

### **Toggle Feature Flag**
```typescript
await supabase
  .from('app_settings')
  .update({ value: false })
  .eq('key', 'enable_video_uploads');
```

### **Enable Maintenance Mode**
```typescript
await supabase
  .from('app_settings')
  .update({
    value: true,
    updated_by: adminUserId
  })
  .eq('key', 'maintenance_mode');
```

### **Add New Setting**
```typescript
await supabase
  .from('app_settings')
  .insert({
    key: 'new_feature_limit',
    value: 50,
    value_type: 'number',
    category: 'limits',
    description: 'Limit for new feature',
    is_public: true,
    updated_by: adminUserId
  });
```

---

## 🚀 Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Change Business Rule** | Code + Deploy (1-2 weeks) | Database Update (5 mins) |
| **Toggle Feature** | Code + Deploy | Toggle boolean |
| **A/B Testing** | Impossible | Change settings per region |
| **Emergency Disable** | Code + Deploy | Instant toggle |
| **Maintenance Mode** | Manual coordination | Single setting |
| **Version Control** | Hardcoded | Database-driven |

---

## 🔒 Security

- **RLS Enabled**: Settings respect Row Level Security
- **Public Settings**: Some settings accessible without auth (for UI)
- **Admin Only**: Modifications require service role key
- **Audit Trail**: `updated_by` and `updated_at` track changes

---

## 💡 Best Practices

### **1. Use Descriptive Keys**
```typescript
// Good
'max_listing_images_pro'
'enable_video_uploads'

// Bad
'max_img'
'video'
```

### **2. Always Provide Defaults**
```typescript
// Always provide fallback
const maxImages = getSetting<number>('max_listing_images', 8);
```

### **3. Cache Settings**
```typescript
// Use React Context for app-wide settings
const AppSettingsContext = React.createContext({});
```

### **4. Feature Flag Pattern**
```typescript
if (!getSetting('enable_feature', false)) {
  return null;  // Hide feature
}
```

### **5. Refresh on App Resume**
```typescript
useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      refreshSettings();
    }
  });
  return () => subscription.remove();
}, []);
```

---

## 📊 Monitoring

Track setting changes in your admin dashboard:
```sql
SELECT 
  key,
  value,
  updated_at,
  updated_by,
  p.username as updated_by_name
FROM app_settings s
LEFT JOIN profiles p ON s.updated_by = p.id
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 🎯 Common Use Cases

### **1. Gradual Feature Rollout**
```typescript
// Enable for 10% of users
const featureEnabled = getSetting('new_feature_enabled', false);
const userRolloutPercent = getSetting('new_feature_rollout_percent', 0);

const isFeatureAvailable = featureEnabled && 
  (Math.random() * 100 < userRolloutPercent);
```

### **2. Dynamic Pricing**
```typescript
const commissionRate = getSetting('platform_commission_rate', 0.10);
const sellerEarnings = totalPrice * (1 - commissionRate);
```

### **3. Content Limits**
```typescript
const maxBioLength = getSetting('max_profile_bio_length', 500);
const isValid = bio.length <= maxBioLength;
```

### **4. Maintenance Mode**
```typescript
const maintenanceMode = getSetting('maintenance_mode', false);
const maintenanceMessage = getSetting('maintenance_message', '');

if (maintenanceMode) {
  return <MaintenanceScreen message={maintenanceMessage} />;
}
```

---

**Your app now has enterprise-grade remote configuration!** 🎉

