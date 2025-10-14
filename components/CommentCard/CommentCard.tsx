import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, Image } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Button } from '@/components/Button/Button';
import { Heart, Reply, MoreHorizontal, Flag, Trash2, Edit3, ChevronDown, ChevronRight } from 'lucide-react-native';
import { OfficialBadge } from '@/components/OfficialBadge/OfficialBadge';
import { isOfficialSellarContent, getOfficialDisplayName } from '@/lib/officialContent';

interface CommentCardProps {
  comment: {
    id: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
      isVerified?: boolean;
    };
    content: string;
    timestamp: string;
    likes: number;
    isLiked: boolean;
    replies?: any[];
    depth?: number;
  };
  onLike: () => void;
  onReply: (commentId: string, authorName: string) => void;
  onReport?: () => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  maxDepth?: number;
  style?: any;
}

export function CommentCard({
  comment,
  onLike,
  onReply,
  onReport,
  onDelete,
  onEdit,
  maxDepth = 3,
  style,
}: CommentCardProps) {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [isRepliesCollapsed, setIsRepliesCollapsed] = useState(false);

  const depth = comment.depth || 0;
  const canReply = depth === 0; // Only allow replies to top-level comments (depth 0)
  const isOwnComment = user?.id === comment.author.id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isOfficial = isOfficialSellarContent(comment.author.id);

  const leftMargin = depth * theme.spacing.lg; // Reduced from xl to lg
  
  // Get display name and avatar for official content
  const displayName = isOfficial ? getOfficialDisplayName() : comment.author.name;
  
  // Get theme-aware official icon
  const officialIcon = isDarkMode
    ? require('../../assets/icon/icon-dark.png')
    : require('../../assets/icon/icon-light.png');
  
  const avatarSource = isOfficial ? officialIcon : comment.author.avatar;

  const handleReport = () => {
    Alert.alert(
      'Report Comment',
      'Are you sure you want to report this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            onReport?.();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.(comment.id);
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    onEdit?.(comment.id, comment.content);
  };

  const toggleReplies = () => {
    setIsRepliesCollapsed(!isRepliesCollapsed);
  };

  return (
    <View style={style}>
      <View
        style={{
          marginLeft: leftMargin,
          backgroundColor: depth > 0 ? theme.colors.surfaceVariant : theme.colors.surface,
          borderRadius: theme.borderRadius.sm, // Reduced from md to sm
          padding: theme.spacing.sm, // Reduced from md to sm
          borderLeftWidth: depth > 0 ? 2 : 0, // Reduced from 3 to 2
          borderLeftColor: theme.colors.primary + '30',
          position: 'relative', // Ensure proper positioning context
          overflow: 'visible', // Allow menu to extend outside
        }}
      >
        {/* Comment Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.xs, // Reduced from sm to xs
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={() => !isOfficial && router.push(`/profile/${comment.author.id}`)}
              activeOpacity={isOfficial ? 1 : 0.7}
              disabled={isOfficial}
            >
              {isOfficial ? (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: theme.colors.surface,
                    marginRight: theme.spacing.xs,
                    overflow: 'hidden',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    source={officialIcon}
                    style={{ width: 24, height: 24 }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Avatar
                  source={avatarSource}
                  name={displayName}
                  size="xs"
                  style={{ marginRight: theme.spacing.xs }} // Reduced from sm to xs
                />
              )}
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  {displayName}
                </Text>
                
                {/* ✅ Official Badge */}
                {isOfficial && (
                  <OfficialBadge variant="compact" size="sm" />
                )}
                
                {/* ✅ Verified Badge (only for non-official users) */}
                {!isOfficial && comment.author.isVerified && (
                  <Text style={{ color: theme.colors.primary }}>✓</Text>
                )}
                
                <Text variant="bodySmall" style={{ color: theme.colors.text.muted }}>
                  • {comment.timestamp}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            {isOwnComment && onEdit && (
              <TouchableOpacity
                onPress={handleEdit}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Edit3 
                  size={16} 
                  color={theme.colors.primary} 
                />
              </TouchableOpacity>
            )}
            
            {isOwnComment && onDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Trash2 
                  size={16} 
                  color={theme.colors.error} 
                />
              </TouchableOpacity>
            )}
            
            {!isOwnComment && onReport && (
              <TouchableOpacity
                onPress={handleReport}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Flag 
                  size={16} 
                  color={theme.colors.text.muted} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Comment Content */}
        <Text
          variant="bodySmall" // Changed from body to bodySmall
          style={{
            lineHeight: 18, // Reduced from 20 to 18
            marginBottom: theme.spacing.sm, // Reduced from md to sm
            marginLeft: 28, // Reduced from 32 to 28 to align with smaller avatar
          }}
        >
          {comment.content}
        </Text>

        {/* Comment Actions */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md, // Reduced from lg to md
            marginLeft: 28, // Reduced from 32 to 28 to align with smaller avatar
          }}
        >
          <TouchableOpacity
            onPress={onLike}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
            activeOpacity={0.7}
          >
            <Heart
              size={16}
              color={comment.isLiked ? theme.colors.error : theme.colors.text.muted}
              fill={comment.isLiked ? theme.colors.error : 'transparent'}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.text.muted }}>
              {comment.likes}
            </Text>
          </TouchableOpacity>

          {canReply && (
            <TouchableOpacity
              onPress={() => onReply(comment.id, comment.author.name)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
              }}
              activeOpacity={0.7}
            >
              <Reply size={16} color={theme.colors.text.muted} />
              <Text variant="bodySmall" style={{ color: theme.colors.text.muted }}>
                Reply
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nested Replies */}
        {hasReplies && (
          <View style={{ marginTop: theme.spacing.sm }}>
            {/* Collapse/Expand Button */}
            <TouchableOpacity
              onPress={toggleReplies}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.xs,
                paddingHorizontal: theme.spacing.sm,
                marginBottom: theme.spacing.xs,
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.surfaceVariant,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
              activeOpacity={0.7}
            >
              {isRepliesCollapsed ? (
                <ChevronRight size={16} color={theme.colors.text.muted} />
              ) : (
                <ChevronDown size={16} color={theme.colors.text.muted} />
              )}
              <Text 
                variant="bodySmall" 
                style={{ 
                  marginLeft: theme.spacing.xs,
                  color: theme.colors.text.muted,
                  fontWeight: '500'
                }}
              >
                {isRepliesCollapsed 
                  ? `Show ${comment.replies?.length || 0} ${(comment.replies?.length || 0) === 1 ? 'reply' : 'replies'}`
                  : `Hide ${comment.replies?.length || 0} ${(comment.replies?.length || 0) === 1 ? 'reply' : 'replies'}`
                }
              </Text>
            </TouchableOpacity>

            {/* Replies List */}
            {!isRepliesCollapsed && comment.replies && (
              <View style={{ gap: theme.spacing.sm }}>
                {comment.replies.map((reply) => (
                  <CommentCard
                    key={reply.id}
                    comment={{ ...reply, depth: depth + 1 }}
                    onLike={() => {}}
                    onReply={(commentId, authorName) => onReply(commentId, authorName)}
                    onReport={onReport}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    maxDepth={maxDepth}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>

    </View>
  );
}