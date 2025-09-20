import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Button } from '@/components/Button/Button';
import { Heart, MessageCircle, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';

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
    likes_count: number;
    isLiked: boolean;
    replies?: CommentCardProps['comment'][];
    depth?: number;
  };
  onLike: () => void;
  onReply: (commentId: string, authorName: string) => void; // Pass comment ID and author name
  onReport?: () => void;
  maxDepth?: number;
  style?: any;
}

export function CommentCard({
  comment,
  onLike,
  onReply,
  onReport,
  maxDepth = 3,
  style,
}: CommentCardProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const depth = comment.depth || 0;
  const canReply = depth === 0; // Only allow replies to top-level comments (depth 0)
  const isOwnComment = user?.id === comment.author.id;

  const leftMargin = depth * theme.spacing.lg; // Reduced from xl to lg

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
              onPress={() => router.push(`/profile/${comment.author.id}`)}
              activeOpacity={0.7}
            >
              <Avatar
                source={comment.author.avatar}
                name={comment.author.name}
                size="xs"
                style={{ marginRight: theme.spacing.xs }} // Reduced from sm to xs
              />
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                <TouchableOpacity
                  onPress={() => router.push(`/profile/${comment.author.id}`)}
                  activeOpacity={0.7}
                >
                  <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                    {comment.author.name}
                  </Text>
                </TouchableOpacity>
                {comment.author.isVerified && (
                  <Text style={{ color: theme.colors.primary, fontSize: 12 }}>✓</Text>
                )}
                <Text variant="caption" color="muted">
                  • {comment.timestamp}
                </Text>
              </View>
            </View>
          </View>

          <Button
            variant="icon"
            icon={<MoreHorizontal size={16} color={theme.colors.text.muted} />}
            onPress={() => {}}
            style={{ width: 28, height: 28 }}
          />
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
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
            onPress={onLike}
            activeOpacity={0.7}
          >
            <Heart
              size={16}
              color={comment.isLiked ? theme.colors.error : theme.colors.text.muted}
              fill={comment.isLiked ? theme.colors.error : 'none'}
            />
            <Text 
              variant="caption" 
              style={{ 
                color: comment.isLiked ? theme.colors.error : theme.colors.text.muted,
                fontWeight: comment.isLiked ? '600' : '400',
              }}
            >
              {comment.likes_count}
            </Text>
          </TouchableOpacity>

          {canReply && (
            <TouchableOpacity
              onPress={() => onReply(comment.id, comment.author.name)}
              activeOpacity={0.7}
            >
              <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                Reply
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={{ marginTop: theme.spacing.xs }}> {/* Reduced from sm to xs */}
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={{ ...reply, depth: depth + 1 }}
              onLike={() => {}}
              onReply={(commentId, authorName) => onReply(commentId, authorName)}
              onReport={onReport}
              maxDepth={maxDepth}
            />
          ))}
        </View>
      )}
    </View>
  );
}
