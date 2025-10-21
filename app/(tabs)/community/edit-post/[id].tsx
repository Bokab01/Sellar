import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useListings } from '@/hooks/useListings';
import { hybridStorage } from '@/lib/hybridStorage';
import { STORAGE_BUCKETS } from '@/lib/storage';
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
  OptimizedImage,
  EmptyState,
  LoadingSkeleton,
  PriceDisplay,
} from '@/components';
import { SelectedImage } from '@/components/ImagePicker';
import { Send, Package, X, Search, Sparkles, Users, TrendingUp, Lightbulb, Star, Calendar, Handshake, MessageSquare, Plus } from 'lucide-react-native';

export default function EditPostScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts, updatePost } = useCommunityPosts();
  const { listings: userListings, loading: listingsLoading } = useListings({ userId: user?.id });
  
  const [content, setContent] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Listing attachment functionality
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [listingSearchQuery, setListingSearchQuery] = useState('');
  
  // Post type selection
  const [postType, setPostType] = useState<'general' | 'showcase' | 'question' | 'announcement' | 'tips' | 'review' | 'event' | 'collaboration'>('general');

  // Find the current post
  const currentPost = posts.find(post => post.id === id);

  // Load current post data
  useEffect(() => {
    if (currentPost) {
      setContent(currentPost.content || '');
      setLocation(currentPost.location || '');
      setPostType(currentPost.type || 'general');
      
      // Convert existing images to SelectedImage format
      if (currentPost.images && currentPost.images.length > 0) {
        const existingImages: SelectedImage[] = currentPost.images.map((imageUrl: string, index: number) => ({
          id: `existing-${index}`,
          uri: imageUrl,
          type: 'image',
        }));
        setImages(existingImages);
      }

      // Set selected listing if exists
      if (currentPost.listing_id && userListings) {
        const listing = userListings.find(l => l.id === currentPost.listing_id);
        if (listing) {
          setSelectedListing(listing);
        }
      }
    }
  }, [currentPost, userListings]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    if (!user || !id) {
      Alert.alert('Error', 'Unable to update post');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      let imageUrls: string[] = [];

      // Handle image uploads - only upload new images
      const newImages = images.filter(img => !img.uri.startsWith('http'));
      const existingImages = images.filter(img => img.uri.startsWith('http')).map(img => img.uri);

      if (newImages.length > 0) {
        const uploadResults = await hybridStorage.uploadMultipleImages(
          newImages.map(img => img.uri),
          STORAGE_BUCKETS.COMMUNITY,
          'posts',
          user?.id,
          (current, total) => {
            const progress = current / total;
            setUploadProgress(progress);
          }
        );
        const newImageUrls = uploadResults.map(result => result.url);
        imageUrls = [...existingImages, ...newImageUrls];
      } else {
        imageUrls = existingImages;
      }

      // Update post
      const { error } = await updatePost(id, {
        content: content.trim(),
        images: imageUrls,
        location: location.trim() || undefined,
        type: postType,
      });

      if (error) {
        throw new Error(error);
      }

      setShowSuccess(true);
      
      // Navigate back after success
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (error: any) {
      console.error('Error updating post:', error);
      Alert.alert('Error', error.message || 'Failed to update post. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Filter listings based on search
  const filteredListings = userListings?.filter(listing => 
    listing.title.toLowerCase().includes(listingSearchQuery.toLowerCase()) ||
    listing.description.toLowerCase().includes(listingSearchQuery.toLowerCase())
  ) || [];

  // Get placeholder text based on post type
  const getPlaceholderText = () => {
    switch (postType) {
      case 'showcase':
        return "Show off your latest product, share your success story, or highlight your business achievements...";
      case 'question':
        return "Ask the community for advice, recommendations, or help with something you're working on...";
      case 'announcement':
        return "Share important news, updates, or announcements with the community...";
      case 'tips':
        return "Share helpful tips, advice, or lessons learned that could benefit others in the community...";
      case 'review':
        return "Share your honest review or experience with a product, service, or business...";
      case 'event':
        return "Share details about an upcoming event, meetup, or gathering...";
      case 'collaboration':
        return "Looking for partners, collaborators, or team members for a project...";
      default:
        return "What's on your mind? Share your thoughts, experiences, or connect with the community...";
    }
  };

  // Post type options
  const postTypes = [
    { 
      key: 'general', 
      label: 'General', 
      icon: Users, 
      description: 'Share thoughts',
      color: theme.colors.primary 
    },
    { 
      key: 'showcase', 
      label: 'Showcase', 
      icon: Sparkles, 
      description: 'Show off work',
      color: theme.colors.warning 
    },
    { 
      key: 'question', 
      label: 'Question', 
      icon: MessageSquare, 
      description: 'Ask community',
      color: theme.colors.info 
    },
    { 
      key: 'announcement', 
      label: 'News', 
      icon: TrendingUp, 
      description: 'Share updates',
      color: theme.colors.error 
    },
    { 
      key: 'tips', 
      label: 'Tips', 
      icon: Lightbulb, 
      description: 'Share advice',
      color: theme.colors.success 
    },
    { 
      key: 'review', 
      label: 'Review', 
      icon: Star, 
      description: 'Rate & review',
      color: theme.colors.warning 
    },
    { 
      key: 'event', 
      label: 'Event', 
      icon: Calendar, 
      description: 'Share events',
      color: theme.colors.info 
    },
    { 
      key: 'collaboration', 
      label: 'Collab', 
      icon: Handshake, 
      description: 'Find partners',
      color: theme.colors.success 
    },
  ];

  if (!currentPost) {
    return (
      <SafeAreaWrapper>
        <AppHeader 
          title="Edit Post" 
          showBackButton 
          onBackPress={() => router.back()} 
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
          <EmptyState
            title="Post Not Found"
            description="The post you're trying to edit could not be found."
            action={{
              text: 'Go Back',
              onPress: () => router.back(),
            }}
          />
        </View>
      </SafeAreaWrapper>
    );
  }

  // Check if user owns this post
  if (currentPost.user_id !== user?.id) {
    return (
      <SafeAreaWrapper>
        <AppHeader 
          title="Edit Post" 
          showBackButton 
          onBackPress={() => router.back()} 
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
          <EmptyState
            title="Access Denied"
            description="You can only edit your own posts."
            action={{
              text: 'Go Back',
              onPress: () => router.back(),
            }}
          />
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader 
        title="Edit Post" 
        showBackButton 
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="save"
            variant="primary"
            size="sm"
            onPress={handleSubmit}
            disabled={loading || !content.trim()}
            style={{ minWidth: 80 }}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        ]}
      />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post Type Selection */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
            Post Type
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.md }}
          >
            {postTypes.map((type) => {
              const IconComponent = type.icon;
              const isSelected = postType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setPostType(type.key as any)}
                  style={{
                    backgroundColor: isSelected ? type.color + '20' : theme.colors.surface,
                    borderWidth: 2,
                    borderColor: isSelected ? type.color : theme.colors.border,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.md,
                    alignItems: 'center',
                    minWidth: 100,
                  }}
                >
                  <IconComponent
                    size={24}
                    color={isSelected ? type.color : theme.colors.text.muted}
                    style={{ marginBottom: theme.spacing.xs }}
                  />
                  <Text 
                    variant="bodySmall" 
                    style={{ 
                      fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? type.color : theme.colors.text.muted,
                      textAlign: 'center',
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    {type.label}
                  </Text>
                  <Text 
                    variant="caption" 
                    color="muted"
                    style={{ textAlign: 'center', fontSize: 10 }}
                  >
                    {type.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content Input */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
            Content
          </Text>
          <Input
            placeholder={getPlaceholderText()}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            style={{
              minHeight: 120,
              textAlignVertical: 'top',
              paddingTop: theme.spacing.md,
            }}
          />
        </View>

        {/* Image Picker */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
            Images
          </Text>
          <CustomImagePicker
            value={images}
            onChange={setImages}
            limit={5}
            disabled={loading}
          />
        </View>

        {/* Location Input */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
            Location (Optional)
          </Text>
          <LocationPicker
            value={location}
            onLocationSelect={setLocation}
            placeholder="Add location..."
          />
        </View>

        {/* Selected Listing Preview */}
        {selectedListing && (
          <View style={{ marginBottom: theme.spacing.xl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Text variant="h4" style={{ fontWeight: '600' }}>
                Attached Listing
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedListing(null)}
                style={{
                  backgroundColor: theme.colors.error + '20',
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.xs,
                }}
              >
                <X size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 2,
              borderColor: theme.colors.primary,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                {selectedListing.images?.[0] && (
                  <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: theme.borderRadius.md,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.surface,
                  }}>
                    <OptimizedImage
                      source={{ uri: selectedListing.images[0] }}
                      style={{
                        width: 60,
                        height: 60,
                      }}
                      resizeMode="cover"
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    {selectedListing.title}
                  </Text>
                  <PriceDisplay 
                    amount={selectedListing.price} 
                    currency={selectedListing.currency || 'GHS'} 
                    size="sm" 
                  />
                  {selectedListing.location && (
                    <Text variant="caption" color="muted">
                      {selectedListing.location}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Upload Progress */}
        {loading && uploadProgress > 0 && (
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.sm }}>
              Uploading images... {Math.round(uploadProgress)}%
            </Text>
            <LinearProgress progress={uploadProgress / 100} />
          </View>
        )}

        {/* Submit Button */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleSubmit}
          disabled={loading || !content.trim()}
          style={{ marginBottom: theme.spacing.xl }}
          leftIcon={loading ? undefined : <Send size={20} color={theme.colors.text.inverse} />}
        >
          {loading ? 'Updating Post...' : 'Update Post'}
        </Button>
      </ScrollView>

      {/* Success Toast */}
      <Toast
        visible={showSuccess}
        message="Post updated successfully!"
        variant="success"
        onHide={() => setShowSuccess(false)}
      />
    </SafeAreaWrapper>
  );
}
