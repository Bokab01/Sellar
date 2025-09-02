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
} from '@/components';
import { router } from 'expo-router';
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(password);
    
    if (error) {
      Alert.alert('Error', error);
    } else {
      setResetSuccess(true);
    }
    
    setLoading(false);
  };

  if (resetSuccess) {
    return (
      <SafeAreaWrapper>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Container>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                paddingVertical: theme.spacing['4xl'],
              }}
            >
              {/* Success Header */}
              <View style={{ alignItems: 'center', marginBottom: theme.spacing['4xl'] }}>
                <View
                  style={{
                    backgroundColor: theme.colors.success,
                    borderRadius: 50,
                    padding: theme.spacing.xl,
                    marginBottom: theme.spacing.xl,
                  }}
                >
                  <CheckCircle size={48} color={theme.colors.successForeground} />
                </View>
                <Text variant="h1" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
                  Password Reset!
                </Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                  Your password has been successfully reset. You can now sign in with your new password.
                </Text>
              </View>

              {/* Action */}
              <Button
                variant="primary"
                onPress={() => router.replace('/(auth)/sign-in')}
                fullWidth
                size="lg"
              >
                Continue to Sign In
              </Button>
            </View>
          </Container>
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
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
              <Text variant="h1" style={{ marginBottom: theme.spacing.md }}>
                Reset Password
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Enter your new password below
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: theme.spacing.xl }}>
              <Input
                variant="password"
                label="New Password"
                placeholder="Enter new password"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
                rightIcon={
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                secureTextEntry={!showPassword}
                helperText="Must be at least 6 characters"
              />

              <Input
                variant="password"
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
                rightIcon={
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                secureTextEntry={!showConfirmPassword}
              />

              <Button
                variant="primary"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
              >
                Reset Password
              </Button>
            </View>

            {/* Password Requirements */}
            <View style={{ marginTop: theme.spacing.xl, padding: theme.spacing.lg, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.borderRadius.md }}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                Password Requirements:
              </Text>
              <View style={{ gap: theme.spacing.xs }}>
                <Text variant="caption" color={password.length >= 6 ? 'success' : 'muted'}>
                  • At least 6 characters
                </Text>
                <Text variant="caption" color={password === confirmPassword && password.length > 0 ? 'success' : 'muted'}>
                  • Passwords match
                </Text>
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}


