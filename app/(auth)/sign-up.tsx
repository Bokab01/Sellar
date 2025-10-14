import React, { useState, useEffect } from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { validateSignUpForm } from '@/utils/validation';
import { supabase } from '@/lib/supabase';
import { checkUserStatus, getUserStatusActions } from '@/utils/checkUserStatus';
import { sanitizeEmail, sanitizeName, sanitizePassword, InputSanitizer } from '@/utils/inputSanitization';
import { AuthRateLimiters, rateLimitUtils } from '@/utils/rateLimiter';
import { checkPhoneUniqueness } from '@/utils/uniquenessValidation';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Input,
  Button,
  LinkButton,
  LocationPicker,
  HybridKeyboardAvoidingView,
  AppModal,
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
  const [checkingPhone, setCheckingPhone] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    actions?: Array<{ text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'tertiary' }>;
  }>({ title: '', message: '' });

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

  // Helper function to show modal
  const showAlertModal = (
    title: string, 
    message: string, 
    actions?: Array<{ text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'tertiary' }>
  ) => {
    setModalConfig({ title, message, actions });
    setShowModal(true);
  };

  // Validate Ghanaian phone number format
  const validatePhoneNumber = (phoneNumber: string): { isValid: boolean; error?: string } => {
    // Remove all spaces and special characters
    const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '');
    
    // Ghanaian phone number patterns
    // Format 1: 0XXXXXXXXX (10 digits starting with 0)
    // Format 2: +233XXXXXXXXX (13 characters starting with +233)
    // Format 3: 233XXXXXXXXX (12 digits starting with 233)
    
    const pattern1 = /^0[2-5][0-9]{8}$/; // 0XX XXXX XXXX (MTN, Vodafone, AirtelTigo)
    const pattern2 = /^\+233[2-5][0-9]{8}$/; // +233 XX XXXX XXXX
    const pattern3 = /^233[2-5][0-9]{8}$/; // 233 XX XXXX XXXX
    
    if (pattern1.test(cleanPhone) || pattern2.test(cleanPhone) || pattern3.test(cleanPhone)) {
      return { isValid: true };
    }
    
    // Provide specific error messages
    if (cleanPhone.length < 10) {
      return { 
        isValid: false, 
        error: 'Phone number is too short. Use format: 0XX XXX XXXX or +233 XX XXX XXXX' 
      };
    }
    
    if (cleanPhone.length > 13) {
      return { 
        isValid: false, 
        error: 'Phone number is too long. Use format: 0XX XXX XXXX or +233 XX XXX XXXX' 
      };
    }
    
    if (cleanPhone.startsWith('0') && cleanPhone.length !== 10) {
      return { 
        isValid: false, 
        error: 'Invalid format. Ghanaian numbers starting with 0 must be 10 digits' 
      };
    }
    
    if (cleanPhone.startsWith('+233') && cleanPhone.length !== 13) {
      return { 
        isValid: false, 
        error: 'Invalid format. Use +233 XX XXX XXXX (13 characters)' 
      };
    }
    
    if (cleanPhone.startsWith('233') && !cleanPhone.startsWith('+') && cleanPhone.length !== 12) {
      return { 
        isValid: false, 
        error: 'Invalid format. Use 233 XX XXX XXXX (12 digits)' 
      };
    }
    
    // Check if second digit (after country code) is valid (2-5)
    let secondDigit = '';
    if (cleanPhone.startsWith('0')) {
      secondDigit = cleanPhone[1];
    } else if (cleanPhone.startsWith('+233')) {
      secondDigit = cleanPhone[4];
    } else if (cleanPhone.startsWith('233')) {
      secondDigit = cleanPhone[3];
    }
    
    if (secondDigit && !['2', '3', '4', '5'].includes(secondDigit)) {
      return { 
        isValid: false, 
        error: 'Invalid Ghanaian number. Must start with 02, 03, 04, or 05' 
      };
    }
    
    return { 
      isValid: false, 
      error: 'Invalid phone number format. Use: 0XX XXX XXXX or +233 XX XXX XXXX' 
    };
  };

  // Check phone number uniqueness when user finishes entering
  const handlePhoneBlur = async () => {
    const trimmedPhone = phone.trim();
    
    // Only check if phone is provided (it's optional)
    if (!trimmedPhone) {
      // Clear any previous phone errors
      if (errors.phone) {
        setErrors(prev => ({ ...prev, phone: '' }));
      }
      return;
    }

    // Validate phone format and length first
    const validation = validatePhoneNumber(trimmedPhone);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, phone: validation.error || 'Invalid phone number' }));
      return;
    }

    // Check uniqueness in database
    setCheckingPhone(true);
    try {
      const result = await checkPhoneUniqueness(trimmedPhone);
      
      if (!result.isUnique) {
        setErrors(prev => ({ 
          ...prev, 
          phone: result.error || 'This phone number is already registered'
        }));
      } else {
        // Clear error if phone is unique and valid
        setErrors(prev => ({ ...prev, phone: '' }));
      }
    } catch (error) {
      console.error('Phone check error:', error);
      // Don't block signup on check failure, just log it
    } finally {
      setCheckingPhone(false);
    }
  };

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
        showAlertModal('Error', `Failed to resend confirmation email: ${error.message}`);
      } else {
        console.log('Confirmation email resent successfully');
        showAlertModal(
          'Email Sent!',
          'A new confirmation email has been sent to your inbox. Please check your email and click the verification link.',
          [
            { text: 'OK', onPress: () => setShowModal(false) },
            { 
              text: 'Go to Verification Screen', 
              onPress: () => {
                setShowModal(false);
                router.push({
                  pathname: '/(auth)/verify-email',
                  params: { email }
                });
              },
              variant: 'primary'
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Resend confirmation catch error:', error);
      showAlertModal('Error', 'Failed to resend confirmation email. Please try again.');
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
        showAlertModal('Registration Limit Reached', message);
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
          showAlertModal(
            'Security Alert',
            'Your input contains potentially harmful content. Please review and try again.'
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
        showAlertModal('Validation Error', firstError);
        setLoading(false);
        return;
      }

      // Step 2.5: Check terms acceptance
      if (!acceptedTerms) {
        setErrors({ terms: 'You must accept the Terms and Conditions and Privacy Policy to continue.' });
        showAlertModal('Terms Required', 'Please accept the Terms and Conditions and Privacy Policy to create your account.');
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
          const modalActions = actions.map(action => ({
            text: action.text,
            variant: (action.style === 'cancel' ? 'secondary' : 'primary') as 'primary' | 'secondary' | 'tertiary',
            onPress: () => {
              setShowModal(false);
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
          
          showAlertModal(
            userStatus.isConfirmed ? 'Account Already Verified' : 'Account Exists',
            userStatus.message,
            modalActions
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
          showAlertModal('Account Exists', 'This email address is already registered. Please sign in instead.');
        } else {
          showAlertModal('Sign Up Failed', result.error || 'Unknown error occurred');
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
      showAlertModal('Sign Up Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <HybridKeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        extraScrollHeight={100}
        contentContainerStyle={{ 
          flexGrow: 1,
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
                marginBottom: theme.spacing.xs,
              }}
            >
              <ArrowLeft size={20} color={theme.colors.text.primary} />
            </Button>
    
          <View
            style={{
              flex: 1,
            }}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: theme.spacing['lg'] }}>
              <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>
                Join Sellar
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
                Create your account to start buying and selling
              </Text>
            </View>

            {/* Sign Up Form */}
            <View>
              <View style={{ flexDirection: 'row', marginBottom: theme.spacing.md}}>
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <Input
                    placeholder="First name *"
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
                    placeholder="Last name *"
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
                placeholder="Enter your email *"
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
                placeholder="Phone number (Optional)"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) {
                    setErrors(prev => ({ ...prev, phone: '' }));
                  }
                }}
                onBlur={handlePhoneBlur}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={theme.colors.text.muted} />}
                error={errors.phone}
                helper={checkingPhone ? 'Checking availability...' : undefined}
                style={{ marginBottom: theme.spacing.lg }}
              />

              <Input
                variant="password"
                placeholder="Create password (6+ characters) *"
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
                placeholder="Confirm password *"
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
                placeholder="Referral code (Optional)"
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
                style={{ marginBottom: theme.spacing.md}}
              />

              {/* Terms and Conditions Checkbox */}
              <View style={{ 
                marginBottom: theme.spacing.md,
                marginTop: theme.spacing.md 
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
           {/*    {!isFormValid() && !loading && (
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
              )} */}
            </View>

            {/* Footer Links */}
            <View style={{ alignItems: 'center', marginTop: theme.spacing['lg'] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="bodySmall" color="secondary">
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

      {/* Alert Modal */}
      <AppModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={modalConfig.title}
        position="center"
        size="md"
      >
        <View style={{ padding: theme.spacing.md }}>
          <Text variant="body" style={{ marginBottom: theme.spacing.lg }}>
            {modalConfig.message}
          </Text>
          
          <View style={{ gap: theme.spacing.sm }}>
            {modalConfig.actions && modalConfig.actions.length > 0 ? (
              modalConfig.actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'primary'}
                  onPress={action.onPress}
                  fullWidth
                >
                  {action.text}
                </Button>
              ))
            ) : (
              <Button
                variant="primary"
                onPress={() => setShowModal(false)}
                fullWidth
              >
                OK
              </Button>
            )}
          </View>
        </View>
      </AppModal>
    </SafeAreaWrapper>
  );
}
