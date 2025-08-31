import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
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
  onReply: (content: string) => void;
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
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const depth = comment.depth || 0;
  const canReply = depth < maxDepth;
  const isOwnComment = user?.id === comment.author.id;

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    try {
      await onReply(replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setSubmittingReply(false);
    }
  };

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
              onPress={() => router.push(`/(tabs)/profile/${comment.author.id}`)}
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
                  onPress={() => router.push(`/(tabs)/profile/${comment.author.id}`)}
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
              onPress={() => setShowReplyInput(!showReplyInput)}
              activeOpacity={0.7}
            >
              <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                Reply
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Reply Input */}
        {showReplyInput && (
          <View
            style={{
              marginTop: theme.spacing.md,
              marginLeft: 32, // Align with avatar
            }}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder={`Reply to ${comment.author.name}...`}
                  value={replyText}
                  onChangeText={setReplyText}
                  variant="multiline"
                  style={{ minHeight: 60 }}
                />
              </View>
              <Button
                variant="primary"
                onPress={handleSubmitReply}
                loading={submittingReply}
                disabled={!replyText.trim() || submittingReply}
                size="sm"
              >
                Reply
              </Button>
            </View>
          </View>
        )}
      </View>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={{ marginTop: theme.spacing.sm }}>
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={{ ...reply, depth: depth + 1 }}
              onLike={() => {}}
              onReply={(content) => onReply(content)}
              onReport={onReport}
              maxDepth={maxDepth}
            />
          ))}
        </View>
      )}
    </View>
  );
}