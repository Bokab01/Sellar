import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Rating } from '@/components/Rating/Rating';

interface ReviewCardProps {
  reviewer: {
    name: string;
    avatar?: string;
  };
  rating: number;
  comment: string;
  timestamp: string;
  helpful?: number;
  verified?: boolean;
  style?: any;
}

export function ReviewCard({
  reviewer,
  rating,
  comment,
  timestamp,
  helpful,
  verified = false,
  style,
}: ReviewCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.lg,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: theme.spacing.md,
        },
        style,
      ]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <Avatar
          source={reviewer.avatar}
          name={reviewer.name}
          size="sm"
          style={{ marginRight: theme.spacing.md }}
        />

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {reviewer.name}
            </Text>
            
            {verified && (
              <View
                style={{
                  backgroundColor: theme.colors.success,
                  borderRadius: theme.borderRadius.sm,
                  paddingHorizontal: theme.spacing.xs,
                  paddingVertical: 2,
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.successForeground,
                    fontSize: 9,
                    fontWeight: '600',
                  }}
                >
                  VERIFIED
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: theme.spacing.xs,
            }}
          >
            <Rating rating={rating} size="sm" />
            
            <Text variant="caption" color="muted">
              {timestamp}
            </Text>
          </View>
        </View>
      </View>

      {/* Comment */}
      <Text
        variant="body"
        style={{
          lineHeight: 22,
          marginBottom: helpful ? theme.spacing.md : 0,
        }}
      >
        {comment}
      </Text>

      {/* Helpful Count */}
      {helpful && helpful > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <Text variant="caption" color="muted">
            👍 {helpful} people found this helpful
          </Text>
        </View>
      )}
    </View>
  );
}