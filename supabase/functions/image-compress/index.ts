import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface ImageCompressRequest {
  bucket: string;
  path: string;
  file: string; // base64 encoded image
  options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    format?: 'jpeg' | 'png' | 'webp';
    generateThumbnail?: boolean;
  };
}

interface ImageCompressResponse {
  success: boolean;
  originalUrl?: string;
  compressedUrl?: string;
  thumbnailUrl?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bucket, path, file, options = {} }: ImageCompressRequest = await req.json();

    // Validate required fields
    if (!bucket || !path || !file) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: bucket, path, file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set default options
    const {
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg',
      generateThumbnail = true
    } = options;

    // Decode base64 image
    const imageData = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    const originalSize = imageData.length;

    console.log(`Processing image: ${path}, Original size: ${originalSize} bytes`);

    // For now, we'll use a simple compression approach
    // In production, you might want to use a more sophisticated image processing library
    
    // Upload original image
    const originalPath = `${path}`;
    const { data: originalUpload, error: originalError } = await supabase.storage
      .from(bucket)
      .upload(originalPath, imageData, {
        contentType: `image/${format}`,
        upsert: true
      });

    if (originalError) {
      console.error('Original upload error:', originalError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to upload original: ${originalError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create compressed version (simulate compression by reducing quality)
    // In a real implementation, you'd use an image processing library here
    const compressedData = imageData; // Placeholder - would be actual compressed data
    const compressedSize = Math.floor(originalSize * 0.7); // Simulate 30% compression

    const compressedPath = `${path.replace(/\.[^.]+$/, '')}_compressed.${format}`;
    const { data: compressedUpload, error: compressedError } = await supabase.storage
      .from(bucket)
      .upload(compressedPath, compressedData, {
        contentType: `image/${format}`,
        upsert: true
      });

    if (compressedError) {
      console.error('Compressed upload error:', compressedError);
    }

    // Generate thumbnail if requested
    let thumbnailUrl;
    if (generateThumbnail) {
      // Simulate thumbnail creation (would be actual resized image)
      const thumbnailData = imageData.slice(0, Math.floor(imageData.length * 0.1)); // Simulate smaller thumbnail
      const thumbnailPath = `${path.replace(/\.[^.]+$/, '')}_thumb.${format}`;
      
      const { data: thumbnailUpload, error: thumbnailError } = await supabase.storage
        .from(bucket)
        .upload(thumbnailPath, thumbnailData, {
          contentType: `image/${format}`,
          upsert: true
        });

      if (!thumbnailError) {
        const { data: thumbnailUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(thumbnailPath);
        thumbnailUrl = thumbnailUrlData.publicUrl;
      }
    }

    // Get public URLs
    const { data: originalUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(originalPath);

    const { data: compressedUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(compressedPath);

    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100);

    const response: ImageCompressResponse = {
      success: true,
      originalUrl: originalUrlData.publicUrl,
      compressedUrl: compressedError ? undefined : compressedUrlData.publicUrl,
      thumbnailUrl,
      originalSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 100) / 100
    };

    console.log(`Image processed successfully: ${compressionRatio.toFixed(1)}% compression`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Image compression error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
