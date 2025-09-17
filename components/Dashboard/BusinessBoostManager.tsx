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
import { calculateBusinessCreditValue, getBusinessDiscount } from '@/constants/monetization';

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
  const { credits, refreshCredits } = useMonetizationStore();
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
        listing_title: boost.listings.title,
        listing_image: boost.listings.images?.[0],
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
    router.push('/business-boost-features');
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
            router.push(`/business-boost-features?extend=${boostId}`);
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
                Business Boost Credits
              </Text>
            <Text variant="body" color="secondary">
              Massive discounts + auto-refresh! Only boosted listings get auto-refresh
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
              <Text variant="h2" style={{ color: theme.colors.warning, fontWeight: '700' }}>
                {credits || 0}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Available Credits
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="h2" style={{ color: theme.colors.success, fontWeight: '700' }}>
                {activeBoosts.length}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Active Boosts
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="h2" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                120
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Monthly Allowance
              </Text>
            </View>
          </View>

          {/* Business Credit Value Showcase */}
          <View style={{
            backgroundColor: theme.colors.success + '10',
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.success + '20',
          }}>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm, textAlign: 'center' }}>
              Your 120 Business Credits Can Get You:
            </Text>
            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                🚀 <Text style={{ fontWeight: '600' }}>40 Mega Pulses</Text> (280 days + auto-refresh) - 94% OFF!
              </Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                🎯 <Text style={{ fontWeight: '600' }}>60 Category Spotlights</Text> (180 days + auto-refresh) - 94% OFF!
              </Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                ⚡ <Text style={{ fontWeight: '600' }}>120 Pulse Boosts</Text> (2,880 hours + auto-refresh) - 93% OFF!
              </Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                🔄 <Text style={{ fontWeight: '600' }}>FREE Ad Refresh</Text> + auto-refresh every 2h!
              </Text>
            </View>
            <Text variant="caption" style={{ 
              textAlign: 'center', 
              marginTop: theme.spacing.sm, 
              color: theme.colors.success,
              fontWeight: '700'
            }}>
              Worth GHS 5,900+ in regular credits + exclusive auto-refresh!
            </Text>
          </View>

          <Button
            variant="primary"
            onPress={handleApplyBoost}
            style={{ 
              width: '100%',
              backgroundColor: theme.colors.warning,
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text variant="body" style={{ 
              color: '#FFFFFF', 
              marginLeft: theme.spacing.sm,
              fontWeight: '700',
            }}>
              Apply Boost (Massive Discounts!)
            </Text>
          </Button>
        </View>

        {/* Active Boosts */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Active Boosts ({activeBoosts.length})
          </Text>
          
          {loading ? (
            <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
              <Text variant="body" color="secondary">Loading active boosts...</Text>
            </View>
          ) : activeBoosts.length === 0 ? (
            <EmptyState
              icon={<Zap size={48} color={theme.colors.text.secondary} />}
              title="No Active Boosts"
              description="Apply boost features to your listings to increase visibility and engagement."
              action={{
                text: 'Apply Boost',
                onPress: handleApplyBoost,
              }}
            />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {activeBoosts.map((boost) => {
                const daysRemaining = getDaysRemaining(boost.expires_at);
                const isExpiringSoon = daysRemaining <= 2;
                
                return (
                  <TouchableOpacity
                    key={boost.id}
                    onPress={() => handleManageBoost(boost.id)}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.md,
                      borderWidth: 1,
                      borderColor: isExpiringSoon ? theme.colors.warning : theme.colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                      {getBoostIcon(boost.feature_name)}
                      <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm, flex: 1 }}>
                        {getBoostDisplayName(boost.feature_name)}
                      </Text>
                      <Badge 
                        text={`${daysRemaining}d left`} 
                        variant={isExpiringSoon ? "warning" : "success"} 
                      />
                    </View>
                    
                    <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
                      {boost.listing_title}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text variant="caption" color="secondary">
                        Expires: {new Date(boost.expires_at).toLocaleDateString()}
                      </Text>
                      
                      {isExpiringSoon && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <AlertCircle size={14} color={theme.colors.warning} />
                          <Text variant="caption" style={{ color: theme.colors.warning, marginLeft: theme.spacing.xs }}>
                            Expiring Soon
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Boost Performance */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Boost Performance
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
              <Text variant="h3" style={{ color: theme.colors.warning, fontWeight: '700' }}>
                {activeBoosts.length}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Active Boosts
              </Text>
            </View>
            
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <Text variant="h3" style={{ color: theme.colors.success, fontWeight: '700' }}>
                +{activeBoosts.length * 25}%
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Est. Visibility
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
                {120 - (credits || 0)}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Credits Used
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
              onPress={handleApplyBoost}
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
                  <Plus size={20} color={theme.colors.warning} />
                  <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm }}>
                    Apply New Boost
                  </Text>
                </View>
                <Text variant="caption" style={{ color: theme.colors.warning }}>
                  {credits || 0} credits available
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
