import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { Picker } from '@react-native-picker/picker';
import { useCreateSupportTicket, SupportTicket } from '@/hooks/useSupport';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Send } from 'lucide-react-native';

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
  { value: 'high', label: 'High - Urgent problem' },
  { value: 'urgent', label: 'Urgent - Critical problem' },
] as const;

export default function CreateSupportTicketScreen() {
  const { theme } = useTheme();
  const { createTicket, loading } = useCreateSupportTicket();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('other');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');

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
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to create support ticket. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Create Support Ticket"
        showBackButton
        onBackPress={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing['2xl'],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.xl,
              borderWidth: 1,
              borderColor: theme.colors.primary + '20',
            }}
          >
            <Text variant="bodySmall" color="secondary" style={{ lineHeight: 20 }}>
              Our support team typically responds within 24 hours. For urgent issues, please select "Urgent" priority.
            </Text>
          </View>

          {/* Subject */}
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text variant="body" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
              Subject <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
            <Input
              placeholder="Brief description of your issue"
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />
            <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
              {subject.length}/100 characters
            </Text>
          </View>

          {/* Category */}
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text variant="body" style={{ marginBottom: theme.spacing.sm, fontWeight: '600' }}>
              Category <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                overflow: 'hidden',
              }}
            >
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue as SupportTicket['category'])}
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text.primary,
                }}
              >
                {CATEGORIES.map((cat) => (
                  <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Priority */}
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text variant="body" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
              Priority <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                overflow: 'hidden',
              }}
            >
              <Picker
                selectedValue={priority}
                onValueChange={(itemValue) => setPriority(itemValue as SupportTicket['priority'])}
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text.primary,
                }}
              >
                {PRIORITIES.map((pri) => (
                  <Picker.Item key={pri.value} label={pri.label} value={pri.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text variant="body" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
              Description <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
            <Input
              placeholder="Please describe your issue in detail..."
              value={description}
              autoExpand
              onChangeText={setDescription}
              multiline
              numberOfLines={8}
              maxLength={500}
              style={{
                minHeight: 100,
                textAlignVertical: 'top',
                paddingTop: theme.spacing.md,
              }}
            />
            <View style={{ marginTop: -theme.spacing.xs }}>
              <Text variant="caption" color="muted" style={{ marginBottom: theme.spacing.xs, marginTop: theme.spacing.xs }}>
                {description.length}/500 characters
              </Text>
              <Text variant="caption" color="muted">
                Include as much detail as possible to help us resolve your issue faster.
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !subject.trim() || !description.trim()}
            leftIcon={<Send size={18} color={theme.colors.primaryForeground} />}
            style={{
              paddingVertical: theme.spacing.md,
            }}
          >
            Submit Ticket
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

