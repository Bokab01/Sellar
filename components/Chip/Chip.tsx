import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { X } from 'lucide-react-native';

type ChipVariant = 'default' | 'selected' | 'filter' | 'category' | 'status';
type ChipSize = 'sm' | 'md' | 'lg';

interface ChipProps {
  text: string;
  variant?: ChipVariant;
  size?: ChipSize;
  selected?: boolean;
  disabled?: boolean;
  removable?: boolean;
  icon?: React.ReactNode;
  onPress?: () => void;
  onRemove?: () => void;
  style?: any;
}

export function Chip({
  text,
  variant = 'default',
  size = 'md',
  selected = false,
  disabled = false,
  removable = false,
  icon,
  onPress,
  onRemove,
  style,
}: ChipProps) {
  const { theme } = useTheme();

  const getChipColors = () => {
    if (disabled) {
      return {
        backgroundColor: theme.colors.surfaceVariant,
        textColor: theme.colors.text.muted,
        borderColor: theme.colors.border,
      };
    }

    if (selected || variant === 'selected') {
      return {
        backgroundColor: theme.colors.primary,
        textColor: theme.colors.primaryForeground,
        borderColor: theme.colors.primary,
      };
    }

    switch (variant) {
      case 'filter':
        return {
          backgroundColor: theme.colors.secondary,
          textColor: theme.colors.secondaryForeground,
          borderColor: theme.colors.border,
        };
      case 'category':
        return {
          backgroundColor: theme.colors.surfaceVariant,
          textColor: theme.colors.text.primary,
          borderColor: theme.colors.border,
        };
      case 'status':
        return {
          backgroundColor: theme.colors.success + '20',
          textColor: theme.colors.success,
          borderColor: theme.colors.success,
        };
      case 'default':
      default:
        return {
          backgroundColor: theme.colors.surfaceVariant,
          textColor: theme.colors.text.primary,
          borderColor: theme.colors.border,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
          gap: theme.spacing.xs,
        };
      case 'lg':
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.borderRadius.lg,
          gap: theme.spacing.md,
        };
      case 'md':
      default:
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          gap: theme.spacing.sm,
        };
    }
  };

  const colors = getChipColors();
  const sizeStyles = getSizeStyles();

  const ChipContent = () => (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.backgroundColor,
          borderWidth: 1,
          borderColor: colors.borderColor,
          ...sizeStyles,
        },
        style,
      ]}
    >
      {icon && (
        <View style={{ marginRight: sizeStyles.gap }}>
          {icon}
        </View>
      )}
      
      <Text
        variant="caption"
        style={{
          color: colors.textColor,
          fontSize: size === 'sm' ? 11 : size === 'lg' ? 14 : 12,
          fontWeight: '500',
        }}
      >
        {text}
      </Text>

      {removable && onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          style={{
            marginLeft: sizeStyles.gap,
            padding: 2,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} color={colors.textColor} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <ChipContent />
      </TouchableOpacity>
    );
  }

  return <ChipContent />;
}