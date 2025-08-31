import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Input,
  Button,
  LinkButton,
  LocationPicker,
} from '@/components';
import { router } from 'expo-router';
import { Mail, Lock, User, Phone } from 'lucide-react-native';

export default function SignUpScreen() {
  const { theme } = useTheme();
  const { signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email.trim(), password, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      location: location || 'Accra, Greater Accra',
    });
    
    if (error) {
      Alert.alert('Sign Up Failed', error);
    } else {
      router.replace('/(tabs)');
    }
    
    setLoading(false);
  };

  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              paddingVertical: theme.spacing['2xl'],
            }}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: theme.spacing['3xl'] }}>
              <Text variant="h1" style={{ marginBottom: theme.spacing.md }}>
                Join Sellar
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Create your account to start buying and selling
              </Text>
            </View>

            {/* Sign Up Form */}
            <View style={{ gap: theme.spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="First Name"
                    placeholder="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    leftIcon={<User size={20} color={theme.colors.text.muted} />}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Last Name"
                    placeholder="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={20} color={theme.colors.text.muted} />}
              />

              <Input
                label="Phone (Optional)"
                placeholder="Enter your phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={theme.colors.text.muted} />}
              />

              <View>
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                  Location
                </Text>
                <LocationPicker
                  value={location}
                  onLocationSelect={setLocation}
                  placeholder="Select your location"
                />
              </View>

              <Input
                variant="password"
                label="Password"
                placeholder="Create a password (min. 6 characters)"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="body" color="secondary">
                  Already have an account?
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
      </ScrollView>
    </SafeAreaWrapper>
  );
}