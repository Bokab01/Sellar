import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { ModernImagePicker, MediaAsset } from './ModernImagePicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Camera, Image as ImageIcon } from 'lucide-react-native';

export function ModernImagePickerDemo() {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<MediaAsset[]>([]);

  const handleImagesSelected = (images: MediaAsset[]) => {
    setSelectedImages(images);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
      >
        {/* Header */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h2" style={{ marginBottom: theme.spacing.sm }}>
            Modern Image Picker
          </Text>
          <Text variant="body" color="secondary">
            A marketplace-style image picker that mimics apps like Vinted and Instagram.
          </Text>
        </View>

        {/* Features */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Features
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            {[
              '📱 Full-screen modal interface',
              '🖼️ 3-column photo grid layout',
              '📷 Camera button as first grid item',
              '✅ Multi-selection with visual indicators',
              '🔢 Selection counter and order numbers',
              '✨ Smooth animations and interactions',
              '🚀 Optimized performance with FlatList',
              '📊 Selection limit enforcement',
            ].map((feature, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.colors.primary,
                    marginRight: theme.spacing.md,
                  }}
                />
                <Text variant="body" style={{ flex: 1 }}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Demo Button */}
        <Button
          variant="primary"
          size="lg"
          icon={<Camera size={20} color={theme.colors.primaryForeground} />}
          onPress={() => setShowPicker(true)}
          fullWidth
          style={{
            paddingVertical: theme.spacing.lg,
            marginBottom: theme.spacing.xl,
          }}
        >
          Open Modern Image Picker
        </Button>

        {/* Selected Images Display */}
        {selectedImages.length > 0 && (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing.lg,
              }}
            >
              <Text variant="h4">Selected Images</Text>
              <View
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.borderRadius.full,
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.primaryForeground,
                    fontWeight: '600',
                  }}
                >
                  {selectedImages.length}
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: theme.spacing.md,
                paddingRight: theme.spacing.md,
              }}
            >
              {selectedImages.map((image, index) => (
                <View
                  key={image.id}
                  style={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                  }}
                >
                  <Image
                    source={{ uri: image.uri }}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: theme.borderRadius.md,
                    }}
                    contentFit="cover"
                  />
                  
                  {/* Selection Order */}
                  <View
                    style={{
                      position: 'absolute',
                      top: -theme.spacing.xs,
                      right: -theme.spacing.xs,
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.borderRadius.full,
                      width: 20,
                      height: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: theme.colors.surface,
                    }}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: theme.colors.primaryForeground,
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Button
              variant="secondary"
              size="sm"
              onPress={() => setSelectedImages([])}
              style={{ marginTop: theme.spacing.lg }}
            >
              Clear Selection
            </Button>
          </View>
        )}

        {/* Usage Example */}
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginTop: theme.spacing.xl,
          }}
        >
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Usage Example
          </Text>
          <Text
            variant="bodySmall"
            color="secondary"
            style={{
              fontFamily: 'monospace',
              lineHeight: 20,
            }}
          >
{`import { ModernImagePicker } from '@/components';

function MyComponent() {
  const [showPicker, setShowPicker] = useState(false);
  const [images, setImages] = useState([]);

  return (
    <>
      <Button onPress={() => setShowPicker(true)}>
        Select Images
      </Button>
      
      <ModernImagePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onImagesSelected={setImages}
        maxSelection={10}
        allowCamera={true}
        title="Select Photos"
      />
    </>
  );
}`}
          </Text>
        </View>
      </ScrollView>

      {/* Modern Image Picker */}
      <ModernImagePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onImagesSelected={handleImagesSelected}
        maxSelection={20}
        allowCamera={true}
        title="Select Photos"
        initialSelectedImages={selectedImages}
      />
    </SafeAreaView>
  );
}
