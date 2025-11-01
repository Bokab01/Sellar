/**
 * Step 4: Shop Photos
 * Upload and manage shop gallery with drag-to-reorder
 */

import React, { memo, useCallback, useState } from 'react';
import { View, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Camera, Upload, X, Star, GripVertical } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { ShopSetupData, ShopPhoto } from '../types';
import { SHOP_PHOTO_TYPES } from '../types';
import { PhotoTypeSelector } from '../components';

interface Step4PhotosProps {
  data: Partial<ShopSetupData>;
  updateData: <K extends keyof ShopSetupData>(key: K, value: ShopSetupData[K]) => void;
  updateMultiple: (updates: Partial<ShopSetupData>) => void;
}

const MAX_PHOTOS = 10;

const Step4Photos = memo<Step4PhotosProps>(({ data, updateData }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const photos = data.photos || [];

  const updatePhotos = useCallback((newPhotos: ShopPhoto[]) => {
    updateData('photos', newPhotos);
  }, [updateData]);

  // Upload image to Supabase
  const uploadImage = useCallback(async (uri: string): Promise<string> => {
    const filename = `${user?.id}/${Date.now()}.jpg`;
    
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const { data, error } = await supabase.storage
      .from('shops-images')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('shops-images')
      .getPublicUrl(data.path);

    return publicUrl;
  }, [user]);

  // Pick image from library or camera
  const pickImage = useCallback(async (useCamera: boolean = false) => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit Reached', `You can only upload up to ${MAX_PHOTOS} photos.`);
      return;
    }

    try {
      // Request permissions
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please enable camera/photo access in settings.');
        return;
      }

      // Launch picker
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: MAX_PHOTOS - photos.length,
            quality: 0.8,
          });

      if (result.canceled) return;

      setUploading(true);

      // Upload all selected images
      const uploadPromises = result.assets.map(asset => uploadImage(asset.uri));
      const uploadedUrls = await Promise.all(uploadPromises);

      // Determine photo type automatically for first photo
      const hasStorefront = photos.some(p => p.photo_type === 'storefront');
      const defaultType = !hasStorefront ? 'storefront' : 'general';

      const newPhotos: ShopPhoto[] = uploadedUrls.map((url, index) => ({
        photo_url: url,
        photo_type: index === 0 && !hasStorefront ? 'storefront' : 'general',
        display_order: photos.length + index,
        is_primary: photos.length === 0 && index === 0,
      }));

      updatePhotos([...photos, ...newPhotos]);
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }, [photos, uploadImage, updatePhotos]);

  // Remove photo
  const removePhoto = useCallback((index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    // Reorder display_order
    newPhotos.forEach((photo, i) => {
      photo.display_order = i;
    });
    // Set first photo as primary if removed was primary
    if (newPhotos.length > 0 && photos[index].is_primary) {
      newPhotos[0].is_primary = true;
    }
    updatePhotos(newPhotos);
  }, [photos, updatePhotos]);

  // Set as primary
  const setPrimary = useCallback((index: number) => {
    const newPhotos = photos.map((photo, i) => ({
      ...photo,
      is_primary: i === index,
    }));
    updatePhotos(newPhotos);
  }, [photos, updatePhotos]);

  // Update photo type
  const updatePhotoType = useCallback((index: number, type: ShopPhoto['photo_type']) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], photo_type: type };
    updatePhotos(newPhotos);
    setSelectedPhotoIndex(null);
  }, [photos, updatePhotos]);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Header */}
      <View>
        <Text variant="h3" style={{ marginBottom: theme.spacing.xs }}>
          Showcase your shop
        </Text>
        <Text variant="body" color="secondary">
          Add photos that help buyers trust your business ({photos.length}/{MAX_PHOTOS})
        </Text>
      </View>

      {/* Upload Buttons */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <TouchableOpacity
          onPress={() => pickImage(true)}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.md,
            backgroundColor: theme.colors.primary,
            borderRadius: theme.borderRadius.md,
            gap: theme.spacing.sm,
            opacity: uploading || photos.length >= MAX_PHOTOS ? 0.5 : 1,
          }}
        >
          <Camera size={20} color={theme.colors.primaryForeground} />
          <Text style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
            Take Photo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => pickImage(false)}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            gap: theme.spacing.sm,
            opacity: uploading || photos.length >= MAX_PHOTOS ? 0.5 : 1,
          }}
        >
          <Upload size={20} color={theme.colors.text.primary} />
          <Text style={{ fontWeight: '600' }}>
            Upload
          </Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
          Uploading...
        </Text>
      )}

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 500 }}
        >
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.md,
          }}>
            {photos.map((photo, index) => (
              <View
                key={index}
                style={{
                  width: '48%',
                  aspectRatio: 4 / 3,
                  position: 'relative',
                }}
              >
                {/* Photo */}
                <TouchableOpacity
                  onLongPress={() => setSelectedPhotoIndex(index)}
                  activeOpacity={0.8}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: theme.borderRadius.md,
                    overflow: 'hidden',
                    borderWidth: photo.is_primary ? 3 : 1,
                    borderColor: photo.is_primary ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Image
                    source={{ uri: photo.photo_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  
                  {/* Primary Badge */}
                  {photo.is_primary && (
                    <View style={{
                      position: 'absolute',
                      top: theme.spacing.xs,
                      left: theme.spacing.xs,
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: 2,
                      borderRadius: theme.borderRadius.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <Star size={12} color={theme.colors.primaryForeground} fill={theme.colors.primaryForeground} />
                      <Text variant="caption" style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
                        Primary
                      </Text>
                    </View>
                  )}

                  {/* Photo Type Badge */}
                  <View style={{
                    position: 'absolute',
                    bottom: theme.spacing.xs,
                    left: theme.spacing.xs,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: 2,
                    borderRadius: theme.borderRadius.sm,
                  }}>
                    <Text variant="caption" style={{ color: '#fff', fontSize: 10 }}>
                      {SHOP_PHOTO_TYPES.find(t => t.value === photo.photo_type)?.label || 'General'}
                    </Text>
                  </View>

                  {/* Remove Button */}
                  <TouchableOpacity
                    onPress={() => removePhoto(index)}
                    style={{
                      position: 'absolute',
                      top: theme.spacing.xs,
                      right: theme.spacing.xs,
                      backgroundColor: theme.colors.destructive,
                      borderRadius: theme.borderRadius.full,
                      width: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Set Primary Button */}
                {!photo.is_primary && (
                  <TouchableOpacity
                    onPress={() => setPrimary(index)}
                    style={{
                      position: 'absolute',
                      bottom: theme.spacing.xs,
                      right: theme.spacing.xs,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      borderRadius: theme.borderRadius.sm,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: 2,
                    }}
                  >
                    <Text variant="caption" style={{ color: '#fff', fontSize: 10 }}>
                      Set Primary
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={{
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}>
          <Camera size={48} color={theme.colors.text.muted} />
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            No photos yet. Add at least one storefront photo to continue.
          </Text>
        </View>
      )}

      {/* Required Photo Types */}
      <View style={{
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.sm,
      }}>
        <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
          Recommended Photos:
        </Text>
        {SHOP_PHOTO_TYPES.slice(0, 4).map(type => {
          const hasType = photos.some(p => p.photo_type === type.value);
          return (
            <View key={type.value} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: hasType ? theme.colors.success : theme.colors.surfaceVariant,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {hasType && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
              </View>
              <Text variant="bodySmall" color={hasType ? 'primary' : 'secondary'}>
                {type.label} - {type.description}
                {type.value === 'storefront' && <Text style={{ color: theme.colors.destructive }}> *</Text>}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Info Box */}
      <View style={{
        backgroundColor: theme.colors.primary + '10',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
      }}>
        <Text variant="bodySmall" style={{ lineHeight: 20 }}>
          📸 <Text style={{ fontWeight: '600' }}>Photo Tips:</Text> Good lighting, clear view of your shop, and product displays help buyers trust your business!
        </Text>
      </View>

      {/* Photo Type Selector Modal */}
      {selectedPhotoIndex !== null && (
        <PhotoTypeSelector
          visible={true}
          currentType={photos[selectedPhotoIndex].photo_type}
          onSelect={(type: ShopPhoto['photo_type']) => updatePhotoType(selectedPhotoIndex, type)}
          onClose={() => setSelectedPhotoIndex(null)}
        />
      )}
    </View>
  );
});

Step4Photos.displayName = 'Step4Photos';

export default Step4Photos;

