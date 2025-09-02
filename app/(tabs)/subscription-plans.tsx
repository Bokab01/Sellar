import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { BUSINESS_PLANS } from '@/constants/monetization';
import { router } from 'expo-router';
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
} from '@/components';
import type { PaymentRequest } from '@/components';
import { Building, Star, Crown, Check, Zap, ChartBar as BarChart, Headphones, Award } from 'lucide-react-native';

export default function SubscriptionPlansScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    currentPlan, 
    entitlements,
    loading, 
    refreshSubscription, 
    subscribeToPlan,
    cancelSubscription,
  } = useMonetizationStore();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);

  useEffect(() => {
    refreshSubscription();
  }, []);

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter_business': return <Building size={40} color={theme.colors.primary} />;
      case 'pro_business': return <Star size={40} color={theme.colors.warning} />;
      case 'premium_business': return <Crown size={40} color={theme.colors.success} />;
      default: return <Building size={40} color={theme.colors.text.muted} />;
    }
  };

  const handleSubscribe = async (planId: string) => {
    setSubscribing(true);
    setSelectedPlan(planId);

    try {
      // Find the selected plan
      const selectedPlan = BUSINESS_PLANS.find(plan => plan.id === planId);
      if (!selectedPlan) {
        throw new Error('Plan not found');
      }

      // Create payment request for subscription
      const request: PaymentRequest = {
        amount: selectedPlan.priceMonthly, // Use monthly price
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
            const result = await cancelSubscription();
            if (result.success) {
              setToastMessage('Subscription cancelled successfully');
              setToastVariant('success');
              setShowToast(true);
            } else {
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

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Business Plans"
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
        title="Business Plans"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Container>
          {/* Current Plan Status */}
          {currentPlan && (
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
                Renews on {new Date(currentPlan.current_period_end).toLocaleDateString()}
              </Text>

              <Button
                variant="tertiary"
                onPress={handleCancelSubscription}
                size="sm"
                style={{ marginTop: theme.spacing.md, alignSelf: 'flex-start' }}
              >
                Cancel Subscription
              </Button>
            </View>
          )}

          {/* Plans */}
          <View style={{ gap: theme.spacing.xl }}>
            {BUSINESS_PLANS.map((plan) => (
              <View
                key={plan.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  borderWidth: 2,
                  borderColor: plan.popular ? theme.colors.primary : theme.colors.border,
                  overflow: 'hidden',
                  position: 'relative',
                  ...theme.shadows.lg,
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
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
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan(plan.id) && (
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
                )}

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
                      amount={plan.priceGHS}
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
                      What's Included
                    </Text>
                    
                    <View style={{ gap: theme.spacing.md }}>
                      {plan.highlights.map((highlight, index) => (
                        <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
                          <Check size={16} color={theme.colors.success} style={{ marginTop: 2 }} />
                          <Text variant="body" style={{ flex: 1, lineHeight: 22 }}>
                            {highlight}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Badges */}
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.xl, flexWrap: 'wrap' }}>
                    {plan.badges.map((badge) => (
                      <Badge
                        key={badge}
                        text={badge.replace('_', ' ').toUpperCase()}
                        variant="info"
                        size="sm"
                      />
                    ))}
                  </View>

                  {/* Action Button */}
                  <Button
                    variant={isCurrentPlan(plan.id) ? "tertiary" : "primary"}
                    onPress={isCurrentPlan(plan.id) ? undefined : () => handleSubscribe(plan.id)}
                    loading={subscribing && selectedPlan === plan.id}
                    disabled={subscribing || isCurrentPlan(plan.id)}
                    fullWidth
                    size="lg"
                  >
                    {isCurrentPlan(plan.id) 
                      ? 'Current Plan' 
                      : subscribing && selectedPlan === plan.id 
                      ? 'Processing...' 
                      : `Subscribe for GHS ${plan.priceGHS}/month`
                    }
                  </Button>
                </View>
              </View>
            ))}
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
                  Yes, you can cancel your subscription at any time. You'll keep access to premium features until the end of your current billing period.
                </Text>
              </View>
              
              <View>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                  What happens to my boost credits?
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Boost credits are added to your account each month and don't expire. You can use them anytime, even after cancelling.
                </Text>
              </View>
              
              <View>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                  Can I upgrade or downgrade?
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Yes, you can change your plan at any time. Changes take effect immediately with prorated billing.
                </Text>
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>

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