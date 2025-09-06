import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  Button,
  Modal,
  LinkButton,
} from '@/components';
import { AlertTriangle, Shield, HelpCircle } from 'lucide-react-native';
import { getModerationErrorMessage } from '@/hooks/useContentModeration';

interface ModerationErrorModalProps {
  visible: boolean;
  onClose: () => void;
  reasons: string[];
  canAppeal?: boolean;
  onAppeal?: () => void;
}

export function ModerationErrorModal({
  visible,
  onClose,
  reasons,
  canAppeal = false,
  onAppeal,
}: ModerationErrorModalProps) {
  const { theme } = useTheme();

  const mainMessage = getModerationErrorMessage(reasons);
  
  const getIconAndColor = () => {
    const hasIllegal = reasons.some(r => r.includes('illegal') || r.includes('violence'));
    const hasAdult = reasons.some(r => r.includes('adult'));
    
    if (hasIllegal) {
      return { icon: AlertTriangle, color: theme.colors.error };
    } else if (hasAdult) {
      return { icon: Shield, color: theme.colors.warning };
    } else {
      return { icon: HelpCircle, color: theme.colors.primary };
    }
  };

  const { icon: Icon, color } = getIconAndColor();

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={{ padding: theme.spacing.xl }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <View
            style={{
              backgroundColor: `${color}20`,
              borderRadius: 50,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Icon size={48} color={color} />
          </View>
          <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
            Content Not Approved
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            {mainMessage}
          </Text>
        </View>

        {/* Details */}
        <ScrollView style={{ maxHeight: 200, marginBottom: theme.spacing.xl }}>
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
            }}
          >
            <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              Specific Issues Found:
            </Text>
            {reasons.map((reason, index) => (
              <View key={index} style={{ flexDirection: 'row', marginBottom: theme.spacing.xs }}>
                <Text variant="bodySmall" color="muted">
                  • {reason}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Guidelines */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.xl,
          }}
        >
          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
            What you can do:
          </Text>
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
            • Review our community guidelines
          </Text>
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
            • Edit your listing to remove prohibited content
          </Text>
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
            • Contact support if you believe this is an error
          </Text>
          {canAppeal && (
            <Text variant="bodySmall" color="secondary">
              • Submit an appeal for manual review
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={{ gap: theme.spacing.md }}>
          {canAppeal && onAppeal && (
            <Button
              variant="secondary"
              onPress={onAppeal}
              fullWidth
            >
              Appeal Decision
            </Button>
          )}
          
          <Button
            variant="primary"
            onPress={onClose}
            fullWidth
          >
            I Understand
          </Button>
        </View>

        {/* Help Links */}
        <View style={{ alignItems: 'center', marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
          <LinkButton
            variant="muted"
            href="/community-guidelines"
          >
            Community Guidelines
          </LinkButton>
          <LinkButton
            variant="muted"
            href="/support"
          >
            Contact Support
          </LinkButton>
        </View>
      </View>
    </Modal>
  );
}
