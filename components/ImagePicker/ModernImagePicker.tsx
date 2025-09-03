import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Check, X, ArrowLeft } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

export interface MediaAsset {
  id: string;
  uri: string;
  filename?: string;
  width: number;
  height: number;
  mediaType: 'photo' | 'video';
  creationTime: number;
}

interface ModernImagePickerProps {
  visible: boolean;
  onClose: () => void;
  onImagesSelected: (images: MediaAsset[]) => void;
  maxSelection?: number;
  initialSelectedImages?: MediaAsset[];
  allowCamera?: boolean;
  title?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_SPACING = 2;
const IMAGE_SIZE = (screenWidth - (GRID_COLUMNS + 1) * GRID_SPACING) / GRID_COLUMNS;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface PhotoItemProps {
  item: MediaAsset | 'camera';
  index: number;
  isSelected: boolean;
  selectionIndex: number;
  onPress: () => void;
  onCameraPress?: () => void;
}

function PhotoItem({ item, index, isSelected, selectionIndex, onPress, onCameraPress }: PhotoItemProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(isSelected ? 1 : 0);
  const overlayOpacity = useSharedValue(isSelected ? 0.3 : 0);

  useEffect(() => {
    checkScale.value = withSpring(isSelected ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
    overlayOpacity.value = withTiming(isSelected ? 0.3 : 0, {
      duration: 200,
    });
  }, [isSelected]);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 200,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 200,
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: interpolate(checkScale.value, [0, 1], [0, 1]),
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (item === 'camera') {
    return (
      <AnimatedTouchableOpacity
        style={[
          animatedStyle,
          {
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: theme.colors.primary + '40',
            borderStyle: 'dashed',
          },
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onCameraPress}
        activeOpacity={0.8}
      >
        <View
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.borderRadius.full,
            width: 48,
            height: 48,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          <Camera size={24} color={theme.colors.primaryForeground} />
        </View>
        <Text
          variant="caption"
          style={{
            color: theme.colors.primary,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          Camera
        </Text>
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <AnimatedTouchableOpacity
      style={[
        animatedStyle,
        {
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
          position: 'relative',
        },
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.uri }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: theme.borderRadius.md,
        }}
        contentFit="cover"
        transition={200}
      />
      
      {/* Selection Overlay */}
      <Animated.View
        style={[
          overlayAnimatedStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.primary,
            borderRadius: theme.borderRadius.md,
          },
        ]}
      />

      {/* Selection Indicator */}
      <View
        style={{
          position: 'absolute',
          top: theme.spacing.sm,
          right: theme.spacing.sm,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: isSelected ? theme.colors.primary : 'rgba(0,0,0,0.3)',
          borderWidth: 2,
          borderColor: theme.colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Animated.View style={checkAnimatedStyle}>
          {isSelected ? (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 8,
                width: 16,
                height: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: theme.colors.primary,
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {selectionIndex}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

export function ModernImagePicker({
  visible,
  onClose,
  onImagesSelected,
  maxSelection = 20,
  initialSelectedImages = [],
  allowCamera = true,
  title = 'Select Photos',
}: ModernImagePickerProps) {
  const { theme } = useTheme();
  const [photos, setPhotos] = useState<MediaAsset[]>([]);
  const [selectedImages, setSelectedImages] = useState<MediaAsset[]>(initialSelectedImages);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [endCursor, setEndCursor] = useState<string | undefined>();

  const headerOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      headerOpacity.value = withTiming(1, { duration: 300 });
      contentTranslateY.value = withTiming(0, { duration: 400 });
      requestPermissions();
    } else {
      headerOpacity.value = withTiming(0, { duration: 200 });
      contentTranslateY.value = withTiming(50, { duration: 300 });
    }
  }, [visible]);

  const requestPermissions = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        loadPhotos();
      }
    } catch (error) {
      console.error('Permission error:', error);
      setHasPermission(false);
    }
  };

  const loadPhotos = async (loadMore = false) => {
    if (loading || (!hasNextPage && loadMore)) return;

    setLoading(true);
    try {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: 'creationTime',
        first: 50,
        after: loadMore ? endCursor : undefined,
      });

      const formattedPhotos: MediaAsset[] = result.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
        mediaType: 'photo',
        creationTime: asset.creationTime,
      }));

      if (loadMore) {
        setPhotos(prev => [...prev, ...formattedPhotos]);
      } else {
        setPhotos(formattedPhotos);
      }

      setHasNextPage(result.hasNextPage);
      setEndCursor(result.endCursor);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoPress = useCallback((photo: MediaAsset) => {
    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.id === photo.id);
      
      if (isSelected) {
        return prev.filter(img => img.id !== photo.id);
      } else {
        if (prev.length >= maxSelection) {
          Alert.alert('Selection Limit', `You can only select up to ${maxSelection} photos`);
          return prev;
        }
        return [...prev, photo];
      }
    });
  }, [maxSelection]);

  const handleCameraPress = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newPhoto: MediaAsset = {
          id: `camera_${Date.now()}`,
          uri: asset.uri,
          filename: asset.fileName || `photo_${Date.now()}.jpg`,
          width: asset.width || 0,
          height: asset.height || 0,
          mediaType: 'photo',
          creationTime: Date.now(),
        };

        setSelectedImages(prev => {
          if (prev.length >= maxSelection) {
            Alert.alert('Selection Limit', `You can only select up to ${maxSelection} photos`);
            return prev;
          }
          return [...prev, newPhoto];
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handleDone = () => {
    onImagesSelected(selectedImages);
    onClose();
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loading) {
      loadPhotos(true);
    }
  };

  const renderItem = ({ item, index }: { item: MediaAsset | 'camera'; index: number }) => {
    if (item === 'camera') {
      return (
        <PhotoItem
          item={item}
          index={index}
          isSelected={false}
          selectionIndex={0}
          onPress={() => {}}
          onCameraPress={handleCameraPress}
        />
      );
    }

    const isSelected = selectedImages.some(img => img.id === item.id);
    const selectionIndex = selectedImages.findIndex(img => img.id === item.id) + 1;

    return (
      <PhotoItem
        item={item}
        index={index}
        isSelected={isSelected}
        selectionIndex={selectionIndex}
        onPress={() => handlePhotoPress(item)}
      />
    );
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const gridData = allowCamera ? ['camera' as const, ...photos] : photos;

  if (hasPermission === false) {
    return (
      <AppModal visible={visible} onClose={onClose} size="lg" position="center">
        <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
          <Text variant="h3" style={{ marginBottom: theme.spacing.lg, textAlign: 'center' }}>
            Permission Required
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
            We need access to your photo library to show your photos.
          </Text>
          <Button variant="primary" onPress={requestPermissions} fullWidth>
            Grant Permission
          </Button>
        </View>
      </AppModal>
    );
  }

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      size="full"
      position="center"
      showCloseButton={false}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        
        {/* Header */}
        <Animated.View
          style={[
            headerAnimatedStyle,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: theme.spacing.sm,
              marginLeft: -theme.spacing.sm,
            }}
          >
            <ArrowLeft size={24} color={theme.colors.foreground} />
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="h4" style={{ fontWeight: '600' }}>
              {title}
            </Text>
            <Text variant="caption" color="secondary">
              {selectedImages.length} of {maxSelection} selected
            </Text>
          </View>

          <Button
            variant={selectedImages.length > 0 ? 'primary' : 'ghost'}
            size="sm"
            onPress={handleDone}
            disabled={selectedImages.length === 0}
            style={{
              paddingHorizontal: theme.spacing.lg,
              opacity: selectedImages.length > 0 ? 1 : 0.5,
            }}
          >
            Done
          </Button>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[contentAnimatedStyle, { flex: 1 }]}>
          {hasPermission && (
            <FlatList
              data={gridData}
              renderItem={renderItem}
              keyExtractor={(item, index) => 
                typeof item === 'string' ? item : item.id
              }
              numColumns={GRID_COLUMNS}
              contentContainerStyle={{
                padding: GRID_SPACING,
                paddingBottom: theme.spacing.xl,
              }}
              columnWrapperStyle={{
                justifyContent: 'space-between',
                marginBottom: GRID_SPACING,
              }}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              initialNumToRender={30}
              maxToRenderPerBatch={20}
              windowSize={10}
              removeClippedSubviews={Platform.OS === 'android'}
              getItemLayout={(data, index) => ({
                length: IMAGE_SIZE + GRID_SPACING,
                offset: (IMAGE_SIZE + GRID_SPACING) * Math.floor(index / GRID_COLUMNS),
                index,
              })}
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </AppModal>
  );
}
