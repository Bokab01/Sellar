import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { router, useFocusEffect } from 'expo-router';
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
  AppModal,
} from '@/components';
import { Zap, Star, Crown, Building, CreditCard, Smartphone } from 'lucide-react-native';

// Credit package type from database
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_ghs: number;
  description: string | null;
  popular: boolean;
  display_order: number;
  icon_key: string | null;
  is_active: boolean;
}

export default function BuyCreditsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    balance, 
    loading: balanceLoading, 
    refreshCredits, 
    purchaseCredits 
  } = useMonetizationStore();
  
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<CreditPackage | null>(null);


  // Fetch credit packages from database
  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setPackages(data || []);
    } catch (error: any) {
      console.error('Error fetching credit packages:', error);
      setToastMessage('Failed to load credit packages. Please try again.');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    refreshCredits();
    fetchPackages();
  }, []);

  // Refresh credits and packages when returning to this screen (after payment)
  useFocusEffect(
    useCallback(() => {
      refreshCredits();
      fetchPackages();
    }, [])
  );

  const getPackageIcon = (iconKey: string | null) => {
    switch (iconKey?.toLowerCase()) {
      case 'starter': return <Zap size={32} color={theme.colors.primary} />;
      case 'seller': return <Star size={32} color={theme.colors.warning} />;
      case 'plus': return <Crown size={32} color={theme.colors.primary} />;
      case 'max': return <Building size={32} color={theme.colors.success} />;
      default: return <CreditCard size={32} color={theme.colors.text.muted} />;
    }
  };

  const handlePurchase = async (packageId: string) => {
    // Find the selected package
    const selectedPkg = packages.find(pkg => pkg.id === packageId);
    if (!selectedPkg) {
      setToastMessage('Package not found');
      setToastVariant('error');
      setShowToast(true);
      return;
    }

    // Show confirmation modal
    setPendingPackage(selectedPkg);
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (!pendingPackage) return;

    setShowConfirmModal(false);
    setPurchasing(true);
    setSelectedPackage(pendingPackage.id);

    try {
      // Initialize payment with Paystack
      const reference = `sellar_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      const response = await supabase.functions.invoke('paystack-initialize', {
        body: {
          amount: Math.round(pendingPackage.price_ghs * 100), // Convert to pesewas and ensure integer
          email: user?.email || 'user@example.com',
          reference,
          purpose: 'credit_purchase',
          purpose_id: pendingPackage.id,
          metadata: {
            package_id: pendingPackage.id,
            credits: pendingPackage.credits,
            package_name: pendingPackage.name,
          },
        },
      });

      // Handle HTTP errors (400, 500, etc.) - these contain our custom error responses
      if (response.error && response.response) {
        // Extract error body from the response
        let errorData = null;
        
        try {
          const responseText = await response.response.text();
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        // Handle price mismatch specifically
        if (errorData?.error === 'Price mismatch' && errorData?.new_price) {
          setToastMessage(`Price updated! Package now costs GHS ${errorData.new_price}. Refreshing...`);
          setToastVariant('warning');
          setShowToast(true);
          
          // Refresh packages to get latest prices
          await fetchPackages();
          setPurchasing(false);
          setSelectedPackage(null);
          setPendingPackage(null);
          return;
        }
        
        // Handle other errors
        if (errorData?.details) {
          throw new Error(errorData.details);
        }
        
        if (errorData?.error) {
          throw new Error(errorData.error);
        }
        
        throw response.error;
      }
      
      const data = response.data;
      
      if (data?.error) {
        console.error('Payment initialization error:', data);
        throw new Error(data.details || data.error);
      }

      if (!data?.authorization_url) {
        throw new Error('Payment URL not received from Paystack');
      }

      // Navigate to payment screen with the payment URL
      router.push({
        pathname: `/payment/${reference}`,
        params: {
          paymentUrl: data.authorization_url,
          amount: pendingPackage.price_ghs.toString(),
          purpose: 'credit_purchase',
          purpose_id: pendingPackage.id,
          credits: pendingPackage.credits.toString(),
          packageName: pendingPackage.name,
        },
      } as any);
    } catch (error: any) {
      console.error('Failed to initialize payment:', error);
      setToastMessage(error.message || 'Failed to initialize payment');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setPurchasing(false);
      setSelectedPackage(null);
      setPendingPackage(null);
    }
  };


  if (loadingPackages || balanceLoading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Buy Credits"
          showBackButton
          onBackPress={() => router.back()}
          rightActions={[
            <TouchableOpacity
              key="diagnostics"
              onPress={() => router.push('/paystack-diagnostics')}
              style={{
                padding: theme.spacing.sm,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                minWidth: 40,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16 }}>🔧</Text>
            </TouchableOpacity>
          ]}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={120} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.xl }} />
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={200} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  return (
          <SafeAreaWrapper>
        <AppHeader
          title="Buy Credits"
          showBackButton
          onBackPress={() => router.back()}
          rightActions={[
            <TouchableOpacity
              key="diagnostics"
              onPress={() => router.push('/paystack-diagnostics')}
              style={{
                padding: theme.spacing.sm,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                minWidth: 40,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16 }}>🔧</Text>
            </TouchableOpacity>
          ]}
        />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Container>
          {/* Current Balance */}
          <View
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              marginBottom: theme.spacing.xl,
              alignItems: 'center',
              ...theme.shadows.lg,
            }}
          >
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.primaryForeground + 'CC',
                marginBottom: theme.spacing.sm,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Current Balance
            </Text>
            <Text
              variant="h1"
              style={{
                color: theme.colors.primaryForeground,
                fontWeight: '700',
                marginBottom: theme.spacing.sm,
              }}
            >
              {(balance || 0).toLocaleString()} Credits
            </Text>
            <Text
              variant="caption"
              style={{ color: theme.colors.primaryForeground + 'AA' }}
            >
              ≈ GHS {((balance || 0) * 0.167).toFixed(2)} value
            </Text>
          </View>

          {/* Package Selection */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Choose Your Package
            </Text>

            <View style={{ gap: theme.spacing.lg }}>
              {packages.map((package_) => {
                const pricePerCredit = package_.price_ghs / package_.credits;
                return (
                  <TouchableOpacity
                    key={package_.id}
                    onPress={() => handlePurchase(package_.id)}
                    disabled={purchasing}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.xl,
                      borderWidth: 2,
                      borderColor: package_.popular ? theme.colors.primary : theme.colors.border,
                      position: 'relative',
                      opacity: purchasing && selectedPackage !== package_.id ? 0.5 : 1,
                      ...theme.shadows.md,
                    }}
                    activeOpacity={0.95}
                  >
                    {/* Popular Badge */}
                    {package_.popular && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -12,
                          alignSelf: 'center',
                          backgroundColor: theme.colors.primary,
                          borderRadius: theme.borderRadius.full,
                          paddingHorizontal: theme.spacing.lg,
                          paddingVertical: theme.spacing.sm,
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
                          Most Popular
                        </Text>
                      </View>
                    )}

                    {/* Loading Indicator */}
                    {purchasing && selectedPackage === package_.id && (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                        <LinearProgress progress={0.7} color={theme.colors.primary} />
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
                      {getPackageIcon(package_.icon_key)}
                      <View style={{ marginLeft: theme.spacing.lg, flex: 1 }}>
                        <Text variant="h3" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                          {package_.name}
                        </Text>
                        <Text variant="bodySmall" color="secondary">
                          {package_.description}
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginBottom: theme.spacing.lg }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                        <Text variant="h2" style={{ fontWeight: '700' }}>
                          {(package_.credits || 0).toLocaleString()}
                        </Text>
                        <Text variant="body" color="secondary">
                          credits
                        </Text>
                      </View>
                      
                      <PriceDisplay
                        amount={package_.price_ghs}
                        size="lg"
                        style={{ marginBottom: theme.spacing.sm }}
                      />
                      
                      <Text variant="caption" color="muted">
                        GHS {pricePerCredit.toFixed(3)} per credit
                      </Text>
                    </View>

                    {/* Value Proposition */}
                    <View
                      style={{
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      <Text variant="bodySmall" style={{ textAlign: 'center' }}>
                        💡 Enough for {Math.floor(package_.credits / 15)} Pulse Boosts or {Math.floor(package_.credits / 5)} Ad Refreshes
                      </Text>
                    </View>

                    <Button
                      variant="primary"
                      onPress={() => handlePurchase(package_.id)}
                      loading={purchasing && selectedPackage === package_.id}
                      disabled={purchasing}
                      fullWidth
                      size="lg"
                    >
                      {purchasing && selectedPackage === package_.id ? 'Processing...' : `Buy for GHS ${package_.price_ghs.toFixed(2)}`}
                    </Button>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Payment Methods */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.xl,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
              Secure Payment Options
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
              <View style={{ alignItems: 'center' }}>
                <CreditCard size={32} color={theme.colors.primary} />
                <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
                  Visa/Mastercard
                </Text>
              </View>
              
              <View style={{ alignItems: 'center' }}>
                <Smartphone size={32} color={theme.colors.primary} />
                <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
                  Mobile Money
                </Text>
              </View>
              
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: theme.colors.success,
                    borderRadius: theme.borderRadius.full,
                    width: 32,
                    height: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.successForeground, fontWeight: '700' }}>P</Text>
                </View>
                <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
                  Paystack
                </Text>
              </View>
            </View>
          </View>

          {/* Benefits */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.lg, textAlign: 'center' }}>
              What You Can Do With Credits
            </Text>
            
            <View style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Text style={{ fontSize: 20 }}>⚡</Text>
                <Text variant="body">Pulse Boost - 24-hour visibility boost (15 credits)</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Text style={{ fontSize: 20 }}>🚀</Text>
                <Text variant="body">Mega Pulse - 7-day mega visibility boost (50 credits)</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Text style={{ fontSize: 20 }}>🎯</Text>
                <Text variant="body">Category Spotlight - 3-day spotlight (35 credits)</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Text style={{ fontSize: 20 }}>🔄</Text>
                <Text variant="body">Ad Refresh - Move to top instantly (5 credits)</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Text style={{ fontSize: 20 }}>✨</Text>
                <Text variant="body">Listing Highlight - Colored border for 7 days (10 credits)</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Text style={{ fontSize: 20 }}>🔥</Text>
                <Text variant="body">Urgent Badge - "Urgent Sale" badge for 3 days (8 credits)</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Text style={{ fontSize: 20 }}>🏢</Text>
                <Text variant="body">Unlock Sellar Pro profile</Text>
              </View>
            </View>
          </View>

          {/* Business Plan Upgrade Suggestion */}
          <View
            style={{
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.primary + '30',
              marginTop: theme.spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <Crown size={24} color={theme.colors.primary} />
              <Text variant="h4" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                Seller Pro Plan Available
              </Text>
            </View>
            
            <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
              Got {(2798).toLocaleString()} credits? Upgrade to Sellar Pro and get unlimited listings, auto-refresh every 2 hours, and premium features!
            </Text>
            
            <Button
              variant="primary"
              onPress={() => router.push('/subscription-plans')}
              size="md"
              style={{ alignSelf: 'center' }}
            >
              View Seller Pro Plans
            </Button>
          </View>
        </Container>
      </ScrollView>

      {/* Confirmation Modal */}
      <AppModal
        visible={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPendingPackage(null);
        }}
        title="Confirm Purchase"
        primaryAction={{
          text: 'Confirm Payment',
          onPress: handleConfirmPurchase,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => {
            setShowConfirmModal(false);
            setPendingPackage(null);
          },
        }}
      >
        {pendingPackage && (
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <Text style={{ fontSize: 48 }}>💳</Text>
            </View>
            
            <Text variant="body" style={{ textAlign: 'center' }}>
              You're about to purchase:
            </Text>
            
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.primary + '20',
              }}
            >
              <Text variant="h3" style={{ fontWeight: '700', textAlign: 'center', marginBottom: theme.spacing.sm }}>
                {pendingPackage.name}
              </Text>
              <Text variant="h2" style={{ color: theme.colors.primary, textAlign: 'center', marginBottom: theme.spacing.sm }}>
                {pendingPackage.credits.toLocaleString()} Credits
              </Text>
              <Text variant="h4" style={{ textAlign: 'center' }}>
                GHS {pendingPackage.price_ghs.toFixed(2)}
              </Text>
            </View>
            
            <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
              You'll be redirected to Paystack to complete your payment securely.
            </Text>
          </View>
        )}
      </AppModal>

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
