import React, { useState } from 'react';
import { View, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { Input } from '@/components/Input/Input';
import { UserDisplayName } from '@/components/UserDisplayName/UserDisplayName';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  MoveHorizontal as MoreHorizontal,
  Flag,
  UserMinus,
  Copy,
  ExternalLink
} from 'lucide-react-native';

interface PostCardProps {
  post: {
    id: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
      rating?: number;
      isVerified?: boolean;
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
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onFollow?: () => void;
  onReport?: () => void;
  style?: any;
}

export function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onFollow,
  onReport,
  style,
}: PostCardProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const isOwnPost = user?.id === post.author.id;

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
      setShowMoreMenu(false);
      setReportReason('');
      setReportDescription('');
      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe. We will review this report.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleCopyLink = () => {
    // TODO: Implement copy link functionality
    setShowMoreMenu(false);
    Alert.alert('Link Copied', 'Post link copied to clipboard');
  };

  const handleShare = () => {
    setShowMoreMenu(false);
    onShare();
  };

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          marginBottom: theme.spacing.md,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      {/* Post Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/profile/${post.author.id}`)}
            activeOpacity={0.7}
          >
            <Avatar
              source={post.author.avatar}
              name={post.author.name}
              size="md"
              style={{ marginRight: theme.spacing.md }}
            />
          </TouchableOpacity>
          
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/profile/${post.author.id}`)}
              activeOpacity={0.7}
            >
              <UserDisplayName
                profile={post.author.profile}
                variant="full"
                showBadge={true}
                textVariant="body"
                style={{ fontWeight: '600' }}
              />
            </TouchableOpacity>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              {post.author.rating && (
                <Text variant="caption" color="muted">
                  ⭐ {post.author.rating.toFixed(1)}
                </Text>
              )}
              <Text variant="caption" color="muted">
                • {post.timestamp}
              </Text>
              {post.location && (
                <Text variant="caption" color="muted">
                  • 📍 {post.location}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        <Button
          variant="icon"
          icon={<MoreHorizontal size={20} color={theme.colors.text.muted} />}
          onPress={() => setShowMoreMenu(true)}
        />
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
              <Image
                source={{ uri: post.listing.image }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.border,
                }}
                resizeMode="cover"
              />
            )}
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                🏷️ {post.listing.title}
              </Text>
              <Text variant="caption" color="primary" style={{ fontWeight: '600' }}>
                GHS {post.listing.price.toLocaleString()}
              </Text>
            </View>
            <ExternalLink size={16} color={theme.colors.text.muted} />
          </View>
        </TouchableOpacity>
      )}

      {/* Post Images */}
      {post.images && post.images.length > 0 && (
        <View style={{ marginBottom: theme.spacing.md }}>
          {post.images.length === 1 ? (
            <TouchableOpacity activeOpacity={0.9}>
              <Image
                source={{ uri: post.images[0] }}
                style={{
                  width: '100%',
                  height: 250,
                  backgroundColor: theme.colors.surfaceVariant,
                }}
                resizeMode="cover"
              />
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
                <TouchableOpacity key={index} activeOpacity={0.9}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: theme.colors.surfaceVariant,
                    }}
                    resizeMode="cover"
                  />
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
          paddingVertical: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing.xl }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
            onPress={onLike}
            activeOpacity={0.7}
          >
            <Heart
              size={20}
              color={post.isLiked ? theme.colors.error : theme.colors.text.muted}
              fill={post.isLiked ? theme.colors.error : 'none'}
            />
            <Text 
              variant="bodySmall" 
              style={{ 
                color: post.isLiked ? theme.colors.error : theme.colors.text.muted,
                fontWeight: post.isLiked ? '600' : '400',
              }}
            >
              {post.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
            onPress={onComment}
            activeOpacity={0.7}
          >
            <MessageCircle size={20} color={theme.colors.text.muted} />
            <Text variant="bodySmall" color="muted">
              {post.comments}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
            onPress={onShare}
            activeOpacity={0.7}
          >
            <Share size={20} color={theme.colors.text.muted} />
            <Text variant="bodySmall" color="muted">
              {post.shares}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* More Menu Modal */}
      <AppModal
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        title="Post Options"
        size="sm"
        position="bottom"
      >
        <View style={{ gap: theme.spacing.md }}>
          {!isOwnPost && onFollow && (
            <Button
              variant="ghost"
              onPress={() => {
                setShowMoreMenu(false);
                onFollow();
              }}
              fullWidth
              style={{ justifyContent: 'flex-start' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <UserMinus size={20} color={theme.colors.text.primary} />
                <Text variant="body">Follow {post.author.profile?.display_business_name && post.author.profile?.business_name ? post.author.profile.business_name : post.author.name}</Text>
              </View>
            </Button>
          )}

          <Button
            variant="ghost"
            onPress={handleCopyLink}
            fullWidth
            style={{ justifyContent: 'flex-start' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Copy size={20} color={theme.colors.text.primary} />
              <Text variant="body">Copy Link</Text>
            </View>
          </Button>

          <Button
            variant="ghost"
            onPress={handleShare}
            fullWidth
            style={{ justifyContent: 'flex-start' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Share size={20} color={theme.colors.text.primary} />
              <Text variant="body">Share Post</Text>
            </View>
          </Button>

          {!isOwnPost && (
            <Button
              variant="ghost"
              onPress={() => {
                setShowMoreMenu(false);
                setShowReportModal(true);
              }}
              fullWidth
              style={{ justifyContent: 'flex-start' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Flag size={20} color={theme.colors.error} />
                <Text variant="body" style={{ color: theme.colors.error }}>
                  Report Post
                </Text>
              </View>
            </Button>
          )}
        </View>
      </AppModal>

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
            Help us understand what's wrong with this post
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
    </View>
  );
}