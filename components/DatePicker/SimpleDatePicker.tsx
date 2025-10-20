import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Calendar, ChevronDown, X } from 'lucide-react-native';

export interface SimpleDatePickerProps {
  label?: string;
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  fullWidth?: boolean;
  containerStyle?: any;
  style?: any;
}

export function SimpleDatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  helper,
  disabled = false,
  minimumDate,
  maximumDate,
  fullWidth = true,
  containerStyle,
  style,
}: SimpleDatePickerProps) {
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
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onChange?.(date);
    setShowPicker(false);
    setFocused(false);
  };

  const handlePress = () => {
    if (!disabled) {
      setFocused(true);
      setShowPicker(true);
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

  // Generate date options (last 100 years)
  const generateDateOptions = () => {
    const options: Date[] = [];
    const today = new Date();
    const startYear = minimumDate ? minimumDate.getFullYear() : today.getFullYear() - 100;
    const endYear = maximumDate ? maximumDate.getFullYear() : today.getFullYear();
    
    for (let year = endYear; year >= startYear; year--) {
      for (let month = 11; month >= 0; month--) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = daysInMonth; day >= 1; day--) {
          const date = new Date(year, month, day);
          if (minimumDate && date < minimumDate) continue;
          if (maximumDate && date > maximumDate) continue;
          options.push(date);
        }
      }
    }
    
    return options.slice(0, 1000); // Limit to 1000 options for performance
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
              maxHeight: '70%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <Text variant="h4">Select Date</Text>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color={theme.colors.text.muted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {generateDateOptions().map((date, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleDateSelect(date)}
                  style={{
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    backgroundColor: selectedDate && selectedDate.getTime() === date.getTime() 
                      ? theme.colors.primary + '10' 
                      : 'transparent',
                  }}
                >
                  <Text 
                    variant="body" 
                    style={{
                      color: selectedDate && selectedDate.getTime() === date.getTime() 
                        ? theme.colors.primary 
                        : theme.colors.text.primary,
                      fontWeight: selectedDate && selectedDate.getTime() === date.getTime() 
                        ? '600' 
                        : '400',
                    }}
                  >
                    {formatDate(date)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
