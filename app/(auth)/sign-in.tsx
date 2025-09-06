import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSecureAuth } from '@/hooks/useSecureAuth';
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
} from '@/components';
import { router } from 'expo-router';
import { Mail, Lock, ArrowLeft } from 'lucide-react-native';

export default function SignInScreen() {
  const { theme } = useTheme();
  const { secureSignIn } = useSecureAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSignIn = async () => {
    // Clear previous errors
    setEmailError('');

    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Check rate limiting first
    const identifier = email.trim().toLowerCase();
    const rateLimitCheck = await AuthRateLimiters.login.checkLimit(identifier, 'login');
    
    if (!rateLimitCheck.allowed) {
      const message = rateLimitUtils.getRateLimitMessage(rateLimitCheck, 'login');
      Alert.alert('Too Many Attempts', message);
      return;
    }

    // Sanitize inputs for security
    const emailSanitization = sanitizeEmail(email);
    const passwordSanitization = sanitizePassword(password);

    // Check for critical security threats
    const allThreats = [...emailSanitization.threats, ...passwordSanitization.threats];
    const criticalThreats = allThreats.filter(t => t.severity === 'critical');
    
    if (criticalThreats.length > 0) {
      Alert.alert(
        'Security Alert',
        'Your input contains potentially harmful content. Please review and try again.',
        [{ text: 'OK' }]
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
        Alert.alert('MFA Required', 'Please enter your two-factor authentication code');
        // In a real app, you'd show an MFA input screen here
      } else {
        Alert.alert('Sign In Failed', result.error || 'Unknown error occurred');
      }
    } else {
      router.replace('/(tabs)/home');
    }
    
    setLoading(false);
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
                disabled={loading}
                fullWidth
                size="lg"
              >
                Sign In
              </Button>
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
    </SafeAreaWrapper>
  );
}
