# Modern Image Picker Component

A modern, marketplace-style image picker component that mimics the user experience of popular apps like Vinted, Instagram, and other modern marketplace applications.

## Features

- **Full-screen modal interface** - Opens in a dedicated full-screen modal for focused image selection
- **3-column grid layout** - Optimized grid display with responsive image sizing
- **Camera integration** - Camera button as the first grid item for instant photo capture
- **Multi-selection support** - Select multiple images with visual indicators and selection order
- **Smooth animations** - Spring-based animations for selection states and interactions
- **Performance optimized** - Uses FlatList with virtualization for handling large photo libraries
- **Permission handling** - Graceful permission requests and error states
- **Selection limits** - Configurable maximum selection with user feedback
- **Modern UI** - Clean, minimal design that fits marketplace app aesthetics

## Usage

### Basic Implementation

```tsx
import React, { useState } from 'react';
import { ModernImagePicker, MediaAsset } from '@/components';

function MyComponent() {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<MediaAsset[]>([]);

  const handleImagesSelected = (images: MediaAsset[]) => {
    setSelectedImages(images);
    console.log('Selected images:', images);
  };

  return (
    <>
      <Button onPress={() => setShowPicker(true)}>
        Select Images
      </Button>
      
      <ModernImagePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onImagesSelected={handleImagesSelected}
        maxSelection={10}
        allowCamera={true}
        title="Select Photos"
      />
    </>
  );
}
```

### Advanced Configuration

```tsx
<ModernImagePicker
  visible={showPicker}
  onClose={() => setShowPicker(false)}
  onImagesSelected={handleImagesSelected}
  maxSelection={20}
  allowCamera={true}
  title="Choose Product Photos"
  initialSelectedImages={existingImages}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | - | Controls modal visibility |
| `onClose` | `() => void` | - | Called when modal should close |
| `onImagesSelected` | `(images: MediaAsset[]) => void` | - | Called when user confirms selection |
| `maxSelection` | `number` | `20` | Maximum number of images that can be selected |
| `initialSelectedImages` | `MediaAsset[]` | `[]` | Pre-selected images |
| `allowCamera` | `boolean` | `true` | Whether to show camera button |
| `title` | `string` | `'Select Photos'` | Modal header title |

## MediaAsset Type

```tsx
interface MediaAsset {
  id: string;
  uri: string;
  filename?: string;
  width: number;
  height: number;
  mediaType: 'photo' | 'video';
  creationTime: number;
}
```

## Permissions

The component automatically handles the following permissions:

- **Media Library Access** - Required to display user's photos
- **Camera Access** - Required when camera functionality is enabled

Permission requests are handled gracefully with user-friendly error states.

## Performance Considerations

- Uses `FlatList` with virtualization for optimal performance with large photo libraries
- Implements `getItemLayout` for smooth scrolling
- Uses `expo-image` for optimized image loading and caching
- Lazy loads photos in batches of 50
- Implements proper memory management for large image sets

## Animations

The component includes several smooth animations:

- **Selection animations** - Spring-based scale and opacity transitions
- **Modal transitions** - Smooth slide-in/out animations
- **Press feedback** - Subtle scale animations on touch
- **Selection indicators** - Animated checkmarks and overlays

## Styling

The component uses the app's design system and theme:

- Respects light/dark mode preferences
- Uses consistent spacing and typography
- Follows material design principles
- Maintains accessibility standards

## Accessibility

- Proper focus management
- Screen reader support
- High contrast support
- Touch target sizing compliance

## Demo

To see the component in action, navigate to `/modern-image-picker-demo` in your app or check out the `ModernImagePickerDemo` component.

## Dependencies

- `expo-media-library` - For accessing device photos
- `expo-image-picker` - For camera functionality
- `expo-image` - For optimized image rendering
- `react-native-reanimated` - For smooth animations
- `react-native-safe-area-context` - For safe area handling

## Browser/Web Support

The component is designed primarily for mobile devices. Web support may be limited due to media library access restrictions in browsers.
