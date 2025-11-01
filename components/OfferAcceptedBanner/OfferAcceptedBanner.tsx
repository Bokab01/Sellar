import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';

interface OfferAcceptedBannerProps {
  depositDeadline?: string;
  onPayDeposit: () => void;
  style?: any;
}

export function OfferAcceptedBanner({ 
  depositDeadline, 
  onPayDeposit,
  style 
}: OfferAcceptedBannerProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.success + '10',
          borderBottomWidth: 3,
          borderBottomColor: theme.colors.success,
          padding: theme.spacing.lg,
        },
        style,
      ]}
    >
      <View style={{ alignItems: 'center', marginBottom: theme.spacing.sm }}>
        <Text
          variant="h3"
          style={{
            color: theme.colors.success,
            fontWeight: '700',
            marginBottom: theme.spacing.xs,
          }}
        >
          🎉 Offer Accepted!
        </Text>
        <Text
          variant="body"
          style={{
            color: theme.colors.text.primary,
            textAlign: 'center',
            marginBottom: theme.spacing.xs,
          }}
        >
          Secure this item with a ₵20 Sellar Secure deposit
        </Text>
        {depositDeadline && (
          <Text
            variant="caption"
            style={{
              color: theme.colors.warning,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            ⏰ Deadline: {new Date(depositDeadline).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        )}
      </View>
      <Button
        variant="primary"
        onPress={onPayDeposit}
        fullWidth
        style={{ marginTop: theme.spacing.sm }}
      >
        Pay ₵20 Deposit Now
      </Button>
    </View>
  );
}

