import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Minus, Plus } from 'lucide-react-native';

interface StepperProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  style?: any;
}

export function Stepper({
  value,
  onValueChange,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
  size = 'md',
  showLabel = false,
  label = 'Quantity',
  style,
}: StepperProps) {
  const { theme } = useTheme();

  const canDecrease = value > min;
  const canIncrease = value < max;

  const handleDecrease = () => {
    if (canDecrease && !disabled) {
      onValueChange(Math.max(min, value - step));
    }
  };

  const handleIncrease = () => {
    if (canIncrease && !disabled) {
      onValueChange(Math.min(max, value + step));
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          buttonSize: 32,
          iconSize: 16,
          fontSize: 14,
          gap: theme.spacing.sm,
        };
      case 'lg':
        return {
          buttonSize: 48,
          iconSize: 20,
          fontSize: 18,
          gap: theme.spacing.lg,
        };
      case 'md':
      default:
        return {
          buttonSize: 40,
          iconSize: 18,
          fontSize: 16,
          gap: theme.spacing.md,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const StepperButton = ({ 
    onPress, 
    canPress, 
    icon 
  }: { 
    onPress: () => void; 
    canPress: boolean; 
    icon: React.ReactNode;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!canPress || disabled}
      style={{
        width: sizeStyles.buttonSize,
        height: sizeStyles.buttonSize,
        borderRadius: theme.borderRadius.md,
        backgroundColor: (!canPress || disabled) 
          ? theme.colors.surfaceVariant 
          : theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: (!canPress || disabled) 
          ? theme.colors.border 
          : theme.colors.primary,
      }}
      activeOpacity={0.7}
    >
      {icon}
    </TouchableOpacity>
  );

  return (
    <View style={style}>
      {showLabel && label && (
        <Text
          variant="bodySmall"
          color="secondary"
          style={{ marginBottom: theme.spacing.sm }}
        >
          {label}
        </Text>
      )}
      
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: sizeStyles.gap,
        }}
      >
        <StepperButton
          onPress={handleDecrease}
          canPress={canDecrease}
          icon={
            <Minus
              size={sizeStyles.iconSize}
              color={
                (!canDecrease || disabled)
                  ? theme.colors.text.muted
                  : theme.colors.primaryForeground
              }
            />
          }
        />

        <View
          style={{
            minWidth: sizeStyles.buttonSize + theme.spacing.md,
            alignItems: 'center',
          }}
        >
          <Text
            variant="body"
            style={{
              fontSize: sizeStyles.fontSize,
              fontWeight: '600',
              color: disabled ? theme.colors.text.muted : theme.colors.text.primary,
            }}
          >
            {value}
          </Text>
        </View>

        <StepperButton
          onPress={handleIncrease}
          canPress={canIncrease}
          icon={
            <Plus
              size={sizeStyles.iconSize}
              color={
                (!canIncrease || disabled)
                  ? theme.colors.text.muted
                  : theme.colors.primaryForeground
              }
            />
          }
        />
      </View>
    </View>
  );
}