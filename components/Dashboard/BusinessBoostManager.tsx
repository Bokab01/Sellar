import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { 
  Zap, 
  TrendingUp, 
  Star, 
  Eye, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Settings
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Container } from '@/components/Layout';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { supabase } from '@/lib/supabase';
import { calculateCreditValue } from '@/constants/monetization';

interface ActiveBoost {
  id: string;
  listing_id: string;
  feature_name: string;
  expires_at: string;
  listing_title: string;
  listing_image?: string;
}

interface BusinessBoostManagerProps {
  onTabChange: (tab: 'overview' | 'boost' | 'analytics' | 'support') => void;
}

export const BusinessBoostManager: React.FC<BusinessBoostManagerProps> = ({ onTabChange }) => {
  const { theme } = useTheme();
  const { balance: credits, refreshCredits } = useMonetizationStore();
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveBoosts();
  }, []);

  const loadActiveBoosts = async () => {
    try {
      setLoading(true);
      
      // Fetch active boosts for the user
      const { data, error } = await supabase
        .from('feature_purchases')
        .select(`
          id,
          listing_id,
          feature_name,
          expires_at,
          listings!inner(
            title,
            images
          )
        `)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());

      if (error) throw error;

      const boosts = data?.map(boost => ({
        id: boost.id,
        listing_id: boost.listing_id,
        feature_name: boost.feature_name,
        expires_at: boost.expires_at,
        listing_title: boost.listings?.[0]?.title,
        listing_image: boost.listings?.[0]?.images?.[0],
      })) || [];

      setActiveBoosts(boosts);
    } catch (error) {
      console.error('Error loading active boosts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBoost = () => {
    // Navigate to business-specific boost application
    router.push('/feature-marketplace');
  };

  const handleManageBoost = (boostId: string) => {
    Alert.alert(
      'Manage Boost',
      'What would you like to do with this boost?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Extend Duration', 
          onPress: () => {
            // Navigate to extend boost
            router.push(`/feature-marketplace?extend=${boostId}`);
          }
        },
        { 
          text: 'Remove Boost', 
          style: 'destructive',
          onPress: () => removeBoost(boostId)
        },
      ]
    );
  };

  const removeBoost = async (boostId: string) => {
    try {
      const { error } = await supabase
        .from('feature_purchases')
        .update({ status: 'cancelled' })
        .eq('id', boostId);

      if (error) throw error;

      // Refresh the list
      loadActiveBoosts();
      refreshCredits();
    } catch (error) {
      console.error('Error removing boost:', error);
      Alert.alert('Error', 'Failed to remove boost. Please try again.');
    }
  };

  const getBoostIcon = (featureName: string) => {
    switch (featureName.toLowerCase()) {
      case 'priority_boost':
        return <TrendingUp size={20} color={theme.colors.warning} />;
      case 'featured_badge':
        return <Star size={20} color={theme.colors.warning} />;
      case 'visibility_boost':
        return <Eye size={20} color={theme.colors.warning} />;
      default:
        return <Zap size={20} color={theme.colors.warning} />;
    }
  };

  const getBoostDisplayName = (featureName: string) => {
    switch (featureName.toLowerCase()) {
      case 'priority_boost':
        return 'Priority Boost';
      case 'featured_badge':
        return 'Featured Badge';
      case 'visibility_boost':
        return 'Visibility Boost';
      case 'pulse_boost':
        return 'Pulse Boost';
      case 'standard_boost':
        return 'Standard Boost';
      default:
        return featureName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <Container style={{ paddingTop: theme.spacing.lg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Business Credits Overview with Value Proposition */}
        <View style={{
          backgroundColor: `linear-gradient(135deg, ${theme.colors.warning}15, ${theme.colors.warning}05)`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          borderWidth: 2,
          borderColor: theme.colors.warning + '20',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <View style={{
              backgroundColor: theme.colors.warning,
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              marginRight: theme.spacing.md,
            }}>
              <Zap size={28} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.xs, color: theme.colors.warning }}>
                Auto-Refresh System
              </Text>
            <Text variant="body" color="secondary">
              Your listings automatically refresh every 2 hours to stay at the top
            </Text>
            </View>
          </View>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text variant="h4" style={{ color: theme.colors.success, fontWeight: '700' }}>
                Active
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Auto-Refresh Status
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="h4" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                Every 2h
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Refresh Interval
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="h4" style={{ color: theme.colors.warning, fontWeight: '700' }}>
                12/day
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Top Placements
              </Text>
            </View>
          </View>

          {/* Auto-Refresh Benefits */}
          <View style={{
            backgroundColor: theme.colors.success + '10',
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.success + '20',
          }}>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm, textAlign: 'center' }}>
              Auto-Refresh Benefits:
            </Text>
            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                🔄 <Text style={{ fontWeight: '600' }}>Continuous Top Placement</Text> - Your listings stay at the top
              </Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                ⚡ <Text style={{ fontWeight: '600' }}>12 Top Placements Daily</Text> - Every 2 hours automatically
              </Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                🎯 <Text style={{ fontWeight: '600' }}>360 Top Placements Monthly</Text> - Maximum visibility
              </Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                🚀 <Text style={{ fontWeight: '600' }}>No Manual Work</Text> - Fully automated system
              </Text>
            </View>
            <Text variant="caption" style={{ 
              textAlign: 'center', 
              marginTop: theme.spacing.sm, 
              color: theme.colors.success,
              fontWeight: '700'
            }}>
              Your listings get maximum visibility without any effort!
            </Text>
          </View>

          <Button
            variant="primary"
            onPress={() => router.push('/feature-marketplace')}
            style={{ 
              width: '100%',
              backgroundColor: theme.colors.primary,
            }}
          >
            <Settings size={18} color="#FFFFFF" />
            <Text variant="body" style={{ 
              color: '#FFFFFF', 
              marginLeft: theme.spacing.sm,
              fontWeight: '700',
            }}>
              Manage Auto-Refresh Settings
            </Text>
          </Button>
        </View>

        {/* Auto-Refresh Status */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Auto-Refresh Status
          </Text>
          
          {loading ? (
            <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
              <Text variant="body" color="secondary">Loading auto-refresh status...</Text>
            </View>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {/* Auto-Refresh Status Card */}
              <View style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.success,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                  <CheckCircle size={20} color={theme.colors.success} />
                  <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm, flex: 1 }}>
                    Auto-Refresh Active
                  </Text>
                  <Badge 
                    text="Active" 
                    variant="success" 
                  />
                </View>
                
                <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
                  All your listings are automatically refreshed every 2 hours
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={14} color={theme.colors.text.muted} />
                    <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                      Next refresh in 1h 23m
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <CheckCircle size={14} color={theme.colors.success} />
                    <Text variant="caption" style={{ color: theme.colors.success, marginLeft: theme.spacing.xs }}>
                      Running Smoothly
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Auto-Refresh Performance */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Auto-Refresh Performance
          </Text>
          
          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <Text variant="h3" style={{ color: theme.colors.success, fontWeight: '700' }}>
                12
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Refreshes Today
              </Text>
            </View>
            
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <Text variant="h3" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                360
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                This Month
              </Text>
            </View>
            
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <Text variant="h3" style={{ color: theme.colors.warning, fontWeight: '700' }}>
                100%
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Uptime
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Quick Actions
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            <TouchableOpacity
              onPress={() => router.push('/feature-marketplace')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Settings size={20} color={theme.colors.primary} />
                  <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm }}>
                    Manage Auto-Refresh
                  </Text>
                </View>
                <Text variant="caption" style={{ color: theme.colors.primary }}>
                  Configure settings
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onTabChange('analytics')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TrendingUp size={20} color={theme.colors.primary} />
                  <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm }}>
                    View Boost Analytics
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  See performance data
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/subscription-plans')}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Settings size={20} color={theme.colors.text.secondary} />
                  <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm }}>
                    Manage Subscription
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  Change plan or billing
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};
