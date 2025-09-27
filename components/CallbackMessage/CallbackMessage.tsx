import React from 'react';
import { View, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { PhoneCall, Clock } from 'lucide-react-native';

interface CallbackMessageProps {
  message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    sender?: {
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
  };
  isOwn: boolean;
  senderName?: string;
  senderPhone?: string;
  timestamp: string;
}

export function CallbackMessage({
  message,
  isOwn,
  senderName,
  senderPhone,
  timestamp,
}: CallbackMessageProps) {
  const { theme } = useTheme();

  const handleCall = () => {
    if (!senderPhone) {
      Alert.alert('No Phone Number', 'Phone number not available');
      return;
    }

    Alert.alert(
      'Call Requester',
      `Call ${senderName || 'User'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${senderPhone}`);
          },
        },
      ]
    );
  };

  // Extract phone number from message content if not provided in props
  const extractedPhone = senderPhone || message.content.match(/\+?[\d\s\-\(\)]+/)?.[0];

  return (
    <View
      style={{
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        marginHorizontal: theme.spacing.lg,
        marginVertical: theme.spacing.xs,
      }}
    >
      {/* Sender name for non-own messages */}
      {!isOwn && senderName && (
        <Text
          variant="caption"
          color="muted"
          style={{
            marginBottom: theme.spacing.xs,
            marginLeft: theme.spacing.sm,
          }}
        >
          {senderName}
        </Text>
      )}

      <View
        style={{
          backgroundColor: isOwn ? theme.colors.primary : theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          borderWidth: 2,
          borderColor: theme.colors.warning,
          ...theme.shadows.sm,
        }}
      >
        {/* Callback Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
          <PhoneCall size={16} color={theme.colors.warning} />
          <Badge
            text="Callback Request"
            variant="warning"
            size="sm"
            style={{ marginLeft: theme.spacing.xs }}
          />
        </View>

        {/* Message Content */}
        <Text
          variant="body"
          style={{
            color: isOwn ? theme.colors.surface : theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }}
        >
          {message.content}
        </Text>

        {/* Call Button for non-own messages */}
        {!isOwn && extractedPhone && (
          <TouchableOpacity
            onPress={handleCall}
            style={{
              backgroundColor: theme.colors.success,
              borderRadius: theme.borderRadius.md,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
              marginTop: theme.spacing.sm,
            }}
          >
            <PhoneCall size={16} color={theme.colors.surface} />
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.surface,
                fontWeight: '600',
              }}
            >
              Call Back
            </Text>
          </TouchableOpacity>
        )}

        {/* Timestamp */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: theme.spacing.xs }}>
          <Clock size={12} color={isOwn ? theme.colors.surface : theme.colors.text.muted} />
          <Text
            variant="caption"
            style={{
              color: isOwn ? theme.colors.surface : theme.colors.text.muted,
              marginLeft: theme.spacing.xs,
            }}
          >
            {timestamp}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default CallbackMessage;
