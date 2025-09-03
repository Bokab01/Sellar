import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { ImageViewer } from './ImageViewer';
import { useImageViewer } from '@/hooks/useImageViewer';

interface ImageViewerExampleProps {
  images: string[];
  title?: string;
}

export function ImageViewerExample({ images, title = 'Gallery' }: ImageViewerExampleProps) {
  const { theme } = useTheme();
  
  const {
    visible,
    currentIndex,
    openViewer,
    closeViewer,
    shareImage,
    downloadImage,
  } = useImageViewer({ images });

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        {title}
      </Text>
      
      <View style={styles.grid}>
        {images.slice(0, 4).map((imageUrl, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.thumbnail,
              {
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.surfaceVariant,
              }
            ]}
            onPress={() => openViewer(index)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            
            {/* Show count overlay on last thumbnail if there are more images */}
            {index === 3 && images.length > 4 && (
              <View style={styles.overlay}>
                <Text variant="h4" style={{ color: 'white', fontWeight: 'bold' }}>
                  +{images.length - 4}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ImageViewer
        visible={visible}
        images={images}
        initialIndex={currentIndex}
        onClose={closeViewer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
