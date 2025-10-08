import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { Text, SafeAreaWrapper, AppHeader, Button, Toast } from '@/components';
import { CheckCircle, XCircle, CreditCard } from 'lucide-react-native';

export default function PaymentScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    reference: string;
    paymentUrl: string;
    amount: string;
    purpose: string;
    purpose_id: string;
    credits: string;
    packageName: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(params.paymentUrl || null);
  const [verifying, setVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    // Validate payment URL on mount
    if (!paymentUrl) {
      setErrorMessage('Payment URL is missing');
      setPaymentStatus('failed');
    }
  }, []);

  const verifyPayment = async () => {
    if (isProcessing) {
      console.log('⏭️ Payment already being verified');
      return;
    }

    try {
      setIsProcessing(true);
      setVerifying(true);

      console.log('🔄 Verifying payment:', params.reference);
      
      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { reference: params.reference },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.log('✅ Payment verified:', data);
      
      setPaymentStatus('success');
      const creditsMsg = params.credits 
        ? `${params.credits} credits added to your account!`
        : 'Credits added to your account!';
      setToastMessage(`Payment successful! ${creditsMsg}`);
      setToastVariant('success');
      setShowToast(true);

      // Navigate back after showing success - give user time to see the message
      setTimeout(() => {
        router.back();
      }, 3500); // 3.5 seconds to see success screen
    } catch (error: any) {
      console.error('❌ Verification failed:', error);
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'Payment verification failed');
      setToastMessage(error.message || 'Payment verification failed');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setVerifying(false);
    }
  };

  const handleNavigationChange = (navState: any) => {
    if (isProcessing) {
      console.log('⏭️ Ignoring navigation - payment already being processed');
      return;
    }

    console.log('🔍 Navigation:', navState.url);

    const url = navState.url.toLowerCase();
    
    // Check for success callback
    if (url.includes('sellar.app/payment/callback') && url.includes('status=success')) {
      console.log('✅ Payment success detected via callback!');
      verifyPayment();
    }
  };

  const handleRetry = () => {
    // Reset state and try payment again
    setPaymentStatus('pending');
    setErrorMessage(null);
    setIsProcessing(false);
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Processing Payment"
          showBackButton
          onBackPress={handleCancel}
        />
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: theme.spacing.xl,
        }}>
          <View
            style={{
              backgroundColor: theme.colors.primary + '20',
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.xl,
              marginBottom: theme.spacing.xl,
            }}
          >
            <CreditCard size={48} color={theme.colors.primary} />
          </View>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="h3" style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}>
            Initializing Payment
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
            Setting up secure payment with Paystack...
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Payment Successful"
          showBackButton={false}
        />
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: theme.spacing.xl,
        }}>
          <View
            style={{
              backgroundColor: theme.colors.success + '20',
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.xl,
              marginBottom: theme.spacing.xl,
            }}
          >
            <CheckCircle size={64} color={theme.colors.success} />
          </View>
          <Text variant="h2" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
            Payment Successful! 🎉
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            {params.credits 
              ? `${params.credits} credits have been added to your account.`
              : 'Your credits have been added to your account.'}
          </Text>
          
          <Button
            variant="primary"
            onPress={() => router.back()}
            style={{ marginTop: theme.spacing.xl }}
          >
            Done
          </Button>
        </View>

        <Toast
          visible={showToast}
          message={toastMessage}
          variant={toastVariant}
          onHide={() => setShowToast(false)}
        />
      </SafeAreaWrapper>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Payment Failed"
          showBackButton
          onBackPress={handleCancel}
        />
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: theme.spacing.xl,
        }}>
          <View
            style={{
              backgroundColor: theme.colors.error + '20',
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.xl,
              marginBottom: theme.spacing.xl,
            }}
          >
            <XCircle size={64} color={theme.colors.error} />
          </View>
          <Text variant="h2" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
            Payment Failed
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
            {errorMessage || 'Something went wrong with your payment.'}
          </Text>
          
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Button
              variant="secondary"
              onPress={handleCancel}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleRetry}
              style={{ flex: 1 }}
            >
              Try Again
            </Button>
          </View>
        </View>

        <Toast
          visible={showToast}
          message={toastMessage}
          variant={toastVariant}
          onHide={() => setShowToast(false)}
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Complete Payment"
        showBackButton
        onBackPress={handleCancel}
      />
      
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {paymentUrl ? (
          <>
            <WebView
              ref={webViewRef}
              source={{ uri: paymentUrl }}
              style={{ flex: 1 }}
              onNavigationStateChange={handleNavigationChange}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  backgroundColor: theme.colors.background,
                }}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={{ marginTop: theme.spacing.md }}>Loading payment...</Text>
                </View>
              )}
            />

            {verifying && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.xl,
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text variant="h4" style={{ marginTop: theme.spacing.md }}>
                    Verifying Payment...
                  </Text>
                  <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.sm }}>
                    Please wait
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: theme.spacing.xl,
          }}>
            <Text variant="h3" style={{ textAlign: 'center' }}>
              Unable to load payment
            </Text>
          </View>
        )}
      </View>

      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}

