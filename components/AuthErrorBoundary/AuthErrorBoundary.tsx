import React, { Component, ReactNode } from 'react';
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { handleAuthError, analyzeAuthError } from '@/utils/authErrorHandler';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { SafeAreaWrapper } from '@/components/Layout';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

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
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);
    
    // Analyze the error to determine if it's auth-related
    const authErrorInfo = analyzeAuthError(error);
    
    this.setState({
      error,
      errorInfo,
    });

    // Handle auth errors automatically
    if (authErrorInfo.shouldSignOut) {
      this.handleAuthError(error);
    }
  }

  private handleAuthError = async (error: Error) => {
    try {
      const result = await handleAuthError(error);
      
      if (result.shouldRedirect) {
        // Navigate to sign in screen
        router.replace('/(auth)/signin' as any);
      }
    } catch (handleError) {
      console.error('Error handling auth error:', handleError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleSignOut = async () => {
    try {
      // Import auth store dynamically to avoid circular dependencies
      const { useAuthStore } = await import('@/store/useAuthStore');
      await useAuthStore.getState().signOut();
      router.replace('/(auth)/signin' as any);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force navigation even if sign out fails
      router.replace('/(auth)/signin' as any);
    }
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const authErrorInfo = analyzeAuthError(error);

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaWrapper>
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: 20,
            backgroundColor: '#f8f9fa'
          }}>
            <Text variant="h2" style={{ marginBottom: 16, textAlign: 'center' }}>
              {authErrorInfo.type === 'refresh_token' ? 'Session Expired' : 'Authentication Error'}
            </Text>
            
            <Text variant="body" style={{ 
              marginBottom: 24, 
              textAlign: 'center',
              color: '#666'
            }}>
              {authErrorInfo.message}
            </Text>

            <View style={{ gap: 12, width: '100%', maxWidth: 300 }}>
              {authErrorInfo.shouldRetry && (
                <Button
                  onPress={this.handleRetry}
                  variant="primary"
                >
                  Try Again
                </Button>
              )}
              
              {authErrorInfo.shouldSignOut && (
                <Button
                  onPress={this.handleSignOut}
                  variant="secondary"
                >
                  Sign In Again
                </Button>
              )}
            </View>
          </View>
        </SafeAreaWrapper>
      );
    }

    return this.props.children;
  }
}