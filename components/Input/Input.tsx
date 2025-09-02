import React, { useState, useRef } from 'react';
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
import { useInputFocus } from '@/components/KeyboardAvoiding';

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
  style?: any; // Allow style prop for container styling
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
  style,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusContext = useInputFocus();
  
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
    style, // Apply the style prop to the container
  ];

  const inputContainerStyles = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: getBorderColor(),
    borderRadius: theme.borderRadius.md,
    backgroundColor: getBackgroundColor(),
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs, // Add vertical padding for better alignment
    minHeight: variant === 'multiline' ? 80 : 52, // Slightly increase height for better proportions
    ...(variant === 'search' && {
      paddingLeft: theme.spacing.sm,
    }),
  };

  const inputStyles = {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontFamily: theme.typography.body.fontFamily,
    color: isDisabled ? theme.colors.text.muted : theme.colors.text.primary,
    paddingVertical: variant === 'multiline' ? theme.spacing.md : theme.spacing.sm,
    paddingHorizontal: 0, // Remove horizontal padding to prevent alignment issues
    includeFontPadding: false, // Android: Remove extra font padding
    textAlignVertical: variant === 'multiline' ? 'top' : 'center',
    height: variant === 'multiline' ? undefined : 40, // Fixed height for single-line inputs
    ...(variant === 'multiline' && {
      minHeight: 60,
    }),
  };

  const renderLeftIcon = () => {
    if (variant === 'search') {
      return (
        <View style={{ 
          marginRight: theme.spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
          height: 40, // Match input height
          width: 24, // Fixed width for consistent alignment
        }}>
          <Search
            size={20}
            color={theme.colors.text.muted}
          />
        </View>
      );
    }
    if (leftIcon) {
      return (
        <View style={{ 
          marginRight: theme.spacing.sm,
          alignItems: 'center',
          justifyContent: variant === 'multiline' ? 'flex-start' : 'center',
          height: variant === 'multiline' ? 60 : 40, // Match input height
          width: 24, // Fixed width for consistent alignment
          paddingTop: variant === 'multiline' ? theme.spacing.md : 0,
        }}>
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
          style={{ 
            padding: theme.spacing.xs, 
            marginLeft: theme.spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            height: variant === 'multiline' ? 60 : 40, // Match input height
            width: 32, // Slightly wider for touch target
            paddingTop: variant === 'multiline' ? theme.spacing.md : 0,
          }}
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
        <View style={{ 
          marginLeft: theme.spacing.sm,
          alignItems: 'center',
          justifyContent: variant === 'multiline' ? 'flex-start' : 'center',
          height: variant === 'multiline' ? 60 : 40, // Match input height
          width: 24, // Fixed width for consistent alignment
          paddingTop: variant === 'multiline' ? theme.spacing.md : 0,
        }}>
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
          ref={inputRef}
          style={inputStyles}
          placeholderTextColor={theme.colors.text.muted}
          selectionColor={theme.colors.primary}
          cursorColor={theme.colors.primary}
          secureTextEntry={variant === 'password' && !showPassword}
          multiline={variant === 'multiline'}
          numberOfLines={variant === 'multiline' ? 4 : 1}
          editable={!isDisabled}
          onFocus={(e) => {
            setIsFocused(true);
            if (inputRef.current && focusContext) {
              focusContext.onInputFocus(inputRef.current);
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (focusContext) {
              focusContext.onInputBlur();
            }
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