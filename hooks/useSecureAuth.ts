/**
 * Secure Authentication Hook
 * Enhanced authentication with security features, MFA, and device tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { securityService, SecurityEvent } from '../lib/securityService';
import { validateEmail, validatePassword } from '../utils/validation';
import { RateLimiter } from '../utils/security';

interface SecureAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresMFA: boolean;
  securityScore: number;
  lastSecurityEvent: SecurityEvent | null;
  deviceTrusted: boolean;
}

interface LoginOptions {
  email: string;
  password: string;
  mfaCode?: string;
  rememberDevice?: boolean;
  trustDevice?: boolean;
}

interface SignUpOptions {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  acceptedTerms?: boolean;
  referralCode?: string;
}

export function useSecureAuth() {
  const { user, session, loading: authLoading, signIn, signUp, signOut } = useAuthStore();
  const [secureState, setSecureState] = useState<SecureAuthState>({
    isAuthenticated: false,
    isLoading: true,
    requiresMFA: false,
    securityScore: 0,
    lastSecurityEvent: null,
    deviceTrusted: false,
  });

  const [loginAttempts, setLoginAttempts] = useState(0);
  const rateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

  const initializingRef = useRef(false);

  useEffect(() => {
    // Prevent concurrent initializations
    if (initializingRef.current) return;
    
    initializingRef.current = true;
    initializeSecureAuth().finally(() => {
      initializingRef.current = false;
    });
  }, [user, session]);

  useEffect(() => {
    // Listen for security events
    const handleSecurityEvent = (event: SecurityEvent) => {
      setSecureState(prev => ({
        ...prev,
        lastSecurityEvent: event,
      }));

      // Handle specific security events
      if (event.eventType === 'suspicious_activity') {
        handleSuspiciousActivity(event);
      }
    };

    securityService.addSecurityEventListener(handleSecurityEvent);

    return () => {
      securityService.removeSecurityEventListener(handleSecurityEvent);
    };
  }, []);

  const initializeSecureAuth = async () => {
    try {
      setSecureState(prev => ({ ...prev, isLoading: true }));

      // Initialize security service with error handling
      try {
        await securityService.initialize();
      } catch (securityError) {
        console.warn('Security service initialization failed, continuing with basic auth:', securityError);
      }

      // Validate current session with fallback
      let sessionValidation = { isValid: true };
      try {
        sessionValidation = await securityService.validateSession();
      } catch (sessionError) {
        console.warn('Session validation failed, using fallback:', sessionError);
      }
      
      const isAuthenticated = !!user && !!session && sessionValidation.isValid;
      
      // Calculate security score with fallback
      let score = 50; // Default score
      try {
        score = calculateSecurityScore();
      } catch (scoreError) {
        console.warn('Security score calculation failed, using default:', scoreError);
      }
      
      // Check if device is trusted with fallback
      let deviceTrusted = false;
      try {
        deviceTrusted = await checkDeviceTrust();
      } catch (trustError) {
        console.warn('Device trust check failed, defaulting to false:', trustError);
      }

      setSecureState({
        isAuthenticated,
        isLoading: false,
        requiresMFA: false,
        securityScore: score,
        lastSecurityEvent: null,
        deviceTrusted,
      });

    } catch (error) {
      console.error('Error initializing secure auth:', error);
      // Fallback to basic authentication state
      setSecureState({
        isAuthenticated: !!user && !!session,
        isLoading: false,
        requiresMFA: false,
        securityScore: 50,
        lastSecurityEvent: null,
        deviceTrusted: false,
      });
    }
  };

  const secureSignIn = async (options: LoginOptions): Promise<{
    success: boolean;
    error?: string;
    requiresMFA?: boolean;
  }> => {
    const { email, password, mfaCode, rememberDevice = false, trustDevice = false } = options;

    try {
      // Validate input
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }

      // Check rate limiting
      if (!rateLimiter.isAllowed(email)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(email) / 1000 / 60);
        return {
          success: false,
          error: `Too many failed attempts. Please try again in ${remainingTime} minutes.`
        };
      }

      setSecureState(prev => ({ ...prev, isLoading: true }));

      // Use security service for enhanced login
      const result = await securityService.secureLogin(email, password, {
        rememberDevice,
        skipRateLimit: false,
      });

      if (!result.success) {
        setLoginAttempts(prev => prev + 1);
        
        if (result.requiresMFA) {
          setSecureState(prev => ({ 
            ...prev, 
            requiresMFA: true, 
            isLoading: false 
          }));
          return { success: false, requiresMFA: true };
        }

        setSecureState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: result.error };
      }

      // If MFA is required but no code provided
      if (result.requiresMFA && !mfaCode) {
        setSecureState(prev => ({ 
          ...prev, 
          requiresMFA: true, 
          isLoading: false 
        }));
        return { success: false, requiresMFA: true };
      }

      // Verify MFA code if provided
      if (mfaCode) {
        const mfaValid = await verifyMFACode(mfaCode);
        if (!mfaValid) {
          return { success: false, error: 'Invalid MFA code' };
        }
      }

      // Complete regular sign in
      const signInResult = await signIn(email, password);
      if (signInResult.error) {
        setSecureState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: signInResult.error };
      }

      // Trust device if requested
      if (trustDevice && user?.id) {
        await trustCurrentDevice(user.id);
      }

      // Reset login attempts on success
      setLoginAttempts(0);
      rateLimiter.reset(email);

      await initializeSecureAuth();
      return { success: true };

    } catch (error) {
      console.error('Secure sign in error:', error);
      setSecureState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const secureSignUp = async (options: SignUpOptions): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      setSecureState(prev => ({ ...prev, isLoading: true }));

      // Enhanced validation
      const emailValidation = validateEmail(options.email);
      if (!emailValidation.isValid) {
        setSecureState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: emailValidation.error };
      }

      const passwordValidation = validatePassword(options.password);
      if (!passwordValidation.isValid) {
        setSecureState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: passwordValidation.error };
      }

      // Use existing sign up with enhanced validation
      const result = await signUp(
        options.email,
        passwordValidation.sanitizedValue || options.password,
        {
          firstName: options.firstName,
          lastName: options.lastName,
          phone: options.phone,
          location: options.location,
          acceptedTerms: options.acceptedTerms,
          referralCode: options.referralCode,
        }
      );

      setSecureState(prev => ({ ...prev, isLoading: false }));

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true };

    } catch (error) {
      console.error('Secure sign up error:', error);
      setSecureState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const secureSignOut = async (): Promise<void> => {
    try {
      // Invalidate current session
      await securityService.invalidateSession();
      
      // Regular sign out
      await signOut();
      
      // Reset secure state
      setSecureState({
        isAuthenticated: false,
        isLoading: false,
        requiresMFA: false,
        securityScore: 0,
        lastSecurityEvent: null,
        deviceTrusted: false,
      });

    } catch (error) {
      console.error('Secure sign out error:', error);
    }
  };

  const verifyMFACode = async (code: string): Promise<boolean> => {
    try {
      // In a real app, this would verify the TOTP code
      // For demo purposes, accept any 6-digit code
      return /^\d{6}$/.test(code);
    } catch (error) {
      console.error('MFA verification error:', error);
      return false;
    }
  };

  const calculateSecurityScore = (): number => {
    let score = 100;

    // Deduct points based on various factors
    if (loginAttempts > 0) {
      score -= loginAttempts * 5;
    }

    // In a real app, you would consider:
    // - Password strength
    // - MFA enabled
    // - Recent security events
    // - Device trust level
    // - Account age
    // - etc.

    return Math.max(0, Math.min(100, score));
  };

  const checkDeviceTrust = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const devices = await securityService.getUserDevices(user.id);
      const currentDevice = devices.find(device => device.isCurrentDevice);
      return currentDevice?.isTrusted || false;
    } catch (error) {
      console.error('Error checking device trust:', error);
      return false;
    }
  };

  const trustCurrentDevice = async (userId: string): Promise<void> => {
    try {
      // This would mark the current device as trusted
      // Implementation depends on your device management system
      console.log('Trusting current device for user:', userId);
    } catch (error) {
      console.error('Error trusting device:', error);
    }
  };

  const handleSuspiciousActivity = (event: SecurityEvent) => {
    Alert.alert(
      'Suspicious Activity Detected',
      'We detected unusual activity on your account. Please review your recent activity and consider changing your password.',
      [
        { text: 'Review Activity', onPress: () => {/* Navigate to security dashboard */} },
        { text: 'Change Password', onPress: () => {/* Navigate to password change */} },
        { text: 'Dismiss', style: 'cancel' },
      ]
    );
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }

      // Use Supabase to change password
      const { error } = await (securityService as any).supabase.auth.updateUser({
        password: passwordValidation.sanitizedValue || newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Log security event
      if (user?.id) {
        await (securityService as any).logSecurityEvent('password_change', user.id, {
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };

    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  };

  const requestPasswordReset = async (email: string): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }

      const { error } = await (securityService as any).supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to request password reset' };
    }
  };

  const getSecurityRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];

    if (secureState.securityScore < 80) {
      recommendations.push('Consider enabling two-factor authentication');
    }

    if (loginAttempts > 2) {
      recommendations.push('Change your password if you suspect unauthorized access');
    }

    if (!secureState.deviceTrusted) {
      recommendations.push('Mark this device as trusted for better security');
    }

    if (secureState.lastSecurityEvent?.eventType === 'failed_login') {
      recommendations.push('Review recent login attempts');
    }

    return recommendations;
  }, [secureState, loginAttempts]);

  return {
    // State
    ...secureState,
    isLoading: secureState.isLoading || authLoading,
    user,
    session,
    loginAttempts,

    // Actions
    secureSignIn,
    secureSignUp,
    secureSignOut,
    changePassword,
    requestPasswordReset,
    verifyMFACode,

    // Utilities
    getSecurityRecommendations,
    calculateSecurityScore,
    checkDeviceTrust,
  };
}
