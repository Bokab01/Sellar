import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  file: string; // base64 encoded
  bucket: string;
  folder: string;
  userId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔐 R2 Upload - Starting authentication...');

    // 1. Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // 2. Parse request data
    const data: UploadRequest = await req.json();
    const { file, bucket, folder, userId, fileName, contentType, fileSize } = data;

    if (!file || !bucket || !folder || !userId || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify user is uploading to their own folder
    if (userId !== user.id) {
      console.error('❌ User ID mismatch:', { provided: userId, actual: user.id });
      return new Response(
        JSON.stringify({ error: 'Cannot upload to another user\'s folder' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validate bucket
    const R2_BUCKET_MAPPING: Record<string, string> = {
      'listing-images': 'media-listings',
      'community-images': 'media-community',
      'chat-attachments': 'chat-attachments',
      'sellar-pro-videos': 'media-videos',
      'profile-images': 'profile-images', // Keep on Supabase but allow in mapping
      'verification-documents': 'verification-documents', // Private bucket
    };

    console.log('📝 Bucket validation:', { 
      received: bucket, 
      availableBuckets: Object.keys(R2_BUCKET_MAPPING),
      willMapTo: R2_BUCKET_MAPPING[bucket] 
    });

    const r2Bucket = R2_BUCKET_MAPPING[bucket];
    if (!r2Bucket) {
      console.error('❌ Invalid bucket:', bucket, 'Available:', Object.keys(R2_BUCKET_MAPPING));
      return new Response(
        JSON.stringify({ 
          error: 'Invalid bucket',
          received: bucket,
          allowed: Object.keys(R2_BUCKET_MAPPING)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Uploading to bucket:', r2Bucket);

    // 5. Check file size limits
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileSize > maxSize) {
      console.error('❌ File too large:', fileSize);
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 100MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
    ];
    if (!allowedTypes.includes(contentType)) {
      console.error('❌ Invalid file type:', contentType);
      return new Response(
        JSON.stringify({ error: 'Invalid file type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Rate limiting - check recent uploads
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabase
      .from('file_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneMinuteAgo);

    if (count && count > 20) {
      console.error('❌ Rate limit exceeded:', count);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 20 uploads per minute' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Initialize R2 client
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.error('❌ Missing R2 credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // 9. Decode base64 file data
    const fileBuffer = Uint8Array.from(atob(file), c => c.charCodeAt(0));

    // 10. Generate unique path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${folder}/${userId}/${timestamp}_${random}.${extension}`;

    console.log('📤 Uploading to path:', path);

    // 11. Upload to R2
    const command = new PutObjectCommand({
      Bucket: r2Bucket,
      Key: path,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });

    const uploadResult = await r2Client.send(command);
    console.log('✅ Upload successful, ETag:', uploadResult.ETag);

    // 12. Generate public URL
    const bucketUrlKey = `R2_${r2Bucket.toUpperCase().replace(/-/g, '_')}_URL`;
    const bucketUrl = Deno.env.get(bucketUrlKey);
    
    if (!bucketUrl) {
      console.error('❌ Missing bucket URL for:', bucketUrlKey);
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const publicUrl = `${bucketUrl}/${path}`;
    console.log('🔗 Public URL:', publicUrl);

    // 13. Log upload for audit
    const { error: logError } = await supabase.from('file_uploads').insert({
      user_id: user.id,
      bucket: r2Bucket,
      path,
      file_size: fileSize,
      content_type: contentType,
    });

    if (logError) {
      console.error('⚠️ Failed to log upload:', logError);
      // Don't fail the request if logging fails
    }

    // 14. Return success
    return new Response(
      JSON.stringify({
        url: publicUrl,
        path,
        cdnUrl: publicUrl,
        bucket: r2Bucket,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ R2 upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Upload failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

