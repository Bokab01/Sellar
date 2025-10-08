import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Clock, Sparkles } from 'lucide-react-native';

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
          onPress={onUpgradePress}
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
    </View>
  );
}
