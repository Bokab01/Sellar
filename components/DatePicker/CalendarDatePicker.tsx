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
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

export interface CalendarDatePickerProps {
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

export function CalendarDatePicker({
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
}: CalendarDatePickerProps) {
  const { theme } = useTheme();
  const [isFocused, setFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? (value instanceof Date ? value : new Date(value)) : null
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);

  useEffect(() => {
    if (value) {
      const date = value instanceof Date ? value : new Date(value);
      setSelectedDate(date);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
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

  // Calendar generation
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      days.push(date);
    }

    // Ensure we always have complete weeks (multiple of 7)
    // Add empty cells to complete the last week if needed
    const totalCells = days.length;
    const remainingCells = totalCells % 7;
    if (remainingCells !== 0) {
      const cellsToAdd = 7 - remainingCells;
      for (let i = 0; i < cellsToAdd; i++) {
        days.push(null);
      }
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setFullYear(newMonth.getFullYear() - 1);
    } else {
      newMonth.setFullYear(newMonth.getFullYear() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const selectYear = (year: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(year);
    setCurrentMonth(newMonth);
    setShowYearPicker(false);
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = minimumDate ? minimumDate.getFullYear() : currentYear - 100;
    const endYear = maximumDate ? maximumDate.getFullYear() : currentYear;
    
    const years = [];
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  };

  const isDateDisabled = (date: Date) => {
    if (minimumDate && date < minimumDate) return true;
    if (maximumDate && date > maximumDate) return true;
    return false;
  };

  const isDateSelected = (date: Date) => {
    return selectedDate && 
           selectedDate.getDate() === date.getDate() &&
           selectedDate.getMonth() === date.getMonth() &&
           selectedDate.getFullYear() === date.getFullYear();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
              height: 500, // Fixed height to prevent modal readjustment
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
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

            {/* Month Navigation */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <TouchableOpacity
                onPress={() => navigateMonth('prev')}
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.background,
                }}
              >
                <ChevronLeft size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowYearPicker(!showYearPicker)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.background,
                }}
              >
                <Text variant="h4" style={{ fontWeight: '600', marginRight: theme.spacing.xs }}>
                  {monthNames[currentMonth.getMonth()]}
                </Text>
                <Text variant="h4" style={{ 
                  fontWeight: '600', 
                  color: theme.colors.primary,
                  textDecorationLine: 'underline',
                }}>
                  {currentMonth.getFullYear()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigateMonth('next')}
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.background,
                }}
              >
                <ChevronRight size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Year Picker */}
            {showYearPicker && (
              <View style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.lg,
                maxHeight: 300,
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: theme.spacing.md,
                }}>
                  <Text variant="body" style={{ 
                    color: theme.colors.text.primary,
                    fontWeight: '600',
                  }}>
                    Select Year
                  </Text>
                  <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                    <X size={20} color={theme.colors.text.muted} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  style={{ maxHeight: 220 }}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingRight: theme.spacing.sm }}
                >
                  {generateYearOptions().map((year) => (
                    <TouchableOpacity
                      key={year}
                      onPress={() => selectYear(year)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: theme.spacing.md,
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.borderRadius.sm,
                        backgroundColor: currentMonth.getFullYear() === year 
                          ? theme.colors.primary 
                          : 'transparent',
                        marginBottom: theme.spacing.xs,
                        borderWidth: currentMonth.getFullYear() === year ? 0 : 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text
                        variant="body"
                        style={{
                          color: currentMonth.getFullYear() === year 
                            ? theme.colors.surface 
                            : theme.colors.text.primary,
                          fontWeight: currentMonth.getFullYear() === year ? '600' : '500',
                          fontSize: 16,
                        }}
                      >
                        {year}
                      </Text>
                      
                      {currentMonth.getFullYear() === year && (
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.colors.surface,
                        }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Day Names Header */}
            <View style={{
              flexDirection: 'row',
              marginBottom: theme.spacing.sm,
            }}>
              {dayNames.map((day) => (
                <View key={day} style={{ 
                  width: '14.28%', 
                  alignItems: 'center',
                  paddingHorizontal: 1, // Match the margin in calendar grid
                }}>
                  <Text variant="bodySmall" style={{
                    color: theme.colors.text.muted,
                    fontWeight: '500',
                  }}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={{
                paddingHorizontal: 1, // Match the padding in day names header
              }}>
                {Array.from({ length: Math.ceil(generateCalendarDays().length / 7) }, (_, weekIndex) => (
                  <View key={weekIndex} style={{
                    flexDirection: 'row',
                    marginBottom: 2,
                  }}>
                    {generateCalendarDays()
                      .slice(weekIndex * 7, (weekIndex + 1) * 7)
                      .map((date, dayIndex) => {
                        const index = weekIndex * 7 + dayIndex;
                        
                        if (!date) {
                          return <View key={index} style={{ 
                            flex: 1, 
                            aspectRatio: 1,
                            margin: 1, // Consistent with date cells
                          }} />;
                        }

                        const disabled = isDateDisabled(date);
                        const selected = isDateSelected(date);
                        const today = isToday(date);

                        return (
                          <TouchableOpacity
                            key={index}
                            onPress={() => !disabled && handleDateSelect(date)}
                            disabled={disabled}
                            style={{
                              flex: 1,
                              aspectRatio: 1,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderRadius: theme.borderRadius.sm,
                              backgroundColor: selected 
                                ? theme.colors.primary 
                                : today 
                                  ? theme.colors.primary + '20'
                                  : 'transparent',
                              margin: 1,
                            }}
                          >
                            <Text
                              variant="bodySmall"
                              style={{
                                color: disabled
                                  ? theme.colors.text.muted
                                  : selected
                                    ? theme.colors.surface
                                    : today
                                      ? theme.colors.primary
                                      : theme.colors.text.primary,
                                fontWeight: selected || today ? '600' : '400',
                              }}
                            >
                              {date.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Quick Actions */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}>
              <TouchableOpacity
                onPress={() => {
                  const today = new Date();
                  // Navigate to current month first
                  setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  
                  // Then try to select today, or find a valid recent date
                  if (!isDateDisabled(today)) {
                    handleDateSelect(today);
                  } else {
                    // Find the most recent valid date
                    const validDate = new Date(today);
                    while (isDateDisabled(validDate) && minimumDate && validDate > minimumDate) {
                      validDate.setDate(validDate.getDate() - 1);
                    }
                    if (!isDateDisabled(validDate)) {
                      handleDateSelect(validDate);
                    }
                  }
                }}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.background,
                }}
              >
                <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const eighteenYearsAgo = new Date();
                  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                  if (!isDateDisabled(eighteenYearsAgo)) {
                    handleDateSelect(eighteenYearsAgo);
                  }
                }}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  backgroundColor: theme.colors.background,
                }}
              >
                <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                  18 Years Ago
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
