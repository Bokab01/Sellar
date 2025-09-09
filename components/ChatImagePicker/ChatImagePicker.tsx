import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { Toast } from '@/components/Toast/Toast';
import { useImageUpload } from '@/hooks/useImageUpload';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon } from 'lucide-react-native';

interface ChatImagePickerProps {
  onImageSelected: (imageUrl: string) => void;
  disabled?: boolean;
}

export function ChatImagePicker({ onImageSelected, disabled = false }: ChatImagePickerProps) {
  const { theme } = useTheme();
  const { uploading, uploadSingle } = useImageUpload({
    folder: 'chat-images',
    bucket: 'listing-images', // Use listing-images as fallback since it's public and more likely to work
  });
  const [showPicker, setShowPicker] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  const showError = (message: string) => {
    setToastMessage(message);
    setToastVariant('error');
    setShowToast(true);
  };

  const showSuccess = (message: string) => {
    setToastMessage(message);
    setToastVariant('success');
    setShowToast(true);
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

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      showError('Failed to capture photo');
    }
  };

  const pickFromLibrary = async () => {
    setShowPicker(false);
    
    const hasPermission = await requestPermissions('library');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      showError('Failed to select image from library');
    }
  };

  const handleImageUpload = async (uri: string) => {
    try {
      const imageData = {
        uri,
        id: Date.now().toString(),
        type: 'image/jpeg',
        name: `chat_image_${Date.now()}.jpg`,
      };

      console.log('📤 Starting image upload for chat:', imageData);
      const result = await uploadSingle(imageData);
      
      if (result) {
        console.log('✅ Chat image upload successful:', result.url);
        onImageSelected(result.url);
        showSuccess('Image uploaded successfully!');
      } else {
        console.error('❌ Chat image upload failed: No result returned');
        showError('Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('❌ Chat image upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Network request failed')) {
        showError('Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('permission')) {
        showError('Permission denied. Please check your account permissions.');
      } else if (errorMessage.includes('bucket')) {
        showError('Storage configuration issue. Please contact support.');
      } else {
        showError('Failed to upload image. Please try again.');
      }
    }
  };

  return (
    <>
      <Button
        variant="icon"
        icon={<ImageIcon size={20} color={uploading ? theme.colors.text.muted : theme.colors.primary} />}
        onPress={() => setShowPicker(true)}
        disabled={disabled || uploading}
        style={{ 
          width: 36, 
          height: 36,
          backgroundColor: uploading ? theme.colors.surfaceVariant : theme.colors.primary + '10',
          opacity: uploading ? 0.5 : 1,
        }}
      />

      {/* Image Source Picker Modal */}
      <AppModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        title="Send Image"
        size="sm"
        position="bottom"
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ 
            textAlign: 'center', 
            lineHeight: 22,
            marginBottom: theme.spacing.md,
          }}>
            Choose how you'd like to send an image
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
              Choose from Gallery
            </Button>
          </View>
        </View>
      </AppModal>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </>
  );
}
