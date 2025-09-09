import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';

interface DateSeparatorProps {
  date: Date | string;
  style?: any;
}

export function DateSeparator({ date, style }: DateSeparatorProps) {
  const { theme } = useTheme();
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const getDateText = () => {
    if (isToday(dateObj)) {
      return 'Today';
    } else if (isYesterday(dateObj)) {
      return 'Yesterday';
    } else if (isThisYear(dateObj)) {
      return format(dateObj, 'EEEE, MMMM d'); // e.g., "Monday, March 15"
    } else {
      return format(dateObj, 'EEEE, MMMM d, yyyy'); // e.g., "Monday, March 15, 2023"
    }
  };

  return (
    <View
      style={[
        {
          alignItems: 'center',
          marginVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
        },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.full,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
        }}
      >
        <Text
          variant="caption"
          style={{
            color: theme.colors.text.secondary,
            fontWeight: '600',
            fontSize: 12,
          }}
        >
          {getDateText()}
        </Text>
      </View>
    </View>
  );
}
