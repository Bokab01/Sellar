import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    text: string;
    onPress: () => void;
  };
  style?: any;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: theme.spacing.xl,
        },
        style,
      ]}
    >
      {/* Icon */}
      {icon && (
        <View
          style={{
            marginBottom: theme.spacing.xl,
            opacity: 0.6,
          }}
        >
          {icon}
        </View>
      )}

      {/* Title */}
      <Text
        variant="h3"
        style={{
          textAlign: 'center',
          marginBottom: description ? theme.spacing.md : theme.spacing.xl,
        }}
      >
        {title}
      </Text>

      {/* Description */}
      {description && (
        <Text
          variant="body"
          color="secondary"
          style={{
            textAlign: 'center',
            marginBottom: theme.spacing.xl,
            maxWidth: 280,
            lineHeight: 22,
          }}
        >
          {description}
        </Text>
      )}

      {/* Action Button */}
      {action && (
        <Button
          variant="primary"
          onPress={action.onPress}
        >
          {action.text}
        </Button>
      )}
    </View>
  );
}
