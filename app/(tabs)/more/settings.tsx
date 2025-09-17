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
  MessageCircle,
  ChevronDown
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme, setThemeMode, themeMode } = useTheme();
  const { user, signOut } = useAuthStore();
  
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
  
  // Collapsible sections
  const [themeExpanded, setThemeExpanded] = useState(false);
  
  // Phone visibility modal
  const [showPhoneVisibilityModal, setShowPhoneVisibilityModal] = useState(false);

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

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setProcessing(true);
    try {
      // Request account deletion using database function
      const { data, error } = await supabase
        .rpc('request_account_deletion', {
          p_user_id: user.id,
          p_reason: 'User requested deletion from settings'
        });

      if (error) {
        throw error;
      }

      const result = data?.[0];
      if (result?.success) {
        const scheduledDate = new Date(result.scheduled_for).toLocaleDateString();
        Alert.alert(
          'Account Deletion Scheduled',
          `Your account has been scheduled for deletion on ${scheduledDate}. You will receive an email confirmation and can cancel this request anytime before then by contacting support.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                setShowDeleteAccount(false);
                setDeleteConfirmText('');
                // Sign out the user
                signOut();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result?.message || 'Failed to process account deletion request');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      Alert.alert('Error', 'Failed to process account deletion request. Please try again.');
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
    description,
    icon, 
    isSelected 
  }: { 
    mode: 'light' | 'dark' | 'system'; 
    title: string; 
    description: string;
    icon: React.ReactNode;
    isSelected: boolean;
  }) => (
    <TouchableOpacity
      onPress={() => {
        setThemeMode(mode);
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: isSelected ? theme.colors.primary + '15' : theme.colors.surfaceVariant,
        borderWidth: 2,
        borderColor: isSelected ? theme.colors.primary : 'transparent',
        minHeight: 64,
        marginBottom: theme.spacing.sm,
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={{ 
          marginRight: theme.spacing.md,
          padding: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.surface,
        }}>
          {icon}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ 
            color: isSelected ? theme.colors.primary : theme.colors.text.primary,
            fontWeight: isSelected ? '600' : '500',
            marginBottom: description ? theme.spacing.xs : 0,
          }}>
            {title}
          </Text>
          {description ? (
            <Text variant="caption" style={{ 
              color: isSelected ? theme.colors.primary + 'CC' : theme.colors.text.muted,
              lineHeight: 16,
            }}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Selection Indicator */}
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        backgroundColor: isSelected ? theme.colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: theme.spacing.sm,
      }}>
        {isSelected && (
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.primaryForeground,
          }} />
        )}
      </View>
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
          rightIcon: (
            <View style={{ 
              transform: [{ rotate: themeExpanded ? '180deg' : '0deg' }]
            }}>
              <ChevronDown size={20} color={theme.colors.text.muted} />
            </View>
          ),
          onPress: () => setThemeExpanded(!themeExpanded),
          customContent: themeExpanded ? (
            <View style={{ 
              gap: theme.spacing.sm, 
              marginTop: theme.spacing.md,
              paddingBottom: theme.spacing.sm,
            }}>
              <ThemeOption
                mode="light"
                title="Light Theme"
                description=""
                icon={<Sun size={20} color={themeMode === 'light' ? theme.colors.primary : theme.colors.text.primary} />}
                isSelected={themeMode === 'light'}
              />
              
              <ThemeOption
                mode="dark"
                title="Dark Theme"
                description=""
                icon={<Moon size={20} color={themeMode === 'dark' ? theme.colors.primary : theme.colors.text.primary} />}
                isSelected={themeMode === 'dark'}
              />
              
              <ThemeOption
                mode="system"
                title="System Default"
                description=""
                icon={<Smartphone size={20} color={themeMode === 'system' ? theme.colors.primary : theme.colors.text.primary} />}
                isSelected={themeMode === 'system'}
              />
            </View>
          ) : null,
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
          onPress: () => setShowPhoneVisibilityModal(true),
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
          onPress: () => router.push('/(tabs)/more/settings'),
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
                      leftIcon={item.icon}
                      rightIcon={(item as any).rightIcon}
                      showChevron={!(item as any).toggle && item.onPress && !(item as any).rightIcon}
                      toggle={(item as any).toggle}
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
        size="lg"
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

      {/* Phone Visibility Modal */}
      <AppModal
        visible={showPhoneVisibilityModal}
        onClose={() => setShowPhoneVisibilityModal(false)}
        title="Phone Number Visibility"
        size="lg"
        position="bottom"
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md }}>
            Choose who can see your phone number on your profile and listings.
          </Text>

          {[
            {
              value: 'public',
              title: 'Public',
              description: 'Anyone can see your phone number',
              icon: '🌍',
            },
            {
              value: 'contacts',
              title: 'Contacts Only',
              description: 'Only people you\'ve chatted with can see it',
              icon: '👥',
            },
            {
              value: 'private',
              title: 'Private',
              description: 'Your phone number is hidden from everyone',
              icon: '🔒',
            },
          ].map((option) => {
            const isSelected = (settings?.phone_visibility || 'contacts') === option.value;
            
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  updateSetting('phone_visibility', option.value);
                  setShowPhoneVisibilityModal(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.lg,
                  borderRadius: theme.borderRadius.lg,
                  backgroundColor: isSelected ? theme.colors.primary + '15' : theme.colors.surfaceVariant,
                  borderWidth: 2,
                  borderColor: isSelected ? theme.colors.primary : 'transparent',
                  minHeight: 64,
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={{ 
                    fontSize: 24, 
                    marginRight: theme.spacing.md,
                  }}>
                    {option.icon}
                  </Text>
                  
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ 
                      color: isSelected ? theme.colors.primary : theme.colors.text.primary,
                      fontWeight: isSelected ? '600' : '500',
                      marginBottom: theme.spacing.xs,
                    }}>
                      {option.title}
                    </Text>
                    <Text variant="caption" style={{ 
                      color: isSelected ? theme.colors.primary + 'CC' : theme.colors.text.muted,
                      lineHeight: 16,
                    }}>
                      {option.description}
                    </Text>
                  </View>
                </View>

                {/* Selection Indicator */}
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: theme.spacing.sm,
                }}>
                  {isSelected && (
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.colors.primaryForeground,
                    }} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginTop: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ 
              color: theme.colors.primary, 
              textAlign: 'center',
              lineHeight: 18,
            }}>
              💡 Your privacy is important. You can change this setting anytime.
            </Text>
          </View>
        </View>
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
