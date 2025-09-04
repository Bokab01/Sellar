import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Button,
  LinkButton,
} from '@/components';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail, CheckCircle, Clock, RefreshCw } from 'lucide-react-native';

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const { resendVerification, user } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();
  
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);

  const userEmail = email || user?.email || '';

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!userEmail) {
      Alert.alert('Error', 'No email address found');
      return;
    }

    setLoading(true);
    const { error } = await resendVerification(userEmail);
    
    if (error) {
      Alert.alert('Error', error);
    } else {
      setEmailSent(true);
      setResendCooldown(60); // 60 second cooldown
    }
    
    setLoading(false);
  };

  const handleCheckEmail = () => {
    // This would typically refresh the auth state
    // For now, we'll just navigate back to sign in
    router.replace('/(auth)/sign-in');
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
              <View
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 50,
                  padding: theme.spacing.xl,
                  marginBottom: theme.spacing.xl,
                }}
              >
                <Mail size={48} color={theme.colors.primaryForeground} />
              </View>
              <Text variant="h1" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
                Verify Your Email
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                We&apos;ve sent a verification link to
              </Text>
              <Text variant="body" style={{ textAlign: 'center', fontWeight: '600', marginTop: theme.spacing.xs }}>
                {userEmail}
              </Text>
            </View>

            {/* Instructions */}
            <View style={{ marginBottom: theme.spacing['4xl'] }}>
              <View
                style={{
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.lg,
                  marginBottom: theme.spacing.xl,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
                  <CheckCircle size={20} color={theme.colors.success} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmall" style={{ marginBottom: theme.spacing.xs }}>
                      Click the verification link in your email
                    </Text>
                    <Text variant="caption" color="muted">
                      Check your spam folder if you don&apos;t see it
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
                  <RefreshCw size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmall" style={{ marginBottom: theme.spacing.xs }}>
                      Return to this app after clicking the link
                    </Text>
                    <Text variant="caption" color="muted">
                      Your account will be automatically verified
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={{ gap: theme.spacing.lg }}>
              <Button
                variant="primary"
                onPress={handleCheckEmail}
                fullWidth
                size="lg"
              >
                I&apos;ve Verified My Email
              </Button>

              <Button
                variant="secondary"
                onPress={handleResendVerification}
                loading={loading}
                disabled={loading || resendCooldown > 0}
                fullWidth
                size="lg"
                icon={resendCooldown > 0 ? <Clock size={16} /> : undefined}
              >
                {resendCooldown > 0 
                  ? `Resend in ${resendCooldown}s` 
                  : emailSent 
                    ? 'Email Sent!' 
                    : 'Resend Verification Email'
                }
              </Button>
            </View>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: theme.spacing['2xl'] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="body" color="secondary">
                  Wrong email?
                </Text>
                <LinkButton
                  variant="primary"
                  href="/(auth)/sign-up"
                >
                  Sign Up Again
                </LinkButton>
              </View>
            </View>

            {/* Help */}
            <View style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
              <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
                Having trouble? Contact support for help with email verification.
              </Text>
            </View>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
