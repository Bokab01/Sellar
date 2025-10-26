# R2 Secure Implementation - Quick Start

## 🚀 What Was Implemented

✅ **3 Secure Edge Functions**:
- `r2-upload` - Upload files with authentication
- `r2-delete` - Delete files with ownership verification
- `r2-signed-url` - Generate signed URLs for private files

✅ **New Secure Library**: `lib/r2StorageSecure.ts`
- Uses Edge Functions (no exposed credentials)
- Automatic authentication
- Audit logging

✅ **Database Migration**: `file_uploads` table for audit logging

✅ **Updated hybrid storage** to use secure implementation

---

## 📋 Deployment Steps (5 minutes)

### 1. Apply Database Migration
```bash
supabase db push
```

### 2. Set Secrets (Replace with your values)
```bash
supabase secrets set CLOUDFLARE_ACCOUNT_ID=your_account_id
supabase secrets set R2_ACCESS_KEY_ID=your_access_key_id
supabase secrets set R2_SECRET_ACCESS_KEY=your_secret_access_key
supabase secrets set R2_MEDIA_LISTINGS_URL=https://pub-fa8c64af0b004548b89f95a73ea86432.r2.dev
supabase secrets set R2_MEDIA_VIDEOS_URL=https://pub-e68584bd10d34b0a983945212fa9e4ec.r2.dev
supabase secrets set R2_MEDIA_COMMUNITY_URL=https://pub-ff441ed5b17941cda1ca7402e7bb45f3.r2.dev
supabase secrets set R2_CHAT_ATTACHMENTS_URL=https://pub-ce752b72e73b4750acccd8a1498c591c.r2.dev
```

### 3. Deploy Edge Functions
```bash
supabase functions deploy r2-upload
supabase functions deploy r2-delete
supabase functions deploy r2-signed-url
```

### 4. Remove Client Credentials
**Delete these lines from `.env`**:
```env
EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID=xxx
EXPO_PUBLIC_R2_ACCESS_KEY_ID=xxx
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=xxx
EXPO_PUBLIC_R2_LISTINGS_URL=xxx
EXPO_PUBLIC_R2_VIDEOS_URL=xxx
EXPO_PUBLIC_R2_COMMUNITY_URL=xxx
EXPO_PUBLIC_R2_CHAT_URL=xxx
EXPO_PUBLIC_R2_PUBLIC_URL=xxx
```

### 5. Restart App
```bash
npm start -- --clear
```

---

## ✅ Testing

1. **Upload an image** (listing, community post, or chat)
2. **Check console** - Should see:
   ```
   📤 [Secure] Uploading image via Edge Function...
   ✅ [Secure] Upload successful!
   ```
3. **Verify in Supabase**:
   ```sql
   SELECT * FROM file_uploads ORDER BY created_at DESC LIMIT 10;
   ```

---

## 🔒 Security Improvements

| Before | After |
|--------|-------|
| 🔴 R2 keys in client app | ✅ Keys secure on server |
| 🔴 Anyone can upload | ✅ Authentication required |
| 🔴 No rate limiting | ✅ 20 uploads/minute limit |
| 🔴 No audit trail | ✅ Every upload logged |
| 🔴 Unlimited file sizes | ✅ 100MB limit enforced |
| 🔴 Any file type allowed | ✅ Only images/videos allowed |

---

## 💰 Cost Impact

**Before**: ~$1.50/month (R2 only, but INSECURE)
**After**: ~$1.50/month (R2 + Edge Functions, SECURE)

**Edge Functions**: FREE up to 2M invocations/month
- Even at 100k uploads/month = $0
- Still 95% cheaper than Supabase Storage

---

## 📊 Monitoring

### View Edge Function Logs
1. Supabase Dashboard → Edge Functions → r2-upload → Logs

### Check Audit Log
```sql
-- Recent uploads
SELECT 
  user_id,
  bucket,
  path,
  file_size,
  created_at
FROM file_uploads 
WHERE deleted_at IS NULL
ORDER BY created_at DESC 
LIMIT 50;

-- Upload statistics
SELECT 
  bucket,
  COUNT(*) as total_uploads,
  SUM(file_size) / 1024 / 1024 as total_mb
FROM file_uploads
WHERE deleted_at IS NULL
GROUP BY bucket;
```

---

## 🔄 What Changed in the Code

### Old (Insecure):
```typescript
import { r2Storage } from './r2Storage'; // Direct R2 access
```

### New (Secure):
```typescript
import { r2StorageSecure } from './r2StorageSecure'; // Via Edge Functions
```

**No other code changes needed!** The API remains the same.

---

## 🆘 Troubleshooting

### "Unauthorized" error
- **Fix**: Ensure user is signed in

### "Rate limit exceeded"
- **Fix**: Wait 1 minute

### "Server configuration error"
- **Fix**: Check secrets are set correctly:
  ```bash
  supabase secrets list
  ```

### Images upload but don't display
- **Fix**: Check CORS on R2 buckets (see `R2_CORS_SETUP_GUIDE.md`)

---

## 📚 Full Documentation

- **Complete Guide**: `R2_SECURE_DEPLOYMENT_GUIDE.md`
- **Security Details**: `R2_SECURITY_IMPLEMENTATION.md`
- **CORS Setup**: `R2_CORS_SETUP_GUIDE.md`

---

## ✨ You're Done!

Your R2 implementation is now:
- ✅ Secure (no exposed credentials)
- ✅ Authenticated (users verified)
- ✅ Audited (all uploads logged)
- ✅ Cost-effective (95% savings)
- ✅ Rate-limited (abuse prevention)

**Next**: Deploy and test! 🚀

