import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useBlockUser, BLOCK_REASONS } from '@/hooks/useBlockUser';
import { useBlockStore } from '@/store/useBlockStore';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Avatar,
  Button,
  Input,
  Toast,
  AppModal,
} from '@/components';
import { ShieldAlert, Check } from 'lucide-react-native';

export default function BlockUserScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    userId: string;
    userName: string;
    userAvatar?: string;
  }>();

  const { blockUser, loading } = useBlockUser();
  const { addBlockedUser } = useBlockStore();
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!params.userId) {
      setErrorMessage('User information is missing');
      setShowErrorModal(true);
      return;
    }

    const result = await blockUser(params.userId, selectedReason, notes);

    if (result.success) {
      addBlockedUser(params.userId);
      setToastMessage('User blocked successfully');
      setShowToast(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } else {
      setErrorMessage(result.error || 'Failed to block user');
      setShowErrorModal(true);
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Block User"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 3,
        }}
      >
        {/* User Info */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginBottom: theme.spacing.xl,
          }}
        >
          <Avatar
            name={params.userName || 'User'}
            source={params.userAvatar}
            size="md"
          />
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: 4 }}>
              {params.userName || 'User'}
            </Text>
            <Text variant="bodySmall" color="secondary">
              You're about to block this user
            </Text>
          </View>
        </View>

        {/* Warning Message */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.destructive + '15',
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.xl,
          }}
        >
          <ShieldAlert size={20} color={theme.colors.destructive} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={{ color: theme.colors.destructive, lineHeight: 20 }}>
              They won't be able to message you, see your posts, or interact with your content.
            </Text>
          </View>
        </View>

        {/* Reason Selection */}
        <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
          Select a reason (optional)
        </Text>

        <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          {BLOCK_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: selectedReason === reason.value ? 2 : 1,
                borderColor: selectedReason === reason.value ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
              }}
              onPress={() => setSelectedReason(reason.value)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    {reason.label}
                  </Text>
                </View>
                {selectedReason === reason.value && (
                  <Check size={20} color={theme.colors.primary} strokeWidth={3} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Additional Notes */}
        <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
          Additional notes (optional)
        </Text>
        <Input
          placeholder="Add any additional information..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          maxLength={500}
          style={{ marginBottom: theme.spacing.xl }}
        />

        {/* Submit Button */}
        <Button
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={{ backgroundColor: theme.colors.destructive }}
        >
          Block User
        </Button>

        {/* Cancel Button */}
        <Button
          variant="outline"
          onPress={() => router.back()}
          disabled={loading}
          style={{ marginTop: theme.spacing.md }}
        >
          Cancel
        </Button>
      </ScrollView>

      {/* Error Modal */}
      <AppModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        position="center"
      >
        <View style={{ padding: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
            {errorMessage}
          </Text>
          <Button onPress={() => setShowErrorModal(false)}>
            OK
          </Button>
        </View>
      </AppModal>

      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}

