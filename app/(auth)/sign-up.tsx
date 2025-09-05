import React, { useState } from 'react';
import { View, Alert, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { validateSignUpForm } from '@/utils/validation';
import { checkMultipleUniqueness } from '@/utils/uniquenessValidation';
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
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react-native';

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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSignUp = async () => {
    // Clear previous errors
    setErrors({});
    setLoading(true);

    try {
      // Step 1: Validate all form fields
      const validation = validateSignUpForm({
        email: email.trim(),
        password,
        confirmPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });

      if (!validation.isValid) {
        setErrors(validation.errors);
        const firstError = Object.values(validation.errors)[0];
        Alert.alert('Validation Error', firstError);
        setLoading(false);
        return;
      }

      // Step 2: Check uniqueness of email and phone
      const uniquenessCheck = await checkMultipleUniqueness({
        email: email.trim(),
        phone: phone.trim() || undefined,
      });

      if (!uniquenessCheck.isValid) {
        setErrors(uniquenessCheck.errors);
        const firstError = Object.values(uniquenessCheck.errors)[0];
        Alert.alert('Registration Error', firstError);
        setLoading(false);
        return;
      }

      // Step 3: Proceed with signup
      const result = await secureSignUp({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        location: location || undefined,
      });
      
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
                style={{ marginBottom: theme.spacing.xl }}
              />

              <Button
                variant="primary"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
              >
                Create Account
              </Button>
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
