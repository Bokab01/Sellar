# 🔧 R2 CORS & Public Access Setup Guide

## Issue: Images/Videos Upload but Don't Display (Blank)

If your media uploads successfully to R2 but appears blank on listing/post cards, you need to configure CORS and public access.

---

## 🎯 Quick Fix (5 minutes)

### Step 1: Enable Public Access on R2 Buckets

For **each public bucket**, enable public access:

1. **Go to Cloudflare Dashboard** → R2
2. **Click on each bucket** (one at a time):
   - `media-listings`
   - `media-videos`
   - `media-community`
   - `chat-attachments`

3. **For each bucket:**
   - Go to **Settings** tab
   - Find **Public Access** section
   - Click **"Allow Access"** or **"Connect Domain"**
   - If using custom domain, enter it (e.g., `cdn.sellar.app`)
   - If not, R2 will provide a public URL: `https://pub-<account-id>.r2.dev`

4. **Keep PRIVATE:**
   - `verification-documents` (should NOT be public)

---

### Step 2: Configure CORS Rules

For **each public bucket**, add CORS rules:

1. **Go to Cloudflare Dashboard** → R2 → Select bucket
2. Go to **Settings** tab
3. Find **CORS policy** section
4. Click **"Add CORS policy"** or **"Edit"**
5. Add this CORS configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Apply to these buckets:**
- ✅ `media-listings`
- ✅ `media-videos`
- ✅ `media-community`
- ✅ `chat-attachments`

---

### Step 3: Update R2 Public URL in Environment

If you enabled public access, R2 gave you a public URL. Add it to your `.env`:

```env
# Add this to your .env file
EXPO_PUBLIC_R2_PUBLIC_URL=https://pub-YOUR_ACCOUNT_ID.r2.dev
```

**Or if using custom domain:**
```env
EXPO_PUBLIC_R2_PUBLIC_URL=https://cdn.sellar.app
```

---

### Step 4: Restart Your App

```bash
npm start -- --clear
```

---

## 🔍 Testing

### Test if URLs are accessible:

1. **Upload a new image** (listing or community post)
2. **Copy the image URL** from the network tab or console
3. **Open URL in browser directly**
   - ✅ If it loads: CORS is configured correctly
   - ❌ If it fails: Check public access settings

### Example URLs:

**With custom domain:**
```
https://cdn.sellar.app/media-listings/listing/user123/12345_abc.jpg
```

**With R2 public URL:**
```
https://pub-abcd1234.r2.dev/media-listings/listing/user123/12345_abc.jpg
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "Access Denied" or 403 Error

**Cause:** Public access not enabled
**Fix:** 
1. Go to R2 bucket → Settings → Public Access
2. Click "Allow Access"
3. Save and wait 1-2 minutes for changes to propagate

---

### Issue 2: CORS Error in Browser Console

**Cause:** CORS policy not configured
**Fix:**
1. Add CORS policy (see Step 2 above)
2. Make sure `AllowedOrigins` includes `"*"` or your domain
3. Include `GET` and `HEAD` methods

---

### Issue 3: Images Still Don't Load After Setup

**Possible causes:**
1. **Cached old URLs** - Clear app cache and restart
2. **Wrong public URL** - Check `EXPO_PUBLIC_R2_PUBLIC_URL` in `.env`
3. **DNS not propagated** - Wait 5-10 minutes if using custom domain
4. **Bucket name mismatch** - Verify bucket names match exactly

**Debug steps:**
```bash
# 1. Check what URL is being generated
# Look in app console for upload success messages

# 2. Test URL directly in browser
# Copy the URL and open in new tab

# 3. Check R2 dashboard
# Verify files are actually uploaded to correct bucket

# 4. Restart with fresh cache
npm start -- --clear
```

---

## 📋 Checklist

Before reporting issues, verify:

- [ ] Public access enabled on all public buckets
- [ ] CORS policy added to all public buckets
- [ ] `EXPO_PUBLIC_R2_PUBLIC_URL` in `.env` (if using public URL)
- [ ] App restarted after .env changes
- [ ] Image URL accessible directly in browser
- [ ] No CORS errors in browser/app console
- [ ] Bucket names match exactly in code and Cloudflare

---

## 🎯 Alternative: Custom Domain Setup (Recommended for Production)

### Why Custom Domain?

- ✅ Better branding (`cdn.sellar.app` vs `pub-xyz.r2.dev`)
- ✅ Better caching
- ✅ More control
- ✅ SSL certificate included

### Setup Steps:

1. **In Cloudflare Dashboard:**
   - R2 → Select bucket
   - Settings → Custom Domains
   - Click "Connect Domain"
   - Enter: `cdn.sellar.app` (or your subdomain)
   - Cloudflare auto-configures DNS

2. **Update .env:**
   ```env
   EXPO_PUBLIC_R2_PUBLIC_URL=https://cdn.sellar.app
   ```

3. **Enable Caching (Optional but recommended):**
   - Cloudflare Dashboard → Rules → Page Rules
   - Add rule: `cdn.sellar.app/*`
   - Settings:
     - Browser Cache TTL: 1 year
     - Cache Level: Everything
   - Save

4. **Wait for DNS propagation:** 5-10 minutes

---

## 🔐 Security Note

**Public buckets are safe because:**
- ✅ URLs are hard to guess (random filenames)
- ✅ No directory listing enabled
- ✅ Users can only read, not write
- ✅ Verification documents use private bucket with signed URLs

---

## 💡 Pro Tips

1. **Use custom domain in production** - Better performance and branding
2. **Enable cache rules** - Dramatically improves load times
3. **Monitor bandwidth usage** - Even though egress is free, monitor for abuse
4. **Test in both environments** - Development and production may have different CORS requirements

---

## 📞 Still Having Issues?

If images still don't load after following this guide:

1. **Check browser console** for specific error messages
2. **Test URL directly** in browser (should download/display)
3. **Verify bucket settings** in Cloudflare dashboard
4. **Check R2 storage** to confirm files are uploaded
5. **Clear all caches** and restart app with `--clear` flag

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Images load on listing cards
- ✅ Videos play in app
- ✅ Community post images display
- ✅ Chat attachments load
- ✅ No CORS errors in console
- ✅ URLs are accessible in browser

**After setup, all media should load instantly!** 🎉

