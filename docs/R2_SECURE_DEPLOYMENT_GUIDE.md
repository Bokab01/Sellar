# R2 Secure Deployment Guide

## Overview
This guide walks you through deploying the secure R2 implementation using Supabase Edge Functions.

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project linked: `supabase link --project-ref your-project-ref`
- Cloudflare R2 buckets created and configured with public access + CORS

---

## Step 1: Apply Database Migration

Run the migration to create the audit table:

```bash
supabase db push
```

This creates the `file_uploads` table for audit logging.

---

## Step 2: Set Edge Function Secrets

Set your R2 credentials as secrets (NEVER in environment variables):

```bash
# R2 Credentials
supabase secrets set CLOUDFLARE_ACCOUNT_ID=your_account_id
supabase secrets set R2_ACCESS_KEY_ID=your_access_key_id  
supabase secrets set R2_SECRET_ACCESS_KEY=your_secret_access_key

# Bucket Public URLs
supabase secrets set R2_MEDIA_LISTINGS_URL=https://pub-xxx.r2.dev
supabase secrets set R2_MEDIA_VIDEOS_URL=https://pub-yyy.r2.dev
supabase secrets set R2_MEDIA_COMMUNITY_URL=https://pub-zzz.r2.dev
supabase secrets set R2_CHAT_ATTACHMENTS_URL=https://pub-aaa.r2.dev
```

**Important**: These secrets are stored securely on Supabase servers and NEVER exposed to the client.

---

## Step 3: Deploy Edge Functions

Deploy all three Edge Functions:

```bash
# Deploy r2-upload function
supabase functions deploy r2-upload

# Deploy r2-delete function
supabase functions deploy r2-delete

# Deploy r2-signed-url function
supabase functions deploy r2-signed-url
```

Verify deployment:
```bash
supabase functions list
```

---

## Step 4: Remove Client-Side R2 Credentials

**CRITICAL SECURITY STEP**: Remove all `EXPO_PUBLIC_R2_*` variables from your `.env` file:

### Before (INSECURE):
```env
EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID=xxx
EXPO_PUBLIC_R2_ACCESS_KEY_ID=xxx
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=xxx
EXPO_PUBLIC_R2_LISTINGS_URL=https://pub-xxx.r2.dev
EXPO_PUBLIC_R2_VIDEOS_URL=https://pub-yyy.r2.dev
EXPO_PUBLIC_R2_COMMUNITY_URL=https://pub-zzz.r2.dev
EXPO_PUBLIC_R2_CHAT_URL=https://pub-aaa.r2.dev
```

### After (SECURE):
```env
# R2 credentials are now in Supabase secrets - NEVER expose them!
# No R2 variables needed in client environment
```

**Keep only**:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## Step 5: Test the Implementation

### Test Upload (via mobile app):

1. **Restart your app** to clear old R2 initialization
2. **Upload an image** (listing, community post, or chat)
3. **Check console logs** - you should see:
   ```
   ✅ Hybrid Storage initialized - using secure R2 via Edge Functions
   📤 [Secure] Uploading image via Edge Function...
   ✅ [Secure] Upload successful!
   ```

### Test in Supabase Dashboard:

1. Go to **Edge Functions** → **Logs**
2. You should see logs from `r2-upload` function
3. Check for successful uploads (200 status)

### Test Audit Log:

```sql
-- Check recent uploads in Supabase SQL Editor
SELECT * FROM file_uploads 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Step 6: Monitor and Optimize

### View Edge Function Metrics

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on each function to see:
   - Invocation count
   - Error rate
   - Response time
   - Logs

### Check R2 Usage

1. Go to **Cloudflare Dashboard** → **R2**
2. View storage and bandwidth usage
3. Verify costs are within expectations

### Monitor Audit Log

```sql
-- Get upload statistics
SELECT 
  user_id,
  bucket,
  COUNT(*) as upload_count,
  SUM(file_size) as total_bytes,
  MAX(created_at) as last_upload
FROM file_uploads
WHERE deleted_at IS NULL
GROUP BY user_id, bucket
ORDER BY upload_count DESC;
```

---

## Step 7: Performance Optimization (Optional)

### Enable Edge Function Caching

Add caching headers to Edge Functions for frequently accessed data:

```typescript
return new Response(
  JSON.stringify(result),
  { 
    status: 200, 
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    } 
  }
);
```

### Implement Pre-signed URLs (Advanced)

For large files, generate pre-signed URLs and upload directly to R2:

```typescript
// 1. Get pre-signed URL from Edge Function (1 invocation)
const { uploadUrl } = await r2Storage.getPresignedUploadUrl();

// 2. Upload directly to R2 (no Edge Function)
await fetch(uploadUrl, { method: 'PUT', body: file });
```

This reduces Edge Function invocations by 50%!

---

## Troubleshooting

### Error: "Unauthorized"
- **Cause**: User not authenticated
- **Fix**: Ensure user is signed in before uploading

### Error: "Rate limit exceeded"
- **Cause**: Too many uploads in short time
- **Fix**: Wait 1 minute or increase rate limit in Edge Function

### Error: "Invalid bucket"
- **Cause**: Bucket not in allowed list
- **Fix**: Check bucket name matches mapping in Edge Function

### Error: "Server configuration error"
- **Cause**: Missing R2 credentials in secrets
- **Fix**: Run `supabase secrets set` commands again

### Upload works but image doesn't display
- **Cause**: CORS not configured on R2 bucket
- **Fix**: Follow CORS setup in `R2_CORS_SETUP_GUIDE.md`

---

## Rollback Plan

If you need to rollback to direct R2 access:

1. Restore environment variables in `.env`
2. Revert `lib/hybridStorage.ts`:
   ```typescript
   import { r2Storage } from './r2Storage'; // Old insecure version
   ```
3. Restart app

**Note**: This is NOT recommended due to security risks!

---

## Security Best Practices

### ✅ DO:
- Keep R2 credentials in Supabase secrets
- Use Edge Functions for all R2 operations
- Monitor audit logs regularly
- Set up rate limiting
- Validate file types and sizes
- Enable MFA on Cloudflare account

### ❌ DON'T:
- Expose R2 credentials in client app
- Skip authentication checks
- Allow unlimited file uploads
- Store credentials in Git
- Disable audit logging
- Share R2 access keys

---

## Cost Monitoring

### Set up Cloudflare Alerts

1. Go to **Cloudflare Dashboard** → **Notifications**
2. Create alerts for:
   - R2 storage > 100 GB
   - R2 operations > 1 million/day
   - Unexpected spikes

### Set up Supabase Alerts

1. Go to **Supabase Dashboard** → **Settings** → **Billing**
2. Set budget alerts for Edge Function usage

---

## Next Steps

1. ✅ Test uploads thoroughly
2. ✅ Monitor for 24-48 hours
3. ✅ Check costs after 1 week
4. ✅ Optimize if needed (pre-signed URLs, caching)
5. ✅ Document for your team
6. ✅ Set up monitoring alerts

---

## Support

If you encounter issues:

1. Check Edge Function logs in Supabase Dashboard
2. Check R2 access logs in Cloudflare Dashboard
3. Review `file_uploads` table for audit trail
4. Check this guide's troubleshooting section

---

## Success Checklist

- [ ] Database migration applied
- [ ] Edge Function secrets set
- [ ] All 3 Edge Functions deployed
- [ ] Client-side R2 credentials removed from `.env`
- [ ] Test upload successful
- [ ] Audit log working
- [ ] Images displaying correctly
- [ ] Cost monitoring set up
- [ ] Team documented

**Once all checked, your secure R2 implementation is complete! 🎉**


