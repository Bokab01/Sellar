# 📢 In-App Announcements & Dynamic Theming

## 🎯 Overview

Your app now supports **database-driven announcements** and **dynamic theme customization**! Update brand colors and show important messages without deploying new versions.

---

## 📢 In-App Announcements

### **Features:**
- ✅ **5 Announcement Types**: Info, Success, Warning, Error, Promo
- ✅ **Call-to-Action**: Optional button with deep linking
- ✅ **Dismissible**: Users can close announcements (persists across sessions)
- ✅ **Auto-Expiry**: Set expiration dates
- ✅ **Real-time Updates**: Changes appear instantly

---

### **📊 Announcement Settings**

| Setting | Type | Description | Example |
|---------|------|-------------|---------|
| `announcement_enabled` | boolean | Show/hide banner | `true` |
| `announcement_title` | string | Banner title (optional) | "Flash Sale!" |
| `announcement_message` | string | Main message | "Get 50% off all credits today!" |
| `announcement_type` | string | Visual style | `info`, `success`, `warning`, `error`, `promo` |
| `announcement_action_text` | string | Button text (optional) | "Shop Now" |
| `announcement_action_url` | string | Navigation target | `/buy-credits` or `https://...` |
| `announcement_dismissible` | boolean | Allow dismissal | `true` |
| `announcement_expires_at` | string | Expiry (ISO 8601) | "2025-12-31T23:59:59Z" |

---

### **🎨 Announcement Types**

#### **1. Info (Default)**
- **Color**: Primary blue
- **Icon**: Info circle
- **Use Case**: General updates, feature announcements

#### **2. Success**
- **Color**: Green
- **Icon**: Check circle
- **Use Case**: Successful campaigns, positive news

#### **3. Warning**
- **Color**: Orange
- **Icon**: Alert triangle
- **Use Case**: Important notices, deprecations

#### **4. Error**
- **Color**: Red
- **Icon**: Alert circle
- **Use Case**: Service disruptions, critical alerts

#### **5. Promo**
- **Color**: Primary
- **Icon**: Sparkles
- **Use Case**: Sales, special offers, promotions

---

### **💻 Usage in App**

#### **Add to Home Screen**
```typescript
import { AnnouncementBanner } from '@/components';

function HomeScreen() {
  return (
    <SafeAreaWrapper>
      <AppHeader title="Sellar" />
      
      {/* Announcement Banner */}
      <AnnouncementBanner />
      
      <ScrollView>
        {/* Your content */}
      </ScrollView>
    </SafeAreaWrapper>
  );
}
```

#### **Add to Specific Screens**
```typescript
// In wallet, buy-credits, or any screen
function WalletScreen() {
  return (
    <SafeAreaWrapper>
      <AppHeader title="Wallet" />
      <AnnouncementBanner />
      {/* Screen content */}
    </SafeAreaWrapper>
  );
}
```

#### **With Custom Dismiss Handler**
```typescript
function CustomScreen() {
  const handleDismiss = () => {
    console.log('User dismissed announcement');
    // Track analytics, etc.
  };

  return (
    <SafeAreaWrapper>
      <AnnouncementBanner onDismiss={handleDismiss} />
      {/* Content */}
    </SafeAreaWrapper>
  );
}
```

---

### **🎛️ Admin Dashboard Examples**

#### **Example 1: Flash Sale Promo**
```typescript
await supabase
  .from('app_settings')
  .update({
    value: true,
    updated_by: adminId
  })
  .eq('key', 'announcement_enabled');

await supabase
  .from('app_settings')
  .update({ value: '"Flash Sale: 50% Off Credits!"' })
  .eq('key', 'announcement_title');

await supabase
  .from('app_settings')
  .update({ value: '"Get double credits on all packages. Ends tonight!"' })
  .eq('key', 'announcement_message');

await supabase
  .from('app_settings')
  .update({ value: '"promo"' })
  .eq('key', 'announcement_type');

await supabase
  .from('app_settings')
  .update({ value: '"Buy Now"' })
  .eq('key', 'announcement_action_text');

await supabase
  .from('app_settings')
  .update({ value: '"/buy-credits"' })
  .eq('key', 'announcement_action_url');

await supabase
  .from('app_settings')
  .update({ value: '"2025-10-13T23:59:59Z"' })
  .eq('key', 'announcement_expires_at');
```

#### **Example 2: Service Alert**
```typescript
await supabase
  .from('app_settings')
  .update({ value: true })
  .eq('key', 'announcement_enabled');

await supabase
  .from('app_settings')
  .update({ value: '"Scheduled Maintenance"' })
  .eq('key', 'announcement_title');

await supabase
  .from('app_settings')
  .update({ value: '"We will be performing maintenance on Oct 15, 2am-4am GMT. App will be temporarily unavailable."' })
  .eq('key', 'announcement_message');

await supabase
  .from('app_settings')
  .update({ value: '"warning"' })
  .eq('key', 'announcement_type');

await supabase
  .from('app_settings')
  .update({ value: false })  // Can't dismiss
  .eq('key', 'announcement_dismissible');
```

#### **Example 3: Feature Launch**
```typescript
await supabase
  .from('app_settings')
  .update({ value: '"New Feature: Video Uploads!"' })
  .eq('key', 'announcement_title');

await supabase
  .from('app_settings')
  .update({ value: '"Sellar Pro users can now upload videos to their listings!"' })
  .eq('key', 'announcement_message');

await supabase
  .from('app_settings')
  .update({ value: '"success"' })
  .eq('key', 'announcement_type');

await supabase
  .from('app_settings')
  .update({ value: '"Learn More"' })
  .eq('key', 'announcement_action_text');

await supabase
  .from('app_settings')
  .update({ value: '"/subscription-plans"' })
  .eq('key', 'announcement_action_url');
```

---

## 🎨 Dynamic Theme Customization

### **Features:**
- ✅ **6 Customizable Colors**: Primary, Secondary, Accent, Success, Error, Warning
- ✅ **Dark Mode Control**: Enable/disable dark mode
- ✅ **Default Theme**: Set default (light, dark, system, amoled)
- ✅ **Custom Fonts**: Enable custom font families
- ✅ **Real-time Updates**: Changes apply instantly

---

### **🎨 Theme Settings**

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `primary_color` | string | `#007AFF` | Primary brand color |
| `secondary_color` | string | `#5856D6` | Secondary brand color |
| `accent_color` | string | `#FF9500` | Accent/highlight color |
| `success_color` | string | `#34C759` | Success state color |
| `error_color` | string | `#FF3B30` | Error state color |
| `warning_color` | string | `#FF9500` | Warning state color |
| `dark_mode_enabled` | boolean | `true` | Enable dark mode |
| `default_theme` | string | `system` | Default theme mode |
| `custom_font_enabled` | boolean | `false` | Enable custom fonts |
| `font_family` | string | `System` | Font family name |

---

### **💻 Usage in App**

#### **Apply Dynamic Theme**
```typescript
import { useDynamicTheme } from '@/hooks/useDynamicTheme';

function App() {
  const { theme, dynamicColors, loading } = useDynamicTheme();

  if (loading) return <SplashScreen />;

  return (
    <ThemeProvider theme={theme}>
      <NavigationContainer>
        {/* Your app */}
      </NavigationContainer>
    </ThemeProvider>
  );
}
```

#### **Use Specific Dynamic Color**
```typescript
import { useDynamicColor } from '@/hooks/useDynamicTheme';

function CustomButton() {
  const primaryColor = useDynamicColor('primary');
  
  return (
    <TouchableOpacity
      style={{
        backgroundColor: primaryColor,
        padding: 16,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: 'white' }}>Click Me</Text>
    </TouchableOpacity>
  );
}
```

#### **Check Theme Settings**
```typescript
import { useDynamicTheme } from '@/hooks/useDynamicTheme';

function SettingsScreen() {
  const { 
    isDarkModeEnabled,
    defaultTheme,
    isCustomFontEnabled,
    fontFamily 
  } = useDynamicTheme();

  return (
    <View>
      <Text>Dark Mode: {isDarkModeEnabled ? 'Enabled' : 'Disabled'}</Text>
      <Text>Default Theme: {defaultTheme}</Text>
      <Text>Font: {fontFamily}</Text>
    </View>
  );
}
```

---

### **🎛️ Admin Theme Examples**

#### **Example 1: Rebrand Primary Color**
```typescript
// Change primary from blue to purple
await supabase
  .from('app_settings')
  .update({ 
    value: '"#8B5CF6"',  // Purple
    updated_by: adminId 
  })
  .eq('key', 'primary_color');

// All buttons, links, and accents will update instantly!
```

#### **Example 2: Holiday Theme**
```typescript
// Christmas theme
await supabase
  .from('app_settings')
  .update({ value: '"#DC2626"' })  // Red
  .eq('key', 'primary_color');

await supabase
  .from('app_settings')
  .update({ value: '"#16A34A"' })  // Green
  .eq('key', 'secondary_color');

await supabase
  .from('app_settings')
  .update({ value: '"#F59E0B"' })  // Gold
  .eq('key', 'accent_color');
```

#### **Example 3: Disable Dark Mode**
```typescript
await supabase
  .from('app_settings')
  .update({ value: false })
  .eq('key', 'dark_mode_enabled');

// Dark mode toggle will be hidden in settings
```

#### **Example 4: Set Default Theme**
```typescript
await supabase
  .from('app_settings')
  .update({ value: '"light"' })
  .eq('key', 'default_theme');

// New users will default to light theme
```

---

## 🚀 Use Cases

### **Announcements:**
1. **Flash Sales** - Promo banner with "Buy Now" CTA
2. **Service Alerts** - Warning banner for maintenance
3. **Feature Launches** - Success banner with "Learn More"
4. **Critical Issues** - Error banner (non-dismissible)
5. **Seasonal Events** - Info banner for holidays/events

### **Theming:**
1. **Seasonal Rebranding** - Christmas, Valentine's, etc.
2. **Partner Promotions** - Match partner brand colors
3. **Regional Variants** - Different colors per country
4. **A/B Testing** - Test different color schemes
5. **Accessibility** - Adjust colors for better contrast

---

## 📊 Analytics Integration

```typescript
// Track announcement interactions
const handleDismiss = () => {
  analytics.track('announcement_dismissed', {
    message: settings.announcement_message,
    type: settings.announcement_type,
  });
};

const handleAction = () => {
  analytics.track('announcement_action_clicked', {
    message: settings.announcement_message,
    action_url: settings.announcement_action_url,
  });
};
```

---

## 🔒 Security Notes

- ✅ All announcement settings are public (no auth required for read)
- ✅ Theme settings are public (cached on client)
- ✅ Only admin can modify via service role key
- ✅ URL validation prevents XSS in action links
- ✅ Color validation ensures valid hex codes

---

## 💡 Best Practices

### **Announcements:**
1. **Keep it short** - Max 2-3 lines
2. **Clear CTA** - Action text should be compelling
3. **Set expiry** - Don't show outdated messages
4. **Use correct type** - Match visual style to urgency
5. **Test navigation** - Ensure action URLs work

### **Theming:**
1. **Test contrast** - Ensure readability
2. **Gradual changes** - Don't shock users
3. **Brand consistency** - Stay on-brand
4. **Accessibility** - Check WCAG compliance
5. **Reset option** - Keep defaults safe

---

## 🎉 Result

**Your app can now:**
- 📢 Show targeted messages instantly
- 🎨 Update brand colors without deployment
- 🎯 Drive conversions with CTAs
- 🎨 Match seasonal themes
- 📱 Provide consistent UX across features

**No more waiting for app updates!** 🚀

