import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { CustomImagePicker as ImagePicker } from '@/components/ImagePicker';
import { Picker } from '@react-native-picker/picker';
import { useProfile, useUpdateProfile, UserProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const CONTACT_METHOD_OPTIONS = [
  { value: 'app', label: 'In-app messaging' },
  { value: 'phone', label: 'Phone calls' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

const RESPONSE_TIME_OPTIONS = [
  { value: 'within_minutes', label: 'Within minutes' },
  { value: 'within_hours', label: 'Within hours' },
  { value: 'within_day', label: 'Within a day' },
  { value: 'within_week', label: 'Within a week' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'contacts', label: 'Contacts only' },
  { value: 'private', label: 'Private' },
];

export function ProfileEditModal({ visible, onClose, onProfileUpdated }: ProfileEditModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { updateProfile, loading } = useUpdateProfile();
  const { hasBusinessPlan } = useMonetizationStore();

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    date_of_birth: '',
    gender: '',
    professional_title: '',
    years_of_experience: '',
    preferred_contact_method: 'app',
    response_time_expectation: 'within_hours',
    phone_visibility: 'contacts',
    email_visibility: 'private',
    show_online_status: true,
    show_last_seen: true,
    display_business_name: false,
    business_name_priority: 'secondary',
  });

  const [avatar, setAvatar] = useState<string | null>(null);
  const [specializations, setSpecializations] = useState<string>('');

  // Initialize form with profile data
  useEffect(() => {
    if (profile && visible) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        professional_title: profile.professional_title || '',
        years_of_experience: profile.years_of_experience?.toString() || '',
        preferred_contact_method: profile.preferred_contact_method || 'app',
        response_time_expectation: profile.response_time_expectation || 'within_hours',
        phone_visibility: profile.phone_visibility || 'contacts',
        email_visibility: profile.email_visibility || 'private',
        show_online_status: profile.show_online_status ?? true,
        show_last_seen: profile.show_last_seen ?? true,
        display_business_name: profile.display_business_name ?? false,
        business_name_priority: profile.business_name_priority || 'secondary',
      });
      setAvatar(profile.avatar_url || null);
      setSpecializations(profile.specializations?.join(', ') || '');
    }
  }, [profile, visible]);

  const resetForm = () => {
    setFormData({
      full_name: '',
      username: '',
      email: '',
      phone: '',
      bio: '',
      location: '',
      date_of_birth: '',
      gender: '',
      professional_title: '',
      years_of_experience: '',
      preferred_contact_method: 'app',
      response_time_expectation: 'within_hours',
      phone_visibility: 'contacts',
      email_visibility: 'private',
      show_online_status: true,
      show_last_seen: true,
      display_business_name: false,
      business_name_priority: 'secondary',
    });
    setAvatar(null);
    setSpecializations('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Error', 'Full name is required.');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required.');
      return;
    }

    try {
      const updates: Partial<UserProfile> = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        location: formData.location.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say' | undefined,
        professional_title: formData.professional_title.trim() || undefined,
        years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : undefined,
        specializations: specializations.trim() ? specializations.split(',').map(s => s.trim()).filter(s => s) : [],
        preferred_contact_method: formData.preferred_contact_method as any,
        response_time_expectation: formData.response_time_expectation as any,
        phone_visibility: formData.phone_visibility as any,
        email_visibility: formData.email_visibility as any,
        show_online_status: formData.show_online_status,
        show_last_seen: formData.show_last_seen,
        display_business_name: formData.display_business_name,
        business_name_priority: formData.business_name_priority as any,
        avatar_url: avatar || undefined,
      };

      // Only include username if it has a value
      if (formData.username.trim()) {
        updates.username = formData.username.trim();
      }

      // Auto-set is_business to true if user has business information
      if (formData.display_business_name) {
        updates.is_business = true;
        console.log('🔍 Auto-setting is_business to true because display_business_name is enabled');
      }

      const updatedProfile = await updateProfile(updates);

      Alert.alert(
        'Success',
        'Your profile has been updated successfully!',
        [{ text: 'OK', onPress: handleClose }]
      );

      onProfileUpdated?.(updatedProfile);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to update profile. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAvatarSelected = (uri: string) => {
    setAvatar(uri);
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title="Edit Profile"
      primaryAction={{
        text: 'Save Changes',
        onPress: handleSubmit,
        loading,
      }}
      secondaryAction={{
        text: 'Cancel',
        onPress: handleClose,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: theme.spacing.lg }}>
          {/* Avatar Section */}
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Profile Picture
            </Text>
            <ImagePicker
              currentImage={avatar}
              onImageSelected={handleAvatarSelected}
              onChange={() => {}}
              bucketName="profile-images"
              folder={`${user?.id}/avatar`}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
              }}
            />
          </View>

          {/* Basic Information */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Basic Information
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              <Input
                label="Full Name *"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
              />

              <Input
                label="Username"
                placeholder="Choose a unique username"
                value={formData.username}
                onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
              />

              <Input
                label="Email *"
                placeholder="Enter your email address"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Phone Number"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />

              <Input
                label="Bio"
                placeholder="Tell others about yourself..."
                value={formData.bio}
                onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                autoExpand
                minHeight={80}
                maxHeight={200}
                maxLength={500}
              />

              <Input
                label="Location"
                placeholder="City, Region"
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              />

              <Input
                label="Date of Birth"
                placeholder="YYYY-MM-DD"
                value={formData.date_of_birth}
                onChangeText={(text) => setFormData(prev => ({ ...prev, date_of_birth: text }))}
              />

              {/* Gender Picker */}
              <View>
                <Text variant="bodySmall" style={{ 
                  marginBottom: theme.spacing.sm,
                  fontWeight: '500',
                  color: theme.colors.text.primary,
                }}>
                  Gender
                </Text>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Picker
                    selectedValue={formData.gender}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                    style={{
                      color: theme.colors.text.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        color={theme.colors.text.primary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {/* Professional Information */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Professional Information
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              <Input
                label="Professional Title"
                placeholder="e.g., Software Developer, Teacher, etc."
                value={formData.professional_title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, professional_title: text }))}
              />

              <Input
                label="Years of Experience"
                placeholder="Number of years"
                value={formData.years_of_experience}
                onChangeText={(text) => setFormData(prev => ({ ...prev, years_of_experience: text }))}
                keyboardType="numeric"
              />

              <Input
                label="Specializations"
                placeholder="Comma-separated skills or areas of expertise"
                value={specializations}
                onChangeText={setSpecializations}
              />
            </View>
          </View>

          {/* Contact Preferences */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Contact Preferences
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              {/* Preferred Contact Method */}
              <View>
                <Text variant="bodySmall" style={{ 
                  marginBottom: theme.spacing.sm,
                  fontWeight: '500',
                  color: theme.colors.text.primary,
                }}>
                  Preferred Contact Method
                </Text>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Picker
                    selectedValue={formData.preferred_contact_method}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_contact_method: value }))}
                    style={{
                      color: theme.colors.text.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {CONTACT_METHOD_OPTIONS.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        color={theme.colors.text.primary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Response Time Expectation */}
              <View>
                <Text variant="bodySmall" style={{ 
                  marginBottom: theme.spacing.sm,
                  fontWeight: '500',
                  color: theme.colors.text.primary,
                }}>
                  Response Time Expectation
                </Text>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Picker
                    selectedValue={formData.response_time_expectation}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, response_time_expectation: value }))}
                    style={{
                      color: theme.colors.text.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {RESPONSE_TIME_OPTIONS.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        color={theme.colors.text.primary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {/* Privacy Settings */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Privacy Settings
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              {/* Phone Visibility */}
              <View>
                <Text variant="bodySmall" style={{ 
                  marginBottom: theme.spacing.sm,
                  fontWeight: '500',
                  color: theme.colors.text.primary,
                }}>
                  Phone Number Visibility
                </Text>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Picker
                    selectedValue={formData.phone_visibility}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, phone_visibility: value }))}
                    style={{
                      color: theme.colors.text.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        color={theme.colors.text.primary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Email Visibility */}
              <View>
                <Text variant="bodySmall" style={{ 
                  marginBottom: theme.spacing.sm,
                  fontWeight: '500',
                  color: theme.colors.text.primary,
                }}>
                  Email Visibility
                </Text>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Picker
                    selectedValue={formData.email_visibility}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, email_visibility: value }))}
                    style={{
                      color: theme.colors.text.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        color={theme.colors.text.primary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Online Status Toggles */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="body">Show online status</Text>
                <Button
                  variant={formData.show_online_status ? 'primary' : 'tertiary'}
                  size="small"
                  onPress={() => setFormData(prev => ({ ...prev, show_online_status: !prev.show_online_status }))}
                >
                  <Text variant="bodySmall" style={{ 
                    color: formData.show_online_status ? theme.colors.surface : theme.colors.primary 
                  }}>
                    {formData.show_online_status ? 'ON' : 'OFF'}
                  </Text>
                </Button>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="body">Show last seen</Text>
                <Button
                  variant={formData.show_last_seen ? 'primary' : 'tertiary'}
                  size="small"
                  onPress={() => setFormData(prev => ({ ...prev, show_last_seen: !prev.show_last_seen }))}
                >
                  <Text variant="bodySmall" style={{ 
                    color: formData.show_last_seen ? theme.colors.surface : theme.colors.primary 
                  }}>
                    {formData.show_last_seen ? 'ON' : 'OFF'}
                  </Text>
                </Button>
              </View>
            </View>
          </View>

          {/* Business Name Display Settings */}
          {profile?.is_business && profile?.business_name && (hasBusinessPlan() || profile?.display_business_name) && (
            <View>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Business Name Display
              </Text>

              <View style={{ gap: theme.spacing.md }}>
                {/* Display Business Name Toggle */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                }}>
                  <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                    <Text variant="body">Show business name publicly</Text>
                    <Text variant="bodySmall" color="muted">
                      Display &quot;{profile.business_name}&quot; on your posts, listings, and profile
                    </Text>
                  </View>
                  <Button
                    variant={formData.display_business_name ? 'primary' : 'tertiary'}
                    size="small"
                    onPress={() => setFormData(prev => ({ ...prev, display_business_name: !prev.display_business_name }))}
                  >
                    <Text variant="bodySmall" style={{ 
                      color: formData.display_business_name ? theme.colors.surface : theme.colors.primary 
                    }}>
                      {formData.display_business_name ? 'ON' : 'OFF'}
                    </Text>
                  </Button>
                </View>

                {/* Business Name Priority */}
                {formData.display_business_name && (
                  <View>
                    <Text variant="bodySmall" style={{ 
                      marginBottom: theme.spacing.sm,
                      fontWeight: '500',
                      color: theme.colors.text.primary,
                    }}>
                      Display Priority
                    </Text>
                    <View style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.borderRadius.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}>
                      <Picker
                        selectedValue={formData.business_name_priority}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, business_name_priority: value }))}
                        style={{
                          color: theme.colors.text.primary,
                          backgroundColor: 'transparent',
                        }}
                      >
                        <Picker.Item
                          label="Show business name first"
                          value="primary"
                          color={theme.colors.text.primary}
                        />
                        <Picker.Item
                          label="Show both names (Name • Business)"
                          value="secondary"
                          color={theme.colors.text.primary}
                        />
                        <Picker.Item
                          label="Hide business name"
                          value="hidden"
                          color={theme.colors.text.primary}
                        />
                      </Picker>
                    </View>

                    {/* Preview */}
                    <View
                      style={{
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                        marginTop: theme.spacing.sm,
                      }}
                    >
                      <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.xs }}>
                        Preview:
                      </Text>
                      <Text variant="body" style={{ fontWeight: '600' }}>
                        {formData.business_name_priority === 'primary' 
                          ? profile.business_name
                          : formData.business_name_priority === 'secondary'
                          ? `${formData.full_name || profile.full_name} • ${profile.business_name}`
                          : formData.full_name || profile.full_name
                        }
                      </Text>
                    </View>
                  </View>
                )}

                {/* Business Plan Benefits */}
                {!hasBusinessPlan() && (
                  <View
                    style={{
                      backgroundColor: theme.colors.primary + '10',
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                    }}
                  >
                    <Text variant="bodySmall" style={{ 
                      color: theme.colors.primary,
                      textAlign: 'center',
                    }}>
                      💡 Upgrade to a Business Plan for enhanced business name display features and priority placement!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Help Text */}
          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ 
              color: theme.colors.primary, 
              textAlign: 'center',
              lineHeight: 18,
            }}>
              💡 Complete your profile to increase trust and get better visibility in search results.
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}
