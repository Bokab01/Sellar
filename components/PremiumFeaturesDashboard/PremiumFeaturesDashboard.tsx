import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { ListItem } from '@/components/ListItem/ListItem';
import { 
  Crown, 
  Star, 
  TrendingUp, 
  Megaphone,
  Palette,
  Home,
  Settings,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Target,
  Users
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  usage?: {
    current: number;
    limit: number;
    unit: string;
  };
}

interface HomepagePlacement {
  id: string;
  listingTitle: string;
  position: number;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
}

export function PremiumFeaturesDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [placements, setPlacements] = useState<HomepagePlacement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPremiumFeatures();
  }, []);

  const fetchPremiumFeatures = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Simulate fetching premium features data
      const mockFeatures: PremiumFeature[] = [
        {
          id: 'premium_branding',
          name: 'Premium Branding',
          description: 'Custom themes and enhanced visual styling for your listings',
          icon: <Palette size={20} color={theme.colors.primary} />,
          enabled: true,
          usage: {
            current: 3,
            limit: 10,
            unit: 'custom themes',
          },
        },
        {
          id: 'homepage_placement',
          name: 'Homepage Placement',
          description: 'Feature your listings prominently on the homepage',
          icon: <Home size={20} color={theme.colors.primary} />,
          enabled: true,
          usage: {
            current: 2,
            limit: 5,
            unit: 'active placements',
          },
        },
        {
          id: 'sponsored_posts',
          name: 'Sponsored Posts',
          description: 'Promote your posts in the community feed',
          icon: <Megaphone size={20} color={theme.colors.primary} />,
          enabled: true,
          usage: {
            current: 1,
            limit: 10,
            unit: 'sponsored posts/month',
          },
        },
        {
          id: 'advanced_targeting',
          name: 'Advanced Targeting',
          description: 'Target specific audiences with your promotions',
          icon: <Target size={20} color={theme.colors.primary} />,
          enabled: false,
        },
      ];

      const mockPlacements: HomepagePlacement[] = [
        {
          id: '1',
          listingTitle: 'iPhone 14 Pro Max - Like New',
          position: 2,
          startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          impressions: 1250,
          clicks: 89,
        },
        {
          id: '2',
          listingTitle: 'MacBook Air M2 - Excellent Condition',
          position: 4,
          startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          impressions: 890,
          clicks: 67,
        },
      ];

      setFeatures(mockFeatures);
      setPlacements(mockPlacements);
    } catch (error) {
      console.error('Error fetching premium features:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureId: string) => {
    try {
      setFeatures(prev => prev.map(feature => 
        feature.id === featureId 
          ? { ...feature, enabled: !feature.enabled }
          : feature
      ));

      // In a real implementation, you would update the backend here
      Alert.alert(
        'Feature Updated',
        'Premium feature settings have been updated.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update feature settings.');
    }
  };

  const getClickThroughRate = (placement: HomepagePlacement) => {
    return placement.impressions > 0 
      ? ((placement.clicks / placement.impressions) * 100).toFixed(1)
      : '0.0';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
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
      {/* Premium Features Overview */}
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
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}>
          <View style={{
            backgroundColor: theme.colors.primary + '15',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.sm,
            marginRight: theme.spacing.md,
          }}>
            <Crown size={24} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h4">Premium Features</Text>
            <Text variant="bodySmall" color="muted">
              Exclusive tools to grow your business
            </Text>
          </View>
          <Badge text="Premium" variant="primary" />
        </View>

        <View style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
          }}>
            <Sparkles size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ 
              marginLeft: theme.spacing.sm,
              fontWeight: '600',
              color: theme.colors.primary,
            }}>
              Premium Benefits Active
            </Text>
          </View>
          
          <Text variant="bodySmall" color="secondary">
            You have access to all premium features including custom branding, 
            homepage placement, sponsored posts, and priority support.
          </Text>
        </View>
      </View>

      {/* Feature Controls */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
          Feature Controls
        </Text>

        <View style={{ gap: theme.spacing.md }}>
          {features.map((feature, index) => (
            <View
              key={feature.id}
              style={{
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: index < features.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing.xs,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                }}>
                  {feature.icon}
                  <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {feature.name}
                    </Text>
                    <Text variant="bodySmall" color="muted">
                      {feature.description}
                    </Text>
                  </View>
                </View>
                
                <Button
                  variant={feature.enabled ? 'primary' : 'tertiary'}
                  size="small"
                  onPress={() => toggleFeature(feature.id)}
                >
                  <Text variant="bodySmall" style={{
                    color: feature.enabled ? theme.colors.surface : theme.colors.primary,
                  }}>
                    {feature.enabled ? 'ON' : 'OFF'}
                  </Text>
                </Button>
              </View>
              
              {feature.usage && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: theme.spacing.xs,
                  marginLeft: theme.spacing.lg + theme.spacing.md,
                }}>
                  <Text variant="caption" color="muted">
                    {feature.usage.current} / {feature.usage.limit} {feature.usage.unit}
                  </Text>
                  <View style={{
                    flex: 1,
                    height: 4,
                    backgroundColor: theme.colors.surfaceVariant,
                    borderRadius: 2,
                    marginLeft: theme.spacing.md,
                    marginRight: theme.spacing.md,
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${(feature.usage.current / feature.usage.limit) * 100}%`,
                      backgroundColor: theme.colors.primary,
                      borderRadius: 2,
                    }} />
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Homepage Placements */}
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
          <Text variant="h4">Homepage Placements</Text>
          <Button
            variant="tertiary"
            size="small"
            onPress={() => {
              // Navigate to placement management
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              Manage
            </Text>
          </Button>
        </View>

        {placements.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {placements.map((placement, index) => (
              <View
                key={placement.id}
                style={{
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                }}
              >
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: theme.spacing.sm,
                }}>
                  <Text variant="body" style={{ fontWeight: '500', flex: 1 }}>
                    {placement.listingTitle}
                  </Text>
                  <Badge 
                    text={`Position ${placement.position}`}
                    variant="primary"
                    size="small"
                  />
                </View>
                
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing.sm,
                }}>
                  <View>
                    <Text variant="bodySmall" color="muted">Impressions</Text>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {(placement.impressions || 0).toLocaleString()}
                    </Text>
                  </View>
                  
                  <View>
                    <Text variant="bodySmall" color="muted">Clicks</Text>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {placement.clicks}
                    </Text>
                  </View>
                  
                  <View>
                    <Text variant="bodySmall" color="muted">CTR</Text>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {getClickThroughRate(placement)}%
                    </Text>
                  </View>
                  
                  <View>
                    <Text variant="bodySmall" color="muted">Days Left</Text>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {getDaysRemaining(placement.endDate)}
                    </Text>
                  </View>
                </View>
                
                <Text variant="caption" color="muted">
                  {formatDate(placement.startDate)} - {formatDate(placement.endDate)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
          }}>
            <Home size={48} color={theme.colors.text.muted} style={{ marginBottom: theme.spacing.md }} />
            <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
              No active homepage placements
            </Text>
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
              Feature your best listings on the homepage for maximum visibility
            </Text>
          </View>
        )}
      </View>

      {/* Performance Insights */}
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
          Performance Insights
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            alignItems: 'center',
          }}>
            <TrendingUp size={24} color={theme.colors.success} />
            <Text variant="h4" style={{ fontWeight: '600', marginTop: theme.spacing.sm }}>
              +24%
            </Text>
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center' }}>
              Visibility Increase
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            alignItems: 'center',
          }}>
            <Users size={24} color={theme.colors.primary} />
            <Text variant="h4" style={{ fontWeight: '600', marginTop: theme.spacing.sm }}>
              2.1K
            </Text>
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center' }}>
              Total Impressions
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            alignItems: 'center',
          }}>
            <Star size={24} color={theme.colors.warning} />
            <Text variant="h4" style={{ fontWeight: '600', marginTop: theme.spacing.sm }}>
              4.8
            </Text>
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center' }}>
              Avg. Rating
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

        <View style={{ gap: theme.spacing.sm }}>
          <ListItem
            title="Create Sponsored Post"
            description="Promote a post in the community feed"
            leftIcon={<Megaphone size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // Navigate to sponsored post creation
            }}
            showChevron
          />
          
          <ListItem
            title="Request Homepage Placement"
            description="Feature a listing on the homepage"
            leftIcon={<Home size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // Navigate to homepage placement request
            }}
            showChevron
            style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
          />
          
          <ListItem
            title="Customize Branding"
            description="Update your premium themes and styling"
            leftIcon={<Palette size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // Navigate to branding customization
            }}
            showChevron
            style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
          />
          
          <ListItem
            title="Premium Settings"
            description="Configure all premium features"
            leftIcon={<Settings size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // Navigate to premium settings
            }}
            showChevron
            style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
          />
        </View>
      </View>
    </ScrollView>
  );
}
