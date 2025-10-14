import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Eye, EyeOff, Search } from 'lucide-react-native';
import { useInputFocus } from '@/components/KeyboardAvoiding/KeyboardAwareScrollView';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  variant?: 'default' | 'search' | 'multiline' | 'password';
  state?: 'default' | 'focus' | 'error' | 'disabled';
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  containerStyle?: any;
  style?: any;
  autoExpand?: boolean;
  minHeight?: number;
  maxHeight?: number;
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
  autoExpand = false,
  minHeight = 52,
  maxHeight = 200,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inputHeight, setInputHeight] = useState(minHeight);
  const inputRef = useRef<TextInput>(null);
  const focusContext = useInputFocus();
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  const isDisabled = state === 'disabled' || props.editable === false;
  const hasError = state === 'error' || !!error;
  const currentState = hasError ? 'error' : isFocused ? 'focus' : state;
  const isMultiline = variant === 'multiline' || props.multiline || autoExpand;
  const shouldAutoExpand = variant === 'multiline' || autoExpand;

  // Handle auto-expand functionality with debouncing to prevent shaking
  const handleContentSizeChange = useCallback((event: any) => {
    if (shouldAutoExpand && event?.nativeEvent?.contentSize?.height) {
      // Store the content height before the timeout to avoid null reference
      const contentHeight = event.nativeEvent.contentSize.height;
      
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Debounce the height update to prevent rapid changes
      debounceTimeoutRef.current = setTimeout(() => {
        const newHeight = Math.max(minHeight, Math.min(maxHeight, contentHeight + 8));
        setInputHeight(newHeight);
      }, 16); // ~60fps debounce
    }
  }, [shouldAutoExpand, minHeight, maxHeight]);

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
    style,
  ];

  const inputContainerStyles = {
    flexDirection: 'row' as const,
    alignItems: (isMultiline && leftIcon) ? 'flex-start' as const : 'center' as const,
    borderWidth: 1,
    borderColor: getBorderColor(),
    borderRadius: theme.borderRadius.md,
    backgroundColor: getBackgroundColor(),
    paddingHorizontal: theme.spacing.md,
    paddingVertical: isMultiline ? theme.spacing.md : theme.spacing.sm,
    minHeight: isMultiline ? (shouldAutoExpand ? inputHeight : 52) : 52,
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
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: isMultiline ? 'top' as const : 'center' as const,
    height: isMultiline ? (shouldAutoExpand ? inputHeight : 40) : 40,
  };

  const renderLeftIcon = () => {
    if (variant === 'search') {
      return (
        <View style={{ 
          marginRight: theme.spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
          height: 40,
          width: 20,
        }}>
          <Search
            size={18}
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
          justifyContent: isMultiline ? 'flex-start' : 'center',
          paddingTop: isMultiline ? theme.spacing.sm : 0,
          height: isMultiline ? '100%' : 40,
          width: 20,
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
            marginLeft: theme.spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            height: 40,
            width: 20,
          }}
        >
          {showPassword ? (
            <EyeOff size={18} color={theme.colors.text.muted} />
          ) : (
            <Eye size={18} color={theme.colors.text.muted} />
          )}
        </TouchableOpacity>
      );
    }
    if (rightIcon) {
      return (
        <View style={{ 
          marginLeft: theme.spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
          height: 40,
          width: 20,
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
          multiline={isMultiline}
          numberOfLines={isMultiline ? (shouldAutoExpand ? undefined : props.numberOfLines || 4) : 1}
          editable={!isDisabled}
          onContentSizeChange={shouldAutoExpand ? handleContentSizeChange : props.onContentSizeChange}
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