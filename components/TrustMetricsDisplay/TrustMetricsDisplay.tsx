import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { 
  Text, 
  Badge, 
  Rating,
  VerificationBadge
} from '@/components';
import { 
  Shield, 
  CheckCircle, 
  Users, 
  Award,
  TrendingUp,
  Star,
  Phone,
  Mail,
  FileText
} from 'lucide-react-native';

interface TrustMetrics {
  trust_score: number;
  phone_verified: boolean;
  email_verified: boolean;
  id_verified: boolean;
  successful_transactions: number;
  total_reviews: number;
  confirmed_reviews: number;
  average_rating: number;
  confirmed_rating: number;
  account_age_days: number;
}

interface TrustMetricsDisplayProps {
  metrics: TrustMetrics;
  variant?: 'full' | 'compact' | 'minimal';
  showDetails?: boolean;
  style?: any;
}

export function TrustMetricsDisplay({
  metrics,
  variant = 'full',
  showDetails = true,
  style,
}: TrustMetricsDisplayProps) {
  const { theme } = useTheme();

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.primary;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 80) return 'Highly Trusted';
    if (score >= 60) return 'Trusted';
    if (score >= 40) return 'Developing Trust';
    return 'New User';
  };

  const getVerificationBadges = () => {
    const badges = [];
    
    if (metrics.phone_verified) {
      badges.push({
        icon: <Phone size={12} color={theme.colors.success} />,
        text: 'Phone',
        variant: 'success' as const,
      });
    }
    
    if (metrics.email_verified) {
      badges.push({
        icon: <Mail size={12} color={theme.colors.success} />,
        text: 'Email',
        variant: 'success' as const,
      });
    }
    
    if (metrics.id_verified) {
      badges.push({
        icon: <FileText size={12} color={theme.colors.success} />,
        text: 'ID',
        variant: 'success' as const,
      });
    }

    return badges;
  };

  if (variant === 'minimal') {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }, style]}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: getTrustScoreColor(metrics.trust_score) + '20',
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
        }}>
          <Shield size={12} color={getTrustScoreColor(metrics.trust_score)} />
          <Text 
            variant="caption" 
            style={{ 
              marginLeft: theme.spacing.xs,
              color: getTrustScoreColor(metrics.trust_score),
              fontWeight: '600',
            }}
          >
            {metrics.trust_score}%
          </Text>
        </View>
        
        {metrics.confirmed_reviews > 0 && (
          <Badge
            text={`${metrics.confirmed_reviews} verified`}
            variant="success"
            size="small"
            leftIcon={<CheckCircle size={10} color={theme.colors.success} />}
          />
        )}
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={[{ gap: theme.spacing.md }, style]}>
        {/* Trust Score */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Shield size={16} color={getTrustScoreColor(metrics.trust_score)} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
              Trust Score
            </Text>
          </View>
          <Badge
            text={`${metrics.trust_score}% ${getTrustScoreLabel(metrics.trust_score)}`}
            variant={metrics.trust_score >= 60 ? 'success' : 'warning'}
          />
        </View>

        {/* Reviews Summary */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text variant="body" color="secondary">
            Reviews
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {metrics.confirmed_rating > 0 && (
              <Rating rating={metrics.confirmed_rating} size="sm" showValue />
            )}
            <Text variant="bodySmall" color="secondary">
              {metrics.confirmed_reviews}/{metrics.total_reviews} verified
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Full variant
  return (
    <View style={[{
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    }, style]}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
      }}>
        <Text variant="h4">Trust & Verification</Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: getTrustScoreColor(metrics.trust_score) + '20',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
        }}>
          <Shield size={16} color={getTrustScoreColor(metrics.trust_score)} />
          <Text 
            variant="body" 
            style={{ 
              marginLeft: theme.spacing.sm,
              color: getTrustScoreColor(metrics.trust_score),
              fontWeight: '700',
            }}
          >
            {metrics.trust_score}%
          </Text>
        </View>
      </View>

      {/* Trust Score Details */}
      <View style={{
        backgroundColor: theme.colors.surfaceVariant,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
      }}>
        <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
          {getTrustScoreLabel(metrics.trust_score)}
        </Text>
        <Text variant="caption" color="secondary">
          Based on verification status, transaction history, and community feedback
        </Text>
      </View>

      {/* Verification Badges */}
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
          Verifications
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {getVerificationBadges().map((badge, index) => (
            <Badge
              key={index}
              text={badge.text}
              variant={badge.variant}
              leftIcon={badge.icon}
              size="small"
            />
          ))}
          {getVerificationBadges().length === 0 && (
            <Text variant="caption" color="muted">
              No verifications yet
            </Text>
          )}
        </View>
      </View>

      {/* Transaction Stats */}
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
          Transaction History
        </Text>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Users size={14} color={theme.colors.text.secondary} />
              <Text variant="bodySmall" style={{ marginLeft: theme.spacing.sm }}>
                Successful Meetups
              </Text>
            </View>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {metrics.successful_transactions}
            </Text>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CheckCircle size={14} color={theme.colors.success} />
              <Text variant="bodySmall" style={{ marginLeft: theme.spacing.sm }}>
                Verified Reviews
              </Text>
            </View>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {metrics.confirmed_reviews}/{metrics.total_reviews}
            </Text>
          </View>
        </View>
      </View>

      {/* Rating Comparison */}
      {metrics.total_reviews > 0 && (
        <View style={{ marginBottom: theme.spacing.lg }}>
          <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
            Ratings
          </Text>
          <View style={{ gap: theme.spacing.md }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text variant="bodySmall" color="secondary">
                All Reviews
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Rating rating={metrics.average_rating} size="sm" showValue />
                <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.sm }}>
                  ({metrics.total_reviews})
                </Text>
              </View>
            </View>

            {metrics.confirmed_reviews > 0 && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={12} color={theme.colors.success} />
                  <Text variant="bodySmall" style={{ marginLeft: theme.spacing.xs }}>
                    Verified Only
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Rating rating={metrics.confirmed_rating} size="sm" showValue />
                  <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.sm }}>
                    ({metrics.confirmed_reviews})
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Account Age */}
      {showDetails && (
        <View style={{
          paddingTop: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Text variant="caption" color="muted">
              Member for
            </Text>
            <Text variant="caption" color="muted">
              {Math.floor(metrics.account_age_days / 30)} months
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Quick trust indicator for inline use
export function TrustIndicator({ 
  trustScore, 
  verifiedReviews 
}: { 
  trustScore: number; 
  verifiedReviews: number; 
}) {
  const { theme } = useTheme();
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <Shield 
        size={12} 
        color={trustScore >= 60 ? theme.colors.success : theme.colors.warning} 
      />
      <Text 
        variant="caption" 
        style={{ 
          color: trustScore >= 60 ? theme.colors.success : theme.colors.warning,
          fontWeight: '600',
        }}
      >
        {trustScore}%
      </Text>
      {verifiedReviews > 0 && (
        <>
          <Text variant="caption" color="muted">•</Text>
          <Text variant="caption" color="muted">
            {verifiedReviews} verified
          </Text>
        </>
      )}
    </View>
  );
}
