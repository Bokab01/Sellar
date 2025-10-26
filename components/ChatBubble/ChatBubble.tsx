import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { ReadReceipt } from '@/ReadReceipt/ReadReceipt';
import { ImageViewer } from '@/components/ImageViewer/ImageViewer';
import { useImageViewer } from '@/hooks/useImageViewer';

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
  
  // Image viewer hook
  const {
    visible: imageViewerVisible,
    openViewer,
    closeViewer,
    shareImage,
    downloadImage,
  } = useImageViewer({
    images: images || [],
    initialIndex: 0,
  });

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
          marginVertical: theme.spacing.sm,
        }}
      >
        <View
          style={{
            backgroundColor: colors.backgroundColor,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
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
        marginVertical: 2,
        paddingHorizontal: theme.spacing.sm,
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
            padding: theme.spacing.sm,
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
              lineHeight: 18,
              marginBottom: theme.spacing.xs,
            }}
          >
            {message}
          </Text>

          {/* Images */}
          {images && Array.isArray(images) && images.length > 0 && (
            <View style={{ marginBottom: theme.spacing.xs }}>
              {images.map((imageUrl, index) => (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.8}
                  onPress={() => openViewer(index)}
                >
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
                  {/* Image overlay indicator */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: (index < images.length - 1 ? theme.spacing.sm : 0) + theme.spacing.xs,
                      right: theme.spacing.xs,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: theme.borderRadius.sm,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                    }}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: 'white',
                        fontSize: 10,
                        fontWeight: '600',
                      }}
                    >
                      {images.length > 1 ? `${index + 1}/${images.length}` : '📷'}
                    </Text>
                  </View>
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

            {isOwn && (
              <ReadReceipt
                isRead={status === 'read'}
                isDelivered={status === 'delivered' || status === 'read'}
                size={12}
                style={{ marginLeft: theme.spacing.sm }}
                color="rgba(255,255,255,0.9)" // White color for visibility on primary background
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Image Viewer */}
      <ImageViewer
        visible={imageViewerVisible}
        images={images || []}
        onClose={closeViewer}
        onShare={shareImage}
        onDownload={downloadImage}
      />
    </View>
  );
}
