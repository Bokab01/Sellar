import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTheme } from '@/theme/ThemeProvider';
import { handleAuthDeepLink, isAuthDeepLink } from '@/utils/deepLinkUtils';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Button,
  LoadingSkeleton,
} from '@/components';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react-native';

export default function EmailConfirmationScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingDeepLink, setProcessingDeepLink] = useState(false);

  useEffect(() => {
    handleConfirmation();
  }, []);

  const handleConfirmation = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try to get the current URL (if opened via deep link)
      const currentUrl = await Linking.getInitialURL();
      console.log('Current URL in email confirmation:', currentUrl);

      if (currentUrl && isAuthDeepLink(currentUrl)) {
        console.log('Processing deep link for email confirmation...');
        setProcessingDeepLink(true);
        
        const result = await handleAuthDeepLink(currentUrl);
        
        if (result.success && result.user && result.session) {
          // Update auth state
          setUser(result.user);
          setSession(result.session);
          
          setSuccess(true);
          setLoading(false);
          setProcessingDeepLink(false);
          
          // Show success message and redirect
          setTimeout(() => {
            Alert.alert(
              'Email Confirmed!',
              'Your email has been successfully confirmed. Welcome to Sellar!',
              [
                {
                  text: 'Continue',
                  onPress: () => router.replace('/(auth)/welcome'),
                },
              ]
            );
          }, 1000);
          
          return;
        } else {
          console.error('Deep link processing failed:', result.error);
          setError(result.error || 'Failed to confirm email');
        }
      } else {
        // Fallback: Check URL parameters (legacy method)
        const params = useLocalSearchParams<{
          token_hash?: string;
          type?: string;
          email?: string;
          code?: string;
        }>();

        console.log('URL parameters:', params);

        if (params.code || (params.token_hash && params.type && params.email)) {
          // Try to construct the full URL for processing
          const baseUrl = Linking.createURL('auth/callback');
          let fullUrl = baseUrl;
          
          if (params.code) {
            fullUrl += `?code=${params.code}`;
          } else if (params.token_hash && params.type && params.email) {
            fullUrl += `#token_hash=${params.token_hash}&type=${params.type}&email=${params.email}`;
          }
          
          console.log('Constructed URL for processing:', fullUrl);
          
          const result = await handleAuthDeepLink(fullUrl);
          
          if (result.success && result.user && result.session) {
            setUser(result.user);
            setSession(result.session);
            setSuccess(true);
            
            setTimeout(() => {
              router.replace('/(auth)/welcome');
            }, 2000);
            
            return;
          } else {
            setError(result.error || 'Failed to confirm email');
          }
        } else {
          setError('Invalid confirmation link - missing required parameters');
        }
      }
    } catch (error: any) {
      console.error('Email confirmation error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setProcessingDeepLink(false);
    }
  };

  const handleResendEmail = async () => {
    // This would need the email from somewhere - could be passed as param
    Alert.alert(
      'Resend Email',
      'Please go back to the sign-up screen to resend the verification email.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go Back', onPress: () => router.replace('/(auth)/sign-up') },
      ]
    );
  };

  const handleGoToSignIn = () => {
    router.replace('/(auth)/sign-in');
  };

  if (loading || processingDeepLink) {
    return (
      <SafeAreaWrapper
        backgroundColor={theme.colors.background}
        testID="email-confirmation-loading"
      >
        <Container>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.primary + '20',
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing.xl,
                marginBottom: theme.spacing.xl,
              }}
            >
              <Loader2
                size={48}
                color={theme.colors.primary}
                style={{
                  alignSelf: 'center',
                  // Add rotation animation if needed
                }}
              />
            </View>
            
            <Text
              variant="h2"
              style={{
                textAlign: 'center',
                marginBottom: theme.spacing.md,
                color: theme.colors.text.primary,
              }}
            >
              {processingDeepLink ? 'Confirming Email...' : 'Processing...'}
            </Text>
            
            <Text
              variant="body"
              style={{
                textAlign: 'center',
                color: theme.colors.textSecondary,
                lineHeight: 24,
              }}
            >
              {processingDeepLink 
                ? 'Please wait while we confirm your email address.'
                : 'Loading confirmation details...'
              }
            </Text>
            
            <LoadingSkeleton
              width="100%"
              height={20}
              style={{ marginTop: theme.spacing.lg }}
            />
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  if (success) {
    return (
      <SafeAreaWrapper
        backgroundColor={theme.colors.background}
        testID="email-confirmation-success"
      >
        <Container>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.success + '20',
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing.xl,
                marginBottom: theme.spacing.xl,
              }}
            >
              <CheckCircle
                size={48}
                color={theme.colors.success}
                style={{ alignSelf: 'center' }}
              />
            </View>
            
            <Text
              variant="h2"
              style={{
                textAlign: 'center',
                marginBottom: theme.spacing.md,
                color: theme.colors.text.primary,
              }}
            >
              Email Confirmed!
            </Text>
            
            <Text
              variant="body"
              style={{
                textAlign: 'center',
                color: theme.colors.textSecondary,
                lineHeight: 24,
                marginBottom: theme.spacing.xl,
              }}
            >
              Your email has been successfully confirmed. Welcome to Sellar!
            </Text>
            
            <Button
              onPress={() => router.replace('/(auth)/welcome')}
              style={{ width: '100%' }}
            >
              Continue to App
            </Button>
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  // Error state
  return (
    <SafeAreaWrapper
      backgroundColor={theme.colors.background}
      testID="email-confirmation-error"
    >
      <Container>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.error + '20',
              borderRadius: theme.borderRadius.xl,
              padding: theme.spacing.xl,
              marginBottom: theme.spacing.xl,
            }}
          >
            <XCircle
              size={48}
              color={theme.colors.error}
              style={{ alignSelf: 'center' }}
            />
          </View>
          
          <Text
            variant="h2"
            style={{
              textAlign: 'center',
              marginBottom: theme.spacing.md,
              color: theme.colors.text.primary,
            }}
          >
            Confirmation Failed
          </Text>
          
          <Text
            variant="body"
            style={{
              textAlign: 'center',
              color: theme.colors.textSecondary,
              lineHeight: 24,
              marginBottom: theme.spacing.xl,
            }}
          >
            {error || 'We couldn\'t confirm your email. The link may have expired or is invalid.'}
          </Text>
          
          <View style={{ width: '100%', gap: theme.spacing.md }}>
            <Button
              onPress={handleResendEmail}
              style={{ width: '100%' }}
            >
              Resend Email
            </Button>
            
            <Button
              onPress={handleGoToSignIn}
              style={{ width: '100%' }}
            >
              Go to Sign In
            </Button>
          </View>
        </View>
      </Container>
    </SafeAreaWrapper>
  );
}
