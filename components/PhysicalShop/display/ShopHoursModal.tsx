/**
 * ShopHoursModal Component
 * Displays full week business hours in a modal
 * Optimized and beautifully designed
 */

import React, { memo, useMemo } from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { X, Clock, MapPin } from 'lucide-react-native';
import { DAYS_OF_WEEK } from '../types';
import type { BusinessHoursSchedule } from '../types';

interface ShopHoursModalProps {
  visible: boolean;
  onClose: () => void;
  shopName: string;
  businessHours: BusinessHoursSchedule;
  address?: string;
}

const formatTime = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};

const getCurrentDayKey = (): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

const isCurrentlyOpen = (businessHours: BusinessHoursSchedule): boolean => {
  const now = new Date();
  const currentDay = getCurrentDayKey();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const todaySchedule = businessHours[currentDay];
  if (!todaySchedule?.is_open) return false;

  const [openHour, openMinute] = todaySchedule.open.split(':').map(Number);
  const [closeHour, closeMinute] = todaySchedule.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;

  return currentTime >= openTime && currentTime < closeTime;
};

export const ShopHoursModal = memo<ShopHoursModalProps>(({
  visible,
  onClose,
  shopName,
  businessHours,
  address,
}) => {
  const { theme } = useTheme();
  const currentDayKey = useMemo(() => getCurrentDayKey(), []);
  const isOpen = useMemo(() => isCurrentlyOpen(businessHours), [businessHours]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.borderRadius.xl,
            borderTopRightRadius: theme.borderRadius.xl,
            maxHeight: '80%',
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                <Clock size={20} color={theme.colors.primary} />
                <Text variant="h4">Business Hours</Text>
              </View>
              <Text variant="body" color="secondary">
                {shopName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Status Banner */}
          <View style={{
            padding: theme.spacing.md,
            backgroundColor: isOpen ? theme.colors.success + '10' : theme.colors.destructive + '10',
            borderLeftWidth: 4,
            borderLeftColor: isOpen ? theme.colors.success : theme.colors.destructive,
            margin: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: isOpen ? theme.colors.success : theme.colors.destructive,
              }} />
              <Text style={{
                fontWeight: '600',
                color: isOpen ? theme.colors.success : theme.colors.destructive,
              }}>
                {isOpen ? 'Open Now' : 'Closed'}
              </Text>
            </View>
            {businessHours[currentDayKey]?.is_open && (
              <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.xs }}>
                Today: {formatTime(businessHours[currentDayKey].open)} - {formatTime(businessHours[currentDayKey].close)}
              </Text>
            )}
          </View>

          {/* Hours List */}
          <ScrollView
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0 }}
          >
            <View style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.lg,
              overflow: 'hidden',
            }}>
              {DAYS_OF_WEEK.map((day, index) => {
                const schedule = businessHours[day.key];
                const isToday = day.key === currentDayKey;

                return (
                  <View
                    key={day.key}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: theme.spacing.md,
                      backgroundColor: isToday ? theme.colors.primary + '10' : 'transparent',
                      borderLeftWidth: isToday ? 4 : 0,
                      borderLeftColor: theme.colors.primary,
                      borderBottomWidth: index < DAYS_OF_WEEK.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                    }}
                  >
                    <Text
                      variant="body"
                      style={{
                        fontWeight: isToday ? '600' : '400',
                        color: isToday ? theme.colors.primary : theme.colors.text.primary,
                      }}
                    >
                      {day.label}
                      {isToday && (
                        <Text variant="caption" style={{ color: theme.colors.primary }}>
                          {' '}(Today)
                        </Text>
                      )}
                    </Text>
                    <Text
                      variant="body"
                      style={{
                        fontWeight: isToday ? '600' : '400',
                        color: schedule?.is_open
                          ? isToday ? theme.colors.primary : theme.colors.text.primary
                          : theme.colors.text.muted,
                      }}
                    >
                      {schedule?.is_open
                        ? `${formatTime(schedule.open)} - ${formatTime(schedule.close)}`
                        : 'Closed'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Address */}
            {address && (
              <View style={{
                marginTop: theme.spacing.lg,
                padding: theme.spacing.md,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                flexDirection: 'row',
                gap: theme.spacing.sm,
              }}>
                <MapPin size={16} color={theme.colors.text.secondary} style={{ marginTop: 2 }} />
                <Text variant="bodySmall" color="secondary" style={{ flex: 1, lineHeight: 18 }}>
                  {address}
                </Text>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

ShopHoursModal.displayName = 'ShopHoursModal';

