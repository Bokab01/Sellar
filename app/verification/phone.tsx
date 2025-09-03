import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  Input,
} from '@/components';
import { Phone, CheckCircle } from 'lucide-react-native';
import { usePhoneVerification } from '@/hooks/useVerification';

export default function PhoneVerificationScreen() {
  const { theme } = useTheme();
  const { sendVerificationCode, verifyCode, loading } = usePhoneVerification();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Basic phone number validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      await sendVerificationCode(phoneNumber);
      setCodeSent(true);
      setStep('code');
      Alert.alert('Code Sent', 'We\'ve sent a verification code to your phone number');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send verification code');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCodeInput.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (verificationCodeInput.length !== 6) {
      Alert.alert('Error', 'Verification code must be 6 digits');
      return;
    }

    try {
      await verifyCode(verificationCodeInput);
      setStep('success');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid verification code');
    }
  };

  const handleResendCode = async () => {
    try {
      await sendVerificationCode(phoneNumber);
      Alert.alert('Code Resent', 'A new verification code has been sent to your phone');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend verification code');
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
          We'll send you a verification code to confirm your phone number and increase your account security.
        </Text>
      </View>

      <Input
        label="Phone Number"
        placeholder="Enter your phone number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        style={{ marginBottom: theme.spacing.lg }}
      />

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
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
          📱 We'll send you a 6-digit code via SMS. Standard messaging rates may apply.
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
          We've sent a 6-digit code to {phoneNumber}
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
          💡 Didn't receive the code? Check your messages or try resending.
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
          🎉 You've earned trust points! Your verification level has been updated.
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
    </SafeAreaWrapper>
  );
}
