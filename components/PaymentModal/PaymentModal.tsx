import React, { useState, useRef } from 'react';
import { View, Modal, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { SafeAreaWrapper } from '@/components/Layout';
import { X, CreditCard, Smartphone } from 'lucide-react-native';

export interface PaymentRequest {
  amount: number; // Amount in GHS
  email: string;
  reference?: string;
  purpose: 'credit_purchase' | 'subscription' | 'feature_purchase';
  purpose_id: string;
  metadata?: Record<string, any>;
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  paymentRequest: PaymentRequest | null;
  onSuccess: (reference: string) => void;
  onError: (error: string) => void;
}

export function PaymentModal({
  visible,
  onClose,
  paymentRequest,
  onSuccess,
  onError,
}: PaymentModalProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const paystackWebViewRef = useRef<any>(null);

  // Get Paystack public key from environment
  const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_your_test_public_key';

  const initializePayment = async () => {
    if (!paymentRequest || !user) return;

    try {
      setLoading(true);

      // Generate reference if not provided
      const reference = paymentRequest.reference || generateReference();
      setPaymentReference(reference);

      // Get user session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      // Initialize payment via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          amount: paymentRequest.amount * 100, // Convert to pesewas
          email: paymentRequest.email,
          reference,
          purpose: paymentRequest.purpose,
          purpose_id: paymentRequest.purpose_id,
          metadata: paymentRequest.metadata,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.authorization_url) {
        setPaymentUrl(data.authorization_url);
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      onError(error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      const reference = response.reference || paymentReference;
      
      if (!reference) {
        throw new Error('Payment reference not found');
      }

      // Verify payment via webhook (automatic) or direct verification
      // The webhook should handle the verification, but we can also verify directly
      await verifyPayment(reference);
      
      onSuccess(reference);
      handleClose();
    } catch (error: any) {
      console.error('Payment success handling error:', error);
      onError(error.message || 'Payment verification failed');
    }
  };

  const handlePaymentCancel = () => {
    Alert.alert(
      'Payment Cancelled',
      'Your payment was cancelled. You can try again anytime.',
      [
        { text: 'OK', onPress: handleClose }
      ]
    );
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    onError(error.message || 'Payment failed');
  };

  const verifyPayment = async (reference: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { reference },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      throw error;
    }
  };

  const generateReference = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `sellar_${timestamp}_${random}`;
  };

  const handleClose = () => {
    setPaymentUrl(null);
    setPaymentReference(null);
    setLoading(false);
    onClose();
  };

  React.useEffect(() => {
    if (visible && paymentRequest) {
      initializePayment();
    }
  }, [visible, paymentRequest]);

  if (!visible || !paymentRequest) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaWrapper>
        <AppHeader
          title="Complete Payment"
          showBackButton
          onBackPress={handleClose}
          rightActions={[
            <Button
              key="close-payment"
              variant="icon"
              icon={<X size={20} color={theme.colors.text.primary} />}
              onPress={handleClose}
            />
          ]}
        />

        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {loading || !paymentUrl ? (
            <View style={{ flex: 1, padding: theme.spacing.lg }}>
              <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
                <View
                  style={{
                    backgroundColor: theme.colors.primary + '20',
                    borderRadius: theme.borderRadius.full,
                    padding: theme.spacing.lg,
                    marginBottom: theme.spacing.lg,
                  }}
                >
                  <CreditCard size={48} color={theme.colors.primary} />
                </View>
                <Text variant="h3" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
                  Initializing Payment
                </Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                  Setting up secure payment with Paystack...
                </Text>
              </View>

              <View style={{ gap: theme.spacing.md }}>
                <LoadingSkeleton width="100%" height={60} />
                <LoadingSkeleton width="100%" height={40} />
                <LoadingSkeleton width="80%" height={40} />
              </View>

              <View
                style={{
                  marginTop: theme.spacing.xl,
                  padding: theme.spacing.lg,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                  <Smartphone size={16} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                    Payment Methods Available
                  </Text>
                </View>
                <Text variant="caption" color="muted">
                  • Card payments (Visa, Mastercard, Verve){'\n'}
                  • Mobile Money (MTN, Vodafone, AirtelTigo){'\n'}
                  • Bank transfer & USSD
                </Text>
              </View>
            </View>
          ) : paymentUrl ? (
            <WebView
              ref={paystackWebViewRef}
              source={{ uri: paymentUrl }}
              style={{ flex: 1 }}
              onNavigationStateChange={(navState) => {
                // Handle navigation changes to detect success/failure
                if (navState.url.includes('callback') || navState.url.includes('success')) {
                  // Payment completed - you can extract reference from URL
                  const urlParams = new URLSearchParams(navState.url.split('?')[1]);
                  const reference = urlParams.get('reference') || paymentReference;
                  if (reference) {
                    handlePaymentSuccess({ reference });
                  }
                } else if (navState.url.includes('cancel') || navState.url.includes('error')) {
                  handlePaymentCancel();
                }
              }}
              onError={(error) => {
                console.error('WebView error:', error);
                handlePaymentError(error);
              }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  backgroundColor: theme.colors.background 
                }}>
                  <LoadingSkeleton width={200} height={20} />
                  <Text style={{ marginTop: theme.spacing.md }}>Loading payment...</Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </SafeAreaWrapper>
    </Modal>
  );
}

// Helper function to format amount for display
export function formatAmount(amount: number, currency: string = 'GHS'): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

// Helper function to validate mobile money number
export function validateMobileMoneyNumber(phone: string): { isValid: boolean; provider?: string } {
  // Remove country code and clean number
  const cleanPhone = phone.replace(/^\+233/, '').replace(/^0/, '');
  
  if (cleanPhone.length !== 9) {
    return { isValid: false };
  }

  const prefix = cleanPhone.substring(0, 3);
  
  const providers = [
    { code: 'mtn', name: 'MTN Mobile Money', prefixes: ['024', '025', '053', '054', '055', '059'] },
    { code: 'vodafone', name: 'Vodafone Cash', prefixes: ['020', '050'] },
    { code: 'airteltigo', name: 'AirtelTigo Money', prefixes: ['027', '028', '057', '026', '056'] },
  ];

  for (const provider of providers) {
    if (provider.prefixes.includes(prefix)) {
      return { isValid: true, provider: provider.code };
    }
  }

  return { isValid: false };
}
