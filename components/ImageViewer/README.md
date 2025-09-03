# ImageViewer Component

A comprehensive image viewer component with pinch-to-zoom, swipe navigation, and sharing capabilities.

## Features

- **Pinch to Zoom**: Zoom in/out with pinch gestures (0.5x to 5x)
- **Pan to Navigate**: Pan around when zoomed in
- **Swipe Between Images**: Swipe left/right to navigate between images
- **Double Tap to Zoom**: Double tap to zoom in/out
- **Single Tap to Toggle Controls**: Hide/show navigation controls
- **Image Navigation**: Previous/next buttons and page indicators
- **Share & Download**: Built-in sharing and download functionality
- **Responsive Design**: Works on all screen sizes
- **Smooth Animations**: Powered by React Native Reanimated

## Installation

The component requires the following dependencies:

```bash
npm install react-native-gesture-handler react-native-reanimated expo-file-system expo-media-library expo-sharing
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { ImageViewer } from '@/components';

function MyComponent() {
  const [visible, setVisible] = useState(false);
  const images = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ];

  return (
    <>
      <Button onPress={() => setVisible(true)}>
        Open Gallery
      </Button>
      
      <ImageViewer
        visible={visible}
        images={images}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
```

## Using the Hook

For easier state management, use the `useImageViewer` hook:

```tsx
import React from 'react';
import { ImageViewer, useImageViewer } from '@/components';

function MyComponent() {
  const images = ['image1.jpg', 'image2.jpg'];
  
  const {
    visible,
    currentIndex,
    openViewer,
    closeViewer,
    shareImage,
    downloadImage,
  } = useImageViewer({ images });

  return (
    <>
      <Button onPress={() => openViewer(0)}>
        View Images
      </Button>
      
      <ImageViewer
        visible={visible}
        images={images}
        initialIndex={currentIndex}
        onClose={closeViewer}
        onShare={shareImage}
        onDownload={downloadImage}
      />
    </>
  );
}
```

## Props

### ImageViewer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | `false` | Whether the viewer is visible |
| `images` | `string[]` | `[]` | Array of image URLs |
| `initialIndex` | `number` | `0` | Initial image index to display |
| `onClose` | `() => void` | - | Callback when viewer is closed |
| `onShare` | `(url: string, index: number) => void` | - | Callback for sharing images |
| `onDownload` | `(url: string, index: number) => void` | - | Callback for downloading images |
| `showControls` | `boolean` | `true` | Whether to show navigation controls |
| `backgroundColor` | `string` | `'rgba(0, 0, 0, 0.9)'` | Background color of the viewer |

### useImageViewer Hook Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `string[]` | `[]` | Array of image URLs |
| `initialIndex` | `number` | `0` | Initial image index |

### useImageViewer Hook Returns

| Property | Type | Description |
|----------|------|-------------|
| `visible` | `boolean` | Current visibility state |
| `currentIndex` | `number` | Current image index |
| `openViewer` | `(index?: number) => void` | Function to open viewer |
| `closeViewer` | `() => void` | Function to close viewer |
| `shareImage` | `(url: string, index: number) => Promise<void>` | Function to share image |
| `downloadImage` | `(url: string, index: number) => Promise<void>` | Function to download image |

## Gestures

### Pinch Gesture
- **Zoom In**: Pinch outward to zoom in (up to 5x)
- **Zoom Out**: Pinch inward to zoom out (minimum 0.5x)
- **Auto Reset**: Automatically resets to 1x if zoomed below 1x

### Pan Gesture
- **When Zoomed**: Pan to move around the zoomed image
- **When Not Zoomed**: Swipe horizontally to navigate between images
- **Boundaries**: Respects image boundaries when zoomed

### Tap Gestures
- **Single Tap**: Toggle visibility of navigation controls
- **Double Tap**: Zoom in to 2.5x or zoom out to 1x

### Swipe Navigation
- **Threshold**: 30% of screen width or high velocity
- **Animation**: Smooth spring animation between images
- **Boundaries**: Respects first/last image boundaries

## Integration Examples

### With ProductCard

```tsx
import { ProductCardWithViewer } from '@/components/Card/ProductCardWithViewer';

<ProductCardWithViewer
  image={['image1.jpg', 'image2.jpg']}
  title="Product Title"
  price={100}
  seller={{ name: 'John Doe' }}
  enableImageViewer={true}
/>
```

### With Listing Detail Screen

The component is already integrated into the listing detail screen (`app/(tabs)/home/[id].tsx`). Users can tap on any image to open the full-screen viewer.

### Custom Gallery

```tsx
import { ImageViewerExample } from '@/components/ImageViewer/ImageViewerExample';

<ImageViewerExample
  images={galleryImages}
  title="Product Gallery"
/>
```

## Platform Support

- **iOS**: Full support with native gestures
- **Android**: Full support with native gestures  
- **Web**: Full support with touch/mouse events

## Performance Considerations

- Images are loaded on-demand
- Smooth 60fps animations with React Native Reanimated
- Memory efficient with proper cleanup
- Optimized for large image sets

## Accessibility

- VoiceOver/TalkBack support
- Keyboard navigation support
- Screen reader announcements
- High contrast support

## Troubleshooting

### Images not loading
- Ensure image URLs are valid and accessible
- Check network connectivity
- Verify CORS settings for web images

### Gestures not working
- Ensure `react-native-gesture-handler` is properly installed
- Check that gesture handler is wrapped around your app
- Verify Android/iOS specific setup

### Performance issues
- Reduce image sizes for better performance
- Use optimized image formats (WebP, AVIF)
- Consider lazy loading for large galleries
