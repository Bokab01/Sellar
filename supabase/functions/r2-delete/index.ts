import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteRequest {
  bucket: string;
  path: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🗑️ R2 Delete - Starting authentication...');

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
    const data: DeleteRequest = await req.json();
    const { bucket, path } = data;

    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🗑️ Delete request for:', { bucket, path });

    // 3. Verify ownership - check if user uploaded this file
    const { data: uploadRecord, error: recordError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('bucket', bucket)
      .eq('path', path)
      .eq('user_id', user.id)
      .single();

    if (recordError || !uploadRecord) {
      console.error('❌ File not found or not owned by user');
      return new Response(
        JSON.stringify({ error: 'File not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Ownership verified');

    // 4. Initialize R2 client
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

    // 5. Delete from R2
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    await r2Client.send(command);
    console.log('✅ File deleted from R2');

    // 6. Mark as deleted in audit log (soft delete)
    const { error: updateError } = await supabase
      .from('file_uploads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('bucket', bucket)
      .eq('path', path);

    if (updateError) {
      console.error('⚠️ Failed to update audit log:', updateError);
      // Don't fail the request if logging fails
    }

    // 7. Return success
    return new Response(
      JSON.stringify({ success: true, message: 'File deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ R2 delete error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Delete failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


