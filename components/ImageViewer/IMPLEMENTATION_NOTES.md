# ImageViewer Implementation - Full Rewrite

## Overview
Complete rewrite of the ImageViewer component using modern React Native Gesture Handler v2 and Reanimated v3 APIs.

## Previous Issues Fixed

### 1. **Double-tap zoom not working**
- **Problem**: Used deprecated `State` enum and `onGestureEvent` callbacks
- **Solution**: Migrated to new `Gesture` API with `.Tap().numberOfTaps(2)` and proper event handling

### 2. **Swipe between images getting stuck**
- **Problem**: Zoom transforms were applied to all images, not just the current one
- **Solution**: Created separate `ZoomableImage` component for each image with isolated gesture state

### 3. **Gesture conflicts**
- **Problem**: Poor gesture handler composition with nested `simultaneousHandlers`
- **Solution**: Used proper gesture composition:
  - `Gesture.Simultaneous()` for pinch + pan (zoom)
  - `Gesture.Exclusive()` for double-tap vs single-tap
  - Separate pan gesture at container level for swiping between images

## Architecture

### Component Structure
```
ImageViewer (Main Container)
├── Pan Gesture (Swipe between images)
└── ZoomableImage[] (One per image)
    ├── Pinch Gesture (Zoom)
    ├── Pan Gesture (Pan when zoomed)
    └── Exclusive(DoubleTap, SingleTap)
```

### Key Design Decisions

1. **Isolated Zoom State**: Each image has its own zoom/pan state via `ZoomableImage`
   - Prevents gesture conflicts when switching images
   - Automatically resets zoom when image becomes inactive

2. **Gesture Composition**:
   ```typescript
   const composedGesture = Gesture.Simultaneous(
     pinchGesture,
     panGesture,
     Gesture.Exclusive(doubleTapGesture, singleTapGesture)
   );
   ```

3. **Smart Pan Gesture**: Pan only works when zoomed (`scale > 1`)
   ```typescript
   .enabled(scale.value > 1)
   ```

4. **Container-level Swipe**: Separate pan gesture on the image container for smooth swiping
   ```typescript
   .activeOffsetX([-10, 10]) // Prevents accidental swipes
   ```

## Features

### ✅ Double-tap to zoom
- Tap at any point to zoom in (2.5x) centered on tap location
- Double-tap again to zoom out

### ✅ Pinch to zoom
- Zoom range: 1x to 5x
- Smooth spring animations
- Auto-reset if zoomed below 1x

### ✅ Pan when zoomed
- Pan to explore zoomed image
- Constrained to image boundaries
- Only enabled when `scale > 1`

### ✅ Smooth swipe between images
- Swipe threshold: 25% of screen width OR velocity > 500
- Bounce-back animation when at first/last image
- No interference with zoom gestures

### ✅ Single-tap controls
- Toggle UI controls (header, nav arrows, indicators)
- Properly deferred when double-tap detected

### ✅ Automatic zoom reset
- Zoom resets when switching to different image
- Clean state management

## Usage

```typescript
import { ImageViewer } from '@/components/ImageViewer';

<ImageViewer
  visible={isVisible}
  images={imageUrls}
  initialIndex={0}
  onClose={() => setIsVisible(false)}
  showControls={true}
  backgroundColor="rgba(0, 0, 0, 0.9)"
/>
```

## Performance Optimizations

1. **Worklet animations**: All gestures run on UI thread
2. **Spring config**: Tuned for smooth, natural feel
   ```typescript
   { damping: 20, stiffness: 90, mass: 0.5 }
   ```
3. **Lazy rendering**: Images rendered upfront but zoom state isolated
4. **Proper cleanup**: Zoom state resets on image change

## Compatibility

- ✅ Expo (Managed & Bare workflow)
- ✅ React Native CLI
- ✅ iOS & Android
- ✅ TypeScript

## Dependencies

```json
{
  "react-native-gesture-handler": "^2.x",
  "react-native-reanimated": "^3.x",
  "react-native-safe-area-context": "^4.x"
}
```

## Migration Notes

If upgrading from the old implementation:
- No API changes - same props interface
- Better performance and reliability
- All previous issues resolved
- No breaking changes for consumers

## Testing Checklist

- [x] Double-tap zooms in/out
- [x] Pinch to zoom works smoothly
- [x] Pan works only when zoomed
- [x] Swipe between images is smooth
- [x] No gesture conflicts
- [x] Zoom resets on image change
- [x] Single tap toggles controls
- [x] Navigation buttons work
- [x] Page indicators update correctly
- [x] Close button works
- [x] Handles single image
- [x] Handles multiple images
- [x] Works on iOS
- [x] Works on Android

