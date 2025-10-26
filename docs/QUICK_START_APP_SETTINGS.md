# 🚀 Quick Start: Using App Settings

## Installation Complete! ✅

All database migrations are ready. Just run:
```bash
npx supabase db push
```

---

## 🎯 Common Use Cases

### **1. Check if a Feature is Enabled**

```typescript
import { useAppSetting } from '@/hooks/useAppSettings';

function VideoUploadButton() {
  const { value: enabled, loading } = useAppSetting('enable_video_uploads', true);
  
  if (loading) return <Skeleton />;
  if (!enabled) return null;  // Hide feature
  
  return <Button>Upload Video</Button>;
}
```

---

### **2. Get Max Listing Images (Based on User Type)**

```typescript
import { useAppSettings } from '@/hooks/useAppSettings';

function ImageUpload() {
  const { getSetting, loading } = useAppSettings('business_rules');
  const isProUser = useAuthStore(state => state.user?.is_sellar_pro);
  
  const maxImages = isProUser 
    ? getSetting('max_listing_images_pro', 15)
    : getSetting('max_listing_images', 8);
  
  return <ImagePicker maxImages={maxImages} />;
}
```

---

### **3. Show/Hide Homepage Sections**

```typescript
import { useAppSettings } from '@/hooks/useAppSettings';

function HomeScreen() {
  const { getSetting } = useAppSettings('ui_config');
  
  const showTrending = getSetting('show_trending_section', true);
  const showRecommended = getSetting('show_recommended_section', true);
  const showBusiness = getSetting('show_business_listings', true);
  
  return (
    <ScrollView>
      {showTrending && <TrendingSection />}
      {showRecommended && <RecommendedSection />}
      {showBusiness && <BusinessListingsSection />}
    </ScrollView>
  );
}
```

---

### **4. Maintenance Mode Check**

```typescript
import { useAppSetting } from '@/hooks/useAppSettings';

function AppRoot() {
  const { value: maintenanceMode } = useAppSetting('maintenance_mode', false);
  const { value: message } = useAppSetting('maintenance_message', 
    'We are currently performing maintenance. Please check back soon.'
  );
  
  if (maintenanceMode) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, textAlign: 'center' }}>
          🔧 {message}
        </Text>
      </View>
    );
  }
  
  return <MainApp />;
}
```

---

### **5. Get Multiple Settings at Once**

```typescript
import { useAppSettings } from '@/hooks/useAppSettings';

function CreateListing() {
  const { settings, loading } = useAppSettings('business_rules');
  
  if (loading) return <LoadingSkeleton />;
  
  const maxImages = settings.max_listing_images || 8;
  const maxImagesPro = settings.max_listing_images_pro || 15;
  const additionalFee = settings.additional_listing_fee || 5;
  const expiryDays = settings.listing_expiry_days || 90;
  
  return (
    <View>
      <Text>Upload up to {maxImages} images</Text>
      <Text>Listings expire after {expiryDays} days</Text>
      <Text>Additional listings cost {additionalFee} credits</Text>
    </View>
  );
}
```

---

### **6. Refresh Settings on App Resume**

```typescript
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAppSettings } from '@/hooks/useAppSettings';

function App() {
  const { refreshSettings } = useAppSettings();
  
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Refresh settings when app comes to foreground
        refreshSettings();
      }
    });
    
    return () => subscription.remove();
  }, []);
  
  return <MainApp />;
}
```

---

### **7. Dynamic Pricing/Commission**

```typescript
import { useAppSetting } from '@/hooks/useAppSettings';

function CheckoutScreen({ totalAmount }: { totalAmount: number }) {
  const { value: commission } = useAppSetting('platform_commission_rate', 0.10);
  
  const platformFee = totalAmount * commission;
  const sellerEarnings = totalAmount - platformFee;
  
  return (
    <View>
      <Text>Total: GHS {totalAmount.toFixed(2)}</Text>
      <Text>Platform Fee ({(commission * 100).toFixed(0)}%): GHS {platformFee.toFixed(2)}</Text>
      <Text>You Earn: GHS {sellerEarnings.toFixed(2)}</Text>
    </View>
  );
}
```

---

### **8. Content Validation Rules**

```typescript
import { useAppSettings } from '@/hooks/useAppSettings';

function ListingTitleInput() {
  const { getSetting } = useAppSettings('moderation');
  const [title, setTitle] = useState('');
  
  const minLength = getSetting('min_listing_title_length', 5);
  const maxLength = getSetting('max_listing_title_length', 100);
  
  const isValid = title.length >= minLength && title.length <= maxLength;
  
  return (
    <View>
      <Input
        value={title}
        onChangeText={setTitle}
        maxLength={maxLength}
      />
      <Text>
        {title.length}/{maxLength} characters 
        (min: {minLength})
      </Text>
      {!isValid && <Text style={{ color: 'red' }}>
        Title must be {minLength}-{maxLength} characters
      </Text>}
    </View>
  );
}
```

---

### **9. Feature Flag with Loading State**

```typescript
import { useAppSetting } from '@/hooks/useAppSettings';

function OffersTab() {
  const { value: offersEnabled, loading } = useAppSetting('enable_offers', true);
  
  if (loading) {
    return <LoadingSkeleton />;
  }
  
  if (!offersEnabled) {
    return (
      <EmptyState
        title="Offers Temporarily Unavailable"
        description="This feature is currently disabled. Check back soon!"
      />
    );
  }
  
  return <OffersContent />;
}
```

---

### **10. Pull-to-Refresh Settings**

```typescript
import { useAppSettings } from '@/hooks/useAppSettings';
import { RefreshControl } from 'react-native';

function SettingsScreen() {
  const { settings, loading, refreshSettings } = useAppSettings();
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSettings();
    setRefreshing(false);
  };
  
  return (
    <ScrollView
      refreshControl={
        <RefreshControl 
          refreshing={refreshing || loading} 
          onRefresh={onRefresh} 
        />
      }
    >
      {Object.entries(settings).map(([key, value]) => (
        <Text key={key}>{key}: {String(value)}</Text>
      ))}
    </ScrollView>
  );
}
```

---

## 🎯 Available Settings by Category

### **Business Rules** (`business_rules`)
```typescript
max_listing_images: number           // 8
max_listing_images_pro: number       // 15
max_free_listings: number            // 5
additional_listing_fee: number       // 5 credits
listing_expiry_days: number          // 90
auto_refresh_interval_hours: number  // 2
```

### **Feature Flags** (`feature_flags`)
```typescript
enable_video_uploads: boolean        // true
enable_chat: boolean                 // true
enable_offers: boolean               // true
enable_reservations: boolean         // true
enable_events: boolean               // true
enable_community: boolean            // true
```

### **UI Config** (`ui_config`)
```typescript
show_trending_section: boolean       // true
show_recommended_section: boolean    // true
show_business_listings: boolean      // true
homepage_banner_enabled: boolean     // false
```

### **System** (`system`)
```typescript
maintenance_mode: boolean            // false
maintenance_message: string          // "We are..."
min_app_version_android: string      // "1.0.0"
min_app_version_ios: string          // "1.0.0"
force_update_android: boolean        // false
force_update_ios: boolean            // false
```

**See `APP_SETTINGS_DOCUMENTATION.md` for complete list!**

---

## 💡 Best Practices

### ✅ DO:
```typescript
// Always provide default values
const value = getSetting('key', defaultValue);

// Use loading states
if (loading) return <Skeleton />;

// Cache settings in context for app-wide use
const SettingsContext = createContext({});
```

### ❌ DON'T:
```typescript
// Don't forget defaults
const value = getSetting('key');  // ❌ No fallback

// Don't ignore loading
const { value } = useAppSetting('key');  // ❌ No loading check
return <Text>{value}</Text>;

// Don't fetch same setting multiple times
// Use context or memo instead
```

---

## 🔧 TypeScript Types

```typescript
// The hook returns typed values
const { value } = useAppSetting<boolean>('enable_chat', true);
const maxImages = getSetting<number>('max_listing_images', 8);
const message = getSetting<string>('maintenance_message', 'Default');
```

---

## 🚀 Performance Tips

1. **Use category filtering** when possible:
```typescript
const { settings } = useAppSettings('feature_flags');  // Only fetch feature flags
```

2. **Create a settings context** for app-wide access:
```typescript
// contexts/AppSettingsContext.tsx
const AppSettingsProvider = ({ children }) => {
  const settings = useAppSettings();
  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
};
```

3. **Memoize computed values**:
```typescript
const maxImages = useMemo(() => 
  isProUser 
    ? getSetting('max_listing_images_pro', 15)
    : getSetting('max_listing_images', 8),
  [isProUser, settings]
);
```

---

## 🎉 You're All Set!

Start using `useAppSettings()` and `useAppSetting()` in your components to fetch dynamic configuration from the database!

**No more hardcoded values!** 🚀

