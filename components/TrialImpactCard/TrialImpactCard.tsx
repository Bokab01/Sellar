import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  MessageCircle, 
  RefreshCw, 
  Clock, 
  DollarSign,
  Zap,
  ChevronRight,
  Sparkles
} from 'lucide-react-native';

interface TrialImpactMetrics {
  trial_days_used: number;
  total_views: number;
  views_increase_percent: number;
  messages_received: number;
  auto_refresh_count: number;
  time_saved_hours: number;
  estimated_sales_value: number;
  listings_created: number;
  videos_uploaded: number;
  has_baseline: boolean;
}

interface TrialImpactCardProps {
  userId: string;
  variant?: 'full' | 'compact';
  onViewDetails?: () => void;
}

export function TrialImpactCard({ 
  userId, 
  variant = 'full',
  onViewDetails 
}: TrialImpactCardProps) {
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState<TrialImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpactMetrics();
  }, [userId]);

  const fetchImpactMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_trial_impact_metrics', { p_user_id: userId });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setMetrics(data[0]);
      }
    } catch (error) {
      console.error('Error fetching trial impact:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.sm }}>
          Calculating your impact...
        </Text>
      </View>
    );
  }

  if (!metrics || metrics.trial_days_used === 0) {
    return null;
  }

  const MetricItem = ({ 
    icon: Icon, 
    value, 
    label, 
    highlight 
  }: { 
    icon: any; 
    value: string | number; 
    label: string; 
    highlight?: boolean;
  }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: highlight ? theme.colors.primary + '10' : theme.colors.background,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
      }}>
        <Icon size={20} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="h3" style={{ fontWeight: '700', marginBottom: 2 }}>
          {value}
        </Text>
        <Text variant="caption" color="secondary">
          {label}
        </Text>
      </View>
      {highlight && (
        <Sparkles size={18} color={theme.colors.warning} />
      )}
    </View>
  );

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={onViewDetails}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.primary + '30',
          ...theme.shadows.sm,
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text variant="h4" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              📊 Your Trial Impact
            </Text>
            <Text variant="bodySmall" color="secondary">
              {metrics.auto_refresh_count} auto-refreshes • {metrics.total_views} views
            </Text>
          </View>
          <View style={{
            backgroundColor: theme.colors.success + '15',
            borderRadius: theme.borderRadius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}>
            <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.success }}>
              ~GHS {metrics.estimated_sales_value}
            </Text>
            <ChevronRight size={16} color={theme.colors.success} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      ...theme.shadows.md,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <View style={{
          backgroundColor: theme.colors.primary + '15',
          borderRadius: theme.borderRadius.lg,
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}>
          <Zap size={24} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3" style={{ fontWeight: '700', marginBottom: 2 }}>
            Your Trial Impact
          </Text>
          <Text variant="bodySmall" color="secondary">
            Day {metrics.trial_days_used} of 14 • Real-time metrics
          </Text>
        </View>
      </View>

      {/* Metrics Grid */}
      <View>
        {/* Views Increase */}
        {metrics.has_baseline && metrics.views_increase_percent !== 0 && (
          <MetricItem
            icon={TrendingUp}
            value={metrics.views_increase_percent > 0 ? `+${metrics.views_increase_percent}%` : `${metrics.views_increase_percent}%`}
            label="Views increase vs pre-trial"
            highlight={metrics.views_increase_percent > 20}
          />
        )}

        {/* Total Views */}
        <MetricItem
          icon={TrendingUp}
          value={metrics.total_views}
          label="Total views during trial"
        />

        {/* Messages Received */}
        <MetricItem
          icon={MessageCircle}
          value={metrics.messages_received}
          label="Messages from buyers"
          highlight={metrics.messages_received > 5}
        />

        {/* Auto-Refresh Count */}
        <MetricItem
          icon={RefreshCw}
          value={metrics.auto_refresh_count}
          label="Automatic refreshes (every 2 hours)"
          highlight={metrics.auto_refresh_count > 20}
        />

        {/* Time Saved */}
        {metrics.time_saved_hours > 0 && (
          <MetricItem
            icon={Clock}
            value={`${metrics.time_saved_hours}h`}
            label="Time saved on manual refreshes"
          />
        )}

        {/* Estimated Sales Value */}
        {metrics.estimated_sales_value > 0 && (
          <MetricItem
            icon={DollarSign}
            value={`GHS ${metrics.estimated_sales_value}`}
            label="Estimated additional sales"
            highlight={metrics.estimated_sales_value >= 400}
          />
        )}
      </View>

      {/* ROI Summary */}
      {metrics.estimated_sales_value >= 400 && (
        <View style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.success + '10',
          borderRadius: theme.borderRadius.md,
          borderWidth: 1,
          borderColor: theme.colors.success + '30',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <Sparkles size={16} color={theme.colors.success} style={{ marginRight: theme.spacing.xs }} />
            <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.success }}>
              Trial Already Paying Off!
            </Text>
          </View>
          <Text variant="caption" color="secondary">
            Your estimated sales already cover the GHS 400/month cost. The trial has paid for itself!
          </Text>
        </View>
      )}

      {/* Info Message */}
      {!metrics.has_baseline && (
        <View style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.md,
        }}>
          <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
            💡 We'll show comparison data as you use the trial more
          </Text>
        </View>
      )}
    </View>
  );
}

