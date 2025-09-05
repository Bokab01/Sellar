import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Input, Button, AppModal } from '@/components';
import { Picker } from '@react-native-picker/picker';
import { useCreateSupportTicket, SupportTicket } from '@/hooks/useSupport';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

interface CreateTicketModalProps {
  visible: boolean;
  onClose: () => void;
  onTicketCreated?: (ticket: SupportTicket) => void;
}

const CATEGORIES = [
  { value: 'account', label: 'Account Issues' },
  { value: 'billing', label: 'Billing & Credits' },
  { value: 'technical', label: 'Technical Problems' },
  { value: 'listing', label: 'Listing Issues' },
  { value: 'chat', label: 'Chat & Messages' },
  { value: 'safety', label: 'Safety & Security' },
  { value: 'verification', label: 'Account Verification' },
  { value: 'payments', label: 'Payments' },
  { value: 'features', label: 'App Features' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
] as const;

const PRIORITIES = [
  { value: 'low', label: 'Low - General inquiry' },
  { value: 'medium', label: 'Medium - Standard issue' },
  { value: 'high', label: 'High - Urgent issue' },
  { value: 'urgent', label: 'Urgent - Critical problem' },
] as const;

export function CreateTicketModal({ visible, onClose, onTicketCreated }: CreateTicketModalProps) {
  const { theme } = useTheme();
  const { createTicket, loading } = useCreateSupportTicket();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('other');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setCategory('other');
    setPriority('medium');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getDeviceInfo = async () => {
    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        deviceName: Device.deviceName,
        deviceType: Device.deviceType,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        appVersion: Application.nativeApplicationVersion,
        buildVersion: Application.nativeBuildVersion,
      } as any;

      return deviceInfo;
    } catch (error) {
      console.error('Error getting device info:', error);
      return {};
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject for your ticket.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your issue.');
      return;
    }

    if (subject.length < 5) {
      Alert.alert('Error', 'Subject must be at least 5 characters long.');
      return;
    }

    if (description.length < 10) {
      Alert.alert('Error', 'Description must be at least 10 characters long.');
      return;
    }

    try {
      const deviceInfo = await getDeviceInfo();
      const userAgent = `Sellar Mobile App/${deviceInfo.appVersion} (${deviceInfo.platform} ${deviceInfo.osVersion})`;

      const ticket = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        user_agent: userAgent,
        app_version: deviceInfo.appVersion || '1.0.0',
        device_info: deviceInfo,
      });

      Alert.alert(
        'Ticket Created',
        `Your support ticket ${ticket.ticket_number} has been created successfully. We'll respond within 24 hours.`,
        [{ text: 'OK', onPress: handleClose }]
      );

      onTicketCreated?.(ticket);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to create support ticket. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <AppModal
      visible={visible}
      position="top"
      onClose={handleClose}
      title="Create Support Ticket"
      size="full"
      primaryAction={{
        text: 'Create Ticket',
        onPress: handleSubmit,
        loading,
      }}
      secondaryAction={{
        text: 'Cancel',
        onPress: handleClose,
      }}
    >
      <ScrollView 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: theme.spacing.md }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary">
            Describe your issue and we&apos;ll help you resolve it as quickly as possible.
          </Text>

          {/* Subject */}
          <Input
            label="Subject"
            placeholder="Brief description of your issue"
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
          />

          {/* Category */}
          <View>
            <Text variant="bodySmall" style={{ 
              marginBottom: theme.spacing.sm,
              fontWeight: '500',
              color: theme.colors.text.primary,
            }}>
              Category
            </Text>
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={{
                  color: theme.colors.text.primary,
                  backgroundColor: 'transparent',
                }}
              >
                {CATEGORIES.map((cat) => (
                  <Picker.Item
                    key={cat.value}
                    label={cat.label}
                    value={cat.value}
                    color={theme.colors.text.primary}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Priority */}
          <View>
            <Text variant="bodySmall" style={{ 
              marginBottom: theme.spacing.sm,
              fontWeight: '500',
              color: theme.colors.text.primary,
            }}>
              Priority
            </Text>
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Picker
                selectedValue={priority}
                onValueChange={setPriority}
                style={{
                  color: theme.colors.text.primary,
                  backgroundColor: 'transparent',
                }}
              >
                {PRIORITIES.map((pri) => (
                  <Picker.Item
                    key={pri.value}
                    label={pri.label}
                    value={pri.value}
                    color={theme.colors.text.primary}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Description */}
          <Input
            variant="multiline"
            label="Description"
            placeholder="Please provide detailed information about your issue..."
            value={description}
            onChangeText={setDescription}
            style={{ minHeight: 80 }}
            maxLength={5000}
          />

          {/* Help Text */}
          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ 
              color: theme.colors.primary, 
              textAlign: 'center',
              lineHeight: 18,
            }}>
              💡 Include steps to reproduce the issue, error messages, and any relevant details to help us assist you better.
            </Text>
          </View>

          {/* Response Time Info */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center' }}>
              📧 We&apos;ll respond to your registered email address within 24 hours
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}
