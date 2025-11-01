/**
 * TimePickerModal Component
 * Custom time picker for business hours
 * Optimized with wheel picker for smooth UX
 */

import React, { memo, useState, useCallback } from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialTime: string; // HH:mm format
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

// Generate time options (30-minute intervals)
const generateTimeOptions = (): string[] => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      times.push(`${h}:${m}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

const formatTimeDisplay = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};

export const TimePickerModal = memo<TimePickerModalProps>(({
  visible,
  title,
  initialTime,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();
  const [selectedTime, setSelectedTime] = useState(initialTime);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedTime);
  }, [selectedTime, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: theme.spacing.lg,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View style={{
            padding: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <Text variant="h4">{title}</Text>
          </View>

          {/* Time List */}
          <ScrollView
            style={{ maxHeight: 300 }}
            showsVerticalScrollIndicator={false}
          >
            {TIME_OPTIONS.map((time) => {
              const isSelected = time === selectedTime;
              return (
                <TouchableOpacity
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  style={{
                    padding: theme.spacing.md,
                    backgroundColor: isSelected
                      ? theme.colors.primary + '20'
                      : 'transparent',
                    borderLeftWidth: isSelected ? 4 : 0,
                    borderLeftColor: theme.colors.primary,
                  }}
                >
                  <Text
                    variant="body"
                    style={{
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected
                        ? theme.colors.primary
                        : theme.colors.text.primary,
                    }}
                  >
                    {formatTimeDisplay(time)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View style={{
            flexDirection: 'row',
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            <Button
              variant="outline"
              onPress={onCancel}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleConfirm}
              style={{ flex: 1 }}
            >
              Confirm
            </Button>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

TimePickerModal.displayName = 'TimePickerModal';

