import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { AppModal } from '@/components/Modal/Modal';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { FEATURE_CATALOG, getFeatureByKey, getFeatureCost, getProBenefit, BUSINESS_PLANS } from '@/constants/monetization';
import { 
  Zap, 
  Rocket, 
  Target, 
  RefreshCw, 
  Sparkles, 
  Flame,
  Crown,
  CreditCard,
  Info,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react-native';

interface ListingFeatureSelectorProps {
  visible: boolean;
  onClose: () => void;
  onFeaturesSelected: (selectedFeatures: SelectedFeature[]) => void;
  listingTitle?: string;
}

interface SelectedFeature {
  key: string;
  name: string;
  credits: number;
  duration: string;
  description: string;
}

interface FeatureCardProps {
  featureKey: string;
  feature: any;
  isSelected: boolean;
  onToggle: () => void;
  canAfford: boolean;
  isBusinessPlan: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  featureKey,
  feature,
  isSelected,
  onToggle,
  canAfford,
  isBusinessPlan
}) => {
  const { theme } = useTheme();

  const getFeatureIcon = (key: string) => {
    switch (key) {
      case 'pulse_boost_24h': return <Zap size={24} color={theme.colors.warning} />;
      case 'mega_pulse_7d': return <Rocket size={24} color={theme.colors.primary} />;
      case 'category_spotlight_3d': return <Target size={24} color={theme.colors.secondary} />;
      case 'ad_refresh': return <RefreshCw size={24} color={theme.colors.success} />;
      case 'listing_highlight': return <Sparkles size={24} color={theme.colors.warning} />;
      case 'urgent_badge': return <Flame size={24} color={theme.colors.error} />;
      default: return <Zap size={24} color={theme.colors.primary} />;
    }
  };

  const getBenefits = (key: string) => {
    const baseBenefits = {
      'pulse_boost_24h': ['2x visibility for 24 hours', 'Higher search ranking', 'More views & inquiries'],
      'mega_pulse_7d': ['5x visibility for 7 days', 'Top search results', 'Maximum exposure'],
      'category_spotlight_3d': ['Featured in category', '3 days of prominence', 'Category page highlight'],
      'ad_refresh': ['Move to top instantly', 'Fresh timestamp', 'Renewed visibility'],
      'listing_highlight': ['Golden border highlight', '7 days of distinction', 'Stands out visually'],
      'urgent_badge': ['Red "Urgent Sale" badge', '3 days of urgency', 'Attracts quick buyers'],
    };
    
    const benefits = baseBenefits[key as keyof typeof baseBenefits] || ['Enhanced visibility', 'Better performance', 'More engagement'];
    
    // Add Pro-specific benefits
    if (isBusinessPlan) {
      const proBenefit = getProBenefit(key);
      if (proBenefit) {
        return [...benefits, `✨ ${proBenefit} (Sellar Pro)`];
      }
    }
    
    return benefits;
  };

  const credits = getFeatureCost(featureKey, isBusinessPlan);
  const proBenefit = getProBenefit(featureKey);

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={!canAfford && !isBusinessPlan}
      style={{
        backgroundColor: isSelected ? theme.colors.primary + '10' : theme.colors.surface,
        borderWidth: 2,
        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        opacity: (!canAfford && !isBusinessPlan) ? 0.6 : 1,
        ...theme.shadows.sm,
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
        <View style={{ marginRight: theme.spacing.md }}>
          {getFeatureIcon(featureKey)}
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <Text variant="h4" style={{ flex: 1 }}>
              {feature.name}
            </Text>
            {isSelected && (
              <CheckCircle size={20} color={theme.colors.primary} />
            )}
          </View>
          
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
            {feature.description}
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {/* Pricing - same for all users */}
            <Badge 
              text={`${credits} credits`} 
              variant="primary" 
              size="sm"
            />
            
            <Badge 
              text={feature.duration} 
              variant="neutral" 
              size="sm"
              leftIcon={<Clock size={12} color={theme.colors.text.secondary} />}
            />
            
            {/* Pro benefit badge */}
            {isBusinessPlan && proBenefit && (
              <Badge 
                text="Pro Benefit" 
                variant="success" 
                size="sm"
              />
            )}
          </View>
        </View>
      </View>
      
      {/* Benefits List */}
      <View style={{ marginLeft: theme.spacing.xl }}>
        {getBenefits(featureKey).map((benefit, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <View style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.primary,
              marginRight: theme.spacing.sm
            }} />
            <Text variant="caption" color="secondary">
              {benefit}
            </Text>
          </View>
        ))}
      </View>
      
      {!canAfford && !isBusinessPlan && (
        <View style={{
          marginTop: theme.spacing.sm,
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.error + '10',
          borderRadius: theme.borderRadius.sm,
        }}>
          <Text variant="caption" color="error">
            Insufficient credits. Need {getFeatureCost(featureKey, isBusinessPlan)} credits.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export function ListingFeatureSelector({
  visible,
  onClose,
  onFeaturesSelected,
  listingTitle = 'your listing'
}: ListingFeatureSelectorProps) {
  const { theme } = useTheme();
  const { 
    balance, 
    hasBusinessPlan, 
    currentPlan, 
    entitlements,
    refreshCredits,
    refreshSubscription 
  } = useMonetizationStore();

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      refreshCredits();
      refreshSubscription();
    }
  }, [visible]);

  const handleFeatureToggle = (featureKey: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureKey)
        ? prev.filter(key => key !== featureKey)
        : [...prev, featureKey]
    );
  };

  const getTotalCost = () => {
    const isBusinessUser = hasBusinessPlan();
    return selectedFeatures.reduce((total, key) => {
      return total + getFeatureCost(key, isBusinessUser);
    }, 0);
  };

  const canAffordFeature = (credits: number) => {
    return balance >= credits;
  };

  const handleApplyFeatures = () => {
    const totalCost = getTotalCost();
    
    if (selectedFeatures.length === 0) {
      Alert.alert('No Features Selected', 'Please select at least one feature to apply to your listing.');
      return;
    }

    if (!hasBusinessPlan() && balance < totalCost) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${totalCost} credits but only have ${balance}. Would you like to purchase more credits?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => {
            onClose();
            // Navigate to buy credits screen
          }}
        ]
      );
      return;
    }

    const features: SelectedFeature[] = selectedFeatures.map(key => {
      const feature = getFeatureByKey(key);
      const isBusinessUser = hasBusinessPlan();
      return {
        key,
        name: feature?.name || key,
        credits: getFeatureCost(key, isBusinessUser),
        duration: feature?.duration || '24 hours',
        description: feature?.description || ''
      };
    });

    onFeaturesSelected(features);
    onClose();
  };

  const getBusinessPlanBenefits = () => {
    if (!hasBusinessPlan() || !currentPlan) return null;

    const plan = BUSINESS_PLANS.find(p => p.id === currentPlan.plan_id);
    if (!plan) return null;

    return (
      <View style={{
        backgroundColor: theme.colors.warning + '10',
        borderWidth: 1,
        borderColor: theme.colors.warning,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <Crown size={24} color={theme.colors.warning} />
          <Text variant="h4" style={{ marginLeft: theme.spacing.sm, color: theme.colors.warning }}>
            {plan.name} Plan Active
          </Text>
        </View>
        
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
          Your business plan includes special benefits:
        </Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {entitlements?.monthlyCredits > 0 && (
            <Badge text={`${entitlements.monthlyCredits} monthly credits`} variant="warning" size="sm" />
          )}
          {entitlements?.autoBoost && (
            <Badge text="Auto-boost listings" variant="warning" size="sm" />
          )}
          {entitlements?.prioritySupport && (
            <Badge text="Priority support" variant="warning" size="sm" />
          )}
        </View>
      </View>
    );
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Boost Your Listing"
      position='bottom'
      size='lg'
    >
      <View style={{ height: 500 }}>
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {/* Header */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
              Make {listingTitle} stand out
            </Text>
            <Text variant="body" color="secondary">
              Choose features to increase visibility and attract more buyers
            </Text>
          </View>

          {/* Credit Balance */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.primary + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CreditCard size={20} color={theme.colors.primary} />
              <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
                Available Credits
              </Text>
            </View>
            <Text variant="h4" color="primary">
              {balance.toLocaleString()}
            </Text>
          </View>

          {/* Business Plan Benefits */}
          {getBusinessPlanBenefits()}

          {/* Feature Selection */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Available Features
            </Text>
            
            {Object.entries(FEATURE_CATALOG).map(([key, feature]) => (
              <FeatureCard
                key={key}
                featureKey={key}
                feature={feature}
                isSelected={selectedFeatures.includes(key)}
                onToggle={() => handleFeatureToggle(key)}
                canAfford={canAffordFeature(getFeatureCost(key, hasBusinessPlan()))}
                isBusinessPlan={hasBusinessPlan()}
              />
            ))}
          </View>

          {/* Summary */}
          {selectedFeatures.length > 0 && (
            <View style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
            }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Selection Summary
              </Text>
              
              {selectedFeatures.map(key => {
                const feature = getFeatureByKey(key);
                return (
                  <View key={key} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: theme.spacing.sm,
                  }}>
                    <Text variant="body">{feature?.name}</Text>
                    <Text variant="body" color="primary">
                      {getFeatureCost(key, hasBusinessPlan())} credits
                    </Text>
                  </View>
                );
              })}
              
              <View style={{
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                paddingTop: theme.spacing.sm,
                marginTop: theme.spacing.sm,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Text variant="h4">Total Cost</Text>
                <Text variant="h4" color="primary">
                  {getTotalCost()} credits
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Button
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1 }}
            >
              Skip for Now
            </Button>
            <Button
              variant="primary"
              onPress={handleApplyFeatures}
              style={{ flex: 1 }}
              disabled={selectedFeatures.length === 0}
              loading={loading}
            >
              Apply Features
            </Button>
          </View>

          {/* Help Text */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.info + '10',
            borderRadius: theme.borderRadius.md,
          }}>
            <Info size={16} color={theme.colors.info} style={{ marginRight: theme.spacing.sm, marginTop: 2 }} />
            <Text variant="caption" color="secondary" style={{ flex: 1 }}>
              Features will be applied immediately after your listing is published. You can always add more features later from your listing management page.
            </Text>
          </View>
        </ScrollView>
      </View>
    </AppModal>
  );
}
