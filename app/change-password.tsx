import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Input,
  Button,
  AppHeader,
  AppModal,
} from '@/components';
import { router } from 'expo-router';
import { Lock, CheckCircle } from 'lucide-react-native';

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const { changePassword } = useSecureAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);
  
  // Error states
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
  }>({ title: '', message: '' });

  const showAlertModal = (title: string, message: string) => {
    setModalConfig({ title, message });
    setShowModal(true);
  };

  const handleChangePassword = async () => {
    // Clear previous errors
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    // Validation
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      setNewPasswordError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setNewPasswordError('Password must be at least 6 characters');
      return;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setNewPasswordError('New password must be different from current password');
      return;
    }

    setLoading(true);
    
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const result = await Promise.race([
        changePassword(currentPassword, newPassword),
        timeoutPromise
      ]) as { success: boolean; error?: string };
      
      if (result.success) {
        setChangeSuccess(true);
      } else {
        showAlertModal('Error', result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      showAlertModal(
        'Error', 
        error instanceof Error && error.message === 'Request timeout' 
          ? 'Request timed out. Please check your connection and try again.' 
          : 'Failed to change password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (changeSuccess) {
    return (
      <SafeAreaWrapper>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Container padding='sm'>
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
                  Password Changed!
                </Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
                  Your password has been successfully updated. You can now use your new password to sign in.
                </Text>
                <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
                  📧 A confirmation email has been sent to your registered email address.
                </Text>
              </View>

              {/* Action */}
              <Button
                variant="primary"
                onPress={() => router.back()}
                fullWidth
                size="lg"
              >
                Back to Settings
              </Button>
            </View>
          </Container>
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader 
        title="Change Password" 
        showBackButton 
        onBackPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container padding='sm'>
          <View
            style={{
              flex: 1,
              paddingVertical: theme.spacing.xl,
            }}
          >
            {/* Info Box */}
            <View
              style={{
                backgroundColor: theme.colors.primary + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                marginBottom: theme.spacing['2xl'],
              }}
            >
              <Text variant="bodySmall" style={{ color: theme.colors.primary, textAlign: 'center', lineHeight: 18 }}>
                💡 Choose a strong password that you haven&apos;t used before
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: theme.spacing.xl }}>
              <Input
                variant="password"
                label="Current Password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (currentPasswordError) setCurrentPasswordError('');
                }}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
                error={currentPasswordError}
              />

              <Input
                variant="password"
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (newPasswordError) setNewPasswordError('');
                }}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
                error={newPasswordError}
                helper="Must be at least 6 characters"
              />

              <Input
                variant="password"
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
                leftIcon={<Lock size={20} color={theme.colors.text.muted} />}
                error={confirmPasswordError}
              />
            </View>

            {/* Password Requirements */}
            <View style={{ 
              marginTop: theme.spacing.xl, 
              padding: theme.spacing.lg, 
              backgroundColor: theme.colors.surfaceVariant, 
              borderRadius: theme.borderRadius.md 
            }}>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm, fontWeight: '600' }}>
                Password Requirements:
              </Text>
              <View style={{ gap: theme.spacing.xs }}>
                <Text variant="caption" color={newPassword.length >= 6 ? 'success' : 'muted'}>
                  {newPassword.length >= 6 ? '✓' : '○'} At least 6 characters
                </Text>
                <Text variant="caption" color={newPassword === confirmPassword && newPassword.length > 0 ? 'success' : 'muted'}>
                  {newPassword === confirmPassword && newPassword.length > 0 ? '✓' : '○'} Passwords match
                </Text>
                <Text variant="caption" color={currentPassword && newPassword && currentPassword !== newPassword ? 'success' : 'muted'}>
                  {currentPassword && newPassword && currentPassword !== newPassword ? '✓' : '○'} Different from current password
                </Text>
              </View>
            </View>

            {/* Button */}
            <Button
              variant="primary"
              onPress={handleChangePassword}
              loading={loading}
              disabled={loading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
              fullWidth
              size="lg"
              style={{ marginTop: theme.spacing.xl }}
            >
              Change Password
            </Button>
          </View>
        </Container>
      </ScrollView>

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
          
          <Button
            variant="primary"
            onPress={() => setShowModal(false)}
            fullWidth
          >
            OK
          </Button>
        </View>
      </AppModal>
    </SafeAreaWrapper>
  );
}

