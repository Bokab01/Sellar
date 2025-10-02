# 🎨 Community Screen Skeleton Update

## Summary

Updated the Community screen loading skeleton to accurately match the actual PostCard UI structure, providing a better loading experience.

---

## 📊 Before vs After

### **Before:**
- Generic rectangular skeleton boxes
- No resemblance to actual PostCard structure
- Poor user expectation setting

### **After:**
- Accurate PostCard skeleton structure
- Matches real UI layout
- Shows post type badge, author info, content, optional images, and actions
- Alternates image display (every other post)

---

## 🎯 What Changed

### 1. **Created `PostCardSkeleton` Component**
**File:** `components/LoadingSkeleton/PostCardSkeleton.tsx`

```typescript
export function PostCardSkeleton({ showImage = false }: PostCardSkeletonProps)
```

**Features:**
- **Post Type Badge** - 80px rounded badge at top
- **Author Section** - 40px circular avatar + name/timestamp lines
- **Content Lines** - 3 lines of varying widths (100%, 90%, 70%)
- **Optional Image** - 200px height image placeholder
- **Footer Actions** - 3 action buttons (Like, Comment, Share)

**Layout Structure:**
```
┌─────────────────────────────────┐
│ 🏷️ Post Type Badge       ⋮     │
│                                  │
│ 👤 Avatar  Name                 │
│           Timestamp              │
│                                  │
│ ──────────────────────────       │
│ ─────────────────────            │
│ ──────────────                   │
│                                  │
│ [Optional Image Placeholder]     │
│                                  │
│ 👍 60px  💬 60px  🔗 60px        │
└─────────────────────────────────┘
```

### 2. **Updated Community Screen**
**File:** `app/(tabs)/community/index.tsx`

**Before:**
```typescript
{Array.from({ length: 3 }).map((_, index) => (
  <LoadingSkeleton
    key={index}
    width="100%"
    height={200}
    borderRadius={theme.borderRadius.lg}
    style={{ marginBottom: theme.spacing.lg }}
  />
))}
```

**After:**
```typescript
{Array.from({ length: 3 }).map((_, index) => (
  <PostCardSkeleton 
    key={index} 
    showImage={index % 2 === 0}  // Alternate image display
  />
))}
```

### 3. **Exported Component**
**File:** `components/index.ts`

```typescript
export { PostCardSkeleton } from './LoadingSkeleton/PostCardSkeleton';
```

---

## ✨ Features

### 1. **Accurate UI Representation**
- Matches real PostCard dimensions
- Shows all key sections (badge, author, content, actions)
- Uses correct spacing and border radius

### 2. **Visual Variety**
- Alternates image display (`showImage` prop)
- Some posts show images, some don't
- Creates realistic loading pattern

### 3. **Consistent Styling**
- Uses theme colors and spacing
- Matches PostCard border and shadow
- Proper padding and gaps

### 4. **Reusable Component**
- Can be used in any screen showing PostCards
- Configurable image display
- Easy to maintain

---

## 🎨 Design Details

### **Colors:**
- Background: `theme.colors.surface`
- Border: `theme.colors.border` (1px)
- Skeleton: Shimmer animation (light theme: light gray, dark theme: dark gray)

### **Spacing:**
- Card padding: `theme.spacing.md`
- Gap between elements: `theme.spacing.sm`
- Bottom margin: `theme.spacing.md`

### **Dimensions:**
- Avatar: 40x40px (circle)
- Post type badge: 80px width, 20px height
- Image placeholder: Full width, 200px height
- Action buttons: 60px width, 20px height

---

## 📱 User Experience Benefits

1. **Better Loading Expectations**
   - Users know exactly what's coming
   - Reduces perceived loading time
   - Professional feel

2. **Consistency**
   - Loading state matches loaded state
   - No jarring transitions
   - Smooth experience

3. **Realistic Preview**
   - Shows actual content structure
   - Alternating images adds variety
   - Feels like real content loading

---

## 🔄 Reusability

The `PostCardSkeleton` can be used in:
- ✅ Community main screen
- ✅ My Posts screen
- ✅ Following feed
- ✅ Events screen
- ✅ Any screen showing PostCards

**Usage:**
```typescript
import { PostCardSkeleton } from '@/components';

// Show skeleton with image
<PostCardSkeleton showImage />

// Show skeleton without image
<PostCardSkeleton />

// Multiple skeletons
{Array.from({ length: 5 }).map((_, i) => (
  <PostCardSkeleton key={i} showImage={i % 2 === 0} />
))}
```

---

## ✅ Testing Checklist

- [x] Component renders without errors
- [x] Matches PostCard layout
- [x] Works in light mode
- [x] Works in dark mode
- [x] Image display alternates correctly
- [x] Exported and importable
- [ ] Test on slow network
- [ ] Verify on physical device

---

**Status:** ✅ Complete - Community skeleton now matches the actual UI!

