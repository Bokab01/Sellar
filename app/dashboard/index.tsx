import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useAnalytics, type QuickStats, type AnalyticsData } from '@/lib/analyticsService';
import { router } from 'expo-router';
import { ExternalLink, Monitor } from 'lucide-react-native';

// Import dashboard components
import { BusinessOverview } from '@/components/Dashboard/BusinessOverview';
import { FreeUserDashboard } from '@/components/Dashboard/FreeUserDashboard';
import { TrialBadge, Container, PaymentModal, Toast, TrialImpactCard, TrialOnboardingGuide, Text } from '@/components';
import type { PaymentRequest } from '@/components';
import { supabase } from '@/lib/supabase';

export default function DashboardOverviewScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const hasBusinessPlan = useMonetizationStore(state => state.hasBusinessPlan);
  const { getQuickStats, getBusinessAnalytics } = useAnalytics();
  
  // Trial state from monetization store
  const isOnTrial = useMonetizationStore(state => state.isOnTrial);
  const trialEndsAt = useMonetizationStore(state => state.trialEndsAt);
  const currentPlan = useMonetizationStore(state => state.currentPlan);
  const convertTrialToPaid = useMonetizationStore(state => state.convertTrialToPaid);
  const refreshSubscription = useMonetizationStore(state => state.refreshSubscription);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    profileViews: 0,
    totalMessages: 0,
    totalReviews: 0,
    averageRating: 0,
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  // Determine if user has business plan
  const isBusinessUser = hasBusinessPlan();

  // Handle upgrade button press from trial badge - initiate payment directly
  const handleUpgradePress = async () => {
    setSubscribing(true);

    try {
      // Fetch subscription plan details
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(1);

      if (plansError || !plans || plans.length === 0) {
        throw new Error('Failed to load subscription plan');
      }

      const result = await convertTrialToPaid();
      
      if (result.success && result.paymentUrl) {
        // Open payment modal
        const request: PaymentRequest = {
          amount: plans[0]?.price_ghs || 4,
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

  // Handle payment modal close
  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPaymentRequest(null);
  };

  // Handle payment success
  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setPaymentRequest(null);
    
    setToastMessage('🎉 Your subscription has been activated!');
    setToastVariant('success');
    setShowToast(true);
    
    // Refresh subscription to update UI
    await refreshSubscription();
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    setShowPaymentModal(false);
    setPaymentRequest(null);
    
    setToastMessage(error || 'Payment failed. Please try again.');
    setToastVariant('error');
    setShowToast(true);
  };

  // Load dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, analytics] = await Promise.all([
        getQuickStats(),
        getBusinessAnalytics(),
      ]);
      
      setQuickStats(stats);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Handle tab navigation from within components
  const handleTabChange = useCallback((tab: string) => {
    // Navigate to the corresponding tab in the layout
    if (tab === 'boost') {
      router.push('/dashboard/auto-refresh');
    } else if (tab === 'analytics') {
      router.push('/dashboard/analytics');
    } else if (tab === 'support') {
      router.push('/dashboard/support');
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Trial Badge - Show at top of dashboard if user is on trial */}
        {isOnTrial && trialEndsAt && (
          <Container style={{ marginTop: theme.spacing.lg }}>
            <TrialBadge
              trialEndsAt={trialEndsAt}
              onUpgradePress={handleUpgradePress}
              variant="full"
            />

            {/* Trial Impact Card - Show ROI metrics */}
            {user?.id && (
              <View style={{ marginTop: theme.spacing.lg }}>
                <TrialImpactCard 
                  userId={user.id}
                  variant="full"
                />
              </View>
            )}
          </Container>
        )}

        {/* Web Dashboard Access - Show for business users or trial users */}
        {(isBusinessUser || isOnTrial) && (
          <Container style={{ marginTop: theme.spacing.lg }}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://dashboard.sellarghana.com')}
              style={{
                backgroundColor: theme.colors.primary + '10',
                borderColor: theme.colors.primary,
                borderWidth: 1,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.xl,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                  <Monitor size={24} color={theme.colors.primary} />
                  <Text variant="h3" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                    Web Dashboard
                  </Text>
                </View>
                <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                  Access advanced analytics and management tools on desktop
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  dashboard.sellarghana.com
                </Text>
              </View>
              <ExternalLink size={28} color={theme.colors.primary} />
            </TouchableOpacity>
          </Container>
        )}

        {isBusinessUser ? (
          <BusinessOverview
            loading={loading}
            quickStats={quickStats}
            analyticsData={analyticsData}
            onTabChange={handleTabChange}
          />
        ) : (
          <FreeUserDashboard
            loading={loading}
            quickStats={quickStats}
          />
        )}
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

      {/* Trial Onboarding Guide */}
      {isOnTrial && user?.id && (
        <TrialOnboardingGuide 
          userId={user.id}
          trialDay={trialEndsAt ? Math.ceil((14 - ((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))) : 1}
        />
      )}
    </View>
  );
}



