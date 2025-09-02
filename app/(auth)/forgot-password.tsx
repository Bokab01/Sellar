import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail } from '@/utils/validation';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Input,
  Button,
  LinkButton,
} from '@/components';
import { router } from 'expo-router';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { forgotPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleForgotPassword = async () => {
    // Clear previous errors
    setEmailError('');

    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    // Validate email using robust validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!);
      return;
    }

    setLoading(true);
    const { error } = await forgotPassword(email.trim());
    
    if (error) {
      Alert.alert('Error', error);
    } else {
      setEmailSent(true);
    }
    
    setLoading(false);
  };

  if (emailSent) {
    return (
      <SafeAreaWrapper>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Container>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                paddingVertical: theme.spacing['4xl'],
              }}
            >
              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: theme.spacing['4xl'] }}>
                <View
                  style={{
                    backgroundColor: theme.colors.success,
                    borderRadius: 50,
                    padding: theme.spacing.xl,
                    marginBottom: theme.spacing.xl,
                  }}
                >
                  <CheckCircle size={48} color={theme.colors.successForeground} />
                </View>
                <Text variant="h1" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
                  Check Your Email
                </Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                  We've sent a password reset link to {email}
                </Text>
              </View>

              {/* Instructions */}
              <View style={{ marginBottom: theme.spacing['4xl'] }}>
                <Text variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 24 }}>
                  Click the link in the email to reset your password. If you don't see it, check your spam folder.
                </Text>
              </View>

              {/* Actions */}
              <View style={{ gap: theme.spacing.lg }}>
                <Button
                  variant="primary"
                  onPress={() => router.push('/(auth)/sign-in')}
                  fullWidth
                  size="lg"
                >
                  Back to Sign In
                </Button>

                <Button
                  variant="secondary"
                  onPress={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  fullWidth
                  size="lg"
                >
                  Try Different Email
                </Button>
              </View>
            </View>
          </Container>
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              paddingVertical: theme.spacing['4xl'],
            }}
          >
            {/* Back Button */}
            <View style={{ marginBottom: theme.spacing.xl }}>
              <Button
                variant="ghost"
                icon={<ArrowLeft size={20} color={theme.colors.text.primary} />}
                onPress={() => router.back()}
                size="sm"
              >
                Back
              </Button>
            </View>

            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: theme.spacing['4xl'] }}>
              <Text variant="h1" style={{ marginBottom: theme.spacing.md }}>
                Forgot Password?
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                No worries! Enter your email and we'll send you a reset link.
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: theme.spacing.xl }}>
                          <Input
              label="Email"
              placeholder="Enter your email address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // Clear error when user starts typing
                if (emailError) setEmailError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={theme.colors.text.muted} />}
              error={emailError}
            />

              <Button
                variant="primary"
                onPress={handleForgotPassword}
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
              >
                Send Reset Link
              </Button>
            </View>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: theme.spacing['2xl'] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="body" color="secondary">
                  Remember your password?
                </Text>
                <LinkButton
                  variant="primary"
                  href="/(auth)/sign-in"
                >
                  Sign In
                </LinkButton>
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
