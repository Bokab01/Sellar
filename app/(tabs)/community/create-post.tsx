import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { storageHelpers } from '@/lib/storage';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Input,
  Button,
  CustomImagePicker,
  LocationPicker,
  Toast,
  LinearProgress,
} from '@/components';
import { SelectedImage } from '@/components/ImagePicker';
import { Send, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';

export default function CreatePostScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { createPost } = useCommunityPosts();
  
  const [content, setContent] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    setLoading(true);
    try {
      // Upload images if any
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const uploadResults = await storageHelpers.uploadMultipleImages(
          images.map(img => img.uri),
          'images',
          'posts',
          user.id,
          setUploadProgress
        );
        imageUrls = uploadResults.map(result => result.url);
      }

      // Create post
      const { error } = await createPost(
        content.trim(),
        imageUrls,
        undefined // listingId - TODO: Add listing tagging feature
      );

      if (error) {
        throw new Error(error);
      }

      setShowSuccess(true);
      
      // Reset form and navigate back
      setTimeout(() => {
        setContent('');
        setImages([]);
        setLocation('');
        router.back();
      }, 1500);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Create Post"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !content.trim()}
          >
            Post
          </Button>,
        ]}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ padding: theme.spacing.lg }}>
          {/* Content Input */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Input
              variant="multiline"
              placeholder="What's on your mind? Share your thoughts, experiences, or ask the community..."
              value={content}
              onChangeText={setContent}
              style={{ minHeight: 120 }}
            />
          </View>

          {/* Image Picker */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <CustomImagePicker
              limit={5}
              value={images}
              onChange={setImages}
              disabled={loading}
            />
            
            {loading && uploadProgress > 0 && (
              <View style={{ marginTop: theme.spacing.md }}>
                <LinearProgress
                  progress={uploadProgress}
                  showPercentage
                />
                <Text
                  variant="caption"
                  color="muted"
                  style={{ textAlign: 'center', marginTop: theme.spacing.sm }}
                >
                  Uploading images... {Math.round(uploadProgress * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* Location (Optional) */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Add Location (Optional)
            </Text>
            <LocationPicker
              value={location}
              onLocationSelect={setLocation}
              placeholder="Where are you posting from?"
            />
          </View>

          {/* Submit Button */}
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !content.trim()}
            fullWidth
            size="lg"
            icon={<Send size={18} color={theme.colors.primaryForeground} />}
          >
            {loading ? 'Creating Post...' : 'Share Post'}
          </Button>
        </View>
      </ScrollView>

      {/* Success Toast */}
      <Toast
        visible={showSuccess}
        message="Post shared successfully!"
        variant="success"
        onHide={() => setShowSuccess(false)}
      />
    </SafeAreaWrapper>
  );
}