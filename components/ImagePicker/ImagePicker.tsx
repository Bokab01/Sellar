import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { LinearProgress } from '@/components/ProgressIndicator/ProgressIndicator';
import { useImageUpload } from '@/hooks/useImageUpload';
import * as ImagePicker from 'expo-image-picker';

import { Camera, Image as ImageIcon, X, Plus } from 'lucide-react-native';

export interface SelectedImage {
  uri: string;
  id: string;
  type?: string;
  name?: string;
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
      showError(`Maximum ${limit} images allowed`);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: undefined, // Allow flexible aspect ratio
        quality: 0.8,
        exif: false, // Don't include EXIF data to reduce file size
      });

      if (!result.canceled && result.assets[0]) {
        const newImage: SelectedImage = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
          type: result.assets[0].type,
          name: result.assets[0].fileName || `image_${Date.now()}.jpg`,
        };

        onChange([...value, newImage]);
        
        if (uploadImmediately) {
          await handleUpload([newImage]);
        }
        
        // Photo captured successfully
      }
    } catch (error) {
      showError('Failed to capture photo');
    }
  };

  const pickFromLibrary = async () => {
    if (!(await requestPermissions('library'))) return;

    if (value.length >= limit) {
      showError(`Maximum ${limit} images already selected`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // Always allow multiple selection
        selectionLimit: Math.max(1, limit - value.length), // Only allow selecting up to remaining slots
        quality: 0.8,
        allowsEditing: false, // Disable editing to allow multiple selection and flexible cropping
        exif: false, // Don't include EXIF data to reduce file size
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages: SelectedImage[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `${Date.now()}_${index}`,
          type: 'image',
          name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
        }));

        // Check if adding new images would exceed the limit
        const totalImages = value.length + newImages.length;
        if (totalImages > limit) {
          const availableSlots = limit - value.length;
          if (availableSlots <= 0) {
            showError(`Maximum ${limit} images allowed`);
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
      showError('Failed to select images from library');
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
            {uploadError || `Uploading images... ${Math.round(progress * 100)}%`}
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
        {/* Selected Images */}
        {value.map((image, index) => (
          <View
            key={image.id}
            style={{
              position: 'relative',
              width: 100,
              height: 100,
            }}
          >
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

            {/* Remove Button */}
            <TouchableOpacity
              onPress={() => removeImage(image.id)}
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
              {value.length === 0 ? 'Add Images' : 'Add More'}
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
            ? `Add up to ${limit} images to showcase your product`
            : value.length === limit
            ? 'Maximum images reached'
            : `Add ${limit - value.length} more image${limit - value.length > 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Image Source Picker Modal */}
      <AppModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        title="Add Images"
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
              ? `Choose how you'd like to add images (up to ${limit - value.length} more)`
              : "Choose how you'd like to add an image"
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
              Take Photo
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
              {limit > 1 ? 'Select Multiple Images' : 'Choose from Gallery'}
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
                📸 {limit - value.length} more image{limit - value.length !== 1 ? 's' : ''} can be added
              </Text>
            </View>
          )}
        </View>
      </AppModal>




    </View>
  );
}
