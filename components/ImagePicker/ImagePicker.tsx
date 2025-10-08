import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { LinearProgress } from '@/components/ProgressIndicator/ProgressIndicator';
import { useImageUpload } from '@/hooks/useImageUpload';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';

import { Camera, Image as ImageIcon, X, Plus, Play } from 'lucide-react-native';

export interface SelectedImage {
  uri: string;
  id: string;
  type?: string;
  name?: string;
  mediaType?: 'image' | 'video'; // Track if it's an image or video
  duration?: number; // Video duration in milliseconds
}

interface ImagePickerProps {
  limit?: number;
  value?: SelectedImage[];
  currentImage?: string | null;
  onChange: (images: SelectedImage[]) => void;
  onImageSelected?: (uri: string) => void;
  bucketName?: string;
  folder?: string;
  uploadImmediately?: boolean;
  onUploadComplete?: (urls: string[]) => void;
  disabled?: boolean;
  style?: any;
  title?: string;
  allowVideos?: boolean; // New prop to enable video selection
  maxVideoDuration?: number; // Max video duration in seconds (default 60)
}

// Video Preview Item Component
function VideoPreviewItem({ 
  image, 
  index, 
  theme, 
  onRemove 
}: { 
  image: SelectedImage; 
  index: number; 
  theme: any; 
  onRemove: (id: string) => void;
}) {
  const player = image.mediaType === 'video' 
    ? useVideoPlayer(image.uri, (player) => {
        player.pause();
      })
    : null;

  return (
    <View
      style={{
        position: 'relative',
        width: 100,
        height: 100,
      }}
    >
      {image.mediaType === 'video' && player ? (
        <>
          {/* Video Preview */}
          <VideoView
            player={player}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.surfaceVariant,
            }}
            contentFit="cover"
            nativeControls={false}
          />
          {/* Video Play Icon Overlay */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: theme.borderRadius.md,
          }}>
            <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          {/* Video Duration Badge */}
          {image.duration && (
            <View style={{
              position: 'absolute',
              bottom: theme.spacing.xs,
              right: theme.spacing.xs,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              paddingHorizontal: theme.spacing.xs,
              paddingVertical: 2,
              borderRadius: theme.borderRadius.sm,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
                {Math.floor(image.duration / 1000)}s
              </Text>
            </View>
          )}
        </>
      ) : (
        /* Image Preview */
        <Image
          source={{ uri: image.uri }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.surfaceVariant,
          }}
          resizeMode="cover"
        />
      )}

      {/* Remove Button */}
      <TouchableOpacity
        onPress={() => onRemove(image.id)}
        style={{
          position: 'absolute',
          top: -theme.spacing.xs,
          right: -theme.spacing.xs,
          backgroundColor: theme.colors.error,
          borderRadius: theme.borderRadius.full,
          width: 28,
          height: 28,
          justifyContent: 'center',
          alignItems: 'center',
          ...theme.shadows.sm,
          borderWidth: 2,
          borderColor: theme.colors.surface,
        }}
      >
        <X size={16} color={theme.colors.errorForeground} />
      </TouchableOpacity>

      {/* Image Number */}
      <View
        style={{
          position: 'absolute',
          bottom: theme.spacing.xs,
          left: theme.spacing.xs,
          backgroundColor: theme.colors.primary,
          borderRadius: theme.borderRadius.sm,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          minWidth: 20,
          alignItems: 'center',
        }}
      >
        <Text
          variant="caption"
          style={{
            color: theme.colors.primaryForeground,
            fontSize: 10,
            fontWeight: '600',
          }}
        >
          {index + 1}
        </Text>
      </View>
    </View>
  );
}

export function CustomImagePicker({
  limit = 5,
  value = [],
  currentImage,
  onChange,
  onImageSelected,
  bucketName,
  folder,
  uploadImmediately = false,
  onUploadComplete,
  disabled = false,
  style,
  title = "Product Images",
  allowVideos = false,
  maxVideoDuration = 60,
}: ImagePickerProps) {
  const { theme } = useTheme();
  const { uploading, progress, error: uploadError, uploadMultiple } = useImageUpload({
    folder: 'listings',
  });
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 4000);
  };


  const requestPermissions = async (type: 'camera' | 'library') => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showError('Camera permission is required to take photos');
          return false;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showError('Photo library permission is required to select images');
          return false;
        }
      }
      return true;
    } catch (error) {
      showError('Failed to request permissions');
      return false;
    }
  };

  const pickFromCamera = async () => {
    setShowPicker(false);
    
    const hasPermission = await requestPermissions('camera');
    if (!hasPermission) return;

    if (value.length >= limit) {
      showError(`Maximum ${limit} ${allowVideos ? 'items' : 'images'} allowed`);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: allowVideos ? ['images', 'videos'] : ['images'],
        allowsEditing: !allowVideos, // Disable editing for videos
        aspect: allowVideos ? undefined : undefined, // Allow flexible aspect ratio
        videoMaxDuration: allowVideos ? maxVideoDuration : undefined,
        videoQuality: allowVideos ? 0 : undefined, // 0 = low quality (compressed), 1 = high quality
        quality: 0.8,
        exif: false, // Don't include EXIF data to reduce file size
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        
        // Log video info for verification
        if (isVideo) {
          console.log('📹 Video selected:', {
            duration: asset.duration ? `${(asset.duration / 1000).toFixed(1)}s` : 'unknown',
            width: asset.width,
            height: asset.height,
            fileSize: asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'unknown',
          });
        }
        
        // Check video duration if it's a video
        if (isVideo && asset.duration && asset.duration > maxVideoDuration * 1000) {
          showError(`Video must be ${maxVideoDuration} seconds or less`);
          return;
        }
        
        // Check video file size (max 100 MB - now using blob upload instead of base64)
        const MAX_VIDEO_SIZE_MB = 100;
        const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
        if (isVideo && asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE_BYTES) {
          showError(`Video is too large (${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB). Maximum size is ${MAX_VIDEO_SIZE_MB} MB. Please record a shorter video.`);
          return;
        }
        
        const newImage: SelectedImage = {
          uri: asset.uri,
          id: Date.now().toString(),
          type: asset.type,
          name: asset.fileName || `${isVideo ? 'video' : 'image'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          mediaType: isVideo ? 'video' : 'image',
          duration: asset.duration || undefined,
        };

        onChange([...value, newImage]);
        
        if (uploadImmediately) {
          await handleUpload([newImage]);
        }
        
        // Photo captured successfully
      }
    } catch (error) {
      showError(`Failed to capture ${allowVideos ? 'media' : 'photo'}`);
    }
  };

  const pickFromLibrary = async () => {
    if (!(await requestPermissions('library'))) return;

    if (value.length >= limit) {
      showError(`Maximum ${limit} ${allowVideos ? 'items' : 'images'} already selected`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: allowVideos ? ['images', 'videos'] : ['images'],
        allowsMultipleSelection: true, // Always allow multiple selection
        selectionLimit: Math.max(1, limit - value.length), // Only allow selecting up to remaining slots
        quality: 0.8,
        videoQuality: allowVideos ? 0 : undefined, // 0 = low quality (compressed), 1 = high quality
        allowsEditing: false, // Disable editing to allow multiple selection and flexible cropping
        exif: false, // Don't include EXIF data to reduce file size
        videoMaxDuration: allowVideos ? maxVideoDuration : undefined,
      });

      if (!result.canceled && result.assets.length > 0) {
        const MAX_VIDEO_SIZE_MB = 100;
        const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
        
        const newImages: SelectedImage[] = result.assets
          .filter((asset) => {
            const isVideo = asset.type === 'video';
            
            // Check video duration
            if (isVideo && asset.duration && asset.duration > maxVideoDuration * 1000) {
              showError(`Video must be ${maxVideoDuration} seconds or less`);
              return false;
            }
            
            // Check video file size
            if (isVideo && asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE_BYTES) {
              showError(`Video is too large (${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB). Maximum size is ${MAX_VIDEO_SIZE_MB} MB.`);
              return false;
            }
            
            return true;
          })
          .map((asset, index) => {
            const isVideo = asset.type === 'video';
            
            return {
              uri: asset.uri,
              id: `${Date.now()}_${index}`,
              type: asset.type || 'image',
              name: asset.fileName || `${isVideo ? 'video' : 'image'}_${Date.now()}_${index}.${isVideo ? 'mp4' : 'jpg'}`,
              mediaType: isVideo ? 'video' as const : 'image' as const,
              duration: asset.duration || undefined,
            };
          });

        // Check if adding new images would exceed the limit
        const totalImages = value.length + newImages.length;
        if (totalImages > limit) {
          const availableSlots = limit - value.length;
          if (availableSlots <= 0) {
            showError(`Maximum ${limit} ${allowVideos ? 'items' : 'images'} allowed`);
            return;
          }
          const imagesToAdd = newImages.slice(0, availableSlots);
          onChange([...value, ...imagesToAdd]);
          // Images added successfully
          
          if (uploadImmediately && imagesToAdd.length > 0) {
            handleUpload(imagesToAdd);
          }
        } else {
          onChange([...value, ...newImages]);
          // Images added successfully
          
          if (uploadImmediately && newImages.length > 0) {
            handleUpload(newImages);
          }
        }
      }
    } catch (error) {
      showError(`Failed to select ${allowVideos ? 'media' : 'images'} from library`);
    }
    
    setShowPicker(false);
  };



  const removeImage = (imageId: string) => {
    const updatedImages = value.filter(img => img.id !== imageId);
    onChange(updatedImages);
  };

  const handleUpload = async (imagesToUpload: SelectedImage[]) => {
    try {
      const results = await uploadMultiple(imagesToUpload);
      const urls = results.map(result => result.url);
      onUploadComplete?.(urls);
    } catch (err) {
      showError('Failed to upload images');
    }
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...value];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    onChange(updatedImages);
  };

  return (
    <View style={style}>
      {/* Header with count */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}
      >
        <Text variant="h4">
          {title}
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.borderRadius.full,
          }}
        >
          <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
            {value.length}/{limit}
          </Text>
        </View>
      </View>

      {/* Loading Progress */}
      {(uploading || uploadError) && (
        <View style={{ marginBottom: theme.spacing.lg }}>
          <LinearProgress progress={progress} showPercentage />
          <Text
            variant="caption"
            color={uploadError ? "error" : "muted"}
            style={{ textAlign: 'center', marginTop: theme.spacing.sm }}
          >
            {uploadError || `Uploading ${allowVideos ? 'media' : 'images'}... ${Math.round(progress * 100)}%`}
          </Text>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View
          style={{
            backgroundColor: theme.colors.error + '10',
            borderColor: theme.colors.error,
            borderWidth: 1,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        </View>
      )}

      {/* Image Grid */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: theme.spacing.md,
            paddingRight: theme.spacing.md,
          }}
        >
        {/* Selected Images and Videos */}
        {value.map((image, index) => (
          <VideoPreviewItem 
            key={image.id}
            image={image}
            index={index}
            theme={theme}
            onRemove={removeImage}
          />
        ))}

        {/* Add Image Button */}
        {value.length < limit && (
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            disabled={disabled || uploading}
            style={{
              width: 100,
              height: 100,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.surface,
              borderWidth: 2,
              borderColor: theme.colors.primary + '40',
              borderStyle: 'solid',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: disabled || uploading ? 0.5 : 1,
              ...theme.shadows.sm,
            }}
            activeOpacity={0.7}
          >
            {/* Background gradient effect */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.colors.primary + '05',
                borderRadius: theme.borderRadius.lg - 2,
              }}
            />
            
            <View
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.full,
                width: 36,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: theme.spacing.sm,
                ...theme.shadows.sm,
              }}
            >
              <Plus
                size={18}
                color={theme.colors.primaryForeground}
              />
            </View>
            <Text 
              variant="bodySmall" 
              style={{ 
                color: theme.colors.primary,
                textAlign: 'center',
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              {value.length === 0 ? (allowVideos ? 'Add Media' : 'Add Images') : 'Add More'}
            </Text>
          </TouchableOpacity>
        )}
        </ScrollView>

        {/* Helper Text */}
        <Text
          variant="caption"
          color="muted"
          style={{
            textAlign: 'center',
            marginTop: theme.spacing.lg,
            lineHeight: 16,
          }}
        >
          {value.length === 0
            ? `Add up to ${limit} ${allowVideos ? 'photos or videos' : 'images'} to showcase your product`
            : value.length === limit
            ? `Maximum ${allowVideos ? 'media' : 'images'} reached`
            : `Add ${limit - value.length} more ${allowVideos ? 'item' : 'image'}${limit - value.length > 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Image Source Picker Modal */}
      <AppModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        title={allowVideos ? "Add Media" : "Add Images"}
        size="sm"
        position="bottom"
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ 
            textAlign: 'center', 
            lineHeight: 22,
            marginBottom: theme.spacing.md,
          }}>
            {limit > 1 
              ? `Choose how you'd like to add ${allowVideos ? 'photos or videos' : 'images'} (up to ${limit - value.length} more)`
              : `Choose how you'd like to add ${allowVideos ? 'a photo or video' : 'an image'}`
            }
          </Text>

          <View style={{ gap: theme.spacing.md }}>
            <Button
              variant="primary"
              icon={<Camera size={20} color={theme.colors.primaryForeground} />}
              onPress={pickFromCamera}
              fullWidth
              size="lg"
              style={{
                paddingVertical: theme.spacing.lg,
                ...theme.shadows.md,
              }}
            >
              {allowVideos ? 'Take Photo or Video' : 'Take Photo'}
            </Button>

            <Button
              variant="secondary"
              icon={<ImageIcon size={20} color={theme.colors.secondaryForeground} />}
              onPress={pickFromLibrary}
              fullWidth
              size="lg"
              style={{
                paddingVertical: theme.spacing.lg,
                ...theme.shadows.sm,
              }}
            >
              {limit > 1 
                ? `Select Multiple ${allowVideos ? 'Items' : 'Images'}` 
                : 'Choose from Gallery'}
            </Button>
          </View>

          {value.length > 0 && (
            <View
              style={{
                backgroundColor: theme.colors.primary + '10',
                borderColor: theme.colors.primary + '20',
                borderWidth: 1,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                marginTop: theme.spacing.sm,
              }}
            >
              <Text variant="bodySmall" style={{ 
                textAlign: 'center',
                color: theme.colors.primary,
                fontWeight: '500',
              }}>
                {allowVideos ? '📸🎥' : '📸'} {limit - value.length} more {allowVideos ? 'item' : 'image'}{limit - value.length !== 1 ? 's' : ''} can be added
              </Text>
            </View>
          )}
        </View>
      </AppModal>




    </View>
  );
}
