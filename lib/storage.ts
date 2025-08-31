import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';

export interface UploadResult {
  url: string;
  path: string;
}

export const storageHelpers = {
  async uploadImage(
    uri: string, 
    bucket: string = 'images',
    folder: string = 'listings',
    userId?: string
  ): Promise<UploadResult> {
    try {
      // Compress and resize image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1024 } }, // Resize to max width of 1024px
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const filename = `${folder}/${userId || 'anonymous'}/${timestamp}_${randomId}.jpg`;

      // Convert to blob for upload
      const response = await fetch(manipulatedImage.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  },

  async uploadMultipleImages(
    uris: string[],
    bucket: string = 'images',
    folder: string = 'listings',
    userId?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < uris.length; i++) {
      try {
        const result = await this.uploadImage(uris[i], bucket, folder, userId);
        results.push(result);
        
        // Report progress
        onProgress?.((i + 1) / uris.length);
      } catch (error) {
        console.error(`Failed to upload image ${i + 1}:`, error);
        throw error;
      }
    }
    
    return results;
  },

  async deleteImage(path: string, bucket: string = 'images'): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Image delete error:', error);
      throw error;
    }
  },

  getImageUrl(path: string, bucket: string = 'images'): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  },
};