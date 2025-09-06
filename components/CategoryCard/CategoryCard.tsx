import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';

interface CategoryCardProps {
  title: string;
  icon: React.ReactNode;
  itemCount?: number;
  onPress?: () => void;
  style?: any;
}

export function CategoryCard({
  title,
  icon,
  itemCount,
  onPress,
  style,
}: CategoryCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
          minHeight: 100,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <View
        style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.full,
          width: 48,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        {icon}
      </View>

      <Text
        variant="bodySmall"
        style={{
          textAlign: 'center',
          fontWeight: '600',
          marginBottom: theme.spacing.xs,
        }}
      >
        {title}
      </Text>

      {itemCount !== undefined && (
        <Text
          variant="caption"
          color="muted"
          style={{ textAlign: 'center' }}
        >
          {(itemCount || 0).toLocaleString()} items
        </Text>
      )}
    </TouchableOpacity>
  );
}
