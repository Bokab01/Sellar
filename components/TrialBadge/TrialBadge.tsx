import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Clock, Sparkles, Crown, Zap, TrendingUp } from 'lucide-react-native';
import { AppModal } from '@/components/Modal/Modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../Button/Button';

interface TrialBadgeProps {
  trialEndsAt: string;
  onUpgradePress?: () => void;
  variant?: 'compact' | 'full';
  style?: any;
}

export function TrialBadge({ 
  trialEndsAt, 
  onUpgradePress,
  variant = 'compact',
  style 
}: TrialBadgeProps) {
  const { theme } = useTheme();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { daysRemaining, isEndingSoon } = useMemo(() => {
    const now = new Date();
    const endDate = new Date(trialEndsAt);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      daysRemaining: Math.max(0, diffDays),
      isEndingSoon: diffDays <= 3,
    };
  }, [trialEndsAt]);

  const handleUpgradePress = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmUpgrade = () => {
    setShowConfirmModal(false);
    if (onUpgradePress) {
      onUpgradePress();
    }
  };

  if (variant === 'compact') {
    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isEndingSoon ? theme.colors.warning + '15' : theme.colors.primary + '15',
            borderColor: isEndingSoon ? theme.colors.warning : theme.colors.primary,
            borderWidth: 1,
            borderRadius: theme.borderRadius.full,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            gap: theme.spacing.xs,
          },
          style,
        ]}
      >
        <Sparkles 
          size={14} 
          color={isEndingSoon ? theme.colors.warning : theme.colors.primary} 
        />
        <Text
          variant="caption"
          style={{
            color: isEndingSoon ? theme.colors.warning : theme.colors.primary,
            fontWeight: '600',
          }}
        >
          Free Trial · {daysRemaining}d left
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: isEndingSoon 
            ? theme.colors.warning + '10' 
            : theme.colors.primary + '10',
          borderColor: isEndingSoon ? theme.colors.warning : theme.colors.primary,
          borderWidth: 1,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.borderRadius.full,
            backgroundColor: isEndingSoon 
              ? theme.colors.warning + '20' 
              : theme.colors.primary + '20',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isEndingSoon ? (
            <Clock size={20} color={theme.colors.warning} />
          ) : (
            <Sparkles size={20} color={theme.colors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            variant="h4"
            style={{
              color: isEndingSoon ? theme.colors.warning : theme.colors.primary,
            }}
          >
            {isEndingSoon ? 'Trial Ending Soon' : 'Free Trial Active'}
          </Text>
          <Text variant="caption" color="secondary">
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
          </Text>
        </View>
      </View>

      {/* Message */}
      <Text variant="body" style={{ lineHeight: 20 }}>
        {isEndingSoon
          ? `Your trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Upgrade now to keep your premium features!`
          : `You're enjoying all Sellar Pro features. Your trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}.`}
      </Text>

      {/* Upgrade Button */}
      {onUpgradePress && (
        <TouchableOpacity
          onPress={handleUpgradePress}
          style={{
            backgroundColor: isEndingSoon ? theme.colors.warning : theme.colors.primary,
            borderRadius: theme.borderRadius.md,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            alignItems: 'center',
          }}
        >
          <Text
            variant="button"
            style={{
              color: isEndingSoon 
                ? theme.colors.warningForeground 
                : theme.colors.primaryForeground,
              fontWeight: '600',
            }}
          >
            {isEndingSoon ? 'Upgrade Now' : 'Upgrade to Keep Features'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Confirmation Modal */}
      <AppModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Upgrade to Sellar Pro"
        size="md"
        position="bottom"
      >
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.surface }}>
        <View style={{ gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg }}>
          {/* Icon */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.primary + '15',
              justifyContent: 'center',
              alignItems: 'center',
              alignSelf: 'center',
            }}
          >
            <Crown size={32} color={theme.colors.primary} />
          </View>

          {/* Message */}
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="h3" style={{ textAlign: 'center' }}>
              Keep Your Pro Features
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
              Convert your free trial to a paid subscription to continue enjoying all Sellar Pro benefits.
            </Text>
          </View>

          {/* Features List */}
          <View style={{ gap: theme.spacing.sm }}>
            {[
              { icon: Zap, text: 'Auto-refresh every 2 hours' },
              { icon: TrendingUp, text: 'Unlimited listings' },
              { icon: Crown, text: 'Priority support, video uploads, analytics & more' },

            ].map((feature, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  backgroundColor: theme.colors.surfaceVariant,
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.md,
                }}
              >
                <feature.icon size={20} color={theme.colors.primary} />
                <Text variant="body" style={{ flex: 1 }}>
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Trial Info */}
          <View
            style={{
              backgroundColor: isEndingSoon 
                ? theme.colors.warning + '10' 
                : theme.colors.info + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
              borderWidth: 1,
              borderColor: isEndingSoon ? theme.colors.warning + '30' : theme.colors.info + '30',
            }}
          >
            <Text variant="bodySmall" style={{ textAlign: 'center', lineHeight: 20 }}>
              {isEndingSoon 
                ? `⏰ Your trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}!`
                : `You have ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left in your trial`}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              variant="primary"
              onPress={handleConfirmUpgrade}
              style={{
                width: '100%',
              }}
            >
              Continue to Payment
            </Button>

            <Button
                variant="outline"
                onPress={() => setShowConfirmModal(false)}
                style={{
                  width: '100%',
                }}
              >
                Maybe Later
            </Button>
          </View>
        </View>
        </SafeAreaView>
      </AppModal>
    </View>
  );
}
