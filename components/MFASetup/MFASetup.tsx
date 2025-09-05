/**
 * Multi-Factor Authentication Setup Component
 * Allows users to enable/disable MFA and manage backup codes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { generateSecureToken } from '../../utils/security';

interface MFASetupProps {
  onMFAStatusChange?: (enabled: boolean) => void;
}

interface BackupCode {
  code: string;
  used: boolean;
}

export function MFASetup({ onMFAStatusChange }: MFASetupProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);
  const [qrCodeSecret, setQrCodeSecret] = useState('');

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Check if MFA is enabled for this user
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('two_factor_enabled')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading MFA status:', error);
        return;
      }

      setMfaEnabled(data?.two_factor_enabled || false);
      
    } catch (error) {
      console.error('Error loading MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = () => {
    setShowSetupModal(true);
    setSetupStep(1);
    generateQRSecret();
  };

  const handleDisableMFA = () => {
    Alert.alert(
      'Disable Two-Factor Authentication',
      'This will make your account less secure. Are you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: disableMFA },
      ]
    );
  };

  const generateQRSecret = () => {
    // In a real app, you would generate a proper TOTP secret
    // and create a QR code for authenticator apps
    const secret = generateSecureToken(16);
    setQrCodeSecret(secret);
  };

  const verifyMFACode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    try {
      // In a real app, you would verify the TOTP code against the secret
      // For demo purposes, we'll accept any 6-digit code
      if (!/^\d{6}$/.test(verificationCode)) {
        Alert.alert('Error', 'Invalid verification code');
        return;
      }

      // Generate backup codes
      const codes = generateBackupCodes();
      setBackupCodes(codes);
      setSetupStep(3);
      
    } catch (error) {
      console.error('Error verifying MFA code:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    }
  };

  const generateBackupCodes = (): BackupCode[] => {
    const codes: BackupCode[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push({
        code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        used: false,
      });
    }
    return codes;
  };

  const completeMFASetup = async () => {
    if (!user?.id) return;

    try {
      // Save MFA settings to database
      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          two_factor_enabled: true,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error enabling MFA:', error);
        Alert.alert('Error', 'Failed to enable MFA. Please try again.');
        return;
      }

      // In a real app, you would also save the TOTP secret and backup codes securely
      
      setMfaEnabled(true);
      setShowSetupModal(false);
      onMFAStatusChange?.(true);
      
      Alert.alert(
        'MFA Enabled',
        'Two-factor authentication has been successfully enabled for your account.'
      );
      
    } catch (error) {
      console.error('Error completing MFA setup:', error);
      Alert.alert('Error', 'Failed to enable MFA. Please try again.');
    }
  };

  const disableMFA = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          two_factor_enabled: false,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error disabling MFA:', error);
        Alert.alert('Error', 'Failed to disable MFA. Please try again.');
        return;
      }

      setMfaEnabled(false);
      onMFAStatusChange?.(false);
      
      Alert.alert('MFA Disabled', 'Two-factor authentication has been disabled.');
      
    } catch (error) {
      console.error('Error disabling MFA:', error);
      Alert.alert('Error', 'Failed to disable MFA. Please try again.');
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.map(code => code.code).join('\n');
    Clipboard.setString(codesText);
    Alert.alert('Copied', 'Backup codes have been copied to your clipboard.');
  };

  const downloadBackupCodes = () => {
    // In a real app, you would generate a file download
    Alert.alert(
      'Download Backup Codes',
      'In a production app, this would download a secure file with your backup codes.'
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
          Loading MFA settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons 
              name="shield-checkmark" 
              size={32} 
              color={mfaEnabled ? theme.colors.success || '#4CAF50' : theme.colors.textSecondary} 
            />
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                Two-Factor Authentication
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          
          <View style={[
            styles.statusBadge, 
            { backgroundColor: mfaEnabled ? theme.colors.success || '#4CAF50' : theme.colors.error }
          ]}>
            <Text style={styles.statusText}>
              {mfaEnabled ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Two-factor authentication adds an extra layer of security to your account by requiring 
          a verification code from your phone in addition to your password.
        </Text>

        <View style={styles.actions}>
          {!mfaEnabled ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleEnableMFA}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Enable MFA</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowBackupCodes(true)}
              >
                <Ionicons name="key-outline" size={20} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  View Backup Codes
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: theme.colors.error }]}
                onPress={handleDisableMFA}
              >
                <Ionicons name="shield-outline" size={20} color={theme.colors.error} />
                <Text style={[styles.dangerButtonText, { color: theme.colors.error }]}>
                  Disable MFA
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* MFA Setup Modal */}
      <Modal
        visible={showSetupModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowSetupModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Setup Two-Factor Authentication
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {setupStep === 1 && (
              <View style={styles.step}>
                <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                  Step 1: Install Authenticator App
                </Text>
                <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                  Download and install an authenticator app like Google Authenticator, 
                  Microsoft Authenticator, or Authy on your phone.
                </Text>
                
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setSetupStep(2)}
                >
                  <Text style={styles.primaryButtonText}>I have an authenticator app</Text>
                </TouchableOpacity>
              </View>
            )}

            {setupStep === 2 && (
              <View style={styles.step}>
                <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                  Step 2: Scan QR Code
                </Text>
                <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                  Scan this QR code with your authenticator app, then enter the 6-digit code 
                  it generates.
                </Text>
                
                {/* QR Code Placeholder */}
                <View style={[styles.qrCodePlaceholder, { borderColor: theme.colors.border }]}>
                  <Ionicons name="qr-code-outline" size={100} color={theme.colors.textSecondary} />
                  <Text style={[styles.qrCodeText, { color: theme.colors.textSecondary }]}>
                    QR Code would appear here
                  </Text>
                  <Text style={[styles.secretText, { color: theme.colors.textSecondary }]}>
                    Secret: {qrCodeSecret}
                  </Text>
                </View>

                <TextInput
                  style={[styles.codeInput, { 
                    borderColor: theme.colors.border, 
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.background 
                  }]}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton, 
                    { 
                      backgroundColor: verificationCode.length === 6 
                        ? theme.colors.primary 
                        : theme.colors.textSecondary 
                    }
                  ]}
                  onPress={verifyMFACode}
                  disabled={verificationCode.length !== 6}
                >
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                </TouchableOpacity>
              </View>
            )}

            {setupStep === 3 && (
              <View style={styles.step}>
                <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                  Step 3: Save Backup Codes
                </Text>
                <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                  Save these backup codes in a secure place. You can use them to access your 
                  account if you lose your phone.
                </Text>

                <View style={[styles.backupCodesContainer, { backgroundColor: theme.colors.background }]}>
                  {backupCodes.map((backup, index) => (
                    <Text key={index} style={[styles.backupCode, { color: theme.colors.text.primary }]}>
                      {backup.code}
                    </Text>
                  ))}
                </View>

                <View style={styles.backupActions}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                    onPress={copyBackupCodes}
                  >
                    <Ionicons name="copy-outline" size={20} color={theme.colors.text.primary} />
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                      Copy Codes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                    onPress={downloadBackupCodes}
                  >
                    <Ionicons name="download-outline" size={20} color={theme.colors.text.primary} />
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                      Download
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={completeMFASetup}
                >
                  <Text style={styles.primaryButtonText}>Complete Setup</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        visible={showBackupCodes}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowBackupCodes(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Backup Codes
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              These backup codes can be used to access your account if you lose access to 
              your authenticator app. Each code can only be used once.
            </Text>

            <View style={[styles.backupCodesContainer, { backgroundColor: theme.colors.background }]}>
              {backupCodes.map((backup, index) => (
                <View key={index} style={styles.backupCodeRow}>
                  <Text style={[
                    styles.backupCode, 
                    { 
                      color: backup.used ? theme.colors.textSecondary : theme.colors.text.primary,
                      textDecorationLine: backup.used ? 'line-through' : 'none'
                    }
                  ]}>
                    {backup.code}
                  </Text>
                  {backup.used && (
                    <Text style={[styles.usedLabel, { color: theme.colors.textSecondary }]}>
                      Used
                    </Text>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.backupActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={copyBackupCodes}
              >
                <Ionicons name="copy-outline" size={20} color={theme.colors.text.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  Copy Codes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  // Generate new backup codes
                  const newCodes = generateBackupCodes();
                  setBackupCodes(newCodes);
                  Alert.alert('New Codes Generated', 'Your old backup codes are no longer valid.');
                }}
              >
                <Text style={styles.primaryButtonText}>Generate New Codes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  step: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  qrCodeText: {
    fontSize: 14,
    marginTop: 8,
  },
  secretText: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  codeInput: {
    width: 200,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 24,
  },
  backupCodesContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  backupCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  backupCode: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  usedLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
});
