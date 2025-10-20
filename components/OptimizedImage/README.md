# Image Optimization Implementation Guide

## 🎯 Goal: Reduce Egress by 70-90%

### 1. Replace All Image Components

**Before (High Egress):**
```tsx
// ❌ Direct Supabase URLs - no optimization
<Image source={{ uri: `https://your-project.supabase.co/storage/v1/object/public/listing-images/${imagePath}` }} />
```

**After (Optimized):**
```tsx
// ✅ CDN optimized with caching
<CDNOptimizedImage 
  bucket="listing-images"
  path={imagePath}
  width={300}
  height={300}
  quality="medium"
/>
```

### 2. Update PostCard Component

```tsx
// In components/PostCard/PostCard.tsx
import { CDNOptimizedImage } from '@/components/OptimizedImage/CDNOptimizedImage';

// Replace PostImage usage:
<CDNOptimizedImage
  bucket="community-images"
  path={post.image_url}
  width={300}
  height={200}
  quality="medium"
  style={styles.postImage}
/>
```

### 3. Update Listing Components

```tsx
// In components/ListingCard/ListingCard.tsx
<CDNOptimizedImage
  bucket="listing-images"
  path={listing.image_url}
  width={200}
  height={150}
  quality="medium"
  style={styles.listingImage}
/>
```

### 4. Update Profile Images

```tsx
// In components/Avatar/Avatar.tsx
<CDNOptimizedImage
  bucket="profile-images"
  path={profile.avatar_url}
  width={50}
  height={50}
  quality="medium"
  style={styles.avatar}
/>
```

## 🔧 Configuration

### CDN Settings
```tsx
// lib/cdnOptimization.ts
const CDN_CONFIG = {
  // Enable WebP format (30% smaller than JPEG)
  format: 'webp',
  
  // Quality settings by use case
  quality: {
    thumbnail: 60,
    small: 70,
    medium: 80,
    large: 85
  },
  
  // Size limits
  maxWidth: {
    thumbnail: 150,
    small: 300,
    medium: 600,
    large: 1200
  }
};
```

### Caching Settings
```tsx
// lib/imageCache.ts
const CACHE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB cache
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxEntries: 1000
};
```

## 📊 Expected Results

- **70-90% reduction** in egress
- **Faster loading** with cached images
- **Better UX** with progressive loading
- **Lower costs** with optimized requests

## 🚨 Critical Changes

1. **Replace all direct Supabase URLs** with CDNOptimizedImage
2. **Enable WebP format** for all images
3. **Implement proper caching** headers
4. **Use responsive sizing** based on screen size
5. **Preload critical images** only
