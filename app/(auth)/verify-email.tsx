import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, AppState, AppStateStatus } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
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
  const [appState, setAppState] = useState(AppState.currentState);

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

  // Auto-check email verification when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, check if email was verified
        checkEmailVerificationStatus();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  // Function to check email verification status without showing alerts
  const checkEmailVerificationStatus = async () => {
    try {
      
      // First check current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error during auto-check:', sessionError.message);
        return;
      }

      // If current session shows verified, proceed immediately
      if (currentSession?.user?.email_confirmed_at) {
        router.replace('/(tabs)/home');
        return;
      }

      // Try to refresh session to get latest status
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.warn('Session refresh failed during auto-check:', refreshError.message);
        return;
      }
      
      if (refreshedSession?.user?.email_confirmed_at) {
        router.replace('/(tabs)/home');
      } else {
      }
    } catch (error) {
      console.warn('Auto-check email verification failed:', error);
    }
  };

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

  const handleCheckEmail = async () => {
    setLoading(true);
    
    try {
      
      // Get the current session first
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting current session:', sessionError);
        Alert.alert('Error', 'Unable to check your email status. Please try again.');
        setLoading(false);
        return;
      }


      // If we have a session and the email is confirmed, proceed
      if (currentSession?.user?.email_confirmed_at) {
        router.replace('/(tabs)/home');
        return;
      }

      // Try to refresh the session to get the latest verification status
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.warn('Session refresh failed:', refreshError.message);
        
        // If refresh fails but we have a current session, check if it's verified
        if (currentSession?.user) {
          if (currentSession.user.email_confirmed_at) {
            router.replace('/(tabs)/home');
            return;
          } else {
            Alert.alert(
              'Email Not Verified',
              'Your email has not been verified yet. Please click the verification link in your email first.',
              [
                { text: 'OK' },
                { 
                  text: 'Resend Email', 
                  onPress: () => handleResendVerification() 
                }
              ]
            );
            setLoading(false);
            return;
          }
        } else {
          // No session at all
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please sign in again.',
            [
              { 
                text: 'Sign In', 
                onPress: () => router.replace('/(auth)/sign-in') 
              }
            ]
          );
          setLoading(false);
          return;
        }
      }

      
      // Check the refreshed session
      if (!refreshedSession?.user) {
        Alert.alert(
          'Session Error',
          'Unable to verify your session. Please sign in again.',
          [
            { 
              text: 'Sign In', 
              onPress: () => router.replace('/(auth)/sign-in') 
            }
          ]
        );
        setLoading(false);
        return;
      }
      
      // Check if email is confirmed in the refreshed session
      if (refreshedSession.user.email_confirmed_at) {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert(
          'Email Not Verified',
          'Your email has not been verified yet. Please click the verification link in your email first.',
          [
            { text: 'OK' },
            { 
              text: 'Resend Email', 
              onPress: () => handleResendVerification() 
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Error in handleCheckEmail:', error);
      Alert.alert('Error', 'Unable to verify your email status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper testID="verify-email-screen">
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
                      Then tap "Check Email Status" to continue
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
                testID="check-email-button"
              >
                Check Email Status
              </Button>

              <Button
                variant="secondary"
                onPress={handleResendVerification}
                loading={loading}
                disabled={loading || resendCooldown > 0}
                fullWidth
                size="lg"
                testID="resend-email-button"
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
                Having trouble? Check your spam folder or contact support for help.
              </Text>
              <Text variant="caption" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
                The verification link expires in 24 hours.
              </Text>
            </View>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
