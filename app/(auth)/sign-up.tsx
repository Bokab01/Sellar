import React, { useState, useEffect } from 'react';
import { View, Alert, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { validateSignUpForm } from '@/utils/validation';
import { supabase } from '@/lib/supabase';
import { checkUserStatus, getUserStatusActions } from '@/utils/checkUserStatus';
import { sanitizeEmail, sanitizeName, sanitizePassword, InputSanitizer } from '@/utils/inputSanitization';
import { AuthRateLimiters, rateLimitUtils } from '@/utils/rateLimiter';
// import { checkMultipleUniqueness } from '@/utils/uniquenessValidation'; // Temporarily disabled
import {
  Text,
  SafeAreaWrapper,
  Container,
  Input,
  Button,
  LinkButton,
  LocationPicker,
  HybridKeyboardAvoidingView,
} from '@/components';
import { router } from 'expo-router';
import { Mail, Lock, User, Phone, ArrowLeft, Check } from 'lucide-react-native';

export default function SignUpScreen() {
  const { theme } = useTheme();
  const { secureSignUp } = useSecureAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referralCode, setReferralCode] = useState('');

  // Process referral code from URL parameters
  useEffect(() => {
    const processReferralCode = async () => {
      try {
        // Check for referral code in URL parameters
        const params = new URLSearchParams(window?.location?.search || '');
        const refCode = params.get('ref');
        
        if (refCode) {
          setReferralCode(refCode.toUpperCase());
        }
      } catch (error) {
        // Ignore URL processing errors in mobile environment
        console.log('URL processing not available in mobile environment');
      }
    };

    processReferralCode();
  }, []);

  // Check if form is valid and complete
  const isFormValid = () => {
    // Email validation - basic but more thorough
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailValid = email.trim().length > 0 && emailRegex.test(email.trim());
    
    // Password validation
    const passwordValid = password.length >= 6;
    const confirmPasswordValid = confirmPassword === password && confirmPassword.length > 0;
    
    // Name validation
    const firstNameValid = firstName.trim().length >= 2;
    const lastNameValid = lastName.trim().length >= 2;
    
    // Phone validation - optional, but if provided must be at least 10 digits
    const phoneValid = phone.trim().length === 0 || phone.trim().length >= 10;
    
    // Location validation - optional
    const locationValid = true; // Location is optional
    
    // Terms acceptance
    const termsAccepted = acceptedTerms;

    return emailValid && passwordValid && confirmPasswordValid && 
           firstNameValid && lastNameValid && phoneValid && 
           locationValid && termsAccepted;
  };

  const handleResendConfirmation = async (email: string) => {
    try {
      setLoading(true);
      console.log('Resending confirmation email for:', email);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error('Resend confirmation error:', error);
        Alert.alert('Error', `Failed to resend confirmation email: ${error.message}`);
      } else {
        console.log('Confirmation email resent successfully');
        Alert.alert(
          'Email Sent!',
          'A new confirmation email has been sent to your inbox. Please check your email and click the verification link.',
          [
            { text: 'OK' },
            { 
              text: 'Go to Verification Screen', 
              onPress: () => router.push({
                pathname: '/(auth)/verify-email',
                params: { email }
              })
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Resend confirmation catch error:', error);
      Alert.alert('Error', 'Failed to resend confirmation email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    // Clear previous errors
    setErrors({});
    setLoading(true);

    try {
      // Step 1: Check rate limiting first
      const identifier = email.trim().toLowerCase();
      const rateLimitCheck = await AuthRateLimiters.registration.checkLimit(identifier, 'registration');
      
      if (!rateLimitCheck.allowed) {
        const message = rateLimitUtils.getRateLimitMessage(rateLimitCheck, 'registration');
        Alert.alert('Registration Limit Reached', message);
        setLoading(false);
        return;
      }

      // Step 2: Sanitize all inputs for security
      const emailSanitization = sanitizeEmail(email);
      const passwordSanitization = sanitizePassword(password);
      const firstNameSanitization = sanitizeName(firstName);
      const lastNameSanitization = sanitizeName(lastName);
      const phoneSanitization = sanitizeName(phone); // Use name sanitization for phone

      // Check for security threats
      const allThreats = [
        ...emailSanitization.threats,
        ...passwordSanitization.threats,
        ...firstNameSanitization.threats,
        ...lastNameSanitization.threats,
        ...phoneSanitization.threats,
      ];

      if (allThreats.length > 0) {
        const criticalThreats = allThreats.filter(t => t.severity === 'critical');
        if (criticalThreats.length > 0) {
          Alert.alert(
            'Security Alert',
            'Your input contains potentially harmful content. Please review and try again.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
      }

      // Use sanitized values for validation
      const sanitizedData = {
        email: emailSanitization.sanitized.trim(),
        password: passwordSanitization.sanitized,
        confirmPassword, // Don't sanitize confirm password to ensure exact match
        firstName: firstNameSanitization.sanitized.trim(),
        lastName: lastNameSanitization.sanitized.trim(),
        phone: phoneSanitization.sanitized.trim(),
      };

      // Step 2: Validate all form fields
      const validation = validateSignUpForm(sanitizedData);

      if (!validation.isValid) {
        setErrors(validation.errors);
        const firstError = Object.values(validation.errors)[0];
        Alert.alert('Validation Error', firstError);
        setLoading(false);
        return;
      }

      // Step 2.5: Check terms acceptance
      if (!acceptedTerms) {
        setErrors({ terms: 'You must accept the Terms and Conditions and Privacy Policy to continue.' });
        Alert.alert('Terms Required', 'Please accept the Terms and Conditions and Privacy Policy to create your account.');
        setLoading(false);
        return;
      }

      // Step 3: Enhanced pre-signup validation with smart user status detection
      console.log('Checking user status before signup...');
      
      try {
        const userStatus = await checkUserStatus(sanitizedData.email);
        console.log('User status result:', userStatus);
        
        if (userStatus.exists && userStatus.recommendedAction !== 'signup') {
          setErrors({ email: userStatus.message });
          
          const actions = getUserStatusActions(userStatus);
          const alertButtons = actions.map(action => ({
            text: action.text,
            style: action.style,
            onPress: () => {
              switch (action.action) {
                case 'signin':
                  router.replace('/(auth)/sign-in');
                  break;
                case 'resend':
                  handleResendConfirmation(sanitizedData.email);
                  break;
                case 'signup':
                  // Continue with signup
                  break;
                case 'cancel':
                default:
                  // Do nothing
                  break;
              }
            }
          }));
          
          Alert.alert(
            userStatus.isConfirmed ? 'Account Already Verified' : 'Account Exists',
            userStatus.message,
            alertButtons
          );
          
          setLoading(false);
          return;
        }
        
        console.log('Email is available - proceeding with signup');
      } catch (statusCheckError) {
        console.error('User status check failed:', statusCheckError);
        // Continue with signup if check fails (fail-safe)
      }

      // Step 4: Record the registration attempt
      await AuthRateLimiters.registration.recordAttempt(identifier, 'registration');

      // Step 5: Proceed with signup using sanitized data
      console.log('Starting signup process for:', sanitizedData.email);
      const result = await secureSignUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        phone: sanitizedData.phone || undefined,
        location: location || undefined, // Location is not sanitized as it's from picker
        acceptedTerms: acceptedTerms,
        referralCode: referralCode.trim() || undefined,
      });
      
      console.log('Signup result:', result);
      
      if (!result.success) {
        // Handle specific signup errors
        if (result.error?.includes('already registered') || result.error?.includes('already exists')) {
          setErrors({ email: 'This email address is already registered. Please sign in instead.' });
          Alert.alert('Account Exists', 'This email address is already registered. Please sign in instead.');
        } else {
          Alert.alert('Sign Up Failed', result.error || 'Unknown error occurred');
        }
      } else {
        // Navigate to email verification screen
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: email.trim() }
        });
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Sign Up Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <HybridKeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        extraScrollHeight={150}
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingBottom: theme.spacing['4xl'],
        }}
      >
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
              minHeight: '100%',
              justifyContent: 'center',
              paddingVertical: theme.spacing['xs'],
            }}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: theme.spacing['xl'] }}>
              <Text variant="h1" style={{ marginBottom: theme.spacing.md }}>
                Join Sellar
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Create your account to start buying and selling
              </Text>
            </View>

            {/* Sign Up Form */}
            <View>
              <View style={{ flexDirection: 'row', marginBottom: theme.spacing.md}}>
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <Input
                    label="First Name"
                    placeholder="First name"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (errors.firstName) {
                        setErrors(prev => ({ ...prev, firstName: '' }));
                      }
                    }}
                    leftIcon={<User size={20} color={theme.colors.text.muted} />}
                    error={errors.firstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Last Name"
                    placeholder="Last name"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (errors.lastName) {
                        setErrors(prev => ({ ...prev, lastName: '' }));
                      }
                    }}
                    error={errors.lastName}
                  />
                </View>
              </View>

              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={20} color={theme.colors.text.muted} />}
                error={errors.email}
                style={{ marginBottom: theme.spacing.lg }}
              />

              <Input
                label="Phone (Optional)"
                placeholder="Enter your phone number"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) {
                    setErrors(prev => ({ ...prev, phone: '' }));
                  }
                }}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={theme.colors.text.muted} />}
                error={errors.phone}
                style={{ marginBottom: theme.spacing.lg }}
              />

              <Input
                variant="password"
                label="Password"
                placeholder="Create password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
                error={errors.password}
                style={{ marginBottom: theme.spacing.lg }}
              />

              <Input
                variant="password"
                label="Confirm Password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
                error={errors.confirmPassword}
                style={{ marginBottom: theme.spacing.lg }}
              />

              <Input
                label="Referral Code (Optional)"
                placeholder="Enter referral code if you have one"
                value={referralCode}
                onChangeText={(text) => {
                  setReferralCode(text.toUpperCase());
                  if (errors.referralCode) {
                    setErrors(prev => ({ ...prev, referralCode: '' }));
                  }
                }}
                autoCapitalize="characters"
                maxLength={8}
                error={errors.referralCode}
                style={{ marginBottom: theme.spacing.xl }}
              />

              {/* Terms and Conditions Checkbox */}
              <View style={{ 
                marginBottom: theme.spacing.xl,
                marginTop: theme.spacing.lg 
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingHorizontal: theme.spacing.xs,
                }}>
                  <TouchableOpacity
                    onPress={() => {
                      setAcceptedTerms(!acceptedTerms);
                      if (errors.terms) {
                        setErrors(prev => ({ ...prev, terms: '' }));
                      }
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: acceptedTerms ? theme.colors.primary : theme.colors.text.muted,
                      backgroundColor: acceptedTerms ? theme.colors.primary : 'transparent',
                      marginRight: theme.spacing.sm,
                      marginTop: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    activeOpacity={0.7}
                  >
                    {acceptedTerms && (
                      <Check 
                        size={14} 
                        color="white" 
                        strokeWidth={3}
                      />
                    )}
                  </TouchableOpacity>
                  
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmall" style={{ 
                      lineHeight: 20,
                      color: theme.colors.text.secondary 
                    }}>
                      I agree to the{' '}
                      <Text 
                        style={{ 
                          color: theme.colors.primary,
                          textDecorationLine: 'underline' 
                        }}
                        onPress={() => {
                          router.push('/(auth)/terms-and-conditions');
                        }}
                      >
                        Terms and Conditions
                      </Text>
                      {' '}and{' '}
                      <Text 
                        style={{ 
                          color: theme.colors.primary,
                          textDecorationLine: 'underline' 
                        }}
                        onPress={() => {
                          router.push('/(auth)/privacy-policy');
                        }}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                    
                    {errors.terms && (
                      <Text variant="bodySmall" style={{ 
                        color: theme.colors.error,
                        marginTop: theme.spacing.xs 
                      }}>
                        {errors.terms}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <Button
                variant="primary"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading || !isFormValid()}
                fullWidth
                size="lg"
              >
                Create Account
              </Button>

              {/* Form validation helper text */}
              {!isFormValid() && !loading && (
                <Text variant="bodySmall" style={{
                  textAlign: 'center',
                  color: theme.colors.text.muted,
                  marginTop: theme.spacing.sm,
                  lineHeight: 18,
                }}>
                  {(() => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    const missing = [];
                    
                    if (!email.trim() || !emailRegex.test(email.trim())) missing.push('valid email');
                    if (password.length < 6) missing.push('password (6+ chars)');
                    if (confirmPassword !== password || !confirmPassword) missing.push('password confirmation');
                    if (firstName.trim().length < 2) missing.push('first name');
                    if (lastName.trim().length < 2) missing.push('last name');
                    // Phone is optional, but if provided must be valid
                    if (phone.trim().length > 0 && phone.trim().length < 10) missing.push('valid phone number (10+ digits)');
                    if (!acceptedTerms) missing.push('terms acceptance');
                    
                    if (missing.length === 0) return 'All required fields completed!';
                    if (missing.length === 1) return `Please provide ${missing[0]}`;
                    if (missing.length === 2) return `Please provide ${missing[0]} and ${missing[1]}`;
                    return `Please provide ${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
                  })()}
                </Text>
              )}
            </View>

            {/* Footer Links */}
            <View style={{ alignItems: 'center', marginTop: theme.spacing['2xl'] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="body" color="secondary">
                  Already have an account?{' '}
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
      </HybridKeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}
