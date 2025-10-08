import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { Clock, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';

/**
 * TrialEndingModal
 * 
 * Automatically shows a modal when user's trial is ending soon (3 days or less)
 * Encourages users to upgrade to paid subscription
 */
export function TrialEndingModal() {
  const { theme } = useTheme();
  const { isOnTrial, trialEndsAt } = useMonetizationStore();
  const [showModal, setShowModal] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    if (!isOnTrial || !trialEndsAt) {
      setShowModal(false);
      return;
    }

    const now = new Date();
    const endDate = new Date(trialEndsAt);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setDaysRemaining(Math.max(0, diffDays));

    // Show modal if 3 days or less remaining
    // Only show once per session using sessionStorage-like pattern
    const hasShownToday = sessionStorage.getItem('trial_modal_shown_today');
    const today = new Date().toDateString();
    
    if (diffDays <= 3 && diffDays > 0 && hasShownToday !== today) {
      setShowModal(true);
      sessionStorage.setItem('trial_modal_shown_today', today);
    }
  }, [isOnTrial, trialEndsAt]);

  const handleUpgrade = () => {
    setShowModal(false);
    router.push('/subscription-plans');
  };

  const handleRemindLater = () => {
    setShowModal(false);
  };

  if (!isOnTrial || !trialEndsAt) {
    return null;
  }

  return (
    <AppModal
      visible={showModal}
      onClose={handleRemindLater}
      title="Your Trial is Ending Soon"
      size="md"
      position="center"
      primaryAction={{
        text: 'Upgrade Now',
        onPress: handleUpgrade,
      }}
      secondaryAction={{
        text: 'Remind Me Later',
        onPress: handleRemindLater,
      }}
    >
      <View style={{ gap: theme.spacing.lg, alignItems: 'center' }}>
        {/* Icon */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.warning + '20',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Clock size={40} color={theme.colors.warning} />
        </View>

        {/* Message */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text
            variant="h3"
            style={{
              textAlign: 'center',
              color: theme.colors.warning,
              fontWeight: '600',
            }}
          >
            {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Left
          </Text>
          
          <Text
            variant="body"
            style={{
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Your free trial ends in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. 
            Upgrade now to keep enjoying all Sellar Pro features!
          </Text>
        </View>

        {/* Features Reminder */}
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.lg,
            width: '100%',
            gap: theme.spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Sparkles size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              What you'll keep with Sellar Pro:
            </Text>
          </View>
          
          <View style={{ gap: theme.spacing.xs, paddingLeft: theme.spacing.lg }}>
            {[
              'Video uploads for listings',
              'Auto-refresh every 2 hours',
              'Advanced analytics',
              'Priority support',
              'Unlimited active listings',
            ].map((feature, index) => (
              <Text key={index} variant="caption" color="secondary">
                • {feature}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </AppModal>
  );
}

// Simple session storage implementation for React Native
const sessionStorage = {
  storage: new Map<string, string>(),
  
  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  },
  
  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  },
  
  removeItem(key: string): void {
    this.storage.delete(key);
  },
  
  clear(): void {
    this.storage.clear();
  },
};
