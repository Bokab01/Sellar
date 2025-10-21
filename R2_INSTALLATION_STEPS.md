# 📦 Quick Installation Steps for Cloudflare R2

## 1. Install Required Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner base-64
npm install --save-dev @types/base-64
```

## 2. Add Environment Variables

Create or update your `.env` file with:

```env
# Cloudflare R2 Configuration
EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your_account_id_here
EXPO_PUBLIC_R2_ACCESS_KEY_ID=your_access_key_id_here
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your_secret_access_key_here

# Optional: Custom CDN Domain
# EXPO_PUBLIC_R2_PUBLIC_URL=https://cdn.sellar.app
```

## 3. Get Your Credentials from Cloudflare

### Get Account ID:
1. Go to Cloudflare Dashboard
2. Click R2 → Overview
3. Copy Account ID (top right)

### Create API Token:
1. R2 → Manage R2 API Tokens
2. Click "Create API Token"
3. Name: `Sellar Mobile App`
4. Permissions:
   - ✅ Object Read & Write
   - ✅ Bucket Read
5. Click "Create API Token"
6. **SAVE BOTH KEYS IMMEDIATELY** (Secret shown only once!)

## 4. Enable Public Access on R2 Buckets

For these buckets, enable public access:
- `media-listings`
- `media-videos`
- `media-community`
- `chat-attachments`

**Steps:**
1. Go to R2 → Select bucket
2. Settings → Public Access
3. Click "Allow Access"

**Keep PRIVATE:**
- `verification-documents` (uses signed URLs)

## 5. Restart Development Server

```bash
npm start -- --clear
```

## 6. Test It Works

### Check Console on App Start:
You should see:
```
✅ R2 Storage initialized successfully
```

### Test Upload:
1. Create a new listing
2. Upload photos
3. Check URLs contain `.r2.dev` or your custom domain

## 7. Verify Storage Routing

Add this temporarily to any screen:

```typescript
import { hybridStorage } from '@/lib/hybridStorage';

console.log('Storage Stats:', hybridStorage.getStorageStats());
```

Expected output:
```javascript
{
  r2Available: true,
  profilesProvider: 'supabase',  // ✅ Profiles stay on Supabase
  listingsProvider: 'r2',         // ✅ Listings go to R2
  communityProvider: 'r2',        // ✅ Community goes to R2
  chatProvider: 'r2',             // ✅ Chat goes to R2
  videosProvider: 'r2',           // ✅ Videos go to R2
  verificationProvider: 'r2'      // ✅ Verification goes to R2
}
```

## ✅ Done!

Your app now uses Cloudflare R2 for most media storage, saving **~$91/month** on storage and bandwidth costs!

---

## 🚨 Troubleshooting

### "R2 credentials not configured"
- Verify `.env` file has all three variables
- Restart dev server with `--clear` flag

### Images not loading
- Check public access is enabled on R2 buckets
- Verify API token has correct permissions

### Still using Supabase for everything
- Check console for initialization errors
- Verify environment variables are loaded (use `console.log(process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID)`)

---

## 📊 Cost Savings

**Before:** ~$94/month (Supabase storage + bandwidth)
**After:** ~$3/month (Supabase profiles + R2 storage, FREE R2 egress)
**Savings:** **$91/month (97% reduction!)**

Plus unlimited free downloads via Cloudflare's global CDN! 🎉

