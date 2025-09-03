# 🔥 Trending System Setup Guide

## Overview
The trending system automatically tracks hashtags in posts and provides real-time trending topics and posts based on engagement metrics.

## 🗄️ Database Setup

### Step 1: Apply Trending System Migration
1. Copy the contents of `supabase/trending-system.sql`
2. Paste into your Supabase SQL Editor
3. Run the script
4. Verify you see: `✅ Trending system setup completed!`

### Step 2: Test the Setup (Optional)
1. Copy the contents of `supabase/test-trending-system.sql`
2. Paste into your Supabase SQL Editor
3. Run the test script
4. Verify all tests show ✅ status

### What This Creates:

#### **📊 New Tables:**
- `hashtags` - Stores all hashtags with engagement metrics
- `post_hashtags` - Links posts to hashtags (many-to-many)
- `trending_topics` - Time-based trending data with rankings

#### **⚙️ RPC Functions:**
- `extract_hashtags(content)` - Extracts hashtags from text
- `process_post_hashtags(post_id, content)` - Links hashtags to posts
- `get_trending_hashtags(time_period, limit)` - Gets trending topics
- `get_trending_posts(time_period, limit)` - Gets trending posts
- `get_posts_by_hashtag(hashtag, limit, offset)` - Gets posts by hashtag

#### **🔄 Automatic Processing:**
- **Triggers** automatically extract hashtags from new posts
- **Engagement tracking** updates hashtag popularity
- **Count updates** maintain accurate statistics

## 🎯 Features Implemented

### **📱 Trending Screen:**
- **Two Tabs**: Topics and Posts
- **Real-time Data**: Fetches from database
- **Fallback Handling**: Works with or without migration
- **Error States**: Helpful messages for setup issues

### **🏷️ Hashtag System:**
- **Auto-extraction**: Hashtags automatically detected in posts
- **Engagement Tracking**: Likes and comments boost hashtag popularity
- **Category Classification**: Hashtags categorized by content type
- **Growth Analytics**: Percentage growth calculations

### **📊 Trending Topics:**
- **Ranking System**: Top hashtags by engagement
- **Sample Posts**: Preview of popular posts for each hashtag
- **Category Colors**: Visual categorization
- **Growth Indicators**: Trending up/down indicators

### **🔥 Trending Posts:**
- **Engagement Sorting**: Posts ranked by likes + comments + views
- **Author Information**: Profile pictures and names
- **Hashtag Display**: Clickable hashtag chips
- **Time-based Filtering**: Recent posts get priority

## 🧪 Testing the System

### **Without Migration (Fallback Mode):**
1. Navigate to Trending screen
2. Should show helpful error message
3. Fallback queries will show basic post data
4. No hashtag functionality yet

### **With Migration Applied:**
1. Navigate to Trending screen
2. Should load real trending data
3. Switch between Topics and Posts tabs
4. Click on hashtags to see details
5. Posts automatically processed for hashtags

## 📝 How It Works

### **Hashtag Processing:**
```sql
-- When a post is created:
1. extract_hashtags() finds all #hashtags in content
2. process_post_hashtags() links them to the post
3. Hashtag counts automatically update
4. Engagement metrics track popularity
```

### **Trending Calculation:**
```sql
-- Trending score based on:
- Posts count (how many posts use this hashtag)
- Engagement count (total likes + comments)
- Recency (recent activity weighted higher)
- Growth percentage (engagement rate)
```

### **Real-time Updates:**
- New posts automatically processed
- Hashtag counts update instantly
- Trending rankings recalculated
- No manual maintenance required

## 🎨 UI Features

### **Professional Design:**
- **Ranking Badges**: Top 3 hashtags get special badges
- **Category Colors**: Different colors for different categories
- **Growth Indicators**: Visual trending arrows
- **Engagement Stats**: Likes, comments, views display

### **Interactive Elements:**
- **Clickable Hashtags**: Navigate to hashtag-specific posts
- **Post Navigation**: Tap posts to view details
- **Pull to Refresh**: Update trending data
- **Tab Switching**: Topics vs Posts views

### **Error Handling:**
- **Migration Required**: Clear setup instructions
- **Network Errors**: Retry functionality
- **Empty States**: Helpful guidance for new users
- **Loading States**: Smooth skeleton loaders

## 🚀 Next Steps

### **After Setup:**
1. Create some posts with hashtags (e.g., "#electronics #deals")
2. Like and comment on posts to boost engagement
3. Check trending screen to see hashtags appear
4. Watch rankings update based on activity

### **Future Enhancements:**
- Hashtag-specific post screens
- Trending notifications
- Hashtag following
- Advanced analytics dashboard
- Trending time periods (hourly, daily, weekly)

## 📊 Sample Hashtags to Try:
- `#GhanaDeals` - General marketplace deals
- `#TechTuesday` - Technology posts
- `#FashionFinds` - Fashion and style
- `#HomeDecor` - Home improvement
- `#WeekendMarket` - Weekend shopping
- `#BuyerTips` - Shopping advice
- `#SellerLife` - Seller experiences

---

**The trending system is now fully integrated and ready to track your community's interests!** 🎉
