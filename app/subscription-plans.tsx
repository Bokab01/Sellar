import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  PriceDisplay,
  Badge,
  LoadingSkeleton,
  Toast,
  LinearProgress,
  PaymentModal,
  BusinessBadge,
  TrialBadge,
  AppModal,
} from '@/components';
import type { PaymentRequest } from '@/components';
import { Building, Star, Crown, Check, Zap, ChartBar as BarChart, Headphones, Award, TrendingUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Subscription plan type from database
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_ghs: number;
  billing_cycle: string;
  features: any;
  popular: boolean;
  display_order: number;
  icon_key: string | null;
  trial_days: number;
  max_listings: number | null;
  highlights: string[];
  badge_text: string | null;
  is_active: boolean;
}

export default function SubscriptionPlansScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    currentPlan, 
    entitlements,
    balance,
    loading, 
    refreshSubscription, 
    subscribeToPlan,
    upgradeToBusinessWithCredits,
    getBusinessPlanCreditCost,
    cancelSubscription,
    refreshCredits,
    // Trial functions
    isOnTrial,
    trialEndsAt,
    hasUsedTrial,
    startTrial,
    checkTrialEligibility,
    convertTrialToPaid,
    cancelTrial,
  } = useMonetizationStore();
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [isEligibleForTrial, setIsEligibleForTrial] = useState(false);
  const [showTrialConfirmModal, setShowTrialConfirmModal] = useState(false);
  const [showUpgradeConfirmModal, setShowUpgradeConfirmModal] = useState(false);

  // Fetch subscription plans from database
  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching subscription plans:', error);
      setToastMessage('Failed to load subscription plans. Please try again.');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    refreshSubscription();
    refreshCredits();
    checkTrialEligibility().then(setIsEligibleForTrial);
    fetchPlans();
  }, []);

  const getPlanIcon = (planId: string) => {
    // Unified plan gets a premium crown icon
    return <Crown size={40} color={theme.colors.primary} />;
  };

  const handleSubscribe = async (planId: string) => {
    setSubscribing(true);
    setSelectedPlan(planId);

    try {
      // Find the selected plan
      const selectedPlan = plans.find(plan => plan.id === planId);
      if (!selectedPlan) {
        throw new Error('Plan not found');
      }

      // Create payment request for subscription
      const request: PaymentRequest = {
        amount: selectedPlan.price_ghs, // Use plan price
        email: user?.email || 'user@example.com',
        purpose: 'subscription',
        purpose_id: planId,
        metadata: {
          plan_id: planId,
          plan_name: selectedPlan.name,
          billing_cycle: 'monthly',
        },
      };

      setPaymentRequest(request);
      setShowPaymentModal(true);
    } catch (error: any) {
      setToastMessage('Failed to initialize payment');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setSubscribing(false);
      setSelectedPlan(null);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            console.log('🔄 User confirmed cancellation');
            console.log('📋 Current subscription before cancellation:', currentPlan);
            
            const result = await cancelSubscription();
            console.log('📋 Cancellation result:', result);
            
            if (result.success) {
              console.log('✅ Cancellation successful, showing success toast');
              setToastMessage('Subscription cancelled successfully');
              setToastVariant('success');
              setShowToast(true);
              
              // Force refresh the subscription data
              console.log('🔄 Forcing subscription refresh...');
              await refreshSubscription();
              console.log('📋 Subscription after refresh:', currentPlan);
            } else {
              console.log('❌ Cancellation failed:', result.error);
              setToastMessage('Failed to cancel subscription');
              setToastVariant('error');
              setShowToast(true);
            }
          },
        },
      ]
    );
  };

  const handlePaymentSuccess = (reference: string) => {
    setToastMessage('Payment successful! Your subscription will be activated shortly.');
    setToastVariant('success');
    setShowToast(true);
    
    // Refresh subscription after a short delay to allow webhook processing
    setTimeout(() => {
      refreshSubscription();
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setToastMessage(error || 'Payment failed. Please try again.');
    setToastVariant('error');
    setShowToast(true);
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPaymentRequest(null);
  };

  const handleCreditUpgrade = async () => {
    const creditsRequired = getBusinessPlanCreditCost();
    
    Alert.alert(
      'Upgrade with Credits',
      `Upgrade to Sellar Pro for ${creditsRequired.toLocaleString()} credits?\n\nYou currently have ${balance.toLocaleString()} credits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          style: 'default',
          onPress: async () => {
            setSubscribing(true);
            setSelectedPlan('sellar_pro');
            
            try {
              const result = await upgradeToBusinessWithCredits();
              
              if (result.success) {
                setToastMessage('Successfully upgraded to Sellar Pro! Welcome to premium features.');
                setToastVariant('success');
                setShowToast(true);
              } else {
                setToastMessage(result.error || 'Failed to upgrade with credits');
                setToastVariant('error');
                setShowToast(true);
              }
            } catch (error) {
              setToastMessage('An unexpected error occurred');
              setToastVariant('error');
              setShowToast(true);
            } finally {
              setSubscribing(false);
              setSelectedPlan(null);
            }
          },
        },
      ]
    );
  };

  const handleStartTrialClick = () => {
    setShowTrialConfirmModal(true);
  };

  const handleStartTrial = async () => {
    setShowTrialConfirmModal(false);
    setSubscribing(true);
    setSelectedPlan('sellar_pro');

    try {
      const result = await startTrial('Sellar Pro');
      
      if (result.success) {
        setToastMessage('🎉 Welcome to your 14-day free trial! Enjoy all premium features.');
        setToastVariant('success');
        setShowToast(true);
        
        // Refresh subscription to show trial status
        await refreshSubscription();
      } else {
        setToastMessage(result.error || 'Failed to start trial');
        setToastVariant('error');
        setShowToast(true);
      }
    } catch (error: any) {
      setToastMessage(error.message || 'An unexpected error occurred');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setSubscribing(false);
      setSelectedPlan(null);
    }
  };

  const handleConvertTrialClick = () => {
    setShowUpgradeConfirmModal(true);
  };

  const handleConvertTrial = async () => {
    setShowUpgradeConfirmModal(false);
    setSubscribing(true);

    try {
      const result = await convertTrialToPaid();
      
      if (result.success && result.paymentUrl) {
        // Open payment URL
        const request: PaymentRequest = {
          amount: plans[0]?.price_ghs || 400,
          email: user?.email || 'user@example.com',
          purpose: 'subscription' as const,
          purpose_id: currentPlan?.id || '',
          metadata: {
            subscription_id: currentPlan?.id,
            is_trial_conversion: true,
          },
        };

        setPaymentRequest(request);
        setShowPaymentModal(true);
      } else {
        setToastMessage(result.error || 'Failed to initialize payment');
        setToastVariant('error');
        setShowToast(true);
      }
    } catch (error: any) {
      setToastMessage(error.message || 'An unexpected error occurred');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Sellar Pro Plan"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={300} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  const isCurrentPlan = (planId: string) => {
    return currentPlan?.subscription_plans?.name?.toLowerCase().replace(' ', '_') === planId;
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Sellar Pro Plan"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Container>
          {/* Current Plan Status */}
          {currentPlan && !isOnTrial && (
            console.log('📋 Rendering current plan:', currentPlan),
            <View
              style={{
                backgroundColor: theme.colors.success + '10',
                borderColor: theme.colors.success,
                borderWidth: 1,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.xl,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <Check size={24} color={theme.colors.success} />
                <Text variant="h4" style={{ color: theme.colors.success, fontWeight: '600' }}>
                  Active Subscription
                </Text>
              </View>
              
              <Text variant="body" style={{ marginBottom: theme.spacing.sm }}>
                {currentPlan.subscription_plans?.name}
              </Text>
              
              <Text variant="bodySmall" color="secondary">
                {currentPlan.status === 'cancelled' 
                  ? `Expires on ${new Date(currentPlan.current_period_end).toLocaleDateString()}`
                  : `Renews on ${new Date(currentPlan.current_period_end).toLocaleDateString()}`
                }
              </Text>

              {currentPlan.status === 'cancelled' ? (
                <View style={{ 
                  backgroundColor: theme.colors.warning + '20',
                  borderColor: theme.colors.warning,
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  marginTop: theme.spacing.md,
                }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.warning, fontWeight: '600' }}>
                    Subscription Cancelled
                  </Text>
                  <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.xs }}>
                    Your subscription will remain active until the end of your current billing period.
                  </Text>
                </View>
              ) : (
                <Button
                  variant="tertiary"
                  onPress={handleCancelSubscription}
                  size="sm"
                  style={{ marginTop: theme.spacing.md, alignSelf: 'flex-start' }}
                >
                  Cancel Subscription
                </Button>
              )}
            </View>
          )}

          {/* Plans */}
          <View style={{ gap: theme.spacing.xl }}>
            {loadingPlans ? (
              // Loading skeletons
              Array.from({ length: 1 }).map((_, index) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={600}
                  borderRadius={theme.borderRadius.lg}
                />
              ))
            ) : (
              plans.map((plan) => (
              <View
                key={plan.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  borderWidth: 2,
                  borderColor: plan.popular ? theme.colors.primary : theme.colors.border,
                  marginBottom: theme.spacing.xl,
                  overflow: 'hidden',
                  position: 'relative',
                  ...theme.shadows.sm,
                }}
              >
                {/* Dynamic Badges */}
                {(() => {
                  const hasCurrentPlan = !!currentPlan;
                  const isCurrentUserPlan = isCurrentPlan(plan.id);
                  const shouldShowRecommended = plan.popular && !hasCurrentPlan;
                  const shouldShowCurrentPlan = isCurrentUserPlan;

                  if (shouldShowCurrentPlan) {
                    return (
                      <View
                        style={{
                          backgroundColor: theme.colors.success,
                          paddingVertical: theme.spacing.sm,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          variant="caption"
                          style={{
                            color: theme.colors.successForeground,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                          }}
                        >
                          Current Plan
                        </Text>
                      </View>
                    );
                  }

                  /* if (shouldShowRecommended) {
                    return (
                      <View
                        style={{
                          backgroundColor: theme.colors.primary,
                          paddingVertical: theme.spacing.sm,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          variant="caption"
                          style={{
                            color: theme.colors.primaryForeground,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                          }}
                        >
                          Recommended
                        </Text>
                      </View>
                    );
                  } */

                  return null;
                })()}

                <View style={{ padding: theme.spacing.xl }}>
                  {/* Plan Header */}
                  <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
                    {getPlanIcon(plan.id)}
                    
                    <Text variant="h2" style={{ fontWeight: '600', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
                      {plan.name}
                    </Text>
                    
                    <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
                      {plan.description}
                    </Text>
                    
                    <PriceDisplay
                      amount={plan.price_ghs}
                      size="xl"
                      style={{ marginBottom: theme.spacing.sm }}
                    />
                    
                    <Text variant="caption" color="muted">
                      per month
                    </Text>
                  </View>

                  {/* Features */}
                  <View style={{ marginBottom: theme.spacing.xl }}>
                    <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
                      What&apos;s Included
                    </Text>
                    
                    <View style={{ gap: theme.spacing.md }}>
                      {(plan.highlights || []).map((highlight, index) => (
                        <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
                          <Check size={16} color={theme.colors.success} style={{ marginTop: 2 }} />
                          <Text variant="body" style={{ flex: 1, lineHeight: 22 }}>
                            {highlight}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Badge */}
                  {plan.badge_text && (
                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.xl, flexWrap: 'wrap' }}>
                      <BusinessBadge
                        type="business"
                        size="small"
                        variant="compact"
                        showIcon={true}
                        showText={true}
                      />
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={{ gap: theme.spacing.md }}>
                    {/* Trial Button - Show if eligible and not on trial */}
                    {isEligibleForTrial && !isOnTrial && !currentPlan && (
                      <Button
                        variant="primary"
                        onPress={handleStartTrialClick}
                        loading={subscribing && selectedPlan === plan.id}
                        disabled={subscribing}
                        fullWidth
                        size="lg"
                      >
                        {subscribing && selectedPlan === plan.id 
                          ? 'Starting Trial...' 
                          : '🎉 Start 14-Day Free Trial'
                        }
                      </Button>
                    )}

                    {/* Subscribe Button - Show if on trial or not eligible for trial */}
                    {(!isEligibleForTrial || isOnTrial || currentPlan) && (
                      <Button
                        variant={isCurrentPlan(plan.id) ? "tertiary" : isOnTrial ? "primary" : "secondary"}
                        onPress={
                          isCurrentPlan(plan.id) 
                            ? undefined 
                            : isOnTrial 
                            ? handleConvertTrialClick 
                            : () => handleSubscribe(plan.id)
                        }
                        loading={subscribing && selectedPlan === plan.id}
                        disabled={subscribing || (isCurrentPlan(plan.id) && !isOnTrial)}
                        fullWidth
                        size="lg"
                      >
                        {isCurrentPlan(plan.id) && !isOnTrial
                          ? 'Current Plan' 
                          : isOnTrial
                          ? 'Upgrade to Paid Subscription'
                          : subscribing && selectedPlan === plan.id 
                          ? 'Processing...' 
                          : `Subscribe for GHS ${plan.price_ghs}/month`
                        }
                      </Button>
                    )}

                    {/* Credit Upgrade Option - Hide if on trial */}
                    {!isCurrentPlan(plan.id) && !isOnTrial && (
                      <View
                        style={{
                          backgroundColor: theme.colors.surfaceVariant,
                          borderRadius: theme.borderRadius.md,
                          padding: theme.spacing.lg,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                            <Zap size={16} color={theme.colors.warning} />
                            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                              Pay with Credits
                            </Text>
                          </View>
                          <Text variant="caption" color="muted">
                            {getBusinessPlanCreditCost().toLocaleString()} credits
                          </Text>
                        </View>
                        
                        <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                          Use your earned credits instead of cash. You have {balance.toLocaleString()} credits available.
                        </Text>
                        
                        <Button
                          variant="secondary"
                          onPress={handleCreditUpgrade}
                          loading={subscribing && selectedPlan === plan.id}
                          disabled={subscribing || balance < getBusinessPlanCreditCost()}
                          fullWidth
                          size="md"
                        >
                          {balance < getBusinessPlanCreditCost() 
                            ? `Need ${(getBusinessPlanCreditCost() - balance).toLocaleString()} more credits`
                            : `Upgrade with ${getBusinessPlanCreditCost().toLocaleString()} Credits`
                          }
                        </Button>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
            )}
          </View>

          {/* FAQ */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
              Frequently Asked Questions
            </Text>
            
            <View style={{ gap: theme.spacing.lg }}>
              <View>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                  Can I cancel anytime?
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Yes, you can cancel your subscription at any time. You&apos;ll keep access to Sellar Pro features until the end of your current billing period.
                </Text>
              </View>
              
              <View>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                  How does auto-refresh work?
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Your listings automatically refresh every 2 hours, keeping them at the top of search results. No manual intervention needed!
                </Text>
              </View>
              
              <View>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                  Can I upgrade or downgrade?
                </Text>
                <Text variant="bodySmall" color="secondary">
                  No, you cannot upgrade or downgrade your plan. You can only cancel your subscription since it the only premium plan available.
                </Text>
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>

      {/* Trial Confirmation Modal */}
      <AppModal
        visible={showTrialConfirmModal}
        onClose={() => setShowTrialConfirmModal(false)}
        title="Start Your Free Trial?"
        size="lg"
        position="bottom"
        primaryAction={{
          text: 'Yes, Start Free Trial',
          onPress: handleStartTrial,
          loading: subscribing,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowTrialConfirmModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          {/* Icon */}
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary + '20',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Crown size={40} color={theme.colors.primary} />
            </View>
          </View>

          {/* Message */}
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="body" style={{ textAlign: 'center', lineHeight: 22 }}>
              You're about to start a <Text style={{ fontWeight: '600' }}>14-day free trial</Text> of Sellar Pro.
            </Text>
            
            <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center', lineHeight: 20 }}>
              No payment required now. You'll get instant access to all premium features.
            </Text>
          </View>

          {/* Features Preview */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              gap: theme.spacing.sm,
            }}
          >
            <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              What's included:
            </Text>
            
            {plans.length > 0 && plans[0].highlights && plans[0].highlights.length > 0 ? (
              plans[0].highlights.map((highlight, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
                  <Check size={14} color={theme.colors.success} style={{ marginTop: 2 }} />
                  <Text variant="caption" color="secondary" style={{ flex: 1, lineHeight: 18 }}>
                    {highlight}
                  </Text>
                </View>
              ))
            ) : (
              // Fallback to hardcoded features if database fetch fails
              [
                'Video uploads for listings',
                'Auto-refresh every 2 hours',
                'Advanced analytics',
                'Priority support',
                'Unlimited active listings',
              ].map((feature, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
                  <Check size={14} color={theme.colors.success} style={{ marginTop: 2 }} />
                  <Text variant="caption" color="secondary" style={{ flex: 1, lineHeight: 18 }}>
                    {feature}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Important Note */}
          <View
            style={{
              backgroundColor: theme.colors.warning + '10',
              borderColor: theme.colors.warning + '30',
              borderWidth: 1,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="caption" style={{ textAlign: 'center', lineHeight: 18 }}>
              ⚠️ You can only use the free trial once. After 14 days, you can subscribe to continue enjoying premium features.
            </Text>
          </View>
        </View>
      </AppModal>

      {/* Upgrade to Paid Subscription Confirmation Modal */}
      <AppModal
        visible={showUpgradeConfirmModal}
        onClose={() => setShowUpgradeConfirmModal(false)}
        title="Upgrade to Paid Subscription"
        size="md"
        position="bottom"
      >
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.surface }}>
          <View style={{ gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg }}>
            {/* Icon */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary + '15',
                justifyContent: 'center',
                alignItems: 'center',
                alignSelf: 'center',
              }}
            >
              <Crown size={32} color={theme.colors.primary} />
            </View>

            {/* Message */}
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="h3" style={{ textAlign: 'center' }}>
                Continue Your Pro Journey
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
                Convert your free trial to a paid subscription and keep enjoying all Sellar Pro benefits without interruption.
              </Text>
            </View>

            {/* Price Info */}
            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                alignItems: 'center',
              }}
            >
              <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                Monthly Subscription
              </Text>
              <PriceDisplay
                amount={plans[0]?.price_ghs || 4}
                size="lg"
              />
              <Text variant="caption" color="muted">
                per month
              </Text>
            </View>

            {/* Features List */}
            <View style={{ gap: theme.spacing.sm }}>
              {[
                { icon: Zap, text: 'Auto-refresh every 2 hours' },
                { icon: TrendingUp, text: 'Unlimited listings' },
                { icon: Crown, text: 'Priority support, video uploads, analytics & more' },
              ].map((feature, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    backgroundColor: theme.colors.surfaceVariant,
                    padding: theme.spacing.sm,
                    borderRadius: theme.borderRadius.md,
                  }}
                >
                  <feature.icon size={20} color={theme.colors.primary} />
                  <Text variant="body" style={{ flex: 1 }}>
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Trial Info */}
            {trialEndsAt && (
              <View
                style={{
                  backgroundColor: theme.colors.info + '10',
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.info + '30',
                }}
              >
                <Text variant="bodySmall" style={{ textAlign: 'center', lineHeight: 20 }}>
                  💡 Your trial continues until {new Date(trialEndsAt).toLocaleDateString()}. Upgrade now to ensure seamless access.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ gap: theme.spacing.sm }}>
              <Button
                variant="primary"
                onPress={handleConvertTrial}
                loading={subscribing}
                disabled={subscribing}
                style={{
                  width: '100%',
                }}
              >
                {subscribing ? 'Processing...' : 'Continue to Payment'}
              </Button>

              <Button
                variant="outline"
                onPress={() => setShowUpgradeConfirmModal(false)}
                disabled={subscribing}
                style={{
                  width: '100%',
                }}
              >
                Maybe Later
              </Button>
            </View>
          </View>
        </SafeAreaView>
      </AppModal>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={handlePaymentClose}
        paymentRequest={paymentRequest}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}
