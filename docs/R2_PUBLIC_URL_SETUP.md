# 🔗 R2 Public URL Configuration Guide

## Understanding R2 Bucket Public URLs

When you enable public access on each R2 bucket in Cloudflare, **each bucket gets its own unique public URL**. This is important for the app to correctly generate URLs for your media files.

---

## 📊 The Problem

When you enable public access on a bucket in Cloudflare, you'll see something like:

```
Bucket: media-listings
Public URL: https://pub-abc123def456.r2.dev
```

```
Bucket: media-videos  
Public URL: https://pub-xyz789ghi012.r2.dev
```

**Each bucket has a DIFFERENT hash in its URL!**

---

## ✅ Solution: Configure Bucket URLs

### Step 1: Get Public URLs from Cloudflare

For each bucket, after enabling public access:

1. Go to **Cloudflare Dashboard** → **R2**
2. Click on bucket (e.g., `media-listings`)
3. Go to **Settings** tab
4. Under **Public Access**, copy the **Public bucket URL**
5. It will look like: `https://pub-abc123def456.r2.dev`

Do this for all 4 public buckets.

---

### Step 2: Add URLs to .env File

#### **Option A: Individual Bucket URLs (Recommended)**

Add each bucket's public URL to your `.env` file:

```env
# R2 Credentials (required)
EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your_account_id
EXPO_PUBLIC_R2_ACCESS_KEY_ID=your_access_key_id
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your_secret_key

# Individual bucket public URLs (copy from Cloudflare dashboard)
EXPO_PUBLIC_R2_LISTINGS_URL=https://pub-abc123def456.r2.dev
EXPO_PUBLIC_R2_VIDEOS_URL=https://pub-xyz789ghi012.r2.dev
EXPO_PUBLIC_R2_COMMUNITY_URL=https://pub-jkl345mno678.r2.dev
EXPO_PUBLIC_R2_CHAT_URL=https://pub-pqr901stu234.r2.dev
```

**This is the most accurate method!**

---

#### **Option B: Custom Domain (Alternative)**

If you set up a custom domain (e.g., `cdn.sellar.app`) that routes to all buckets:

```env
# R2 Credentials (required)
EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your_account_id
EXPO_PUBLIC_R2_ACCESS_KEY_ID=your_access_key_id
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your_secret_key

# Single global CDN URL
EXPO_PUBLIC_R2_PUBLIC_URL=https://cdn.sellar.app
```

**Note:** This requires additional Cloudflare configuration (Workers, custom domains, routing rules).

---

### Step 3: Restart Your App

```bash
npm start -- --clear
```

---

## 🔍 How to Get Bucket Public URLs

### Detailed Steps:

1. **Go to Cloudflare Dashboard**
   - Navigate to R2 section

2. **For bucket `media-listings`:**
   - Click on the bucket name
   - Go to Settings tab
   - Find "Public Access" section
   - If not enabled, click "Allow Access"
   - Copy the "Public bucket URL" (e.g., `https://pub-abc123.r2.dev`)
   - Add to .env as `EXPO_PUBLIC_R2_LISTINGS_URL`

3. **Repeat for `media-videos`:**
   - Copy its public URL
   - Add to .env as `EXPO_PUBLIC_R2_VIDEOS_URL`

4. **Repeat for `media-community`:**
   - Copy its public URL
   - Add to .env as `EXPO_PUBLIC_R2_COMMUNITY_URL`

5. **Repeat for `chat-attachments`:**
   - Copy its public URL
   - Add to .env as `EXPO_PUBLIC_R2_CHAT_URL`

---

## 📝 Example Configuration

### Real Example .env File:

```env
# R2 Credentials
EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID=a1b2c3d4e5f6
EXPO_PUBLIC_R2_ACCESS_KEY_ID=abc123def456ghi789
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=xyz987wvu654tsr321

# Bucket Public URLs (get these from Cloudflare)
EXPO_PUBLIC_R2_LISTINGS_URL=https://pub-12abc34def56.r2.dev
EXPO_PUBLIC_R2_VIDEOS_URL=https://pub-78ghi90jkl12.r2.dev
EXPO_PUBLIC_R2_COMMUNITY_URL=https://pub-34mno56pqr78.r2.dev
EXPO_PUBLIC_R2_CHAT_URL=https://pub-90stu12vwx34.r2.dev
```

---

## 🎯 Expected URL Output

After configuration, your media URLs will be:

**Listing Images:**
```
https://pub-12abc34def56.r2.dev/listing/user123/1234567_abc.jpg
```

**Videos:**
```
https://pub-78ghi90jkl12.r2.dev/listing/user123/1234567_def.mp4
```

**Community Posts:**
```
https://pub-34mno56pqr78.r2.dev/posts/user123/1234567_ghi.jpg
```

**Chat Attachments:**
```
https://pub-90stu12vwx34.r2.dev/chat/conversation123/1234567_jkl.jpg
```

---

## ⚠️ Common Mistakes

### ❌ Using the same URL for all buckets:
```env
# WRONG - Don't do this!
EXPO_PUBLIC_R2_LISTINGS_URL=https://pub-abc123.r2.dev
EXPO_PUBLIC_R2_VIDEOS_URL=https://pub-abc123.r2.dev  # Same URL - WRONG!
```

Each bucket has a DIFFERENT public URL!

### ❌ Including bucket name in URL:
```env
# WRONG
EXPO_PUBLIC_R2_LISTINGS_URL=https://pub-abc123.r2.dev/media-listings
```

The bucket name is NOT part of the base URL. Just use:
```env
# CORRECT
EXPO_PUBLIC_R2_LISTINGS_URL=https://pub-abc123.r2.dev
```

---

## 🧪 Testing

After adding URLs to .env and restarting:

1. **Upload a new image**
2. **Check console logs** - you should see the full R2 URL
3. **Copy the URL** and open in browser
4. **If it loads** → ✅ Configuration correct!
5. **If 404 error** → ❌ Check bucket URL is correct

---

## 🚀 Alternative: Custom Domain (Advanced)

For production, you can set up ONE custom domain that routes to all buckets:

### Setup:
1. In Cloudflare, go to R2 → select bucket
2. Settings → Custom Domains
3. Add domain: `cdn.sellar.app`
4. Cloudflare configures DNS automatically
5. Repeat for all buckets with same domain

### Then in .env:
```env
# Single global CDN URL
EXPO_PUBLIC_R2_PUBLIC_URL=https://cdn.sellar.app
```

**Benefits:**
- ✅ Simpler configuration (one URL)
- ✅ Better branding
- ✅ Better caching
- ✅ SSL included

**URLs will look like:**
```
https://cdn.sellar.app/media-listings/listing/user123/image.jpg
https://cdn.sellar.app/media-videos/listing/user123/video.mp4
```

---

## 📋 Quick Checklist

- [ ] Enable public access on all 4 buckets in Cloudflare
- [ ] Copy each bucket's public URL from Cloudflare dashboard
- [ ] Add all 4 URLs to `.env` file
- [ ] Verify URLs are different for each bucket
- [ ] Restart app with `--clear` flag
- [ ] Test image upload and verify URL loads in browser
- [ ] Images/videos should now display correctly!

---

## 💡 Pro Tip

Use descriptive names in your .env file and keep them organized:

```env
# ============================================
# CLOUDFLARE R2 CONFIGURATION
# ============================================

# Account & Credentials
EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your_account_id
EXPO_PUBLIC_R2_ACCESS_KEY_ID=your_access_key
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your_secret_key

# Bucket Public URLs (from Cloudflare dashboard)
# Copy these exactly from: R2 → Bucket → Settings → Public Access
EXPO_PUBLIC_R2_LISTINGS_URL=https://pub-12abc34def56.r2.dev  # media-listings bucket
EXPO_PUBLIC_R2_VIDEOS_URL=https://pub-78ghi90jkl12.r2.dev    # media-videos bucket
EXPO_PUBLIC_R2_COMMUNITY_URL=https://pub-34mno56pqr78.r2.dev # media-community bucket
EXPO_PUBLIC_R2_CHAT_URL=https://pub-90stu12vwx34.r2.dev      # chat-attachments bucket
```

---

## ✅ Verification

Once configured correctly, check the app console when uploading. You should see:

```
✅ R2 Storage initialized - using hybrid storage (Supabase + R2)
🎬 Detected video file, using video upload method (if uploading video)
✅ Upload successful
URL: https://pub-abc123.r2.dev/listing/user456/12345_xyz.jpg
```

And images/videos should load instantly on cards! 🎉

