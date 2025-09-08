import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components';

export interface ProfessionalBadgeProps {
  text: string;
  icon?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

export function ProfessionalBadge({ 
  text, 
  icon, 
  variant = 'primary', 
  size = 'md',
  style 
}: ProfessionalBadgeProps) {
  const { theme } = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          background: theme.colors.success + '15',
          border: theme.colors.success + '30',
          text: theme.colors.success,
        };
      case 'warning':
        return {
          background: theme.colors.warning + '15',
          border: theme.colors.warning + '30',
          text: theme.colors.warning,
        };
      case 'error':
        return {
          background: theme.colors.error + '15',
          border: theme.colors.error + '30',
          text: theme.colors.error,
        };
      case 'info':
        return {
          background: theme.colors.info + '15',
          border: theme.colors.info + '30',
          text: theme.colors.info,
        };
      case 'neutral':
        return {
          background: theme.colors.text.secondary + '15',
          border: theme.colors.text.secondary + '30',
          text: theme.colors.text.secondary,
        };
      default: // primary
        return {
          background: theme.colors.primary + '15',
          border: theme.colors.primary + '30',
          text: theme.colors.primary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          fontSize: 12,
          iconSize: 12,
        };
      case 'lg':
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          fontSize: 16,
          iconSize: 16,
        };
      default: // md
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          fontSize: 14,
          iconSize: 14,
        };
    }
  };

  const colors = getVariantColors();
  const sizeStyles = getSizeStyles();

  const styles = StyleSheet.create({
    badge: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      paddingVertical: sizeStyles.paddingVertical,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      alignSelf: 'flex-start',
    },
    text: {
      color: colors.text,
      fontWeight: '600',
      fontSize: sizeStyles.fontSize,
    },
    icon: {
      fontSize: sizeStyles.iconSize,
      color: colors.text,
    },
  });

  return (
    <View style={[styles.badge, style]}>
      {icon && (
        <Text style={styles.icon}>
          {icon}
        </Text>
      )}
      <Text style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

// Preset badge components for common use cases
export function ConditionBadge({ condition, size = 'md' }: { condition: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <ProfessionalBadge
      text={condition?.replace('_', ' ') || 'Unknown'}
      icon="🔍"
      variant="primary"
      size={size}
    />
  );
}

export function OffersBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <ProfessionalBadge
      text="Accepts Offers"
      icon="💰"
      variant="success"
      size={size}
    />
  );
}

export function BoostBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <ProfessionalBadge
      text="Boosted"
      icon="⚡"
      variant="warning"
      size={size}
    />
  );
}

export function VerifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <ProfessionalBadge
      text="Verified Seller"
      icon="✅"
      variant="success"
      size={size}
    />
  );
}

export function QuantityBadge({ quantity, size = 'md' }: { quantity: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <ProfessionalBadge
      text={`${quantity} available`}
      icon="📦"
      variant="info"
      size={size}
    />
  );
}
