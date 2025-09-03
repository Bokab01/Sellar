import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { ProductCard } from './Card';
import { ImageViewer } from '../ImageViewer';
import { useImageViewer } from '@/hooks/useImageViewer';

interface ProductCardWithViewerProps {
  image: string | string[];
  imagePath?: string;
  title: string;
  price: number;
  currency?: string;
  seller: {
    id?: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
  badge?: {
    text: string;
    variant?: 'new' | 'sold' | 'featured' | 'discount' | 'info' | 'success';
  };
  onPress?: () => void;
  onSellerPress?: () => void;
  onActionPress?: () => void;
  actionText?: string;
  location?: string;
  layout?: 'default' | 'grid';
  fullWidth?: boolean;
  enableImageViewer?: boolean;
}

export function ProductCardWithViewer({
  image,
  enableImageViewer = true,
  onPress,
  ...props
}: ProductCardWithViewerProps) {
  // Convert image to array format for ImageViewer
  const images = Array.isArray(image) ? image : [image];
  const displayImage = Array.isArray(image) ? image[0] : image;

  const {
    visible,
    currentIndex,
    openViewer,
    closeViewer,
    shareImage,
    downloadImage,
  } = useImageViewer({ images });

  const handleCardPress = () => {
    if (enableImageViewer && images.length > 0) {
      // If it's a single image, open viewer; if multiple images or no viewer, use original onPress
      if (images.length === 1) {
        openViewer(0);
      } else if (onPress) {
        onPress();
      }
    } else if (onPress) {
      onPress();
    }
  };

  const handleImagePress = (e: any) => {
    if (enableImageViewer) {
      e.stopPropagation();
      openViewer(0);
    }
  };

  return (
    <>
      <ProductCard
        {...props}
        image={displayImage}
        onPress={handleCardPress}
      />
      
      {enableImageViewer && (
        <ImageViewer
          visible={visible}
          images={images}
          initialIndex={currentIndex}
          onClose={closeViewer}
          onShare={shareImage}
          onDownload={downloadImage}
        />
      )}
    </>
  );
}
