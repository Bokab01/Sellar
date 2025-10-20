import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Calendar, ChevronDown } from 'lucide-react-native';

// Conditional import for DateTimePicker
let DateTimePicker: any = null;
try {
  if (Platform.OS !== 'web') {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  }
} catch (error) {
  console.warn('DateTimePicker not available:', error);
}

export interface DatePickerProps {
  label?: string;
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  fullWidth?: boolean;
  containerStyle?: any;
  style?: any;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  helper,
  disabled = false,
  minimumDate,
  maximumDate,
  mode = 'date',
  fullWidth = true,
  containerStyle,
  style,
}: DatePickerProps) {
  const { theme } = useTheme();
  const [isFocused, setFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? (value instanceof Date ? value : new Date(value)) : null
  );

  useEffect(() => {
    if (value) {
      setSelectedDate(value instanceof Date ? value : new Date(value));
    }
  }, [value]);

  const formatDate = (date: Date) => {
    if (mode === 'date') {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } else if (mode === 'time') {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      onChange?.(date);
    }
  };

  const handleFallbackDateChange = () => {
    // Fallback for when DateTimePicker is not available
    const today = new Date();
    const year = today.getFullYear() - 18; // Default to 18 years ago
    const defaultDate = new Date(year, today.getMonth(), today.getDate());
    setSelectedDate(defaultDate);
    onChange?.(defaultDate);
  };

  const handlePress = () => {
    if (!disabled) {
      setFocused(true);
      if (DateTimePicker) {
        setShowPicker(true);
      } else {
        // Fallback when DateTimePicker is not available
        handleFallbackDateChange();
      }
    }
  };

  const handleClose = () => {
    setFocused(false);
    setShowPicker(false);
  };

  const getDisplayValue = () => {
    if (selectedDate) {
      return formatDate(selectedDate);
    }
    return placeholder;
  };

  const getTextColor = () => {
    if (selectedDate) {
      return theme.colors.text.primary;
    }
    return theme.colors.text.muted;
  };

  const getInputState = () => {
    if (error) return 'error';
    if (disabled) return 'disabled';
    if (isFocused) return 'focus';
    return 'default';
  };

  const inputState = getInputState();

  const getBorderColor = () => {
    switch (inputState) {
      case 'error':
        return theme.colors.error;
      case 'focus':
        return theme.colors.primary;
      case 'disabled':
        return theme.colors.border;
      default:
        return theme.colors.border;
    }
  };

  const getBackgroundColor = () => {
    if (disabled) {
      return theme.colors.background;
    }
    return theme.colors.surface;
  };

  const container = (
    <View style={[
      {
        width: fullWidth ? '100%' : 'auto',
      },
      containerStyle,
    ]}>
      {label && (
        <Text 
          variant="bodySmall" 
          style={{ 
            marginBottom: theme.spacing.sm,
            fontWeight: '500',
            color: theme.colors.text.primary,
          }}
        >
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderWidth: 1,
            borderColor: getBorderColor(),
            borderRadius: theme.borderRadius.md,
            backgroundColor: getBackgroundColor(),
            minHeight: 52,
          },
          style,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Calendar 
            size={20} 
            color={selectedDate ? theme.colors.primary : theme.colors.text.muted} 
            style={{ marginRight: theme.spacing.sm }}
          />
          <Text 
            variant="body" 
            style={{
              color: getTextColor(),
              flex: 1,
            }}
          >
            {getDisplayValue()}
          </Text>
        </View>
        
        <ChevronDown 
          size={20} 
          color={theme.colors.text.muted} 
        />
      </TouchableOpacity>

      {error && (
        <Text 
          variant="bodySmall" 
          style={{ 
            color: theme.colors.error,
            marginTop: theme.spacing.xs,
          }}
        >
          {error}
        </Text>
      )}
      
      {helper && !error && (
        <Text 
          variant="bodySmall" 
          style={{ 
            color: theme.colors.text.muted,
            marginTop: theme.spacing.xs,
          }}
        >
          {helper}
        </Text>
      )}
    </View>
  );

  if (!DateTimePicker) {
    // Fallback when DateTimePicker is not available
    return container;
  }

  if (Platform.OS === 'ios') {
    return (
      <>
        {container}
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleClose}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'flex-end',
            }}
            onPress={handleClose}
          >
            <Pressable
              style={{
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.borderRadius.lg,
                borderTopRightRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}>
                <Text variant="h4">Select {mode === 'date' ? 'Date' : mode === 'time' ? 'Time' : 'Date & Time'}</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Text variant="body" style={{ color: theme.colors.primary }}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={selectedDate || new Date()}
                mode={mode}
                display="default"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={{ alignSelf: 'center' }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <>
      {container}
      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode={mode}
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </>
  );
}
