import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useListings } from '@/hooks/useListings';
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
  AppModal,
  LinearProgress,
  OptimizedImage,
  EmptyState,
  LoadingSkeleton,
  PriceDisplay,
} from '@/components';
import { SelectedImage } from '@/components/ImagePicker';
import { Send, Package, X, Search, Sparkles, Users, TrendingUp, Lightbulb, Star, Calendar, Handshake, MessageSquare, Plus } from 'lucide-react-native';
import { router } from 'expo-router';

export default function CreatePostScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { createPost } = useCommunityPosts();
  const { listings: userListings, loading: listingsLoading } = useListings({ userId: user?.id });
  
  const [content, setContent] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [moderationError, setModerationError] = useState('');
  const [showModerationModal, setShowModerationModal] = useState(false);
  
  // Listing attachment functionality
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [listingSearchQuery, setListingSearchQuery] = useState('');
  
  // Post type selection
  const [postType, setPostType] = useState<'general' | 'showcase' | 'question' | 'announcement' | 'tips' | 'review' | 'event' | 'collaboration'>('general');



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
          'community-images',
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
        selectedListing?.id, // Attach selected listing
        postType, // Pass the selected post type
        location // Pass the location
      );

      if (error) {
        // Show moderation error with specific issues
        setModerationError(error);
        setShowModerationModal(true);
        return;
      }

      // Post published successfully
      setShowSuccess(true);
      
      // Reset form and navigate back
      setTimeout(() => {
        setContent('');
        setImages([]);
        setLocation('');
        setSelectedListing(null);
        setPostType('general');
        router.back();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Filter user listings based on search query
  const filteredListings = userListings?.filter((listing: any) => 
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
        return "Announce an upcoming event, workshop, or gathering that the community might be interested in...";
      case 'collaboration':
        return "Looking for partners, collaborators, or team members? Share your collaboration opportunity...";
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
      description: 'Show products',
      color: '#FF6B6B' 
    },
    { 
      key: 'question', 
      label: 'Question', 
      icon: MessageSquare, 
      description: 'Ask for help',
      color: '#4ECDC4' 
    },
    { 
      key: 'tips', 
      label: 'Tips', 
      icon: Lightbulb, 
      description: 'Share advice',
      color: '#FFD93D' 
    },
    { 
      key: 'review', 
      label: 'Review', 
      icon: Star, 
      description: 'Rate & review',
      color: '#FF9500' 
    },
    { 
      key: 'event', 
      label: 'Event', 
      icon: Calendar, 
      description: 'Announce events',
      color: '#8E44AD' 
    },
    { 
      key: 'collaboration', 
      label: 'Collab', 
      icon: Handshake, 
      description: 'Find partners',
      color: '#27AE60' 
    },
    { 
      key: 'announcement', 
      label: 'News', 
      icon: TrendingUp, 
      description: 'Important updates',
      color: '#45B7D1' 
    },
  ];

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Create Post"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="post-button"
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
          {/* Post Type Selection */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              What type of post is this?
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
                    />
                    <Text 
                      variant="caption" 
                      style={{ 
                        marginTop: theme.spacing.xs,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? type.color : theme.colors.text.muted
                      }}
                    >
                      {type.label}
                    </Text>
                    <Text 
                      variant="caption" 
                      color="muted" 
                      style={{ 
                        textAlign: 'center', 
                        fontSize: 10,
                        marginTop: 2
                      }}
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
            <Input
              variant="multiline"
              placeholder={getPlaceholderText()}
              value={content}
              onChangeText={setContent}
              style={{ minHeight: 120 }}
            />
          </View>

          {/* Image Picker - Restricted to 1 image */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <CustomImagePicker
              limit={1}
              value={images}
              onChange={setImages}
              disabled={loading}
              title="Add Photo (Optional)"
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
                  Uploading image... {Math.round(uploadProgress * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* Listing Attachment */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
              <Text variant="h4">Attach a Listing (Optional)</Text>
              {selectedListing && (
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
              )}
            </View>
            
            {selectedListing ? (
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
                      size="sm"
                      style={{ marginTop: theme.spacing.xs }}
                    />
                    <Text variant="caption" color="muted" numberOfLines={2}>
                      {selectedListing.description}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowListingPicker(true)}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 2,
                  borderColor: theme.colors.border,
                  borderStyle: 'dashed',
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.xl,
                  alignItems: 'center',
                  gap: theme.spacing.md,
                }}
              >
                <Package size={32} color={theme.colors.text.muted} />
                <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
                  Tap to attach one of your listings
                </Text>
                <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
                  Great for showcasing products or getting feedback
                </Text>
              </TouchableOpacity>
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

      {/* Listing Picker Modal */}
      {showListingPicker && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.borderRadius.xl,
            borderTopRightRadius: theme.borderRadius.xl,
            maxHeight: '90%',
            minHeight: '60%',
            flex: 1,
            marginTop: 100, // Leave space for status bar and some top margin
            display: 'flex',
            flexDirection: 'column',
            ...theme.shadows.lg,
            shadowOffset: { width: 0, height: -4 },
          }}>
            {/* Modal Handle */}
            <View style={{
              alignItems: 'center',
              paddingTop: theme.spacing.sm,
              paddingBottom: theme.spacing.xs,
            }}>
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: theme.colors.border,
                borderRadius: 2,
              }} />
            </View>

            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.lg,
              paddingBottom: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}>
              <Text variant="h3" style={{ fontWeight: '600' }}>
                Select a Listing
              </Text>
              <TouchableOpacity
                onPress={() => setShowListingPicker(false)}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.sm,
                }}
              >
                <X size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
              <Input
                placeholder="Search your listings..."
                value={listingSearchQuery}
                onChangeText={setListingSearchQuery}
                leftIcon={<Search size={20} color={theme.colors.text.muted} />}
              />
            </View>

            {/* Listings List */}
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ 
                padding: theme.spacing.lg,
                paddingBottom: theme.spacing.xl, // Extra bottom padding for better scrolling
                flexGrow: 1
              }}
              showsVerticalScrollIndicator={true}
            >
              {listingsLoading ? (
                <View style={{ gap: theme.spacing.md }}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <LoadingSkeleton
                      key={index}
                      width="100%"
                      height={80}
                      borderRadius={theme.borderRadius.lg}
                    />
                  ))}
                </View>
              ) : filteredListings.length > 0 ? (
                                        <View style={{ gap: theme.spacing.md }}>
                  {filteredListings.map((listing: any) => (
                    <TouchableOpacity
                      key={listing.id}
                      onPress={() => {
                        setSelectedListing(listing);
                        setShowListingPicker(false);
                      }}
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.borderRadius.lg,
                        padding: theme.spacing.md,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                        {listing.images?.[0] && (
                          <View style={{
                            width: 60,
                            height: 60,
                            borderRadius: theme.borderRadius.md,
                            overflow: 'hidden',
                            backgroundColor: theme.colors.background,
                          }}>
                            <OptimizedImage
                              source={{ uri: listing.images[0] }}
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
                            {listing.title}
                          </Text>
                          <PriceDisplay 
                            amount={listing.price} 
                            size="sm"
                            style={{ marginTop: theme.spacing.xs }}
                          />
                          <Text variant="caption" color="muted" numberOfLines={2}>
                            {listing.description}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : userListings && userListings.length === 0 ? (
                <View style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: theme.spacing.xl,
                  gap: theme.spacing.lg,
                  flex: 1,
                  minHeight: 300,
                }}>
                  <View style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.full,
                    padding: theme.spacing.xl,
                    borderWidth: 2,
                    borderColor: theme.colors.border,
                    borderStyle: 'dashed',
                  }}>
                    <Package size={48} color={theme.colors.text.muted} />
                  </View>
                  <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
                    <Text variant="h4" style={{ textAlign: 'center' }}>
                      No Active Listings
                    </Text>
                    <Text variant="body" color="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
                      You don&apos;t have any active listings yet. Create your first listing to showcase your products in posts.
                    </Text>
                  </View>
                  <Button
                    variant="primary"
                    onPress={() => {
                      setShowListingPicker(false);
                      router.push('/(tabs)/create');
                    }}
                    icon={<Plus size={18} color={theme.colors.primaryForeground} />}
                  >
                    Create Your First Listing
                  </Button>
                </View>
              ) : (
                <EmptyState
                  title="No listings found"
                  description="No listings match your search. Try different keywords."
                  icon={<Search size={48} color={theme.colors.text.muted} />}
                />
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Success Toast */}
      <Toast
        visible={showSuccess}
        message="Post shared successfully!"
        variant="success"
        onHide={() => setShowSuccess(false)}
      />

      {/* Moderation Error Modal */}
      <AppModal
        visible={showModerationModal}
        onClose={() => setShowModerationModal(false)}
        title="Cannot Publish Post"
        size="sm"
        primaryAction={{
          text: 'OK',
          onPress: () => setShowModerationModal(false),
        }}
      >
        <Text style={{ color: theme.colors.text.secondary, lineHeight: 22 }}>
          {moderationError}
        </Text>
      </AppModal>

    </SafeAreaWrapper>
  );
}
