import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Eye, EyeOff, Search } from 'lucide-react-native';
import { getFontFamily } from '@/theme/fonts';

type InputVariant = 'default' | 'search' | 'multiline' | 'password';
type InputState = 'default' | 'focus' | 'error' | 'disabled';

interface InputProps extends Omit<TextInputProps, 'style'> {
  variant?: InputVariant;
  state?: InputState;
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  containerStyle?: any;
}

export function Input({
  variant = 'default',
  state = 'default',
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  fullWidth = true,
  containerStyle,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const isDisabled = state === 'disabled' || props.editable === false;
  const hasError = state === 'error' || !!error;
  const currentState = hasError ? 'error' : isFocused ? 'focus' : state;

  const getBorderColor = () => {
    switch (currentState) {
      case 'focus':
        return theme.colors.primary;
      case 'error':
        return theme.colors.error;
      case 'disabled':
        return theme.colors.border;
      default:
        return theme.colors.border;
    }
  };

  const getBackgroundColor = () => {
    return isDisabled ? theme.colors.surfaceVariant : theme.colors.surface;
  };

  const containerStyles = [
    {
      width: fullWidth ? '100%' : 'auto',
    },
    containerStyle,
  ];

  const inputContainerStyles = [
    {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: getBorderColor(),
      borderRadius: theme.borderRadius.md,
      backgroundColor: getBackgroundColor(),
      paddingHorizontal: theme.spacing.md,
      minHeight: variant === 'multiline' ? 80 : 48,
    },
    variant === 'search' && {
      paddingLeft: theme.spacing.sm,
    },
  ];

  const inputStyles = [
    {
      flex: 1,
      fontSize: theme.typography.body.fontSize,
      lineHeight: theme.typography.body.lineHeight,
      color: isDisabled ? theme.colors.text.muted : theme.colors.text.primary,
      paddingVertical: theme.spacing.sm,
    },
    variant === 'multiline' && {
      textAlignVertical: 'top' as const,
      paddingTop: theme.spacing.md,
    },
  ];

  const renderLeftIcon = () => {
    if (variant === 'search') {
      return (
        <Search
          size={20}
          color={theme.colors.text.muted}
          style={{ marginRight: theme.spacing.sm }}
        />
      );
    }
    if (leftIcon) {
      return (
        <View style={{ marginRight: theme.spacing.sm }}>
          {leftIcon}
        </View>
      );
    }
    return null;
  };

  const renderRightIcon = () => {
    if (variant === 'password') {
      return (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{ padding: theme.spacing.xs, marginLeft: theme.spacing.sm }}
        >
          {showPassword ? (
            <EyeOff size={20} color={theme.colors.text.muted} />
          ) : (
            <Eye size={20} color={theme.colors.text.muted} />
          )}
        </TouchableOpacity>
      );
    }
    if (rightIcon) {
      return (
        <View style={{ marginLeft: theme.spacing.sm }}>
          {rightIcon}
        </View>
      );
    }
    return null;
  };

  return (
    <View style={containerStyles}>
      {label && (
        <Text
          variant="bodySmall"
          color={hasError ? 'error' : 'secondary'}
          style={{ marginBottom: theme.spacing.xs }}
        >
          {label}
        </Text>
      )}
      
      <View style={inputContainerStyles}>
        {renderLeftIcon()}
        
        <TextInput
          style={inputStyles}
          placeholderTextColor={theme.colors.text.muted}
          secureTextEntry={variant === 'password' && !showPassword}
          multiline={variant === 'multiline'}
          numberOfLines={variant === 'multiline' ? 4 : 1}
          editable={!isDisabled}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        {renderRightIcon()}
      </View>
      
      {(error || helper) && (
        <Text
          variant="caption"
          color={hasError ? 'error' : 'muted'}
          style={{ marginTop: theme.spacing.xs }}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
}