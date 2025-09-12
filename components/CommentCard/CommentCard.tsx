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
    likes: number;
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
  const canReply = depth < maxDepth;
  const isOwnComment = user?.id === comment.author.id;

  const leftMargin = depth * theme.spacing.xl;

  return (
    <View style={style}>
      <View
        style={{
          marginLeft: leftMargin,
          backgroundColor: depth > 0 ? theme.colors.surfaceVariant : theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          borderLeftWidth: depth > 0 ? 3 : 0,
          borderLeftColor: theme.colors.primary + '30',
        }}
      >
        {/* Comment Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
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
                style={{ marginRight: theme.spacing.sm }}
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
          variant="body"
          style={{
            lineHeight: 20,
            marginBottom: theme.spacing.md,
            marginLeft: 32, // Align with avatar
          }}
        >
          {comment.content}
        </Text>

        {/* Comment Actions */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.lg,
            marginLeft: 32, // Align with avatar
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
              {comment.likes}
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
        <View style={{ marginTop: theme.spacing.sm }}>
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
