import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { dbHelpers, supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  ListItem,
  Button,
  Badge,
  AppModal,
  Input,
  Toast,
  LoadingSkeleton,
  SecurityDashboard,
  MFASetup,
  PrivacySettings,
  GDPRCompliance,
} from '@/components';
import { 
  Moon, 
  Sun, 
  Smartphone, 
  Bell, 
  Shield, 
  Eye, 
  EyeOff,
  Globe,
  DollarSign,
  Trash2,
  Download,
  Lock,
  Users,
  MessageCircle
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme, setThemeMode, themeMode } = useTheme();
  const { user } = useAuthStore();
  
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showExportData, setShowExportData] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Security modals
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showGDPRCompliance, setShowGDPRCompliance] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserSettings();
    }
  }, [user]);

  const fetchUserSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSettings(data);
      } else if (error && error.code === 'PGRST116') {
        // No settings found, create default
        const { data: newSettings } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
          })
          .select()
          .single();
        
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserSettings();
    setRefreshing(false);
  };

  const updateSetting = async (key: string, value: any) => {
    if (!user || !settings) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings((prev: any) => ({ ...prev, [key]: value }));
      setToastMessage('Settings updated successfully');
      setShowToast(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type "DELETE" to confirm');
      return;
    }

    setProcessing(true);
    try {
      // TODO: Implement account deletion logic
      // This should include:
      // 1. Anonymize user data
      // 2. Delete personal information
      // 3. Keep transaction records for legal compliance
      // 4. Notify related users about account deletion
      
      Alert.alert(
        'Account Deletion',
        'Account deletion request submitted. You will receive an email with further instructions.',
        [{ text: 'OK', onPress: () => setShowDeleteAccount(false) }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process account deletion request');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportData = async () => {
    setProcessing(true);
    try {
      // TODO: Implement data export
      // Generate downloadable file with user's data
      
      setToastMessage('Data export request submitted. You will receive an email with your data within 24 hours.');
      setShowToast(true);
      setShowExportData(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to request data export');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={200} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  const ThemeOption = ({ 
    mode, 
    title, 
    icon, 
    isSelected 
  }: { 
    mode: 'light' | 'dark' | 'system'; 
    title: string; 
    icon: React.ReactNode;
    isSelected: boolean;
  }) => (
    <TouchableOpacity
      onPress={() => setThemeMode(mode)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: isSelected ? theme.colors.primary : 'transparent',
        borderWidth: isSelected ? 0 : 1,
        borderColor: theme.colors.primary,
        minHeight: 52,
      }}
      activeOpacity={0.7}
    >
      <View style={{ marginRight: theme.spacing.md }}>
        {icon}
      </View>
      <Text variant="button" style={{ 
        color: isSelected ? theme.colors.primaryForeground : theme.colors.primary,
        flex: 1,
        textAlign: 'left',
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const settingSections = [
    {
      title: 'Appearance',
      items: [
        {
          title: 'Theme',
          subtitle: `Currently using ${themeMode === 'system' ? `System (${isDarkMode ? 'Dark' : 'Light'})` : (themeMode || 'Default')} theme`,
          icon: <Smartphone size={20} color={theme.colors.text.primary} />,
          onPress: () => {}, // Handled by theme options below
          customContent: (
            <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
              <ThemeOption
                mode="light"
                title="Light Theme"
                icon={<Sun size={20} color={themeMode === 'light' ? theme.colors.primaryForeground : theme.colors.primary} />}
                isSelected={themeMode === 'light'}
              />
              
              <ThemeOption
                mode="dark"
                title="Dark Theme"
                icon={<Moon size={20} color={themeMode === 'dark' ? theme.colors.primaryForeground : theme.colors.primary} />}
                isSelected={themeMode === 'dark'}
              />
              
              <ThemeOption
                mode="system"
                title="System Default"
                icon={<Smartphone size={20} color={themeMode === 'system' ? theme.colors.primaryForeground : theme.colors.primary} />}
                isSelected={themeMode === 'system'}
              />
            </View>
          ),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          title: 'Push Notifications',
          subtitle: 'Receive notifications for messages, offers, and updates',
          icon: <Bell size={20} color={theme.colors.text.primary} />,
          toggle: {
            value: settings?.push_notifications ?? true,
            onToggle: (value: boolean) => updateSetting('push_notifications', value),
          },
        },
        {
          title: 'Email Notifications',
          subtitle: 'Receive important updates via email',
          icon: <MessageCircle size={20} color={theme.colors.text.primary} />,
          toggle: {
            value: settings?.email_notifications ?? true,
            onToggle: (value: boolean) => updateSetting('email_notifications', value),
          },
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          title: 'Security Dashboard',
          subtitle: 'Monitor your account security and devices',
          icon: <Shield size={20} color={theme.colors.text.primary} />,
          onPress: () => setShowSecurityDashboard(true),
        },
        {
          title: 'Two-Factor Authentication',
          subtitle: 'Add extra security to your account',
          icon: <Lock size={20} color={theme.colors.text.primary} />,
          onPress: () => setShowMFASetup(true),
        },
        {
          title: 'Privacy Settings',
          subtitle: 'Control your privacy and data sharing',
          icon: <Eye size={20} color={theme.colors.text.primary} />,
          onPress: () => setShowPrivacySettings(true),
        },
        {
          title: 'Phone Number Visibility',
          subtitle: getPhoneVisibilitySubtitle(),
          icon: <Smartphone size={20} color={theme.colors.text.primary} />,
          onPress: () => {
            Alert.alert(
              'Phone Visibility',
              'Choose who can see your phone number',
              [
                { text: 'Public', onPress: () => updateSetting('phone_visibility', 'public') },
                { text: 'Contacts Only', onPress: () => updateSetting('phone_visibility', 'contacts') },
                { text: 'Private', onPress: () => updateSetting('phone_visibility', 'private') },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
        {
          title: 'Online Status',
          subtitle: 'Show when you\'re online to other users',
          icon: <Eye size={20} color={theme.colors.text.primary} />,
          toggle: {
            value: settings?.online_status_visibility ?? true,
            onToggle: (value: boolean) => updateSetting('online_status_visibility', value),
          },
        },
        {
          title: 'Blocked Users',
          subtitle: 'Manage your blocked users list',
          icon: <Users size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/(tabs)/blocked-users'),
        },
      ],
    },
    {
      title: 'Account & Data',
      items: [
        {
          title: 'Data & Privacy Rights',
          subtitle: 'GDPR compliance and data management',
          icon: <Shield size={20} color={theme.colors.text.primary} />,
          onPress: () => setShowGDPRCompliance(true),
        },
        {
          title: 'Language & Region',
          subtitle: `${settings?.language || 'English'} • ${settings?.currency || 'GHS'}`,
          icon: <Globe size={20} color={theme.colors.text.primary} />,
          onPress: () => {
            Alert.alert('Coming Soon', 'Language and region settings will be available soon');
          },
        },
        {
          title: 'Export My Data',
          subtitle: 'Download a copy of your data',
          icon: <Download size={20} color={theme.colors.text.primary} />,
          onPress: () => setShowExportData(true),
        },
        {
          title: 'Delete Account',
          subtitle: 'Permanently delete your account and data',
          icon: <Trash2 size={20} color={theme.colors.error} />,
          onPress: () => setShowDeleteAccount(true),
        },
      ],
    },
  ];

  function getPhoneVisibilitySubtitle() {
    switch (settings?.phone_visibility) {
      case 'public': return 'Visible to everyone';
      case 'contacts': return 'Visible to people you\'ve chatted with';
      case 'private': return 'Hidden from everyone';
      default: return 'Visible to people you\'ve chatted with';
    }
  }

  return (
    <SafeAreaWrapper>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Container>
          {settingSections.map((section, sectionIndex) => (
            <View key={section.title} style={{ marginBottom: theme.spacing.xl }}>
              <Text
                variant="h4"
                color="secondary"
                style={{
                  marginBottom: theme.spacing.md,
                  textTransform: 'uppercase',
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                }}
              >
                {section.title}
              </Text>

              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  ...theme.shadows.sm,
                }}
              >
                {section.items.map((item, index) => (
                  <View key={item.title}>
                    <ListItem
                      title={item.title}
                      description={item.subtitle}
                      rightIcon={item.icon}
                      showChevron={!(item as any).toggle}
                      onPress={item.onPress}
                      style={{
                        borderBottomWidth: index < section.items.length - 1 || (item as any).customContent ? 1 : 0,
                        paddingVertical: theme.spacing.lg,
                      }}
                    />
                    
                    {/* Custom Content */}
                    {(item as any).customContent && (
                      <View style={{ padding: theme.spacing.lg, paddingTop: 0 }}>
                        {(item as any).customContent}
                      </View>
                    )}

                    {/* Toggle Switch */}
                    {(item as any).toggle && (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'flex-end',
                          paddingHorizontal: theme.spacing.lg,
                          paddingBottom: theme.spacing.lg,
                          marginTop: -theme.spacing.md,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => (item as any).toggle!.onToggle(!(item as any).toggle!.value)}
                          style={{
                            width: 50,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: (item as any).toggle.value ? theme.colors.primary : theme.colors.border,
                            justifyContent: 'center',
                            paddingHorizontal: 2,
                          }}
                          activeOpacity={0.8}
                        >
                          <View
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 13,
                              backgroundColor: theme.colors.surface,
                              alignSelf: (item as any).toggle.value ? 'flex-end' : 'flex-start',
                              ...theme.shadows.sm,
                            }}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* App Version */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              alignItems: 'center',
              marginBottom: theme.spacing.xl,
            }}
          >
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
              Sellar v1.0.0 • Made with ❤️ in Ghana
            </Text>
          </View>
        </Container>
      </ScrollView>

      {/* Export Data Modal */}
      <AppModal
        visible={showExportData}
        onClose={() => setShowExportData(false)}
        title="Export My Data"
        primaryAction={{
          text: 'Request Export',
          onPress: handleExportData,
          loading: processing,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowExportData(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary">
            We&apos;ll prepare a complete export of your data including:
          </Text>

          <View style={{ gap: theme.spacing.md }}>
            <Text variant="bodySmall">• Profile information and settings</Text>
            <Text variant="bodySmall">• Listings and transaction history</Text>
            <Text variant="bodySmall">• Messages and conversation data</Text>
            <Text variant="bodySmall">• Reviews and ratings</Text>
            <Text variant="bodySmall">• Community posts and comments</Text>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary, textAlign: 'center' }}>
              📧 Export will be sent to {user?.email} within 24 hours
            </Text>
          </View>
        </View>
      </AppModal>

      {/* Delete Account Modal */}
      <AppModal
        visible={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        title="Delete Account"
        primaryAction={{
          text: 'Delete Account',
          onPress: handleDeleteAccount,
          loading: processing,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowDeleteAccount(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <View
            style={{
              backgroundColor: theme.colors.error + '10',
              borderColor: theme.colors.error + '30',
              borderWidth: 1,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="body" style={{ color: theme.colors.error, fontWeight: '600', marginBottom: theme.spacing.sm }}>
              ⚠️ This action cannot be undone
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              Deleting your account will permanently remove all your data, listings, messages, and transaction history.
            </Text>
          </View>

          <Text variant="body" color="secondary">
            To confirm deletion, please type &quot;DELETE&quot; below:
          </Text>

          <Input
            placeholder="Type DELETE to confirm"
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            autoCapitalize="characters"
          />
        </View>
      </AppModal>

      {/* Security Dashboard Modal */}
      <AppModal
        visible={showSecurityDashboard}
        onClose={() => setShowSecurityDashboard(false)}
        title="Security Dashboard"
        fullScreen
      >
        <SecurityDashboard />
      </AppModal>

      {/* MFA Setup Modal */}
      <AppModal
        visible={showMFASetup}
        onClose={() => setShowMFASetup(false)}
        title="Two-Factor Authentication"
        fullScreen
      >
        <MFASetup onMFAStatusChange={(enabled) => {
          if (enabled) {
            setToastMessage('Two-factor authentication enabled successfully');
            setShowToast(true);
          }
        }} />
      </AppModal>

      {/* Privacy Settings Modal */}
      <AppModal
        visible={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
        title="Privacy Settings"
        fullScreen
      >
        <PrivacySettings onSettingsChange={() => {
          setToastMessage('Privacy settings updated successfully');
          setShowToast(true);
        }} />
      </AppModal>

      {/* GDPR Compliance Modal */}
      <AppModal
        visible={showGDPRCompliance}
        onClose={() => setShowGDPRCompliance(false)}
        title="Data & Privacy Rights"
        fullScreen
      >
        <GDPRCompliance />
      </AppModal>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}
