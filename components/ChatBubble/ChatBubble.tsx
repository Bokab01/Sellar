import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

type MessageType = 'text' | 'image' | 'offer' | 'system';
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface ChatBubbleProps {
  message: string;
  isOwn: boolean;
  timestamp: string;
  type?: MessageType;
  status?: MessageStatus;
  senderName?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  images?: string[];
}

export function ChatBubble({
  message,
  isOwn,
  timestamp,
  type = 'text',
  status = 'sent',
  senderName,
  onPress,
  onLongPress,
  images,
}: ChatBubbleProps) {
  const { theme } = useTheme();

  const getBubbleColors = () => {
    if (type === 'system') {
      return {
        backgroundColor: theme.colors.surfaceVariant,
        textColor: theme.colors.text.secondary,
      };
    }

    if (isOwn) {
      return {
        backgroundColor: theme.colors.primary,
        textColor: theme.colors.primaryForeground,
      };
    }

    return {
      backgroundColor: theme.colors.surface,
      textColor: theme.colors.text.primary,
    };
  };

  const getStatusIcon = () => {
    if (!isOwn || type === 'system') return null;

    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '❌';
      default:
        return null;
    }
  };

  const colors = getBubbleColors();

  if (type === 'system') {
    return (
      <View
        style={{
          alignItems: 'center',
          marginVertical: theme.spacing.md,
        }}
      >
        <View
          style={{
            backgroundColor: colors.backgroundColor,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.borderRadius.full,
            maxWidth: '80%',
          }}
        >
          <Text
            variant="caption"
            style={{
              color: colors.textColor,
              textAlign: 'center',
              fontWeight: '500',
            }}
          >
            {message}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        style={{
          maxWidth: '85%',
          minWidth: '20%',
        }}
        activeOpacity={0.8}
      >
        {/* Sender Name (for group chats) */}
        {!isOwn && senderName && (
          <Text
            variant="caption"
            color="muted"
            style={{ 
              marginBottom: theme.spacing.xs, 
              marginLeft: theme.spacing.sm,
              fontWeight: '500',
            }}
          >
            {senderName}
          </Text>
        )}

        <View
          style={{
            backgroundColor: colors.backgroundColor,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            borderWidth: isOwn ? 0 : 1,
            borderColor: theme.colors.border,
            ...(!isOwn && theme.shadows.sm),
          }}
        >
          {/* Message Text */}
          <Text
            variant="body"
            style={{
              color: colors.textColor,
              lineHeight: 20,
              marginBottom: theme.spacing.sm,
            }}
          >
            {message}
          </Text>

          {/* Images */}
          {images && images.length > 0 && (
            <View style={{ marginBottom: theme.spacing.sm }}>
              {images.map((imageUrl, index) => (
                <TouchableOpacity key={index} activeOpacity={0.8}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={{
                      width: 200,
                      height: 150,
                      borderRadius: theme.borderRadius.md,
                      marginBottom: index < images.length - 1 ? theme.spacing.sm : 0,
                      backgroundColor: theme.colors.surfaceVariant,
                    }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Timestamp and Status */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              variant="caption"
              style={{
                color: isOwn 
                  ? 'rgba(255,255,255,0.7)' 
                  : theme.colors.text.muted,
                fontSize: 11,
              }}
            >
              {timestamp}
            </Text>

            {getStatusIcon() && (
              <Text
                style={{
                  color: status === 'read' 
                    ? theme.colors.success 
                    : isOwn 
                    ? 'rgba(255,255,255,0.7)'
                    : theme.colors.text.muted,
                  fontSize: 12,
                  marginLeft: theme.spacing.sm,
                }}
              >
                {getStatusIcon()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
