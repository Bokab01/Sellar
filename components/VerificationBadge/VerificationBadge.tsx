import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { 
  Shield, 
  CheckCircle, 
  Phone, 
  Mail, 
  User, 
  Building,
  Award,
  Star
} from 'lucide-react-native';
import { UserVerificationStatus } from '@/hooks/useVerification';
import { getTrustScoreColor, getTrustScoreLabel } from '@/lib/verificationService';

interface VerificationBadgeProps {
  status: UserVerificationStatus;
  size?: 'small' | 'medium' | 'large';
  showTrustScore?: boolean;
  showAllBadges?: boolean;
  onPress?: () => void;
  style?: any;
}

export function VerificationBadge({
  status,
  size = 'medium',
  showTrustScore = true,
  showAllBadges = false,
  onPress,
  style,
}: VerificationBadgeProps) {
  const { theme } = useTheme();

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };

  const getVerificationIcon = (type: string) => {
    const iconSize = getIconSize();
    const color = theme.colors.success;
    
    switch (type) {
      case 'phone_verified':
        return <Phone size={iconSize} color={color} />;
      case 'email_verified':
        return <Mail size={iconSize} color={color} />;
      case 'identity_verified':
        return <User size={iconSize} color={color} />;
      case 'business_verified':
        return <Building size={iconSize} color={color} />;
      case 'trusted_seller':
        return <Award size={iconSize} color={color} />;
      case 'verified_seller':
        return <CheckCircle size={iconSize} color={color} />;
      case 'active_member':
        return <Star size={iconSize} color={color} />;
      default:
        return <Shield size={iconSize} color={color} />;
    }
  };

  const getHighestVerificationBadge = () => {
    const priorityOrder = [
      'trusted_seller',
      'verified_seller',
      'business_verified',
      'identity_verified',
      'active_member',
      'email_verified',
      'phone_verified',
    ];

    for (const badge of priorityOrder) {
      if (status.verification_badges && status.verification_badges.includes(badge)) {
        return badge;
      }
    }

    return null;
  };

  const formatBadgeText = (badge: string) => {
    const badgeMap: Record<string, string> = {
      phone_verified: 'Phone',
      email_verified: 'Email',
      identity_verified: 'ID',
      business_verified: 'Business',
      trusted_seller: 'Trusted',
      verified_seller: 'Verified',
      active_member: 'Active',
    };
    return badgeMap[badge] || badge.replace('_', ' ');
  };

  if (!status.is_verified && (!status.verification_badges || status.verification_badges.length === 0)) {
    return null;
  }

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        },
        style,
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Trust Score Badge */}
      {showTrustScore && (status.trust_score || 0) > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: getTrustScoreColor(status.trust_score || 0) + '15',
            borderRadius: theme.borderRadius.full,
            paddingHorizontal: size === 'small' ? theme.spacing.xs : theme.spacing.sm,
            paddingVertical: size === 'small' ? 2 : 4,
            borderWidth: 1,
            borderColor: getTrustScoreColor(status.trust_score || 0) + '30',
          }}
        >
          <Award 
            size={getIconSize()} 
            color={getTrustScoreColor(status.trust_score || 0)} 
          />
          <Text
            variant={size === 'small' ? 'caption' : 'bodySmall'}
            style={{
              color: getTrustScoreColor(status.trust_score || 0),
              marginLeft: theme.spacing.xs,
              fontWeight: '600',
            }}
          >
            {status.trust_score || 0}
          </Text>
        </View>
      )}

      {/* Verification Badges */}
      {showAllBadges ? (
        // Show all badges
        status.verification_badges?.map((badge) => (
          <View
            key={badge}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.success + '15',
              borderRadius: theme.borderRadius.full,
              paddingHorizontal: size === 'small' ? theme.spacing.xs : theme.spacing.sm,
              paddingVertical: size === 'small' ? 2 : 4,
              borderWidth: 1,
              borderColor: theme.colors.success + '30',
            }}
          >
            {getVerificationIcon(badge)}
            <Text
              variant={size === 'small' ? 'caption' : 'bodySmall'}
              style={{
                color: theme.colors.success,
                marginLeft: theme.spacing.xs,
                fontWeight: '600',
              }}
            >
              {formatBadgeText(badge)}
            </Text>
          </View>
        ))
      ) : (
        // Show only highest priority badge
        (() => {
          const highestBadge = getHighestVerificationBadge();
          if (!highestBadge) return null;

          return (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.success + '15',
                borderRadius: theme.borderRadius.full,
                paddingHorizontal: size === 'small' ? theme.spacing.xs : theme.spacing.sm,
                paddingVertical: size === 'small' ? 2 : 4,
                borderWidth: 1,
                borderColor: theme.colors.success + '30',
              }}
            >
              {getVerificationIcon(highestBadge)}
              <Text
                variant={size === 'small' ? 'caption' : 'bodySmall'}
                style={{
                  color: theme.colors.success,
                  marginLeft: theme.spacing.xs,
                  fontWeight: '600',
                }}
              >
                {formatBadgeText(highestBadge)}
              </Text>
            </View>
          );
        })()
      )}
    </Container>
  );
}

// Compact verification indicator for small spaces
export function CompactVerificationBadge({
  status,
  size = 'small',
  onPress,
  style,
}: Omit<VerificationBadgeProps, 'showTrustScore' | 'showAllBadges'>) {
  const { theme } = useTheme();

  if (!status.is_verified && (!status.verification_badges || status.verification_badges.length === 0)) {
    return null;
  }

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.colors.success,
          borderRadius: theme.borderRadius.full,
          width: size === 'small' ? 20 : size === 'large' ? 28 : 24,
          height: size === 'small' ? 20 : size === 'large' ? 28 : 24,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <CheckCircle size={getIconSize()} color={theme.colors.surface} />
    </Container>
  );
}

// Trust score display component
export function TrustScoreDisplay({
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
  const { theme } = useTheme();

  const getTextVariant = () => {
    switch (size) {
      case 'small':
        return 'caption' as const;
      case 'large':
        return 'h4' as const;
      default:
        return 'bodySmall' as const;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 24;
      default:
        return 16;
    }
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: getTrustScoreColor(trustScore) + '15',
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: size === 'small' ? theme.spacing.xs : theme.spacing.sm,
          paddingVertical: size === 'small' ? 2 : 4,
          borderWidth: 1,
          borderColor: getTrustScoreColor(trustScore) + '30',
        },
        style,
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Award size={getIconSize()} color={getTrustScoreColor(trustScore)} />
      
      <Text
        variant={getTextVariant()}
        style={{
          color: getTrustScoreColor(trustScore),
          marginLeft: theme.spacing.xs,
          fontWeight: '700',
        }}
      >
        {trustScore}
      </Text>

      {showLabel && (
        <Text
          variant={size === 'small' ? 'caption' : 'bodySmall'}
          style={{
            color: getTrustScoreColor(trustScore),
            marginLeft: theme.spacing.xs,
            fontWeight: '500',
          }}
        >
          {getTrustScoreLabel(trustScore)}
        </Text>
      )}
    </Container>
  );
}

// Verification status indicator for profiles
export function VerificationStatusIndicator({
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
  const { theme } = useTheme();

  const getVerificationLevel = () => {
    if (status.business_verified && status.identity_verified) {
      return { level: 'Premium Verified', color: theme.colors.success, icon: Award };
    }
    if (status.business_verified) {
      return { level: 'Business Verified', color: theme.colors.success, icon: Building };
    }
    if (status.identity_verified) {
      return { level: 'ID Verified', color: theme.colors.success, icon: User };
    }
    if (status.email_verified && status.phone_verified) {
      return { level: 'Contact Verified', color: theme.colors.primary, icon: CheckCircle };
    }
    if (status.phone_verified) {
      return { level: 'Phone Verified', color: theme.colors.primary, icon: Phone };
    }
    return { level: 'Unverified', color: theme.colors.text.muted, icon: Shield };
  };

  const { level, color, icon: Icon } = getVerificationLevel();
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
        },
        style,
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Icon size={16} color={color} />
      
      {showText && (
        <Text
          variant="bodySmall"
          style={{
            color,
            marginLeft: theme.spacing.xs,
            fontWeight: '600',
          }}
        >
          {level}
        </Text>
      )}
    </Container>
  );
}
