import { useState } from 'react';
import { storageHelpers } from '@/lib/storage';
import { SelectedImage } from '@/components/ImagePicker';

interface UseImageUploadOptions {
  bucket?: string;
  folder?: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const {
    bucket = 'images',
    folder = 'uploads',
    maxSize = 5, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  } = options;

  const validateImage = (image: SelectedImage): string | null => {
    // Check file type
    if (image.type && !allowedTypes.includes(image.type)) {
      return `File type ${image.type} is not supported. Please use JPEG, PNG, or WebP.`;
    }

    // Note: File size validation would require additional metadata
    // For now, we rely on the compression in storageHelpers

    return null;
  };

  const uploadSingle = async (
    image: SelectedImage,
    userId?: string
  ): Promise<{ url: string; path: string } | null> => {
    const validationError = validateImage(image);
    if (validationError) {
      setError(validationError);
      return null;
    }

    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      const result = await storageHelpers.uploadImage(
        image.uri,
        bucket,
        folder,
        userId
      );

      setProgress(1);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload image';
      setError(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultiple = async (
    images: SelectedImage[],
    userId?: string,
    onProgressUpdate?: (progress: number) => void
  ): Promise<{ url: string; path: string }[]> => {
    // Validate all images first
    for (const image of images) {
      const validationError = validateImage(image);
      if (validationError) {
        setError(validationError);
        throw new Error(validationError);
      }
    }

    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      const results = await storageHelpers.uploadMultipleImages(
        images.map(img => img.uri),
        bucket,
        folder,
        userId,
        (progress) => {
          setProgress(progress);
          onProgressUpdate?.(progress);
        }
      );

      return results;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload images';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (path: string): Promise<boolean> => {
    try {
      setError(null);
      await storageHelpers.deleteImage(path, bucket);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete image';
      setError(errorMessage);
      return false;
    }
  };

  const reset = () => {
    setUploading(false);
    setProgress(0);
    setError(null);
  };

  return {
    uploading,
    progress,
    error,
    uploadSingle,
    uploadMultiple,
    deleteImage,
    reset,
  };
}