import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { CircleAlert as AlertCircle, RefreshCw } from 'lucide-react-native';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  showIcon?: boolean;
  style?: any;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  showIcon = true,
  style,
}: ErrorStateProps) {
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
      {/* Error Icon */}
      {showIcon && (
        <View
          style={{
            marginBottom: theme.spacing.xl,
          }}
        >
          <AlertCircle
            size={64}
            color={theme.colors.error}
          />
        </View>
      )}

      {/* Title */}
      <Text
        variant="h3"
        style={{
          textAlign: 'center',
          marginBottom: theme.spacing.md,
          color: theme.colors.error,
        }}
      >
        {title}
      </Text>

      {/* Message */}
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
        {message}
      </Text>

      {/* Retry Button */}
      {onRetry && (
        <Button
          variant="primary"
          onPress={onRetry}
          icon={<RefreshCw size={18} color={theme.colors.primaryForeground} />}
        >
          {retryText}
        </Button>
      )}
    </View>
  );
}
