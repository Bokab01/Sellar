import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { validateEmail } from '@/utils/validation';
import { sanitizeEmail, sanitizePassword } from '@/utils/inputSanitization';
import { AuthRateLimiters, rateLimitUtils } from '@/utils/rateLimiter';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Input,
  Button,
  LinkButton,
  AppModal,
} from '@/components';
import { router } from 'expo-router';
import { Mail, Lock, ArrowLeft, RefreshCw } from 'lucide-react-native';

export default function SignInScreen() {
  const { theme } = useTheme();
  const { secureSignIn } = useSecureAuth();
  const { resendVerification } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    actions?: Array<{ text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'tertiary' }>;
  }>({ title: '', message: '' });

  // Helper function to show modal
  const showAlertModal = (
    title: string, 
    message: string, 
    actions?: Array<{ text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'tertiary' }>
  ) => {
    setModalConfig({ title, message, actions });
    setShowModal(true);
  };

  const handleSignIn = async () => {
    // Clear previous errors and resend option
    setEmailError('');
    setShowResendOption(false);

    if (!email.trim() || !password.trim()) {
      showAlertModal('Error', 'Please fill in all fields');
      return;
    }

    // Check rate limiting first
    const identifier = email.trim().toLowerCase();
    const rateLimitCheck = await AuthRateLimiters.login.checkLimit(identifier, 'login');
    
    if (!rateLimitCheck.allowed) {
      const message = rateLimitUtils.getRateLimitMessage(rateLimitCheck, 'login');
      showAlertModal('Too Many Attempts', message);
      return;
    }

    // Sanitize inputs for security
    const emailSanitization = sanitizeEmail(email);
    const passwordSanitization = sanitizePassword(password);

    // Check for critical security threats
    const allThreats = [...emailSanitization.threats, ...passwordSanitization.threats];
    const criticalThreats = allThreats.filter(t => t.severity === 'critical');
    
    if (criticalThreats.length > 0) {
      showAlertModal(
        'Security Alert',
        'Your input contains potentially harmful content. Please review and try again.'
      );
      return;
    }

    // Validate email format
    const emailValidation = validateEmail(emailSanitization.sanitized);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!);
      return;
    }

    setLoading(true);
    
    // Record the attempt
    await AuthRateLimiters.login.recordAttempt(identifier, 'login');
    
    const result = await secureSignIn({
      email: emailSanitization.sanitized.trim(),
      password: passwordSanitization.sanitized,
      rememberDevice: true,
    });
    
    if (!result.success) {
      if (result.requiresMFA) {
        showAlertModal('MFA Required', 'Please enter your two-factor authentication code');
        // In a real app, you'd show an MFA input screen here
      } else {
        // Check if the error is related to email verification
        const errorMessage = result.error || '';
        if (errorMessage.toLowerCase().includes('email not confirmed') || 
            errorMessage.toLowerCase().includes('email not verified') ||
            errorMessage.toLowerCase().includes('confirm your email')) {
          setShowResendOption(true);
          showAlertModal(
            'Email Not Confirmed',
            'Please check your email and click the confirmation link to verify your account.',
            [
              {
                text: 'Resend Confirmation',
                onPress: () => {
                  setShowModal(false);
                  handleResendConfirmation();
                },
                variant: 'primary'
              },
              {
                text: 'OK',
                onPress: () => setShowModal(false),
                variant: 'secondary'
              },
            ]
          );
        } else {
          showAlertModal('Sign In Failed', result.error || 'Unknown error occurred');
        }
      }
    } else {
      router.replace('/(tabs)/home');
    }
    
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      showAlertModal('Error', 'Please enter your email address first');
      return;
    }

    setResendingEmail(true);
    
    try {
      const result = await resendVerification(email.trim());
      
      if (result.error) {
        showAlertModal('Error', result.error);
      } else {
        showAlertModal(
          'Confirmation Email Sent',
          'Please check your email and click the confirmation link to verify your account.'
        );
        setShowResendOption(false);
      }
    } catch (error) {
      showAlertModal('Error', 'Failed to resend confirmation email. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };


  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container padding='sm'>
          {/* Back Button */}
         
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                padding: 0,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ArrowLeft size={20} color={theme.colors.text.primary} />
            </Button>

          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              paddingVertical: theme.spacing['4xl'],
            }}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: theme.spacing['xl']}}>
              <Text variant="h1" style={{ marginBottom: theme.spacing.md }}>
                Welcome to Sellar
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Ghana&apos;s premier marketplace for buying and selling
              </Text>
            </View>

            {/* Sign In Form */}
            <View>
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  // Clear error when user starts typing
                  if (emailError) setEmailError('');
                  // Hide resend option when user changes email
                  if (showResendOption) setShowResendOption(false);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={20} color={theme.colors.text.muted} />}
                error={emailError}

                style={{ marginBottom: theme.spacing.lg }}
              />

              <Input
                variant="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}

                style={{ marginBottom: theme.spacing.xl }}
              />

              <Button
                variant="primary"
                onPress={handleSignIn}
                loading={loading}
                disabled={loading || !email.trim() || !password.trim()}
                fullWidth
                size="lg"
              >
                Sign In
              </Button>

              {/* Resend Confirmation Button */}
              {showResendOption && (
                <Button
                  variant="secondary"
                  onPress={handleResendConfirmation}
                  loading={resendingEmail}
                  disabled={resendingEmail || !email.trim()}
                  fullWidth
                  size="md"
                  style={{ marginTop: theme.spacing.lg }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <RefreshCw size={16} color={theme.colors.primary} />
                    <Text variant="button" color="primary">
                      Resend Confirmation Email
                    </Text>
                  </View>
                </Button>
              )}
            </View>

            {/* Footer Links */}
            <View style={{ alignItems: 'center', marginTop: theme.spacing['2xl'] }}>
              <LinkButton
                variant="underline"
                href="/(auth)/forgot-password"
                style={{ marginBottom: theme.spacing.lg }}
              >
                Forgot your password?
              </LinkButton>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md }}>
                <Text variant="body" color="secondary">
                  Don&apos;t have an account?{' '}
                </Text>
                <LinkButton
                  variant="primary"
                  href="/(auth)/sign-up"
                >
                  Sign Up
                </LinkButton>
              </View>

            </View>
          </View>
        </Container>
      </ScrollView>

      {/* Alert Modal */}
      <AppModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={modalConfig.title}
        position="center"
        size="md"
      >
        <View style={{ padding: theme.spacing.md }}>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg }}>
            {modalConfig.message}
          </Text>
          
          <View style={{ gap: theme.spacing.sm }}>
            {modalConfig.actions && modalConfig.actions.length > 0 ? (
              modalConfig.actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'primary'}
                  onPress={action.onPress}
                  fullWidth
                >
                  {action.text}
                </Button>
              ))
            ) : (
              <Button
                variant="primary"
                onPress={() => setShowModal(false)}
                fullWidth
              >
                OK
              </Button>
            )}
          </View>
        </View>
      </AppModal>
    </SafeAreaWrapper>
  );
}
