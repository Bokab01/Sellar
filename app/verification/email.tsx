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
import { Mail, CheckCircle, Clock, RefreshCw } from 'lucide-react-native';
import { useEmailVerification } from '@/hooks/useVerification';

export default function EmailVerificationScreen() {
  const { theme } = useTheme();
  const { sendVerificationEmail, verifyToken, loading } = useEmailVerification();
  
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'success'>('email');
  const [emailSent, setEmailSent] = useState(false);

  const handleSendEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await sendVerificationEmail(email);
      setEmailSent(true);
      setStep('verify');
      Alert.alert('Email Sent', 'We\'ve sent a verification link to your email address');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send verification email');
    }
  };

  const handleVerifyToken = async () => {
    if (!verificationToken.trim()) {
      Alert.alert('Error', 'Please enter the verification token');
      return;
    }

    try {
      await verifyToken(verificationToken);
      setStep('success');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid verification token');
    }
  };

  const handleResendEmail = async () => {
    try {
      await sendVerificationEmail(email);
      Alert.alert('Email Resent', 'A new verification email has been sent');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend verification email');
    }
  };

  const renderEmailStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <Mail size={50} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Verify Your Email
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          We'll send you a verification link to confirm your email address and secure your account.
        </Text>
      </View>

      {/* Benefits Section */}
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Why Verify Your Email?
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="body" color="secondary">
            • Secure your account with email notifications
          </Text>
          <Text variant="body" color="secondary">
            • Receive important updates about your listings
          </Text>
          <Text variant="body" color="secondary">
            • Get notified about messages and offers
          </Text>
          <Text variant="body" color="secondary">
            • Recover your account if you forget your password
          </Text>
          <Text variant="body" color="secondary">
            • Increase your trust score and visibility
          </Text>
        </View>
      </View>

      <Input
        label="Email Address"
        placeholder="Enter your email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginBottom: theme.spacing.lg }}
      />

      <Button
        variant="primary"
        size="lg"
        onPress={handleSendEmail}
        loading={loading}
        disabled={!email.trim()}
        fullWidth
      >
        Send Verification Email
      </Button>

      <View
        style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
          📧 Make sure to check your spam folder if you don't see the email in your inbox.
        </Text>
      </View>
    </View>
  );

  const renderVerifyStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <Clock size={50} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Check Your Email
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          We've sent a verification link to {email}. Click the link in the email or enter the verification code below.
        </Text>
      </View>

      {/* Instructions */}
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Two Ways to Verify
        </Text>
        
        <View style={{ gap: theme.spacing.md }}>
          <View>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              Option 1: Click the Link
            </Text>
            <Text variant="bodySmall" color="secondary">
              Open the email and click the "Verify Email" button. This will automatically verify your email.
            </Text>
          </View>

          <View>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              Option 2: Enter the Code
            </Text>
            <Text variant="bodySmall" color="secondary">
              Copy the verification code from the email and paste it in the field below.
            </Text>
          </View>
        </View>
      </View>

      <Input
        label="Verification Code (Optional)"
        placeholder="Enter code from email or paste verification link"
        value={verificationToken}
        onChangeText={setVerificationToken}
        multiline
        style={{ 
          marginBottom: theme.spacing.lg,
          minHeight: 80,
        }}
      />

      <Button
        variant="primary"
        size="lg"
        onPress={handleVerifyToken}
        loading={loading}
        disabled={!verificationToken.trim()}
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
      >
        Verify Email
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={handleResendEmail}
        disabled={loading}
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
        icon={<RefreshCw size={16} color={theme.colors.primary} />}
      >
        Resend Email
      </Button>

      <Button
        variant="tertiary"
        size="md"
        onPress={() => setStep('email')}
        fullWidth
      >
        Change Email Address
      </Button>

      {/* Troubleshooting */}
      <View
        style={{
          backgroundColor: theme.colors.warning + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        <Text variant="bodySmall" style={{ color: theme.colors.warning, textAlign: 'center' }}>
          💡 Not receiving emails? Check your spam folder or try resending. The verification link expires in 24 hours.
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
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: theme.colors.success + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <CheckCircle size={60} color={theme.colors.success} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Email Verified Successfully!
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Your email address has been verified. You'll now receive important notifications and your account is more secure.
        </Text>
      </View>

      {/* Benefits Unlocked */}
      <View
        style={{
          backgroundColor: theme.colors.success + '10',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h4" style={{ color: theme.colors.success, marginBottom: theme.spacing.md }}>
          Benefits Unlocked
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="body" style={{ color: theme.colors.success }}>
            ✓ Email notifications enabled
          </Text>
          <Text variant="body" style={{ color: theme.colors.success }}>
            ✓ Account recovery available
          </Text>
          <Text variant="body" style={{ color: theme.colors.success }}>
            ✓ Trust score increased
          </Text>
          <Text variant="body" style={{ color: theme.colors.success }}>
            ✓ Enhanced account security
          </Text>
        </View>
      </View>

      {/* Next Steps */}
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Recommended Next Steps
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="body" color="secondary">
            • Verify your phone number for additional security
          </Text>
          <Text variant="body" color="secondary">
            • Complete identity verification to unlock premium features
          </Text>
          <Text variant="body" color="secondary">
            • Set up business verification if you're a business seller
          </Text>
        </View>
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={() => router.push('/verification')}
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
      >
        View All Verifications
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={() => router.back()}
        fullWidth
      >
        Back to Profile
      </Button>
    </View>
  );

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Email Verification"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container style={{ flex: 1, justifyContent: 'center' }}>
          {step === 'email' && renderEmailStep()}
          {step === 'verify' && renderVerifyStep()}
          {step === 'success' && renderSuccessStep()}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
