# Apply Social Features to Database

## Quick Setup Instructions

### Step 1: Copy the SQL Script
1. Open `supabase/add-social-features.sql` in your IDE
2. Copy ALL the contents (Ctrl+A, Ctrl+C)

### Step 2: Apply to Supabase
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a **New Query**
4. Paste the copied SQL script
5. Click **Run** to execute

### Step 3: Verify Installation
After running the script, you should see:
```
✅ Social features added successfully!
```

## What This Adds:

### 🗄️ Database Tables:
- `follows` - Follower/following relationships
- New columns in `profiles`:
  - `followers_count`
  - `following_count` 
  - `posts_count`
  - `listings_count`

### ⚙️ RPC Functions:
- `follow_user(target_user_id)`
- `unfollow_user(target_user_id)`
- `is_following(target_user_id)`
- `get_user_followers(target_user_id, page_limit, page_offset)`
- `get_user_following(target_user_id, page_limit, page_offset)`

### 🔒 Security:
- Row Level Security (RLS) policies
- Automatic count updates via triggers
- Constraint checks (no self-following, unique follows)

### 📊 Features Enabled:
- Real follower/following counts in sidebar
- Follow/unfollow functionality
- Credit balance display
- Social stats tracking

## Troubleshooting:

### If you get errors:
1. **"relation already exists"** - Safe to ignore, means some tables already exist
2. **"function already exists"** - Safe to ignore, means some functions already exist
3. **"permission denied"** - Make sure you're using the correct Supabase project

### If sidebar still shows 0 counts:
1. Refresh the app (pull down on Community screen)
2. Close and reopen the sidebar
3. The counts will update automatically as you use the features

## Test the Features:

After applying the migration:
1. Open the Community sidebar
2. Check that credit balance shows (may be 0 initially)
3. Navigate to Following/Followers screens
4. They should now load without errors
5. Try following/unfollowing users (when available)

---

**The social features are now ready to use!** 🎉
