import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  Input,
  AppModal,
} from '@/components';
import { Phone, CheckCircle, AlertCircle } from 'lucide-react-native';
import { usePhoneVerification } from '@/hooks/useVerification';
import { checkPhoneUniqueness } from '@/utils/uniquenessValidation';
import { useAuthStore } from '@/store/useAuthStore';

export default function PhoneVerificationScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { sendVerificationCode, verifyCode, loading } = usePhoneVerification();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  // Modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');

  // Validate Ghanaian phone number
  const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string; formatted?: string } => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if empty
    if (!cleanPhone) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    // Ghanaian phone numbers patterns:
    // - 10 digits starting with 0 (e.g., 0244123456, 0501234567)
    // - 9 digits without leading 0 (e.g., 244123456)
    // - With country code: +233 or 00233 followed by 9 digits
    
    let normalizedPhone = cleanPhone;
    let formatted = '';
    
    // Handle international format (+233 or 00233)
    if (cleanPhone.startsWith('233')) {
      normalizedPhone = cleanPhone.substring(3);
    } else if (cleanPhone.startsWith('00233')) {
      normalizedPhone = cleanPhone.substring(5);
    } else if (cleanPhone.startsWith('0')) {
      normalizedPhone = cleanPhone.substring(1);
    }
    
    // Check if it's exactly 9 digits after normalization
    if (normalizedPhone.length !== 9) {
      return { 
        isValid: false, 
        error: 'Phone number must be 10 digits (e.g., 0244123456)' 
      };
    }
    
    // Check if it starts with valid Ghanaian network prefix
    const validPrefixes = ['20', '23', '24', '25', '26', '27', '28', '29', '50', '54', '55', '56', '57', '59'];
    const prefix = normalizedPhone.substring(0, 2);
    
    if (!validPrefixes.includes(prefix)) {
      return { 
        isValid: false, 
        error: 'Invalid network prefix. Please enter a valid Ghanaian number' 
      };
    }
    
    // Format as: 0244 123 456
    formatted = `0${normalizedPhone.substring(0, 3)} ${normalizedPhone.substring(3, 6)} ${normalizedPhone.substring(6)}`;
    
    return { 
      isValid: true, 
      formatted: `+233${normalizedPhone}` // Store in international format
    };
  };

  // Handle phone number change with real-time formatting
  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text);
    setPhoneError(null); // Clear error on change
  };

  const handleSendCode = async () => {
    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);
    
    if (!validation.isValid) {
      setPhoneError(validation.error || 'Invalid phone number');
      return;
    }

    // Check if phone number already exists
    const uniquenessCheck = await checkPhoneUniqueness(validation.formatted || phoneNumber, user?.id);
    
    if (!uniquenessCheck.isUnique) {
      setPhoneError(uniquenessCheck.error || 'This phone number is already registered');
      setErrorModalTitle('Phone Already Registered');
      setErrorModalMessage(uniquenessCheck.error || 'This phone number is already registered. Please use a different phone number.');
      setShowErrorModal(true);
      return;
    }

    try {
      await sendVerificationCode(phoneNumber);
      setCodeSent(true);
      setStep('code');
      setSuccessModalTitle('Code Sent');
      setSuccessModalMessage('We\'ve sent a verification code to your phone number');
      setShowSuccessModal(true);
    } catch (error) {
      setErrorModalTitle('Error');
      setErrorModalMessage(error instanceof Error ? error.message : 'Failed to send verification code');
      setShowErrorModal(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCodeInput.trim()) {
      setErrorModalTitle('Error');
      setErrorModalMessage('Please enter the verification code');
      setShowErrorModal(true);
      return;
    }

    if (verificationCodeInput.length !== 6) {
      setErrorModalTitle('Error');
      setErrorModalMessage('Verification code must be 6 digits');
      setShowErrorModal(true);
      return;
    }

    try {
      await verifyCode(verificationCodeInput);
      setStep('success');
    } catch (error) {
      setErrorModalTitle('Error');
      setErrorModalMessage(error instanceof Error ? error.message : 'Invalid verification code');
      setShowErrorModal(true);
    }
  };

  const handleResendCode = async () => {
    try {
      await sendVerificationCode(phoneNumber);
      setSuccessModalTitle('Code Resent');
      setSuccessModalMessage('A new verification code has been sent to your phone');
      setShowSuccessModal(true);
    } catch (error) {
      setErrorModalTitle('Error');
      setErrorModalMessage('Failed to resend verification code');
      setShowErrorModal(true);
    }
  };

  const renderPhoneStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <Phone size={40} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Verify Your Phone Number
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          We&apos;ll send you a verification code to confirm your phone number and increase your account security.
        </Text>
      </View>

      <View style={{ marginBottom: theme.spacing.lg }}>
        <Input
          label="Phone Number"
          placeholder="0244 123 456"
          value={phoneNumber}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={15}
        />
        
        {phoneError && (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginTop: theme.spacing.sm,
          }}>
            <AlertCircle size={16} color={theme.colors.error} />
            <Text 
              variant="bodySmall" 
              style={{ 
                color: theme.colors.error, 
                marginLeft: theme.spacing.xs 
              }}
            >
              {phoneError}
            </Text>
          </View>
        )}
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={handleSendCode}
        loading={loading}
        disabled={!phoneNumber.trim()}
        fullWidth
      >
        Send Verification Code
      </Button>

      <View
        style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.sm, color: theme.colors.primary }}>
          Supported Formats
        </Text>
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="bodySmall" color="secondary">
            • 0244 123 456 (MTN)
          </Text>
          <Text variant="bodySmall" color="secondary">
            • 0501 234 567 (Vodafone)
          </Text>
          <Text variant="bodySmall" color="secondary">
            • 0271 234 567 (AirtelTigo)
          </Text>
          <Text variant="bodySmall" color="secondary">
            • +233 244 123 456 (International)
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.md,
        }}
      >
        <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
          📱 We&apos;ll send you a 6-digit code via SMS. Standard messaging rates may apply.
        </Text>
      </View>
    </View>
  );

  const renderCodeStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <Phone size={40} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Enter Verification Code
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          We&apos;ve sent a 6-digit code to {phoneNumber}
        </Text>
      </View>

      <Input
        label="Verification Code"
        placeholder="Enter 6-digit code"
        value={verificationCodeInput}
        onChangeText={setVerificationCodeInput}
        keyboardType="number-pad"
        maxLength={6}
        style={{ 
          marginBottom: theme.spacing.lg,
          textAlign: 'center',
          fontSize: 18,
          letterSpacing: 2,
        }}
      />

      <Button
        variant="primary"
        size="lg"
        onPress={handleVerifyCode}
        loading={loading}
        disabled={verificationCodeInput.length !== 6}
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
      >
        Verify Code
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={handleResendCode}
        disabled={loading}
        fullWidth
      >
        Resend Code
      </Button>

      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
          💡 Didn&apos;t receive the code? Check your messages or try resending.
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.success + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <CheckCircle size={40} color={theme.colors.success} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Phone Number Verified!
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Your phone number has been successfully verified. This helps build trust with other users and improves your account security.
        </Text>
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={() => router.back()}
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
      >
        Continue
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={() => router.push('/verification')}
        fullWidth
      >
        View All Verifications
      </Button>

      <View
        style={{
          backgroundColor: theme.colors.success + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        <Text variant="bodySmall" style={{ color: theme.colors.success, textAlign: 'center' }}>
          🎉 You&apos;ve earned trust points! Your verification level has been updated.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Phone Verification"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container style={{ flex: 1, justifyContent: 'center' }}>
          {step === 'phone' && renderPhoneStep()}
          {step === 'code' && renderCodeStep()}
          {step === 'success' && renderSuccessStep()}
        </Container>
      </ScrollView>

      {/* Error Modal */}
      <AppModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorModalTitle}
        size="sm"
      >
        <View style={{ padding: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.xl }}>
            {errorModalMessage}
          </Text>
          <Button
            variant="primary"
            onPress={() => setShowErrorModal(false)}
            fullWidth
          >
            OK
          </Button>
        </View>
      </AppModal>

      {/* Success Modal */}
      <AppModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successModalTitle}
        size="sm"
      >
        <View style={{ padding: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.xl }}>
            {successModalMessage}
          </Text>
          <Button
            variant="primary"
            onPress={() => setShowSuccessModal(false)}
            fullWidth
          >
            OK
          </Button>
        </View>
      </AppModal>
    </SafeAreaWrapper>
  );
}
