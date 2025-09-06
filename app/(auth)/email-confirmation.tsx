import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Button,
  LoadingSkeleton,
} from '@/components';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';

export default function EmailConfirmationScreen() {
  const { theme } = useTheme();
  const { token_hash, type, email } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
    email?: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleEmailConfirmation();
  }, [token_hash, type, email]);

  const handleEmailConfirmation = async () => {
    if (!token_hash || !type || !email) {
      setError('Invalid confirmation link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify the email confirmation
      const { data, error: confirmError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
        email,
      });

      if (confirmError) {
        console.error('Email confirmation error:', confirmError);
        setError(confirmError.message);
        return;
      }

      if (data.user) {
        setSuccess(true);
        
        // Wait a moment to show success message, then redirect
        setTimeout(() => {
          // Check if this is a new user (just verified email)
          // New users should see the welcome screen
          router.replace('/(auth)/welcome');
        }, 2000);
      } else {
        setError('Email confirmation failed');
      }
    } catch (err) {
      console.error('Email confirmation catch error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Verification email sent! Please check your inbox.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to resend verification email');
    }
  };

  const handleGoToSignIn = () => {
    router.replace('/(auth)/sign-in');
  };

  if (loading) {
    return (
      <SafeAreaWrapper testID="email-confirmation-loading">
        <Container>
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <LoadingSkeleton height={100} style={{ marginBottom: theme.spacing.lg }} />
            <Text variant="h3" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
              Confirming your email...
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Please wait while we verify your email address.
            </Text>
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  if (success) {
    return (
      <SafeAreaWrapper testID="email-confirmation-success">
        <Container>
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <CheckCircle 
              size={80} 
              color={theme.colors.success} 
              style={{ marginBottom: theme.spacing.xl }}
            />
            <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
              Email Confirmed!
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
              Your email has been successfully verified. You can now access all features of Sellar.
            </Text>
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center' }}>
              Redirecting to the app...
            </Text>
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper testID="email-confirmation-error">
      <Container>
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <XCircle 
            size={80} 
            color={theme.colors.error} 
            style={{ marginBottom: theme.spacing.xl }}
          />
          <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
            Confirmation Failed
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
            {error || 'We couldn\'t verify your email address. This could be because the link has expired or is invalid.'}
          </Text>
          
          <View style={{ gap: theme.spacing.md, width: '100%' }}>
            <Button
              variant="primary"
              onPress={handleResendEmail}
              leftIcon={<Mail size={20} />}
              fullWidth
            >
              Resend Verification Email
            </Button>
            
            <Button
              variant="secondary"
              onPress={handleGoToSignIn}
              fullWidth
            >
              Go to Sign In
            </Button>
          </View>
        </View>
      </Container>
    </SafeAreaWrapper>
  );
}
