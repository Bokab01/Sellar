import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Image, ScrollView, Alert, Animated } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { Input } from '@/components/Input/Input';
import { UserDisplayName } from '@/components/UserDisplayName/UserDisplayName';
import { Rating } from '@/components/Rating/Rating';
import { Badge } from '@/components/Badge/Badge';
import { ImageViewer } from '@/components/ImageViewer';
import { useImageViewer } from '@/hooks/useImageViewer';
import { PostImage, ThumbnailImage } from '@/components/ResponsiveImage/ResponsiveImage';
import { PostInlineMenu } from '@/components/PostInlineMenu/PostInlineMenu';
import { useFollowFeedback } from '@/hooks/useFollowFeedback';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  MoveHorizontal as MoreHorizontal,
  Flag,
  UserMinus,
  UserPlus,
  Copy,
  ExternalLink,
  MapPin,
  Tag,
  Megaphone,
  ShoppingBag,
  Users,
  Camera,
  HelpCircle,
  Lightbulb,
  Star,
  Calendar,
  Handshake,
  TrendingUp,
  Sparkles
} from 'lucide-react-native';

interface PostCardProps {
  post: {
    id: string;
    type?: 'general' | 'showcase' | 'question' | 'announcement' | 'tips' | 'review' | 'event' | 'collaboration' | 'listing' | 'promotion' | 'community';
    user_id?: string; // Original user ID for ownership checks
    author: {
      id: string;
      name: string;
      avatar?: string;
      rating?: number;
      reviewCount?: number;
      isVerified?: boolean;
      location?: string;
      profile?: any; // Full profile object for display name logic
    };
    timestamp: string;
    content: string;
    images?: string[];
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
    location?: string;
    listing?: {
      id: string;
      title: string;
      price: number;
      image?: string;
    };
  };
  isFollowing?: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onReport?: () => void;
  style?: any;
}

export function PostCard({
  post,
  isFollowing = false,
  onLike,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onFollow,
  onUnfollow,
  onReport,
  style,
}: PostCardProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  
  // Local state for like functionality
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [isLiking, setIsLiking] = useState(false);

  // Follow feedback hook
  const { showFeedback: showFollowFeedback, feedbackText: followFeedbackText, animation: feedbackAnimation, showFollowFeedback: triggerFollowFeedback } = useFollowFeedback();

  const isOwnPost = user?.id === post.author.id;


  // Initialize ImageViewer for post images
  const postImages = post.images || [];
  const {
    visible: imageViewerVisible,
    currentIndex: imageViewerIndex,
    openViewer: openImageViewer,
    closeViewer: closeImageViewer,
  } = useImageViewer({ images: postImages });

  // Helper function to get post type configuration
  const getPostTypeConfig = (type?: string) => {
    switch (type) {
      case 'general':
        return {
          icon: <Users size={14} color={theme.colors.primary} />,
          label: 'General',
          color: theme.colors.primary,
          backgroundColor: theme.colors.primary + '15',
        };
      case 'showcase':
        return {
          icon: <Sparkles size={14} color={theme.colors.warning} />,
          label: 'Showcase',
          color: theme.colors.warning,
          backgroundColor: theme.colors.warning + '15',
        };
      case 'question':
        return {
          icon: <HelpCircle size={14} color={theme.colors.info} />,
          label: 'Question',
          color: theme.colors.info,
          backgroundColor: theme.colors.info + '15',
        };
      case 'announcement':
        return {
          icon: <Megaphone size={14} color={theme.colors.error} />,
          label: 'Announcement',
          color: theme.colors.error,
          backgroundColor: theme.colors.error + '15',
        };
      case 'tips':
        return {
          icon: <Lightbulb size={14} color={theme.colors.success} />,
          label: 'Tips',
          color: theme.colors.success,
          backgroundColor: theme.colors.success + '15',
        };
      case 'review':
        return {
          icon: <Star size={14} color={theme.colors.warning} />,
          label: 'Review',
          color: theme.colors.warning,
          backgroundColor: theme.colors.warning + '15',
        };
      case 'event':
        return {
          icon: <Calendar size={14} color={theme.colors.info} />,
          label: 'Event',
          color: theme.colors.info,
          backgroundColor: theme.colors.info + '15',
        };
      case 'collaboration':
        return {
          icon: <Handshake size={14} color={theme.colors.success} />,
          label: 'Collaboration',
          color: theme.colors.success,
          backgroundColor: theme.colors.success + '15',
        };
      case 'listing':
        return {
          icon: <ShoppingBag size={14} color={theme.colors.primary} />,
          label: 'Listing',
          color: theme.colors.primary,
          backgroundColor: theme.colors.primary + '15',
        };
      case 'promotion':
        return {
          icon: <TrendingUp size={14} color={theme.colors.warning} />,
          label: 'Promotion',
          color: theme.colors.warning,
          backgroundColor: theme.colors.warning + '15',
        };
      case 'community':
        return {
          icon: <Users size={14} color={theme.colors.success} />,
          label: 'Community',
          color: theme.colors.success,
          backgroundColor: theme.colors.success + '15',
        };
      default:
        return {
          icon: <Camera size={14} color={theme.colors.text.muted} />,
          label: 'Post',
          color: theme.colors.text.muted,
          backgroundColor: theme.colors.surfaceVariant,
        };
    }
  };

  const postTypeConfig = getPostTypeConfig(post.type);

  const reportReasons = [
    { value: 'spam', label: 'Spam or unwanted content' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'fake_listing', label: 'Fake or misleading listing' },
    { value: 'scam', label: 'Scam or fraud' },
    { value: 'violence', label: 'Violence or threats' },
    { value: 'hate_speech', label: 'Hate speech' },
    { value: 'copyright', label: 'Copyright violation' },
    { value: 'other', label: 'Other' },
  ];

  const handleReport = async () => {
    if (!reportReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    setSubmittingReport(true);
    try {
      // TODO: Implement report submission to database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe. We will review this report.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };


  const handleFollowToggle = () => {
    // Execute the follow/unfollow action first
    if (isFollowing) {
      onUnfollow?.();
      triggerFollowFeedback('Unfollowed');
    } else {
      onFollow?.();
      triggerFollowFeedback('Following');
    }
  };

  const handleLike = async () => {
    if (isLiking) return; // Prevent double-tapping
    
    setIsLiking(true);
    
    // Optimistic update
    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;
    
    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);
    
    try {
      // Call the parent's onLike function
      await onLike();
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(!newIsLiked);
      setLikeCount(likeCount);
      console.error('Failed to like post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    try {
      await onShare();
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  };

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          marginBottom: theme.spacing.lg,
          borderRadius: theme.borderRadius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.md,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Post Header */}
      <View
        style={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}
      >
        {/* Post Type Badge and Menu */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: theme.spacing.md
        }}>
          {post.type ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.full,
                backgroundColor: postTypeConfig.backgroundColor,
                gap: theme.spacing.xs,
              }}
            >
              {postTypeConfig.icon}
              <Text
                variant="caption"
                style={{
                  color: postTypeConfig.color,
                  fontWeight: '600',
                  fontSize: 11,
                }}
              >
                {postTypeConfig.label.toUpperCase()}
              </Text>
            </View>
          ) : (
            <View />
          )}
          
          <PostInlineMenu
            postId={post.id}
            postAuthorId={post.user_id || post.author.id}
            postContent={post.content}
            onDelete={onDelete}
            onEdit={onEdit}
            onReport={() => {
              setShowReportModal(true);
            }}
            onShare={handleShare}
            onViewPost={() => {
              router.push(`/(tabs)/community/${post.id}`);
            }}
          />
        </View>

        {/* Author Info Row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.push(`/profile/${post.author.id}` as any)}
              activeOpacity={0.7}
            >
              <Avatar
                source={post.author.avatar}
                name={post.author.name}
                size="lg"
                style={{ marginRight: theme.spacing.md }}
              />
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => router.push(`/profile/${post.author.id}` as any)}
                activeOpacity={0.7}
              >
                <UserDisplayName
                  profile={post.author.profile}
                  variant="full"
                  showBadge={true}
                  textVariant="body"
                  style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}
                />
              </TouchableOpacity>
              
              {/* Rating Section */}
              {post.author.rating && post.author.rating > 0 && (
                <View style={{ marginBottom: theme.spacing.xs }}>
                  <Rating 
                    rating={post.author.rating} 
                    size="sm" 
                    showValue={true}
                    showCount={post.author.reviewCount ? true : false}
                    reviewCount={post.author.reviewCount}
                  />
                </View>
              )}
              
              {/* Location Section - Under Rating */}
              {(post.location || post.author.location) && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: theme.spacing.xs,
                  marginBottom: theme.spacing.md 
                }}>
                  <MapPin size={12} color={theme.colors.text.muted} />
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {post.location || post.author.location}
                  </Text>
                </View>
              )}

            </View>
          </View>
        </View>
      </View>

      {/* Post Content */}
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <Text variant="body" style={{ lineHeight: 22 }}>
          {post.content}
        </Text>
      </View>

      {/* Linked Listing */}
      {post.listing && (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/home/${post.listing!.id}`)}
          style={{
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.md,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            {post.listing.image && (
              <ThumbnailImage
                source={{ uri: post.listing.image }}
                size={60}
                borderRadius={theme.borderRadius.sm}
                backgroundColor={theme.colors.border}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                🏷️ {post.listing.title}
              </Text>
              <Text variant="caption" color="primary" style={{ fontWeight: '600' }}>
                GHS {(post.listing.price || 0).toLocaleString()}
              </Text>
            </View>
            <ExternalLink size={16} color={theme.colors.text.muted} />
          </View>
        </TouchableOpacity>
      )}

      {/* Post Images with ImageViewer */}
      {post.images && post.images.length > 0 && (
        <View style={{ marginBottom: theme.spacing.md }}>
          {post.images.length === 1 ? (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => openImageViewer(0)}
            >
              <PostImage
                source={{ uri: post.images[0] }}
                containerStyle={{
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.sm,
                }}
              />
              {/* Image viewer indicator */}
              <View style={{
                position: 'absolute',
                top: theme.spacing.md,
                right: theme.spacing.md,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: theme.borderRadius.full,
                padding: theme.spacing.sm,
              }}>
                <Text variant="caption" style={{ color: 'white', fontSize: 10 }}>
                  📷 Tap to view
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: theme.spacing.lg,
                gap: theme.spacing.sm,
              }}
            >
              {post.images.map((imageUrl: string, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.9}
                  onPress={() => openImageViewer(index)}
                >
                  <ThumbnailImage
                    source={{ uri: imageUrl }}
                    size={200}
                    borderRadius={theme.borderRadius.md}
                    backgroundColor={theme.colors.surfaceVariant}
                  />
                  {/* Multiple images indicator */}
                  {index === 0 && post.images && post.images.length > 1 && (
                    <View style={{
                      position: 'absolute',
                      top: theme.spacing.sm,
                      right: theme.spacing.sm,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderRadius: theme.borderRadius.sm,
                      paddingHorizontal: theme.spacing.xs,
                      paddingVertical: 2,
                    }}>
                      <Text variant="caption" style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                        +{(post.images?.length || 1) - 1}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Post Actions */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.lg,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceVariant + '30',
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.xl }}>
          <TouchableOpacity
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.borderRadius.full,
              backgroundColor: isLiked ? theme.colors.error + '15' : 'transparent',
              opacity: isLiking ? 0.7 : 1,
            }}
            onPress={handleLike}
            activeOpacity={0.7}
            disabled={isLiking}
          >
            <Heart
              size={20}
              color={isLiked ? theme.colors.error : theme.colors.text.muted}
              fill={isLiked ? theme.colors.error : 'none'}
            />
            <Text 
              variant="bodySmall" 
              style={{ 
                color: isLiked ? theme.colors.error : theme.colors.text.muted,
                fontWeight: isLiked ? '600' : '500',
              }}
            >
              {likeCount.toLocaleString()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.borderRadius.full,
            }}
            onPress={onComment}
            activeOpacity={0.7}
          >
            <MessageCircle size={20} color={theme.colors.text.muted} />
            <Text variant="bodySmall" color="muted" style={{ fontWeight: '500' }}>
              {(post.comments || 0).toLocaleString()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.borderRadius.full,
            }}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share size={20} color={theme.colors.text.muted} />
            <Text variant="bodySmall" color="muted" style={{ fontWeight: '500' }}>
              {(post.shares || 0).toLocaleString()}
            </Text>
          </TouchableOpacity>

          {/* Follow Button - Only show for other users */}
          {!isOwnPost && (onFollow || onUnfollow) && (
            <View style={{ position: 'relative', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={handleFollowToggle}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isFollowing ? theme.colors.surfaceVariant : theme.colors.primary + '15',
                  borderWidth: 1,
                  borderColor: isFollowing ? theme.colors.border : theme.colors.primary,
                }}
                activeOpacity={0.7}
              >
                {isFollowing ? (
                  <UserMinus size={20} color={theme.colors.text.primary} />
                ) : (
                  <UserPlus size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              
              {/* Dynamic Feedback Text */}
              {showFollowFeedback && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: -35,
                    backgroundColor: theme.colors.text.primary,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.xs,
                    borderRadius: theme.borderRadius.md,
                    shadowColor: theme.colors.text.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                    minWidth: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: feedbackAnimation,
                    transform: [
                      {
                        scale: feedbackAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: feedbackAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    style={{
                      color: theme.colors.background,
                      fontWeight: '600',
                      fontSize: 12,
                      textAlign: 'center',
                    }}
                  >
                    {followFeedbackText}
                  </Text>
                  {/* Small arrow pointing down */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -5,
                      left: '50%',
                      marginLeft: -5,
                      width: 0,
                      height: 0,
                      borderLeftWidth: 5,
                      borderRightWidth: 5,
                      borderTopWidth: 5,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderTopColor: theme.colors.text.primary,
                    }}
                  />
                </Animated.View>
              )}
            </View>
          )}
        </View>
      </View>


      {/* Report Modal */}
      <AppModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Post"
        primaryAction={{
          text: 'Submit Report',
          onPress: handleReport,
          loading: submittingReport,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowReportModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary">
            Help us understand what&apos;s wrong with this post
          </Text>

          <View>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
              Reason for reporting
            </Text>
            <View style={{ gap: theme.spacing.sm }}>
              {reportReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  onPress={() => setReportReason(reason.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: reportReason === reason.value 
                      ? theme.colors.primary + '10' 
                      : theme.colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: reportReason === reason.value 
                      ? theme.colors.primary 
                      : theme.colors.border,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: reportReason === reason.value 
                        ? theme.colors.primary 
                        : theme.colors.border,
                      backgroundColor: reportReason === reason.value 
                        ? theme.colors.primary 
                        : 'transparent',
                      marginRight: theme.spacing.md,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {reportReason === reason.value && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.colors.primaryForeground,
                        }}
                      />
                    )}
                  </View>
                  <Text
                    variant="body"
                    style={{
                      color: reportReason === reason.value 
                        ? theme.colors.primary 
                        : theme.colors.text.primary,
                    }}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            variant="multiline"
            label="Additional Details (Optional)"
            placeholder="Provide more context about why you're reporting this post..."
            value={reportDescription}
            onChangeText={setReportDescription}
          />
        </View>
      </AppModal>

      {/* Image Viewer */}
      <ImageViewer
        visible={imageViewerVisible}
        images={postImages}
        initialIndex={imageViewerIndex}
        onClose={closeImageViewer}
      />
    </View>
  );
}
