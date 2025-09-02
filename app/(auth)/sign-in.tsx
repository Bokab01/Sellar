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
import { Mail, Lock, Eye } from 'lucide-react-native';

export default function SignInScreen() {
  const { theme } = useTheme();
  const { signIn } = useAuth();
  
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

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    
    if (error) {
      Alert.alert('Sign In Failed', error);
    } else {
      router.replace('/(tabs)');
    }
    
    setLoading(false);
  };

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
              <Text variant="h1" style={{ marginBottom: theme.spacing.md }}>
                Welcome to Sellar
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Ghana's premier marketplace for buying and selling
              </Text>
            </View>

            {/* Sign In Form */}
            <View style={{ gap: theme.spacing.xl }}>
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
              />

              <Input
                variant="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
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
            <View style={{ alignItems: 'center', marginTop: theme.spacing['2xl'], gap: theme.spacing.lg }}>
              <LinkButton
                variant="underline"
                href="/(auth)/forgot-password"
              >
                Forgot your password?
              </LinkButton>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="body" color="secondary">
                  Don't have an account?
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