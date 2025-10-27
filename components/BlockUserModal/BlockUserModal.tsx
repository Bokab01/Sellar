import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Input, AppModal } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { Check } from 'lucide-react-native';

export interface BlockReason {
  value: 'spam' | 'harassment' | 'inappropriate' | 'other';
  label: string;
  description: string;
}

export const BLOCK_REASONS: BlockReason[] = [
  {
    value: 'spam',
    label: 'Spam or Scam',
    description: 'Unwanted promotional content or fraudulent activity',
  },
  {
    value: 'harassment',
    label: 'Harassment or Bullying',
    description: 'Abusive, threatening, or intimidating behavior',
  },
  {
    value: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Offensive or unsuitable material',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Another reason not listed above',
  },
];

interface BlockUserModalProps {
  visible: boolean;
  userName: string;
  onClose: () => void;
  onConfirm: (reason?: string, notes?: string) => void;
  loading?: boolean;
}

export function BlockUserModal({
  visible,
  userName,
  onClose,
  onConfirm,
  loading = false,
}: BlockUserModalProps) {
  const { theme } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(selectedReason, notes);
    // Reset state
    setSelectedReason(undefined);
    setNotes('');
  };

  const handleClose = () => {
    onClose();
    // Reset state after animation
    setTimeout(() => {
      setSelectedReason(undefined);
      setNotes('');
    }, 300);
  };

  return (
    <AppModal visible={visible} onClose={handleClose} position="center">
      <View style={styles.container}>
        {/* Header */}
        <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
          Block {userName}?
        </Text>
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
          They won't be able to message you, see your posts, or interact with your content.
        </Text>

        {/* Reason Selection */}
        <Text variant="bodySmall" style={{ marginBottom: theme.spacing.sm, fontWeight: '600' }}>
          Select a reason (optional):
        </Text>

        <ScrollView style={{ maxHeight: 280, marginBottom: theme.spacing.md }}>
          {BLOCK_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              style={[
                styles.reasonItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: selectedReason === reason.value ? theme.colors.primary : theme.colors.border,
                  borderWidth: selectedReason === reason.value ? 2 : 1,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.sm,
                },
              ]}
              onPress={() => setSelectedReason(reason.value)}
              activeOpacity={0.7}
            >
              <View style={styles.reasonContent}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', marginBottom: 2 }}>
                    {reason.label}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {reason.description}
                  </Text>
                </View>
                {selectedReason === reason.value && (
                  <Check size={20} color={theme.colors.primary} strokeWidth={3} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Additional Notes */}
        {selectedReason && (
          <View style={{ marginBottom: theme.spacing.md }}>
            <Input
              placeholder="Additional notes (optional, private)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            variant="outline"
            onPress={handleClose}
            style={{ flex: 1, marginRight: theme.spacing.sm }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleConfirm}
            style={{ flex: 1, backgroundColor: theme.colors.destructive }}
            loading={loading}
            disabled={loading}
          >
            Block
          </Button>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  reasonItem: {
    overflow: 'hidden',
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});

