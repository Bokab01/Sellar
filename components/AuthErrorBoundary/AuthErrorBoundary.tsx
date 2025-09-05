import React, { Component, ReactNode } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { handleAuthError, analyzeAuthError } from '@/utils/authErrorHandler';
import { Text, Button, SafeAreaWrapper } from '@/components';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

/**
 * Error boundary specifically for authentication-related errors
 * Provides graceful fallback and recovery options
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);
    
    // Check if this is an auth-related error
    const authErrorInfo = analyzeAuthError(error);
    
    if (authErrorInfo.type === 'refresh_token' || authErrorInfo.type === 'session') {
      this.handleAuthError(error);
    }
  }

  handleAuthError = async (error: Error) => {
    try {
      const result = await handleAuthError(error);
      
      if (result.handled && result.shouldRedirect) {
        // Show user-friendly message
        Alert.alert(
          'Session Expired',
          result.message || 'Your session has expired. Please sign in again.',
          [
            {
              text: 'Sign In',
              onPress: () => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                router.replace('/(auth)/sign-in');
              },
            },
          ]
        );
      }
    } catch (recoveryError) {
      console.error('Failed to handle auth error:', recoveryError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleSignIn = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    router.replace('/(auth)/sign-in');
  };

  render() {
    if (this.state.hasError) {
      // Check if this is an auth error
      const authErrorInfo = analyzeAuthError(this.state.error);
      
      if (authErrorInfo.type === 'refresh_token' || authErrorInfo.type === 'session') {
        return (
          <SafeAreaWrapper>
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}>
              <Text variant="h2" style={{ textAlign: 'center', marginBottom: 16 }}>
                Session Expired
              </Text>
              <Text variant="body" style={{ textAlign: 'center', marginBottom: 24 }}>
                {authErrorInfo.message}
              </Text>
              <Button
                title="Sign In Again"
                onPress={this.handleSignIn}
                style={{ marginBottom: 12 }}
              />
              <Button
                title="Retry"
                variant="outline"
                onPress={this.handleRetry}
              />
            </View>
          </SafeAreaWrapper>
        );
      }

      // For other errors, show generic error UI or custom fallback
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <SafeAreaWrapper>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <Text variant="h2" style={{ textAlign: 'center', marginBottom: 16 }}>
              Something went wrong
            </Text>
            <Text variant="body" style={{ textAlign: 'center', marginBottom: 24 }}>
              {this.state.errorInfo || 'An unexpected error occurred'}
            </Text>
            <Button
              title="Try Again"
              onPress={this.handleRetry}
            />
          </View>
        </SafeAreaWrapper>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to manually trigger auth error recovery
 */
export function useAuthErrorRecovery() {
  const recoverFromAuthError = async (error: any) => {
    try {
      const result = await handleAuthError(error);
      
      if (result.handled && result.shouldRedirect) {
        Alert.alert(
          'Authentication Error',
          result.message || 'Please sign in again.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)/sign-in'),
            },
          ]
        );
        return true;
      }
      
      return false;
    } catch (recoveryError) {
      console.error('Failed to recover from auth error:', recoveryError);
      return false;
    }
  };

  return { recoverFromAuthError };
}
