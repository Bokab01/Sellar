import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Shield, CheckCircle, Award, Star, Crown } from 'lucide-react-native';

interface VerifiedBadgeProps {
  verificationLevel?: 'basic' | 'identity' | 'business' | 'premium';
  size?: 'xs' | 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'minimal';
  showIcon?: boolean;
  showText?: boolean;
  onPress?: () => void;
  style?: any;
  // Trust score support
  trustScore?: number;
  showTrustScore?: boolean;
}

export function NewVerificationBadge({
  verificationLevel = 'basic',
  size = 'medium',
  variant = 'default',
  showIcon = true,
  showText = true,
  onPress,
  style,
  trustScore,
  showTrustScore = false,
}: VerifiedBadgeProps) {
  const { theme } = useTheme();

  const getSizeConfig = () => {
    switch (size) {
      case 'xs':
        return {
          iconSize: 10,
          fontSize: 8,
          paddingHorizontal: -1,
          paddingVertical: 0,
          gap: 1,
          letterSpacing: 0.9,
        };
      case 'small':
        return {
          iconSize: 12,
          fontSize: 10,
          padding: 4,
          gap: 2,
        };
      case 'large':
        return {
          iconSize: 20,
          fontSize: 14,
          padding: 8,
          gap: 6,
        };
      default:
        return {
          iconSize: 16,
          fontSize: 12,
          padding: 6,
          gap: 4,
        };
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    if (score >= 40) return theme.colors.info;
    return theme.colors.error;
  };

  const getVerificationConfig = () => {
    // If showing trust score, use trust score styling
    if (showTrustScore && trustScore !== undefined) {
      const trustColor = getTrustScoreColor(trustScore);
      return {
        icon: Award,
        text: `${trustScore}`,
        backgroundColor: trustColor + '15',
        borderColor: trustColor + '40',
        textColor: trustColor,
        iconColor: trustColor,
      };
    }

    // Otherwise use verification level styling
    switch (verificationLevel) {
      case 'premium':
        return {
          icon: Crown,
          text: 'PREMIUM VERIFIED',
          backgroundColor: theme.colors.warning + '15',
          borderColor: theme.colors.warning + '40',
          textColor: theme.colors.warning,
          iconColor: theme.colors.warning,
        };
      case 'business':
        return {
          icon: Award,
          text: 'BUSINESS VERIFIED',
          backgroundColor: theme.colors.primary + '15',
          borderColor: theme.colors.primary + '40',
          textColor: theme.colors.primary,
          iconColor: theme.colors.primary,
        };
      case 'identity':
        return {
          icon: Shield,
          text: 'ID VERIFIED',
          backgroundColor: theme.colors.success + '15',
          borderColor: theme.colors.success + '40',
          textColor: theme.colors.success,
          iconColor: theme.colors.success,
        };
      default:
        return {
          icon: CheckCircle,
          text: 'VERIFIED',
          backgroundColor: theme.colors.success + '15',
          borderColor: theme.colors.success + '40',
          textColor: theme.colors.success,
          iconColor: theme.colors.success,
        };
    }
  };

  const getVariantConfig = () => {
    // Get size-specific padding
    const getSizePadding = () => {
      switch (size) {
        case 'xs':
          return {
            paddingHorizontal: 2,
            paddingVertical: 0,
          };
        case 'small':
          return {
            paddingHorizontal: 6,
            paddingVertical: 2,
          };
        case 'large':
          return {
            paddingHorizontal: 12,
            paddingVertical: 6,
          };
        default:
          return {
            paddingHorizontal: 8,
            paddingVertical: 4,
          };
      }
    };

    const sizePadding = getSizePadding();

    switch (variant) {
      case 'compact':
        return {
          borderRadius: theme.borderRadius.sm,
          ...sizePadding,
        };
      case 'minimal':
        return {
          borderRadius: theme.borderRadius.xs,
          paddingHorizontal: Math.max(2, sizePadding.paddingHorizontal - 2),
          paddingVertical: Math.max(0, sizePadding.paddingVertical - 1),
        };
      default:
        return {
          borderRadius: theme.borderRadius.md,
          ...sizePadding,
        };
    }
  };

  const sizeConfig = getSizeConfig();
  const verificationConfig = getVerificationConfig();
  const variantConfig = getVariantConfig();
  const Icon = verificationConfig.icon;

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: verificationConfig.backgroundColor,
          borderWidth: 1,
          borderColor: verificationConfig.borderColor,
          borderRadius: variantConfig.borderRadius,
          paddingHorizontal: variantConfig.paddingHorizontal,
          paddingVertical: variantConfig.paddingVertical,
          gap: sizeConfig.gap,
        },
        style,
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {showIcon && (
        <Icon
          size={sizeConfig.iconSize}
          color={verificationConfig.iconColor}
          fill={verificationConfig.iconColor}
        />
      )}
      
      {showText && (
        <Text
          variant="caption"
          style={{
            color: verificationConfig.textColor,
            fontSize: sizeConfig.fontSize,
            fontWeight: '700',
            letterSpacing: sizeConfig.letterSpacing || 0.5,
          }}
        >
          {verificationConfig.text}
        </Text>
      )}
    </Container>
  );
}

// Convenience components for different verification levels
export function BasicVerificationBadge(props: Omit<VerifiedBadgeProps, 'verificationLevel'>) {
  return <NewVerificationBadge {...props} verificationLevel="basic" />;
}

export function IdentityVerificationBadge(props: Omit<VerifiedBadgeProps, 'verificationLevel'>) {
  return <NewVerificationBadge {...props} verificationLevel="identity" />;
}

export function BusinessVerificationBadge(props: Omit<VerifiedBadgeProps, 'verificationLevel'>) {
  return <NewVerificationBadge {...props} verificationLevel="business" />;
}

export function PremiumVerificationBadge(props: Omit<VerifiedBadgeProps, 'verificationLevel'>) {
  return <NewVerificationBadge {...props} verificationLevel="premium" />;
}

// Compact version for small spaces
export function CompactNewVerificationBadge(props: Omit<VerifiedBadgeProps, 'variant' | 'size'>) {
  return <NewVerificationBadge {...props} variant="compact" size="small" />;
}

// Extra small version for very tight spaces
export function ExtraSmallIdentityVerificationBadge(props: Omit<VerifiedBadgeProps, 'verificationLevel' | 'size'>) {
  return <NewVerificationBadge {...props} verificationLevel="identity" size="xs" />;
}

// Minimal version for very small spaces
export function MinimalNewVerificationBadge(props: Omit<VerifiedBadgeProps, 'variant' | 'size'>) {
  return <NewVerificationBadge {...props} variant="minimal" size="small" />;
}

// Trust score badge components
export function TrustScoreBadge(props: Omit<VerifiedBadgeProps, 'verificationLevel' | 'showTrustScore'>) {
  return <NewVerificationBadge {...props} showTrustScore={true} />;
}

export function ExtraSmallTrustScoreBadge(props: Omit<VerifiedBadgeProps, 'verificationLevel' | 'showTrustScore' | 'size'>) {
  return <NewVerificationBadge {...props} showTrustScore={true} size="xs" />;
}
