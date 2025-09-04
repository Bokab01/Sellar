import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { ListItem } from '@/components/ListItem/ListItem';
import { 
  Zap, 
  Clock, 
  Play, 
  Pause, 
  Settings, 
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { supabase } from '@/lib/supabase';

interface AutoBoostSettings {
  enabled: boolean;
  boostDuration: number; // in days
  maxBoostsPerMonth: number;
  boostCreditsUsed: number;
  nextBoostDate?: string;
  activeBoosts: Array<{
    listingId: string;
    listingTitle: string;
    startDate: string;
    endDate: string;
    creditsUsed: number;
  }>;
}

export function AutoBoostDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { entitlements, creditBalance } = useMonetizationStore();
  
  const [settings, setSettings] = useState<AutoBoostSettings>({
    enabled: false,
    boostDuration: 3,
    maxBoostsPerMonth: 10,
    boostCreditsUsed: 0,
    activeBoosts: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAutoBoostSettings();
  }, []);

  const fetchAutoBoostSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Simulate fetching auto-boost settings
      // In a real implementation, this would fetch from your database
      const mockSettings: AutoBoostSettings = {
        enabled: true,
        boostDuration: entitlements.autoBoostDays || 3,
        maxBoostsPerMonth: Math.floor((entitlements.monthlyCredits || 0) / 15), // 15 credits per boost
        boostCreditsUsed: Math.floor(Math.random() * 50),
        nextBoostDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        activeBoosts: [
          {
            listingId: '1',
            listingTitle: 'iPhone 13 Pro Max',
            startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            creditsUsed: 15,
          },
          {
            listingId: '2',
            listingTitle: 'MacBook Air M2',
            startDate: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString(),
            creditsUsed: 15,
          },
        ],
      };

      setSettings(mockSettings);
    } catch (error) {
      console.error('Error fetching auto-boost settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoBoost = async () => {
    setUpdating(true);
    try {
      const newEnabled = !settings.enabled;
      
      // Update settings
      setSettings(prev => ({ ...prev, enabled: newEnabled }));
      
      // In a real implementation, you would update the database here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      Alert.alert(
        'Auto-boost Updated',
        `Auto-boost has been ${newEnabled ? 'enabled' : 'disabled'}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-boost settings.');
    } finally {
      setUpdating(false);
    }
  };

  const updateBoostDuration = (duration: number) => {
    setSettings(prev => ({ ...prev, boostDuration: duration }));
  };

  const getRemainingCredits = () => {
    return Math.max(0, (entitlements.monthlyCredits || 0) - settings.boostCreditsUsed);
  };

  const getEstimatedBoosts = () => {
    return Math.floor(getRemainingCredits() / 15); // 15 credits per boost
  };

  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Expired';
    if (diffHours < 24) return `${diffHours}h remaining`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays}d remaining`;
  };

  if (loading) {
    return (
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <LoadingSkeleton count={3} height={120} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing.lg }}>
      {/* Auto-boost Status Card */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              backgroundColor: settings.enabled ? theme.colors.success + '15' : theme.colors.error + '15',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
              marginRight: theme.spacing.md,
            }}>
              <Zap size={24} color={settings.enabled ? theme.colors.success : theme.colors.error} />
            </View>
            <View>
              <Text variant="h4">Auto-boost</Text>
              <Text variant="bodySmall" color="muted">
                Automatically boost your listings
              </Text>
            </View>
          </View>
          
          <Badge 
            text={settings.enabled ? 'Active' : 'Inactive'}
            variant={settings.enabled ? 'success' : 'error'}
          />
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.lg,
        }}>
          <View>
            <Text variant="bodySmall" color="muted">Credits Used This Month</Text>
            <Text variant="h4" style={{ fontWeight: '600' }}>
              {settings.boostCreditsUsed} / {entitlements.monthlyCredits || 0}
            </Text>
          </View>
          
          <View>
            <Text variant="bodySmall" color="muted">Estimated Boosts Left</Text>
            <Text variant="h4" style={{ fontWeight: '600' }}>
              {getEstimatedBoosts()}
            </Text>
          </View>
          
          <View>
            <Text variant="bodySmall" color="muted">Boost Duration</Text>
            <Text variant="h4" style={{ fontWeight: '600' }}>
              {settings.boostDuration} days
            </Text>
          </View>
        </View>

        <Button
                          variant={settings.enabled ? 'tertiary' : 'primary'}
          onPress={toggleAutoBoost}
          loading={updating}
          style={{ width: '100%' }}
        >
          {settings.enabled ? <Pause size={18} color={theme.colors.primary} /> : <Play size={18} color={theme.colors.surface} />}
          <Text variant="body" style={{ 
            color: settings.enabled ? theme.colors.primary : theme.colors.surface,
            marginLeft: theme.spacing.sm,
          }}>
            {settings.enabled ? 'Pause Auto-boost' : 'Enable Auto-boost'}
          </Text>
        </Button>
      </View>

      {/* Auto-boost Settings */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
          Settings
        </Text>

        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: theme.spacing.sm,
          }}>
            <View>
              <Text variant="body">Boost Duration</Text>
              <Text variant="bodySmall" color="muted">
                How long each boost lasts
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
              {[1, 3, 7].map((days) => (
                <Button
                  key={days}
                  variant={settings.boostDuration === days ? 'primary' : 'tertiary'}
                  size="small"
                  onPress={() => updateBoostDuration(days)}
                >
                  <Text variant="bodySmall" style={{
                    color: settings.boostDuration === days ? theme.colors.surface : theme.colors.primary,
                  }}>
                    {days}d
                  </Text>
                </Button>
              ))}
            </View>
          </View>

          <View style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Info size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" color="secondary" style={{ 
              marginLeft: theme.spacing.sm,
              flex: 1,
              lineHeight: 18,
            }}>
              Auto-boost will automatically boost your newest listings when they&apos;re created. 
              Each boost costs 15 credits.
            </Text>
          </View>
        </View>
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
          Active Boosts
        </Text>

        {settings.activeBoosts.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {settings.activeBoosts.map((boost, index) => (
              <View
                key={boost.listingId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  borderBottomWidth: index < settings.activeBoosts.length - 1 ? 1 : 0,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <View style={{
                  backgroundColor: theme.colors.warning + '15',
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.sm,
                  marginRight: theme.spacing.md,
                }}>
                  <TrendingUp size={20} color={theme.colors.warning} />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '500' }}>
                    {boost.listingTitle}
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    marginTop: theme.spacing.xs,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Clock size={14} color={theme.colors.text.muted} />
                      <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                        {formatTimeRemaining(boost.endDate)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Zap size={14} color={theme.colors.text.muted} />
                      <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                        {boost.creditsUsed} credits
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Badge 
                  text="Boosted" 
                  variant="warning" 
                  size="small"
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={{
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
          }}>
            <Zap size={48} color={theme.colors.text.muted} style={{ marginBottom: theme.spacing.md }} />
            <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
              No active boosts
            </Text>
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
              {settings.enabled 
                ? 'Auto-boost will activate when you create new listings'
                : 'Enable auto-boost to automatically boost your listings'
              }
            </Text>
          </View>
        )}
      </View>

      {/* Next Boost Schedule */}
      {settings.enabled && settings.nextBoostDate && (
        <View style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.primary + '30',
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
          }}>
            <Calendar size={20} color={theme.colors.primary} />
            <Text variant="h4" style={{ 
              marginLeft: theme.spacing.sm,
              color: theme.colors.primary,
            }}>
              Next Auto-boost
            </Text>
          </View>
          
          <Text variant="body" color="secondary">
            Your next listing will be automatically boosted when created.
          </Text>
          
          <Text variant="bodySmall" color="muted" style={{ marginTop: theme.spacing.sm }}>
            Estimated cost: 15 credits • Duration: {settings.boostDuration} days
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
