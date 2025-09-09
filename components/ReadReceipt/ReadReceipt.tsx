import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Check } from 'lucide-react-native';

interface ReadReceiptProps {
  isRead: boolean;
  isDelivered?: boolean;
  size?: number;
  style?: any;
}

export function ReadReceipt({ 
  isRead, 
  isDelivered = true, 
  size = 14, 
  style 
}: ReadReceiptProps) {
  const { theme } = useTheme();

  if (!isDelivered) {
    // Single gray tick for sent but not delivered
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <Check 
          size={size} 
          color={theme.colors.text.muted} 
          strokeWidth={2}
        />
      </View>
    );
  }

  if (!isRead) {
    // Double gray ticks for delivered but not read
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <Check 
          size={size} 
          color={theme.colors.text.muted} 
          strokeWidth={2}
          style={{ marginRight: -4 }}
        />
        <Check 
          size={size} 
          color={theme.colors.text.muted} 
          strokeWidth={2}
        />
      </View>
    );
  }

  // Double blue ticks for read
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Check 
        size={size} 
        color={theme.colors.primary} 
        strokeWidth={2}
        style={{ marginRight: -4 }}
      />
      <Check 
        size={size} 
        color={theme.colors.primary} 
        strokeWidth={2}
      />
    </View>
  );
}
