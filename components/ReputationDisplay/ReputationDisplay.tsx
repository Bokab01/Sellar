import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { Shield, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { reputationService, UserReputation } from '@/lib/reputationService';

interface ReputationDisplayProps {
  userId: string;
  variant?: 'full' | 'compact' | 'badge-only';
  showHistory?: boolean;
  style?: any;
}

export function ReputationDisplay({
  userId,
  variant = 'compact',
  showHistory = false,
  style,
}: ReputationDisplayProps) {
  const { theme } = useTheme();
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReputation();
  }, [userId]);

  const fetchReputation = async () => {
    try {
      setLoading(true);
      const data = await reputationService.getUserReputation(userId);
      setReputation(data);
    } catch (error) {
      console.error('Error fetching reputation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !reputation) {
    return null;
  }

  const trustInfo = reputationService.getTrustLevelInfo(reputation.trust_level);

  // Badge-only variant
  if (variant === 'badge-only') {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <Badge
          text={`${trustInfo.icon} ${trustInfo.label}`}
          variant={
            reputation.trust_level === 'platinum' || reputation.trust_level === 'gold' ? 'success' :
            reputation.trust_level === 'restricted' || reputation.trust_level === 'banned' ? 'error' :
            'default'
          }
          size="small"
        />
      </View>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <View style={[{
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
      }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Shield size={20} color={trustInfo.color} />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                {trustInfo.label} • {reputation.reputation_score} points
              </Text>
              <Text variant="caption" color="muted">
                {trustInfo.description}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 24 }}>{trustInfo.icon}</Text>
        </View>

        {/* Quick stats */}
        <View style={{
          flexDirection: 'row',
          marginTop: theme.spacing.sm,
          gap: theme.spacing.md,
        }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="muted">Transactions</Text>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {reputation.successful_transactions}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="muted">Reviews</Text>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {reputation.positive_reviews + reputation.negative_reviews}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="muted">Response</Text>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {reputation.response_rate}%
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
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    }, style]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Shield size={24} color={trustInfo.color} />
        <Text variant="h4" style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
          Reputation Score
        </Text>
        <Text style={{ fontSize: 32 }}>{trustInfo.icon}</Text>
      </View>

      {/* Score and Level */}
      <View style={{
        backgroundColor: trustInfo.color + '10',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        alignItems: 'center',
      }}>
        <Text variant="h1" style={{ color: trustInfo.color, fontWeight: '700' }}>
          {reputation.reputation_score}
        </Text>
        <Text variant="body" style={{ color: trustInfo.color, fontWeight: '600', marginTop: theme.spacing.xs }}>
          {trustInfo.label}
        </Text>
        <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
          {trustInfo.description}
        </Text>
      </View>

      {/* Progress to next level */}
      {reputation.trust_level !== 'platinum' && reputation.trust_level !== 'banned' && (
        <View style={{ marginBottom: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
            <Text variant="caption" color="muted">Progress to next level</Text>
            <Text variant="caption" color="muted">
              {Math.min(100, Math.round((reputation.reputation_score % 200) / 2))}%
            </Text>
          </View>
          <View style={{
            height: 8,
            backgroundColor: theme.colors.border,
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <View style={{
              height: '100%',
              width: `${Math.min(100, Math.round((reputation.reputation_score % 200) / 2))}%`,
              backgroundColor: trustInfo.color,
            }} />
          </View>
        </View>
      )}

      {/* Detailed Stats */}
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CheckCircle size={16} color={theme.colors.success} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
              Successful Transactions
            </Text>
          </View>
          <Text variant="body" style={{ fontWeight: '600' }}>
            {reputation.successful_transactions}
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TrendingUp size={16} color={theme.colors.primary} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
              Positive Reviews
            </Text>
          </View>
          <Text variant="body" style={{ fontWeight: '600' }}>
            {reputation.positive_reviews}
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AlertTriangle size={16} color={theme.colors.warning} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
              Negative Reviews
            </Text>
          </View>
          <Text variant="body" style={{ fontWeight: '600' }}>
            {reputation.negative_reviews}
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <Text variant="body">Response Rate</Text>
          <Text variant="body" style={{ fontWeight: '600' }}>
            {reputation.response_rate}%
          </Text>
        </View>

        {reputation.avg_response_time && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <Text variant="body">Avg. Response Time</Text>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {Math.round(reputation.avg_response_time / 60)} hrs
            </Text>
          </View>
        )}

        {reputation.total_flags > 0 && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.sm,
          }}>
            <Text variant="body">Content Flags</Text>
            <Text variant="body" style={{ fontWeight: '600', color: theme.colors.error }}>
              {reputation.total_flags}
            </Text>
          </View>
        )}
      </View>

      {/* Warning for restricted users */}
      {(reputation.trust_level === 'restricted' || reputation.trust_level === 'banned') && (
        <View style={{
          backgroundColor: theme.colors.error + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.error,
        }}>
          <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: '600' }}>
            ⚠️ Account Status Warning
          </Text>
          <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.xs }}>
            {reputation.trust_level === 'banned' 
              ? 'This account has been banned due to policy violations.'
              : 'This account is currently restricted. Some features may be limited.'}
          </Text>
          {reputation.restriction_ends_at && (
            <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.xs }}>
              Restriction ends: {new Date(reputation.restriction_ends_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
