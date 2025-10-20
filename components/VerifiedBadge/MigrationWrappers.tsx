import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { 
  NewVerificationBadge, 
  IdentityVerificationBadge, 
  BusinessVerificationBadge,
  TrustScoreBadge,
  ExtraSmallTrustScoreBadge
} from './VerifiedBadge';
import { UserVerificationStatus } from '@/hooks/useVerification';
import { getTrustScoreColor, getTrustScoreLabel } from '@/lib/verificationService';

// Legacy interface for backward compatibility
interface LegacyVerificationBadgeProps {
  status: UserVerificationStatus;
  size?: 'small' | 'medium' | 'large';
  showTrustScore?: boolean;
  showAllBadges?: boolean;
  onPress?: () => void;
  style?: any;
}

// Migration wrapper for the old VerificationBadge component
export function LegacyVerificationBadge({
  status,
  size = 'medium',
  showTrustScore = true,
  showAllBadges = false,
  onPress,
  style,
}: LegacyVerificationBadgeProps) {
  const { theme } = useTheme();

  // Convert legacy size to new size system
  const getNewSize = () => {
    switch (size) {
      case 'small': return 'small' as const;
      case 'large': return 'large' as const;
      default: return 'medium' as const;
    }
  };

  // Get the highest priority verification badge
  const getHighestVerificationBadge = () => {
    if (status.business_verified) return 'business';
    if (status.identity_verified) return 'identity';
    if (status.email_verified || status.phone_verified) return 'basic';
    return null;
  };

  const highestBadge = getHighestVerificationBadge();
  const newSize = getNewSize();

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }, style]}>
      {/* Trust Score Badge */}
      {showTrustScore && (status.trust_score || 0) > 0 && (
        <TrustScoreBadge
          trustScore={status.trust_score}
          size={newSize}
          onPress={onPress}
        />
      )}

      {/* Verification Badge */}
      {highestBadge && (
        <>
          {highestBadge === 'business' && (
            <BusinessVerificationBadge
              size={newSize}
              onPress={onPress}
            />
          )}
          {highestBadge === 'identity' && (
            <IdentityVerificationBadge
              size={newSize}
              onPress={onPress}
            />
          )}
          {highestBadge === 'basic' && (
            <NewVerificationBadge
              verificationLevel="basic"
              size={newSize}
              onPress={onPress}
            />
          )}
        </>
      )}
    </View>
  );
}

// Legacy CompactVerificationBadge wrapper
export function LegacyCompactVerificationBadge({
  status,
  size = 'small',
  onPress,
  style,
}: Omit<LegacyVerificationBadgeProps, 'showTrustScore' | 'showAllBadges'>) {
  const { theme } = useTheme();

  if (!status.is_verified && (!status.verification_badges || status.verification_badges.length === 0)) {
    return null;
  }

  const getNewSize = () => {
    switch (size) {
      case 'small': return 'xs' as const;
      case 'large': return 'small' as const;
      default: return 'xs' as const;
    }
  };

  return (
    <IdentityVerificationBadge
      size={getNewSize()}
      variant="compact"
      onPress={onPress}
      style={style}
    />
  );
}

// Legacy TrustScoreDisplay wrapper
export function LegacyTrustScoreDisplay({
  trustScore,
  size = 'medium',
  showLabel = true,
  onPress,
  style,
}: {
  trustScore: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onPress?: () => void;
  style?: any;
}) {
  const getNewSize = () => {
    switch (size) {
      case 'small': return 'small' as const;
      case 'large': return 'large' as const;
      default: return 'medium' as const;
    }
  };

  return (
    <TrustScoreBadge
      trustScore={trustScore}
      size={getNewSize()}
      onPress={onPress}
      style={style}
    />
  );
}

// Legacy VerificationStatusIndicator wrapper
export function LegacyVerificationStatusIndicator({
  status,
  showText = true,
  onPress,
  style,
}: {
  status: UserVerificationStatus;
  showText?: boolean;
  onPress?: () => void;
  style?: any;
}) {
  const getVerificationLevel = () => {
    if (status.business_verified && status.identity_verified) {
      return 'premium';
    }
    if (status.business_verified) {
      return 'business';
    }
    if (status.identity_verified) {
      return 'identity';
    }
    return 'basic';
  };

  const verificationLevel = getVerificationLevel();

  return (
    <NewVerificationBadge
      verificationLevel={verificationLevel as any}
      size="small"
      variant="compact"
      showText={showText}
      onPress={onPress}
      style={style}
    />
  );
}
