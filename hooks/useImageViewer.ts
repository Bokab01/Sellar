import { useState, useCallback } from 'react';
import { Alert, Share as RNShare, Platform } from 'react-native';

// Conditional imports with fallbacks
let FileSystem: any = null;
let MediaLibrary: any = null;
let Sharing: any = null;

try {
  FileSystem = require('expo-file-system');
} catch (e) {
  console.warn('expo-file-system not available');
}

try {
  MediaLibrary = require('expo-media-library');
} catch (e) {
  console.warn('expo-media-library not available');
}

try {
  Sharing = require('expo-sharing');
} catch (e) {
  console.warn('expo-sharing not available');
}

interface UseImageViewerProps {
  images: string[];
  initialIndex?: number;
}

export function useImageViewer({ images, initialIndex = 0 }: UseImageViewerProps) {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const openViewer = useCallback((index: number = 0) => {
    setCurrentIndex(index);
    setVisible(true);
  }, []);

  const closeViewer = useCallback(() => {
    setVisible(false);
  }, []);

  const shareImage = useCallback(async (imageUrl: string, index: number) => {
    try {
      if (Platform.OS === 'web') {
        // Web sharing
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({
            title: `Image ${index + 1}`,
            url: imageUrl,
          });
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          // Fallback for web browsers without native sharing
          await navigator.clipboard.writeText(imageUrl);
          Alert.alert('Copied', 'Image URL copied to clipboard');
        } else {
          Alert.alert('Share', `Image URL: ${imageUrl}`);
        }
      } else {
        // Mobile sharing
        if (Sharing && FileSystem) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            // Download image first
            const fileUri = FileSystem.documentDirectory + `image_${index}.jpg`;
            const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
            
            if (downloadResult.status === 200) {
              await Sharing.shareAsync(downloadResult.uri, {
                mimeType: 'image/jpeg',
                dialogTitle: `Share Image ${index + 1}`,
              });
            } else {
              throw new Error('Failed to download image');
            }
          } else {
            // Fallback to React Native Share
            await RNShare.share({
              url: imageUrl,
              title: `Image ${index + 1}`,
            });
          }
        } else {
          // Fallback to React Native Share if expo packages not available
          await RNShare.share({
            url: imageUrl,
            title: `Image ${index + 1}`,
          });
        }
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    }
  }, []);

  const downloadImage = useCallback(async (imageUrl: string, index: number) => {
    try {
      if (Platform.OS === 'web') {
        // Web download
        if (typeof document !== 'undefined') {
          const link = document.createElement('a');
          link.href = imageUrl;
          link.download = `image_${index + 1}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Alert.alert('Downloaded', 'Image download started');
        } else {
          Alert.alert('Download', `Image URL: ${imageUrl}`);
        }
      } else {
        // Mobile download
        if (MediaLibrary && FileSystem) {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant permission to save images to your photo library.');
            return;
          }

          // Download image to cache
          const fileUri = FileSystem.cacheDirectory + `image_${index}_${Date.now()}.jpg`;
          const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
          
          if (downloadResult.status === 200) {
            // Save to photo library
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            await MediaLibrary.createAlbumAsync('Sellar', asset, false);
            
            Alert.alert('Success', 'Image saved to your photo library');
          } else {
            throw new Error('Failed to download image');
          }
        } else {
          Alert.alert('Download Not Available', 'Download functionality requires additional setup.');
        }
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to download image. Please try again.');
    }
  }, []);

  return {
    visible,
    currentIndex,
    openViewer,
    closeViewer,
    shareImage,
    downloadImage,
  };
}
