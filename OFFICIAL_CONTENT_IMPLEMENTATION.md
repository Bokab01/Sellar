# Official Sellar Ghana Content Implementation

## 📋 Overview

This document describes the implementation of the official "Sellar Ghana" branding for posts and comments created by admins from the admin dashboard.

## 🎯 Purpose

When admins create posts or comments from the admin dashboard, they now appear on the mobile app with:
- Display name: **"Sellar Ghana"**
- Avatar: **Sellar Logo** (instead of admin's personal avatar)
- Badge: **"OFFICIAL"** badge with verified icon
- Non-clickable profile (prevents navigation to profile page)

## 🗄️ Database Setup

### System User
A dedicated system user has been created for official content:

```sql
User ID: 00000000-0000-0000-0000-000000000001
Email: official@sellarghana.com
Display Name: Sellar Ghana
```

All admin posts and comments now use this system user ID instead of individual admin IDs.

## 🛠️ Implementation

### 1. Helper Utility (`lib/officialContent.ts`)

Core utilities for identifying and transforming official content:

```typescript
// Constants
export const OFFICIAL_SELLAR_USER_ID = '00000000-0000-0000-0000-000000000001';

// Functions
- isOfficialSellarContent(userId): Check if content is official
- getOfficialDisplayName(): Returns "Sellar Ghana"
- getOfficialAvatarUrl(): Returns logo path
- transformOfficialUser(user): Transform user data for display
```

### 2. Official Badge Component (`components/OfficialBadge/`)

A reusable badge component for marking official content:

**Variants:**
- `default` - Full badge with white background
- `compact` - Subtle badge with light background
- `icon-only` - Just the verified icon

**Sizes:**
- `sm` - Small (for comments)
- `md` - Medium (default)
- `lg` - Large (for emphasis)

**Usage:**
```tsx
<OfficialBadge variant="compact" size="sm" />
```

### 3. PostCard Component Updates

**Changes:**
- ✅ Detects official content via `isOfficialSellarContent()`
- ✅ Displays "Sellar Ghana" name instead of admin name
- ✅ Shows Sellar logo as avatar
- ✅ Adds "OFFICIAL" badge next to name
- ✅ Disables profile navigation for official posts
- ✅ Hides PRO badge for official content

**Key Code:**
```tsx
const isOfficial = isOfficialSellarContent(post.author.id);
const displayName = isOfficial ? getOfficialDisplayName() : post.author.name;

// Get theme-aware official icon
const officialIcon = isDarkMode
  ? require('../../assets/icon/icon-dark.png')
  : require('../../assets/icon/icon-light.png');

const avatarSource = isOfficial ? officialIcon : post.author.avatar;

{isOfficial && <OfficialBadge variant="compact" size="sm" />}
```

### 4. CommentCard Component Updates

**Changes:**
- ✅ Detects official comments via `isOfficialSellarContent()`
- ✅ Displays "Sellar Ghana" name
- ✅ Shows Sellar logo as avatar
- ✅ Adds "OFFICIAL" badge
- ✅ Disables profile navigation for official comments
- ✅ Hides verified checkmark for official content

**Key Code:**
```tsx
const isOfficial = isOfficialSellarContent(comment.author.id);
const displayName = isOfficial ? getOfficialDisplayName() : comment.author.name;

// Get theme-aware official icon
const officialIcon = isDarkMode
  ? require('../../assets/icon/icon-dark.png')
  : require('../../assets/icon/icon-light.png');

const avatarSource = isOfficial ? officialIcon : comment.author.avatar;

{isOfficial && <OfficialBadge variant="compact" size="sm" />}
```

## 🎨 Visual Design

### Theme Support
The official branding is **fully theme-aware**:
- **Light Mode**: Uses `icon-light.png` (dark icon on light background)
- **Dark Mode**: Uses `icon-dark.png` (light icon on dark background)
- **AMOLED Mode**: Uses `icon-dark.png` (light icon on pure black)
- **Automatic Switching**: Icon changes instantly when user switches themes

### Official Badge Styling
- **Background**: Primary color with transparency (`primary + '15'`)
- **Text**: Bold, uppercase "OFFICIAL"
- **Icon**: Shield/Badge check icon
- **Color**: Primary brand color

### Avatar Display
- Official posts use the **Sellar app icon** as the avatar
- Avatar is **theme-aware** (switches between light and dark icon)
- Avatar is **non-clickable** for official content
- Maintains same size as regular user avatars for consistency
- Uses explicit dimensions (48x48 for posts, 24x24 for comments)

### Name Display
- **Font Weight**: 600 (semi-bold)
- **Text**: "Sellar Ghana"
- **Badge Position**: Inline, right after name

## 🔄 Data Flow

### Posts
1. Admin creates post in admin dashboard
2. Post is created with `user_id = '00000000-0000-0000-0000-000000000001'`
3. Mobile app fetches post with profile data
4. PostCard detects official user ID
5. Displays with official branding

### Comments
1. Admin creates comment in admin dashboard
2. Comment is created with `user_id = '00000000-0000-0000-0000-000000000001'`
3. Mobile app fetches comment with profile data
4. CommentCard detects official user ID
5. Displays with official branding

## 📱 Affected Screens

- **Community Feed** (`app/(tabs)/community/index.tsx`)
- **Post Detail** (`app/(tabs)/community/[postId].tsx`)
- All other screens that display `PostCard` or `CommentCard`

## 🧪 Testing Checklist

### Posts
- [ ] Official posts show "Sellar Ghana" name
- [ ] Official posts show Sellar logo as avatar
- [ ] Official posts display "OFFICIAL" badge
- [ ] Official posts are not clickable (no profile navigation)
- [ ] Official posts don't show PRO badge
- [ ] Regular posts still work normally

### Comments
- [ ] Official comments show "Sellar Ghana" name
- [ ] Official comments show Sellar logo as avatar
- [ ] Official comments display "OFFICIAL" badge
- [ ] Official comments are not clickable (no profile navigation)
- [ ] Official comments don't show verified checkmark
- [ ] Regular comments still work normally
- [ ] Nested replies work correctly

### Badge Display
- [ ] Badge is visible and properly styled
- [ ] Badge doesn't overlap with other elements
- [ ] Badge is responsive to different screen sizes
- [ ] Badge colors match theme (light/dark mode)

## 🔧 Maintenance

### Adding More Official Users
To add more official system accounts in the future:

1. Create a new UUID constant in `lib/officialContent.ts`
2. Update `isOfficialSellarContent()` to check multiple IDs
3. Create the user in the database with the SQL migration pattern

### Changing Official Branding
To change the official display name or avatar:

1. Update `getOfficialDisplayName()` in `lib/officialContent.ts`
2. Update `getOfficialAvatarUrl()` or change the `require()` path
3. Update the database profile record if needed

### Customizing Badge Appearance
To change badge styling:

1. Edit `components/OfficialBadge/OfficialBadge.tsx`
2. Modify colors, icons, or text
3. Add new variants if needed

## 🚀 Future Enhancements

Potential improvements:

1. **Multiple Badge Types**
   - Partner badge
   - Verified business badge
   - Community leader badge

2. **Custom Roles**
   - Support team
   - Moderator
   - Ambassador

3. **Enhanced Analytics**
   - Track engagement on official posts
   - Measure official content reach

4. **Admin Dashboard Integration**
   - Preview official branding before posting
   - Toggle official mode on/off

## 📚 Related Files

### Created
- `lib/officialContent.ts` - Core utility functions
- `components/OfficialBadge/OfficialBadge.tsx` - Badge component
- `components/OfficialBadge/index.ts` - Export
- `OFFICIAL_CONTENT_IMPLEMENTATION.md` - This document

### Modified
- `components/PostCard/PostCard.tsx` - Official post display
- `components/CommentCard/CommentCard.tsx` - Official comment display
- `components/index.ts` - Added OfficialBadge export

### Database
- Migration creating system user (already applied)

## 💡 Best Practices

1. **Always use the helper functions** from `lib/officialContent.ts` instead of hardcoding IDs
2. **Keep branding consistent** across all components
3. **Test in both light and dark modes**
4. **Ensure accessibility** (badge text, contrast ratios)
5. **Handle edge cases** (missing avatars, null user IDs)

## 🐛 Troubleshooting

### Badge not showing
- Check if `isOfficialSellarContent()` returns true
- Verify user_id matches `OFFICIAL_SELLAR_USER_ID`
- Ensure OfficialBadge is imported correctly

### Avatar not displaying
- Check if `require('../../assets/icon/icon-light.png')` and `icon-dark.png` paths are correct
- Verify both icon files exist in `assets/icon/` folder
- Ensure theme.mode is accessible and correct
- Check if the Image component is properly rendering with explicit dimensions

### Profile navigation still works
- Ensure `disabled={isOfficial}` prop is set
- Check TouchableOpacity's `onPress` handler
- Verify the `!isOfficial` condition is correct

---

**Implementation Date**: October 13, 2025  
**Status**: ✅ Complete and Ready for Testing

