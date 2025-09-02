import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { activateListingFeature, activateUserFeature } from '@/lib/featureActivation';
import { getFeatureByKey } from '@/constants/monetization';
import {
  Text,
  AppModal,
  Button,
  Badge,
  LoadingSkeleton,
} from '@/components';
import { 
  Zap, 
  Target, 
  RefreshCw, 
  MessageCircle, 
  Building, 
  BarChart3, 
  Headphones,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';

interface FeatureActivationModalProps {
  visible: boolean;
  onClose: () => void;
  featureKey: string;
  listingId?: string;
  listingTitle?: string;
  onSuccess?: () => void;
}

export function FeatureActivationModal({
  visible,
  onClose,
  featureKey,
  listingId,
  listingTitle,
  onSuccess,
}: FeatureActivationModalProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { balance, refreshCredits } = useMonetizationStore();
  
  const [activating, setActivating] = useState(false);
  const [feature, setFeature] = useState<any>(null);

  useEffect(() => {
    if (visible && featureKey) {
      const featureConfig = getFeatureByKey(featureKey);
      setFeature(featureConfig);
      refreshCredits();
    }
  }, [visible, featureKey]);

  const getFeatureIcon = (featureKey: string) => {
    const iconMap: Record<string, any> = {
      pulse_boost_24h: Zap,
      mega_pulse_7d: Zap,
      category_spotlight_3d: Target,
      ad_refresh: RefreshCw,
      auto_refresh_30d: RefreshCw,
      direct_whatsapp: MessageCircle,
      business_profile: Building,
      analytics_report: BarChart3,
      priority_support: Headphones,
    };
    return iconMap[featureKey] || Zap;
  };

  const getFeatureBenefits = (featureKey: string): string[] => {
    const benefitsMap: Record<string, string[]> = {
      pulse_boost_24h: [
        'Increase listing visibility by 200%',
        'Move to top of search results',
        'Active for 24 hours',
        'Get more views and inquiries'
      ],
      mega_pulse_7d: [
        'Increase listing visibility by 300%',
        'Premium placement in search',
        'Active for 7 full days',
        'Maximum exposure and engagement'
      ],
      category_spotlight_3d: [
        'Featured in category spotlight',
        'Highlighted with special badge',
        'Active for 3 days',
        'Stand out from competition'
      ],
      ad_refresh: [
        'Move listing to top instantly',
        'Refresh timestamp',
        'Immediate visibility boost',
        'One-time activation'
      ],
      auto_refresh_30d: [
        'Automatic daily refresh',
        'Always stay near the top',
        'Active for 30 days',
        'Set it and forget it'
      ],
      direct_whatsapp: [
        'Add WhatsApp contact button',
        'Direct messaging capability',
        'Increase response rates',
        'Permanent feature'
      ],
      business_profile: [
        'Unlock business features',
        'Professional profile badge',
        'Enhanced credibility',
        'Permanent upgrade'
      ],
      analytics_report: [
        'Detailed performance metrics',
        'View and engagement data',
        'Competitor insights',
        'Active for 30 days'
      ],
      priority_support: [
        'Fast-track support tickets',
        'Priority response times',
        'Dedicated support channel',
        'Active for 30 days'
      ],
    };
    return benefitsMap[featureKey] || [];
  };

  const handleActivate = async () => {
    if (!user || !feature) return;

    if (balance < feature.credits) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${feature.credits} credits to activate this feature. You currently have ${balance} credits.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => {
            onClose();
            // Navigate to buy credits screen
          }},
        ]
      );
      return;
    }

    try {
      setActivating(true);

      let result;
      if (listingId) {
        result = await activateListingFeature(featureKey, listingId, user.id);
      } else {
        result = await activateUserFeature(featureKey, user.id);
      }

      if (result.success) {
        await refreshCredits();
        
        Alert.alert(
          'Feature Activated!',
          `${feature.name} has been successfully activated.`,
          [
            { text: 'OK', onPress: () => {
              onClose();
              onSuccess?.();
            }}
          ]
        );
      } else {
        Alert.alert('Activation Failed', result.error || 'Failed to activate feature');
      }
    } catch (error: any) {
      console.error('Feature activation error:', error);
      Alert.alert('Error', 'Failed to activate feature. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  if (!feature) {
    return (
      <AppModal
        visible={visible}
        onClose={onClose}
        title="Loading Feature"
        size="md"
      >
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={60} style={{ marginBottom: theme.spacing.md }} />
          <LoadingSkeleton width="80%" height={40} style={{ marginBottom: theme.spacing.md }} />
          <LoadingSkeleton width="60%" height={40} />
        </View>
      </AppModal>
    );
  }

  const IconComponent = getFeatureIcon(featureKey);
  const benefits = getFeatureBenefits(featureKey);
  const hasEnoughCredits = balance >= feature.credits;

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Activate Feature"
      size="lg"
      primaryAction={{
        text: activating ? 'Activating...' : `Activate for ${feature.credits} Credits`,
        onPress: handleActivate,
        loading: activating,
        disabled: !hasEnoughCredits,
      }}
      secondaryAction={{
        text: 'Cancel',
        onPress: onClose,
      }}
    >
      <ScrollView style={{ maxHeight: 500 }}>
        <View style={{ gap: theme.spacing.lg }}>
          {/* Feature Header */}
          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.primary + '20',
                borderRadius: theme.borderRadius.full,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.md,
              }}
            >
              <IconComponent size={48} color={theme.colors.primary} />
            </View>
            
            <Text variant="h3" style={{ fontWeight: '700', marginBottom: theme.spacing.sm, textAlign: 'center' }}>
              {feature.name}
            </Text>
            
            <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
              {feature.description}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Badge
                text={`${feature.credits} Credits`}
                variant="primary"
                icon={<Zap size={12} color={theme.colors.primary} />}
              />
              <Badge
                text={feature.duration}
                variant="secondary"
                icon={<Clock size={12} color={theme.colors.text.secondary} />}
              />
            </View>
          </View>

          {/* Target Listing */}
          {listingId && listingTitle && (
            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
              }}
            >
              <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                Target Listing
              </Text>
              <Text variant="bodySmall" color="secondary">
                {listingTitle}
              </Text>
            </View>
          )}

          {/* Feature Benefits */}
          <View>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
              What You'll Get
            </Text>
            
            <View style={{ gap: theme.spacing.sm }}>
              {benefits.map((benefit, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: theme.spacing.sm,
                  }}
                >
                  <CheckCircle size={16} color={theme.colors.success} style={{ marginTop: 2 }} />
                  <Text variant="bodySmall" style={{ flex: 1 }}>
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Credit Balance Check */}
          <View
            style={{
              backgroundColor: hasEnoughCredits 
                ? theme.colors.success + '10' 
                : theme.colors.destructive + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: hasEnoughCredits 
                ? theme.colors.success + '30' 
                : theme.colors.destructive + '30',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              {hasEnoughCredits ? (
                <CheckCircle size={20} color={theme.colors.success} />
              ) : (
                <AlertCircle size={20} color={theme.colors.destructive} />
              )}
              <Text 
                variant="body" 
                style={{ 
                  marginLeft: theme.spacing.sm, 
                  fontWeight: '600',
                  color: hasEnoughCredits ? theme.colors.success : theme.colors.destructive
                }}
              >
                {hasEnoughCredits ? 'Ready to Activate' : 'Insufficient Credits'}
              </Text>
            </View>
            
            <Text variant="bodySmall" color="secondary">
              {hasEnoughCredits 
                ? `You have ${balance} credits. After activation, you'll have ${balance - feature.credits} credits remaining.`
                : `You need ${feature.credits} credits but only have ${balance}. Purchase more credits to continue.`
              }
            </Text>
          </View>

          {/* Feature Preview */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>
              💡 Tip: Features are activated immediately and cannot be refunded. 
              Make sure you're ready to maximize the benefits!
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}
