# R2 Security Implementation Guide

## Critical Security Issue

**Current Implementation**: R2 access keys are exposed in the client app via `EXPO_PUBLIC_` environment variables.

**Risk**: Anyone can extract these keys and use your R2 buckets, leading to:
- Unauthorized file uploads
- File deletions
- Excessive bandwidth costs
- Data breaches

## Secure Architecture

```
┌─────────────┐
│ Mobile App  │
│ (No keys)   │
└──────┬──────┘
       │ 1. Upload request (with auth token)
       │
       ▼
┌──────────────────┐
│ Supabase         │
│ Edge Function    │  2. Validate user
│ (Has R2 keys)    │  3. Check permissions
└──────┬───────────┘
       │ 4. Upload to R2
       │
       ▼
┌──────────────────┐
│ Cloudflare R2    │
│ (Secure)         │
└──────────────────┘
```

## Implementation Steps

### 1. Create Supabase Edge Function for R2 Uploads

**File**: `supabase/functions/r2-upload/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify user authentication
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get request data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const path = formData.get('path') as string;

    if (!file || !bucket || !path) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate bucket and permissions
    const allowedBuckets = ['media-listings', 'media-videos', 'media-community', 'chat-attachments'];
    if (!allowedBuckets.includes(bucket)) {
      return new Response(
        JSON.stringify({ error: 'Invalid bucket' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check file size limits
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Initialize R2 client (keys are secure in Edge Function environment)
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${Deno.env.get('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
      },
    });

    // 6. Upload to R2
    const fileBuffer = await file.arrayBuffer();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000',
    });

    await r2Client.send(command);

    // 7. Generate public URL
    const publicUrl = `${Deno.env.get(`R2_${bucket.toUpperCase().replace('-', '_')}_URL`)}/${path}`;

    // 8. Log upload for audit
    await supabase.from('file_uploads').insert({
      user_id: user.id,
      bucket,
      path,
      file_size: file.size,
      content_type: file.type,
    });

    return new Response(
      JSON.stringify({ url: publicUrl, path }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('R2 upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 2. Create Edge Function for R2 Deletes

**File**: `supabase/functions/r2-delete/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Similar structure to upload function
// Verify user owns the file before deleting
```

### 3. Create Edge Function for Signed URLs (Private Content)

**File**: `supabase/functions/r2-signed-url/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client } from 'npm:@aws-sdk/client-s3@3';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3';
import { GetObjectCommand } from 'npm:@aws-sdk/client-s3@3';

// Generate temporary signed URLs for private files (e.g., verification documents)
```

### 4. Update Mobile App to Use Edge Functions

**File**: `lib/r2Storage.ts`

```typescript
export class R2StorageService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  async uploadImage(
    uri: string,
    bucket: string,
    folder: string = '',
    userId?: string
  ): Promise<R2UploadResult> {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Prepare file
      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const blob = base64ToBlob(fileData, 'image/jpeg');
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('bucket', bucket);
      formData.append('path', `${folder}/${userId}/${Date.now()}_${Math.random().toString(36)}.jpg`);

      // Call secure Edge Function
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/r2-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { url, path } = await response.json();
      return { url, path, cdnUrl: url };
    } catch (error) {
      console.error('R2 upload failed:', error);
      throw error;
    }
  }
}
```

### 5. Environment Variables (Edge Function Secrets)

**Set using Supabase CLI**:

```bash
# These are NEVER exposed to the client
supabase secrets set CLOUDFLARE_ACCOUNT_ID=your_account_id
supabase secrets set R2_ACCESS_KEY_ID=your_access_key
supabase secrets set R2_SECRET_ACCESS_KEY=your_secret_key
supabase secrets set R2_MEDIA_LISTINGS_URL=https://pub-xxx.r2.dev
supabase secrets set R2_MEDIA_VIDEOS_URL=https://pub-yyy.r2.dev
supabase secrets set R2_MEDIA_COMMUNITY_URL=https://pub-zzz.r2.dev
supabase secrets set R2_CHAT_ATTACHMENTS_URL=https://pub-aaa.r2.dev
```

### 6. Create Audit Log Table

```sql
-- Track all file uploads for security auditing
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_created ON file_uploads(created_at);

-- Enable RLS
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Users can only see their own uploads
CREATE POLICY "Users can view own uploads"
  ON file_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

## Security Checklist

- [ ] Remove `EXPO_PUBLIC_R2_*` variables from `.env`
- [ ] Deploy Edge Functions to Supabase
- [ ] Set R2 credentials as Edge Function secrets
- [ ] Update mobile app to use Edge Functions
- [ ] Test upload with authentication
- [ ] Test upload without authentication (should fail)
- [ ] Implement rate limiting on Edge Functions
- [ ] Set up file upload audit logging
- [ ] Configure R2 bucket lifecycle policies (auto-delete old files)
- [ ] Set up CloudFlare R2 access logs
- [ ] Monitor R2 usage and costs

## Additional Security Measures

### 1. Rate Limiting

Add to Edge Function:

```typescript
// Check user upload rate
const { count } = await supabase
  .from('file_uploads')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last minute

if (count && count > 10) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { status: 429, headers: corsHeaders }
  );
}
```

### 2. File Type Validation

```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'];
if (!allowedTypes.includes(file.type)) {
  return new Response(
    JSON.stringify({ error: 'Invalid file type' }),
    { status: 400, headers: corsHeaders }
  );
}
```

### 3. Virus Scanning (Optional)

Integrate with CloudFlare's virus scanning or third-party service before uploading.

### 4. Content Moderation

Add automatic content moderation using AI services for uploaded images.

## Migration Steps

1. **Deploy Edge Functions** first (test in staging)
2. **Update mobile app** to use Edge Functions
3. **Remove client-side R2 credentials** from environment variables
4. **Test thoroughly** before releasing to production
5. **Monitor** for any issues

## Cost Implications

- Edge Function calls: ~$0.50 per million requests
- R2 storage: $0.015 per GB/month
- R2 operations: $0.36 per million Class A, $4.50 per million Class B
- Still significantly cheaper than Supabase Storage

## Performance Considerations

- Edge Functions add ~50-100ms latency
- But it's worth it for security
- Can optimize with:
  - Pre-signed URLs for direct uploads (advanced)
  - Batch operations
  - Caching

---

## Conclusion

**Current Implementation**: 🔴 **INSECURE** - Credentials exposed in client

**Recommended Implementation**: 🟢 **SECURE** - Credentials protected in Edge Functions

The Edge Function approach adds a small performance overhead but provides:
- ✅ Secure credential management
- ✅ User authentication/authorization
- ✅ Rate limiting
- ✅ Audit logging
- ✅ File validation
- ✅ Cost control

**Next Step**: Implement Edge Functions ASAP to secure your R2 implementation!

