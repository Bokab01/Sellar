/**
 * Step 3: Business Hours
 * Visual editor for weekly opening hours
 */

import React, { memo, useCallback, useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Switch } from 'react-native';
import { Clock, Copy } from 'lucide-react-native';
import { DAYS_OF_WEEK, DEFAULT_BUSINESS_HOURS } from '../types';
import type { ShopSetupData, BusinessHoursSchedule } from '../types';
import { TimePickerModal } from '../components';

interface Step3BusinessHoursProps {
  data: Partial<ShopSetupData>;
  updateData: <K extends keyof ShopSetupData>(key: K, value: ShopSetupData[K]) => void;
  updateMultiple: (updates: Partial<ShopSetupData>) => void;
}

const Step3BusinessHours = memo<Step3BusinessHoursProps>(({ data, updateData }) => {
  const { theme } = useTheme();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [timeType, setTimeType] = useState<'open' | 'close'>('open');

  const businessHours = data.business_hours || DEFAULT_BUSINESS_HOURS;

  const updateDaySchedule = useCallback((day: string, updates: Partial<BusinessHoursSchedule[string]>) => {
    updateData('business_hours', {
      ...businessHours,
      [day]: { ...businessHours[day], ...updates },
    });
  }, [businessHours, updateData]);

  const handleTimeSelect = useCallback((time: string) => {
    if (!selectedDay) return;
    
    updateDaySchedule(selectedDay, {
      [timeType]: time,
    });
    
    setSelectedDay(null);
  }, [selectedDay, timeType, updateDaySchedule]);

  const handleCopyToAll = useCallback((sourceDay: string) => {
    const sourceSchedule = businessHours[sourceDay];
    const updatedSchedule: BusinessHoursSchedule = { ...businessHours };
    
    DAYS_OF_WEEK.forEach(({ key }) => {
      if (key !== sourceDay) {
        updatedSchedule[key] = { ...sourceSchedule };
      }
    });
    
    updateData('business_hours', updatedSchedule);
  }, [businessHours, updateData]);

  const handleSetAllWeekdays = useCallback(() => {
    const updatedSchedule: BusinessHoursSchedule = { ...businessHours };
    
    // Set Monday-Friday to open 9am-6pm
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
      updatedSchedule[day] = { open: '09:00', close: '18:00', is_open: true };
    });
    
    // Set Saturday to 10am-4pm
    updatedSchedule.saturday = { open: '10:00', close: '16:00', is_open: true };
    
    // Set Sunday to closed
    updatedSchedule.sunday = { open: '00:00', close: '00:00', is_open: false };
    
    updateData('business_hours', updatedSchedule);
  }, [businessHours, updateData]);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Header */}
      <View>
        <Text variant="h3" style={{ marginBottom: theme.spacing.xs }}>
          When are you open?
        </Text>
        <Text variant="body" color="secondary">
          Set your regular business hours
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={{ 
        flexDirection: 'row', 
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
      }}>
        <TouchableOpacity
          onPress={handleSetAllWeekdays}
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="bodySmall" style={{ fontWeight: '600' }}>
            📅 Set Standard Hours
          </Text>
        </TouchableOpacity>
      </View>

      {/* Days List */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}>
        {DAYS_OF_WEEK.map((day, index) => {
          const schedule = businessHours[day.key];
          const isOpen = schedule?.is_open ?? true;

          return (
            <View
              key={day.key}
              style={{
                borderBottomWidth: index < DAYS_OF_WEEK.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border,
              }}
            >
              {/* Day Row */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: theme.spacing.md,
                gap: theme.spacing.md,
              }}>
                {/* Day Name */}
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    {day.label}
                  </Text>
                </View>

                {/* Time Pickers or Closed */}
                {isOpen ? (
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedDay(day.key);
                        setTimeType('open');
                      }}
                      style={{
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.sm,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                        {schedule?.open || '09:00'}
                      </Text>
                    </TouchableOpacity>

                    <Text variant="body" color="muted">-</Text>

                    <TouchableOpacity
                      onPress={() => {
                        setSelectedDay(day.key);
                        setTimeType('close');
                      }}
                      style={{
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.sm,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                        {schedule?.close || '18:00'}
                      </Text>
                    </TouchableOpacity>

                    {/* Copy to All Button */}
                    <TouchableOpacity
                      onPress={() => handleCopyToAll(day.key)}
                      style={{
                        padding: theme.spacing.sm,
                      }}
                    >
                      <Copy size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text variant="body" color="muted" style={{ marginRight: theme.spacing.md }}>
                    Closed
                  </Text>
                )}

                {/* Toggle Switch */}
                <Switch
                  value={isOpen}
                  onValueChange={(value: boolean) => updateDaySchedule(day.key, { is_open: value })}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Info Box */}
      <View style={{
        backgroundColor: theme.colors.primary + '10',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
        gap: theme.spacing.sm,
      }}>
        <Text variant="bodySmall" style={{ lineHeight: 20 }}>
          💡 <Text style={{ fontWeight: '600' }}>Tips:</Text>
        </Text>
        <Text variant="bodySmall" style={{ lineHeight: 20 }}>
          • Tap the <Copy size={12} color={theme.colors.text.secondary} /> icon to copy hours to all days
        </Text>
        <Text variant="bodySmall" style={{ lineHeight: 20 }}>
          • Use "Set Standard Hours" for typical Mon-Fri 9-6 schedule
        </Text>
        <Text variant="bodySmall" style={{ lineHeight: 20 }}>
          • Toggle off days when you're closed
        </Text>
      </View>

      {/* Accepts Pickup & Walk-in */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}>
        <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
          Customer Service Options
        </Text>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <View style={{ flex: 1 }}>
            <Text variant="body">Accept Item Pickups</Text>
            <Text variant="caption" color="muted">
              Customers can pickup items from your shop
            </Text>
          </View>
          <Switch
            value={data.accepts_pickup ?? true}
            onValueChange={(value: boolean) => updateData('accepts_pickup', value)}
          />
        </View>

        <View style={{
          height: 1,
          backgroundColor: theme.colors.border,
        }} />

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <View style={{ flex: 1 }}>
            <Text variant="body">Accept Walk-in Customers</Text>
            <Text variant="caption" color="muted">
              Customers can visit and shop in-store
            </Text>
          </View>
          <Switch
            value={data.accepts_walkin ?? true}
            onValueChange={(value: boolean) => updateData('accepts_walkin', value)}
          />
        </View>
      </View>

      {/* Time Picker Modal */}
      {selectedDay && (
        <TimePickerModal
          visible={true}
          title={`Select ${timeType === 'open' ? 'Opening' : 'Closing'} Time`}
          initialTime={
            timeType === 'open'
              ? businessHours[selectedDay]?.open || '09:00'
              : businessHours[selectedDay]?.close || '18:00'
          }
          onConfirm={handleTimeSelect}
          onCancel={() => setSelectedDay(null)}
        />
      )}
    </View>
  );
});

Step3BusinessHours.displayName = 'Step3BusinessHours';

export default Step3BusinessHours;

