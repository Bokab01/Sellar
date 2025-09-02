/**
 * Privacy Settings Component
 * Allows users to control their privacy and security settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

interface PrivacySettings {
  phoneVisibility: 'public' | 'contacts' | 'private';
  emailVisibility: 'public' | 'contacts' | 'private';
  onlineStatusVisible: boolean;
  lastSeenVisible: boolean;
  profileSearchable: boolean;
  showInSuggestions: boolean;
  allowMessagesFrom: 'everyone' | 'contacts' | 'none';
  allowCallsFrom: 'everyone' | 'contacts' | 'none';
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
  analyticsConsent: boolean;
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}

interface PrivacySettingsProps {
  onSettingsChange?: (settings: PrivacySettings) => void;
}

export function PrivacySettings({ onSettingsChange }: PrivacySettingsProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    phoneVisibility: 'contacts',
    emailVisibility: 'private',
    onlineStatusVisible: true,
    lastSeenVisible: true,
    profileSearchable: true,
    showInSuggestions: true,
    allowMessagesFrom: 'everyone',
    allowCallsFrom: 'contacts',
    dataProcessingConsent: false,
    marketingConsent: false,
    analyticsConsent: true,
    twoFactorEnabled: false,
    loginNotifications: true,
    suspiciousActivityAlerts: true,
  });

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error loading privacy settings:', error);
        return;
      }

      if (data) {
        setSettings({
          phoneVisibility: data.phone_visibility || 'contacts',
          emailVisibility: data.email_visibility || 'private',
          onlineStatusVisible: data.online_status_visible ?? true,
          lastSeenVisible: data.last_seen_visible ?? true,
          profileSearchable: data.profile_searchable ?? true,
          showInSuggestions: data.show_in_suggestions ?? true,
          allowMessagesFrom: data.allow_messages_from || 'everyone',
          allowCallsFrom: data.allow_calls_from || 'contacts',
          dataProcessingConsent: data.data_processing_consent ?? false,
          marketingConsent: data.marketing_consent ?? false,
          analyticsConsent: data.analytics_consent ?? true,
          twoFactorEnabled: data.two_factor_enabled ?? false,
          loginNotifications: data.login_notifications ?? true,
          suspiciousActivityAlerts: data.suspicious_activity_alerts ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
    if (!user?.id) return;

    try {
      setSaving(true);
      
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          phone_visibility: updatedSettings.phoneVisibility,
          email_visibility: updatedSettings.emailVisibility,
          online_status_visible: updatedSettings.onlineStatusVisible,
          last_seen_visible: updatedSettings.lastSeenVisible,
          profile_searchable: updatedSettings.profileSearchable,
          show_in_suggestions: updatedSettings.showInSuggestions,
          allow_messages_from: updatedSettings.allowMessagesFrom,
          allow_calls_from: updatedSettings.allowCallsFrom,
          data_processing_consent: updatedSettings.dataProcessingConsent,
          marketing_consent: updatedSettings.marketingConsent,
          analytics_consent: updatedSettings.analyticsConsent,
          two_factor_enabled: updatedSettings.twoFactorEnabled,
          login_notifications: updatedSettings.loginNotifications,
          suspicious_activity_alerts: updatedSettings.suspiciousActivityAlerts,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving privacy settings:', error);
        Alert.alert('Error', 'Failed to save privacy settings. Please try again.');
        return;
      }

      setSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
      
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      Alert.alert('Error', 'Failed to save privacy settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof PrivacySettings, value: boolean) => {
    const newSettings = { [key]: value };
    savePrivacySettings(newSettings);
  };

  const handleVisibilityChange = (
    key: 'phoneVisibility' | 'emailVisibility' | 'allowMessagesFrom' | 'allowCallsFrom',
    options: string[]
  ) => {
    Alert.alert(
      'Select Option',
      `Choose who can see your ${key.replace('Visibility', '').replace('allow', '').replace('From', '')}`,
      options.map(option => ({
        text: option.charAt(0).toUpperCase() + option.slice(1),
        onPress: () => savePrivacySettings({ [key]: option }),
      }))
    );
  };

  const handleDataExport = () => {
    Alert.alert(
      'Export Data',
      'We will prepare your data export and send it to your email address within 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Export', onPress: requestDataExport },
      ]
    );
  };

  const handleAccountDeletion = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This will permanently delete your account and all associated data.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, Delete', style: 'destructive', onPress: requestAccountDeletion },
              ]
            );
          }
        },
      ]
    );
  };

  const requestDataExport = async () => {
    // In a real app, this would trigger a background job to prepare the data export
    Alert.alert('Export Requested', 'Your data export has been requested and will be sent to your email within 24 hours.');
  };

  const requestAccountDeletion = async () => {
    // In a real app, this would trigger account deletion process
    Alert.alert('Deletion Requested', 'Your account deletion request has been submitted. You will receive a confirmation email.');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading privacy settings...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Profile Privacy */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Profile Privacy
        </Text>
        
        <SettingRow
          icon="call-outline"
          title="Phone Number Visibility"
          subtitle={`Currently: ${settings.phoneVisibility}`}
          onPress={() => handleVisibilityChange('phoneVisibility', ['public', 'contacts', 'private'])}
          theme={theme}
        />
        
        <SettingRow
          icon="mail-outline"
          title="Email Visibility"
          subtitle={`Currently: ${settings.emailVisibility}`}
          onPress={() => handleVisibilityChange('emailVisibility', ['public', 'contacts', 'private'])}
          theme={theme}
        />
        
        <SettingToggle
          icon="eye-outline"
          title="Show Online Status"
          subtitle="Let others see when you're online"
          value={settings.onlineStatusVisible}
          onToggle={(value) => handleToggle('onlineStatusVisible', value)}
          theme={theme}
        />
        
        <SettingToggle
          icon="time-outline"
          title="Show Last Seen"
          subtitle="Let others see when you were last active"
          value={settings.lastSeenVisible}
          onToggle={(value) => handleToggle('lastSeenVisible', value)}
          theme={theme}
        />
        
        <SettingToggle
          icon="search-outline"
          title="Profile Searchable"
          subtitle="Allow others to find your profile in search"
          value={settings.profileSearchable}
          onToggle={(value) => handleToggle('profileSearchable', value)}
          theme={theme}
        />
        
        <SettingToggle
          icon="people-outline"
          title="Show in Suggestions"
          subtitle="Appear in friend suggestions"
          value={settings.showInSuggestions}
          onToggle={(value) => handleToggle('showInSuggestions', value)}
          theme={theme}
        />
      </View>

      {/* Communication Settings */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Communication
        </Text>
        
        <SettingRow
          icon="chatbubble-outline"
          title="Allow Messages From"
          subtitle={`Currently: ${settings.allowMessagesFrom}`}
          onPress={() => handleVisibilityChange('allowMessagesFrom', ['everyone', 'contacts', 'none'])}
          theme={theme}
        />
        
        <SettingRow
          icon="call-outline"
          title="Allow Calls From"
          subtitle={`Currently: ${settings.allowCallsFrom}`}
          onPress={() => handleVisibilityChange('allowCallsFrom', ['everyone', 'contacts', 'none'])}
          theme={theme}
        />
      </View>

      {/* Security Settings */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Security
        </Text>
        
        <SettingToggle
          icon="shield-checkmark-outline"
          title="Two-Factor Authentication"
          subtitle="Add an extra layer of security"
          value={settings.twoFactorEnabled}
          onToggle={(value) => handleToggle('twoFactorEnabled', value)}
          theme={theme}
        />
        
        <SettingToggle
          icon="notifications-outline"
          title="Login Notifications"
          subtitle="Get notified of new logins"
          value={settings.loginNotifications}
          onToggle={(value) => handleToggle('loginNotifications', value)}
          theme={theme}
        />
        
        <SettingToggle
          icon="warning-outline"
          title="Suspicious Activity Alerts"
          subtitle="Get alerts for unusual account activity"
          value={settings.suspiciousActivityAlerts}
          onToggle={(value) => handleToggle('suspiciousActivityAlerts', value)}
          theme={theme}
        />
      </View>

      {/* Data & Consent */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Data & Consent
        </Text>
        
        <SettingToggle
          icon="document-text-outline"
          title="Data Processing Consent"
          subtitle="Allow processing of your data for app functionality"
          value={settings.dataProcessingConsent}
          onToggle={(value) => handleToggle('dataProcessingConsent', value)}
          theme={theme}
        />
        
        <SettingToggle
          icon="megaphone-outline"
          title="Marketing Communications"
          subtitle="Receive promotional emails and notifications"
          value={settings.marketingConsent}
          onToggle={(value) => handleToggle('marketingConsent', value)}
          theme={theme}
        />
        
        <SettingToggle
          icon="analytics-outline"
          title="Analytics"
          subtitle="Help improve the app with usage analytics"
          value={settings.analyticsConsent}
          onToggle={(value) => handleToggle('analyticsConsent', value)}
          theme={theme}
        />
      </View>

      {/* Data Management */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Data Management
        </Text>
        
        <SettingRow
          icon="download-outline"
          title="Export My Data"
          subtitle="Download a copy of your data"
          onPress={handleDataExport}
          theme={theme}
        />
        
        <SettingRow
          icon="trash-outline"
          title="Delete Account"
          subtitle="Permanently delete your account and data"
          onPress={handleAccountDeletion}
          theme={theme}
          danger
        />
      </View>

      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.savingText, { color: theme.colors.text }]}>
            Saving...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

interface SettingToggleProps {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  theme: any;
}

function SettingToggle({ icon, title, subtitle, value, onToggle, theme }: SettingToggleProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
        thumbColor={value ? theme.colors.primary : theme.colors.textSecondary}
      />
    </View>
  );
}

interface SettingRowProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  theme: any;
  danger?: boolean;
}

function SettingRow({ icon, title, subtitle, onPress, theme, danger }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingContent}>
        <Ionicons 
          name={icon as any} 
          size={24} 
          color={danger ? theme.colors.error : theme.colors.primary} 
        />
        <View style={styles.settingText}>
          <Text style={[
            styles.settingTitle, 
            { color: danger ? theme.colors.error : theme.colors.text }
          ]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={theme.colors.textSecondary} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
  },
});
