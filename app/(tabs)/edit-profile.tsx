import React, { useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  ListItem,
  Badge,
  ProfileEditModal,
  BusinessProfileSetupModal,
  LoadingSkeleton,
} from '@/components';
import { 
  User, 
  Building, 
  Settings, 
  Shield, 
  Clock,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Crown,
  Edit3,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import { 
  useProfile, 
  useProfileCompletion, 
  useSocialMediaLinks,
  useBusinessHours 
} from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const { completion } = useProfileCompletion();
  const { links } = useSocialMediaLinks();
  const { businessHours } = useBusinessHours();
  const { hasBusinessPlan } = useMonetizationStore();

  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showBusinessSetupModal, setShowBusinessSetupModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleProfileUpdated = () => {
    setShowProfileEditModal(false);
    refetch();
  };

  const handleBusinessProfileCreated = () => {
    setShowBusinessSetupModal(false);
    refetch();
  };

  const getCompletionColor = () => {
    if (completion.percentage >= 80) return theme.colors.success;
    if (completion.percentage >= 50) return theme.colors.warning;
    return theme.colors.error;
  };

  const getVerificationBadge = () => {
    if (!profile) return null;

    switch (profile.verification_level) {
      case 'business':
        return { text: 'Business Verified', variant: 'success' as const };
      case 'identity':
        return { text: 'ID Verified', variant: 'success' as const };
      case 'phone':
        return { text: 'Phone Verified', variant: 'warning' as const };
      case 'email':
        return { text: 'Email Verified', variant: 'warning' as const };
      default:
        return { text: 'Unverified', variant: 'error' as const };
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Edit Profile"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <LoadingSkeleton count={6} height={80} />
        </Container>
      </SafeAreaWrapper>
    );
  }

  if (!profile) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Edit Profile"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: theme.spacing.lg,
          }}>
            <AlertCircle size={48} color={theme.colors.error} />
            <Text variant="h3" style={{ textAlign: 'center' }}>
              Profile Not Found
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Unable to load your profile information.
            </Text>
            <Button variant="primary" onPress={refetch}>
              <Text variant="body" style={{ color: theme.colors.surface }}>
                Try Again
              </Text>
            </Button>
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Edit Profile"
        showBackButton
        onBackPress={() => router.back()}
        rightElement={
          <Button
            variant="ghost"
            size="small"
            onPress={() => setShowProfileEditModal(true)}
          >
            <Edit3 size={20} color={theme.colors.primary} />
          </Button>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Container>
          {/* Profile Completion */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.xl,
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadows.sm,
            }}
          >
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <Text variant="h4">Profile Completion</Text>
              <Badge 
                text={`${completion.percentage}%`}
                variant={completion.percentage >= 80 ? 'success' : completion.percentage >= 50 ? 'warning' : 'error'}
              />
            </View>

            {/* Progress Bar */}
            <View style={{
              height: 8,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 4,
              marginBottom: theme.spacing.md,
            }}>
              <View style={{
                height: '100%',
                width: `${completion.percentage}%`,
                backgroundColor: getCompletionColor(),
                borderRadius: 4,
              }} />
            </View>

            {completion.suggestions.length > 0 && (
              <View>
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                  Suggestions to improve your profile:
                </Text>
                {completion.suggestions.slice(0, 2).map((suggestion, index) => (
                  <Text key={index} variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.xs }}>
                    • {suggestion}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Basic Profile Information */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Profile Information
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
              <ListItem
                title="Personal Details"
                description={`${profile.full_name || 'No name set'} • ${profile.email || 'No email'}`}
                leftIcon={<User size={20} color={theme.colors.text.primary} />}
                rightIcon={<Edit3 size={16} color={theme.colors.text.muted} />}
                onPress={() => setShowProfileEditModal(true)}
                showChevron
              />

              <ListItem
                title="Contact Information"
                description={`${profile.phone || 'No phone'} • ${profile.location || 'No location'}`}
                leftIcon={<Phone size={20} color={theme.colors.text.primary} />}
                rightIcon={<Edit3 size={16} color={theme.colors.text.muted} />}
                onPress={() => setShowProfileEditModal(true)}
                showChevron
                style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
              />

              <ListItem
                title="Professional Info"
                description={profile.professional_title || 'Add your professional title'}
                leftIcon={<Briefcase size={20} color={theme.colors.text.primary} />}
                rightIcon={<Edit3 size={16} color={theme.colors.text.muted} />}
                onPress={() => setShowProfileEditModal(true)}
                showChevron
                style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
              />

              <ListItem
                title="Verification Status"
                description={`${profile.verification_level || 'none'} verification`}
                leftIcon={<Shield size={20} color={theme.colors.text.primary} />}
                badge={getVerificationBadge()}
                onPress={() => router.push('/(tabs)/verification')}
                showChevron
                style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
              />
            </View>
          </View>

          {/* Business Profile Section */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <Text variant="h3">Business Profile</Text>
              {hasBusinessPlan() && (
                <Badge text="Business Plan" variant="success" size="small" />
              )}
            </View>

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
              {profile.is_business ? (
                <>
                  <ListItem
                    title="Business Information"
                    description={`${profile.business_name || 'No business name'} • ${profile.business_type || 'No type set'}`}
                    leftIcon={<Building size={20} color={theme.colors.success} />}
                    badge={{ text: 'Active', variant: 'success' }}
                    rightIcon={<Edit3 size={16} color={theme.colors.text.muted} />}
                    onPress={() => setShowProfileEditModal(true)}
                    showChevron
                  />

                  <ListItem
                    title="Business Hours"
                    description={businessHours ? 'Hours configured' : 'Set your business hours'}
                    leftIcon={<Clock size={20} color={theme.colors.text.primary} />}
                    rightIcon={<Edit3 size={16} color={theme.colors.text.muted} />}
                    onPress={() => router.push('/(tabs)/business-hours')}
                    showChevron
                    style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
                  />

                  <ListItem
                    title="Social Media Links"
                    description={`${links.length} link${links.length !== 1 ? 's' : ''} added`}
                    leftIcon={<User size={20} color={theme.colors.text.primary} />}
                    rightIcon={<Edit3 size={16} color={theme.colors.text.muted} />}
                    onPress={() => router.push('/(tabs)/social-links')}
                    showChevron
                    style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
                  />
                </>
              ) : (
                <ListItem
                  title="Activate Business Profile"
                  description={hasBusinessPlan() ? 'Free with your business plan' : '50 credits - Get business badge & features'}
                  leftIcon={<Building size={20} color={theme.colors.primary} />}
                  badge={hasBusinessPlan() ? { text: 'FREE', variant: 'success' } : { text: '50 Credits', variant: 'warning' }}
                  rightIcon={<Plus size={16} color={theme.colors.primary} />}
                  onPress={() => setShowBusinessSetupModal(true)}
                  showChevron
                />
              )}
            </View>
          </View>

          {/* Privacy & Settings */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Privacy & Settings
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
              <ListItem
                title="Privacy Settings"
                description="Control who can see your information"
                leftIcon={<Shield size={20} color={theme.colors.text.primary} />}
                rightIcon={<Edit3 size={16} color={theme.colors.text.muted} />}
                onPress={() => setShowProfileEditModal(true)}
                showChevron
              />

              <ListItem
                title="Account Settings"
                description="Manage your account preferences"
                leftIcon={<Settings size={20} color={theme.colors.text.primary} />}
                onPress={() => router.push('/(tabs)/settings')}
                showChevron
                style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
          }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                onPress={() => setShowProfileEditModal(true)}
              >
                <Edit3 size={18} color={theme.colors.surface} />
                <Text 
                  variant="body" 
                  style={{ 
                    color: theme.colors.surface, 
                    marginLeft: theme.spacing.sm,
                    fontWeight: '600',
                  }}
                >
                  Edit Profile
                </Text>
              </Button>
            </View>

            {!profile.is_business && (
              <View style={{ flex: 1 }}>
                <Button
                  variant="outline"
                  onPress={() => setShowBusinessSetupModal(true)}
                >
                  <Building size={18} color={theme.colors.primary} />
                  <Text 
                    variant="body" 
                    style={{ 
                      color: theme.colors.primary, 
                      marginLeft: theme.spacing.sm,
                      fontWeight: '600',
                    }}
                  >
                    Go Business
                  </Text>
                </Button>
              </View>
            )}
          </View>

          {/* Profile Tips */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginTop: theme.spacing.xl,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Profile Tips
            </Text>
            
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="bodySmall" color="muted">
                • Complete profiles get 3x more views and messages
              </Text>
              <Text variant="bodySmall" color="muted">
                • Business profiles build trust and credibility
              </Text>
              <Text variant="bodySmall" color="muted">
                • Verification badges increase response rates
              </Text>
              <Text variant="bodySmall" color="muted">
                • Regular updates keep your profile fresh
              </Text>
            </View>
          </View>
        </Container>
      </ScrollView>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        visible={showProfileEditModal}
        onClose={() => setShowProfileEditModal(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Business Profile Setup Modal */}
      <BusinessProfileSetupModal
        visible={showBusinessSetupModal}
        onClose={() => setShowBusinessSetupModal(false)}
        onBusinessProfileCreated={handleBusinessProfileCreated}
      />
    </SafeAreaWrapper>
  );
}
