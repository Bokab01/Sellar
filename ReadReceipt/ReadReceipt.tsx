import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Check } from 'lucide-react-native';

interface ReadReceiptProps {
  isRead: boolean;
  isDelivered?: boolean;
  size?: number;
  style?: any;
  color?: string; // Allow custom color override
}

export function ReadReceipt({ 
  isRead, 
  isDelivered = true, 
  size = 14, 
  style,
  color // Custom color override
}: ReadReceiptProps) {
  const { theme } = useTheme();

  // Determine colors based on read status and custom color override
  const unreadColor = color || theme.colors.text.muted;
  const readColor = color || theme.colors.primary;

  if (!isDelivered) {
    // Single gray tick for sent but not delivered
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <Check 
          size={size} 
          color={unreadColor} 
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
          color={unreadColor} 
          strokeWidth={2}
          style={{ marginRight: -4 }}
        />
        <Check 
          size={size} 
          color={unreadColor} 
          strokeWidth={2}
        />
      </View>
    );
  }

  // Double ticks for read (use custom color if provided, otherwise primary)
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Check 
        size={size} 
        color={readColor} 
        strokeWidth={2}
        style={{ marginRight: -4 }}
      />
      <Check 
        size={size} 
        color={readColor} 
        strokeWidth={2}
      />
    </View>
  );
}
