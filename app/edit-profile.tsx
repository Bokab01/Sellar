import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert, Image } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper, Container } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Badge } from '@/components/Badge/Badge';
import { Avatar } from '@/components/Avatar/Avatar';
import { LocationPicker } from '@/components/LocationPicker/LocationPicker';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Toast } from '@/components/Toast/Toast';
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
  AlertCircle,
  Save,
  ChevronDown,
  ChevronUp,
  Camera
} from 'lucide-react-native';
import { 
  useProfile, 
  useUpdateProfile,
  useProfileCompletion, 
  useSocialMediaLinks,
  useBusinessHours 
} from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { BusinessProfileSetupModal } from '@/components/BusinessProfileSetupModal/BusinessProfileSetupModal';
import { validateName, validateUsername } from '@/utils/validation';
import { checkMultipleUniqueness } from '@/utils/uniquenessValidation';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon } from 'lucide-react-native';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const { updateProfile, loading: updating } = useUpdateProfile();
  const { completion } = useProfileCompletion();
  const { hasBusinessPlan } = useMonetizationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [showBusinessSetupModal, setShowBusinessSetupModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contact: false,
    professional: false,
    business: false,
    privacy: false,
  });

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    professional_title: '',
    years_of_experience: '',
    preferred_contact_method: 'app',
    response_time_expectation: 'within_hours',
    phone_visibility: 'contacts',
    email_visibility: 'private',
    show_online_status: true,
    show_last_seen: true,
    // Business fields
    business_name: '',
    business_type: '',
    business_description: '',
    business_phone: '',
    business_email: '',
    business_website: '',
    display_business_name: false,
    business_name_priority: 'secondary',
  });

  const [avatar, setAvatar] = useState<string | null>(null);


  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      // Split full name into first and last name
      const nameParts = (profile.full_name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData({
        first_name: firstName,
        last_name: lastName,
        username: profile.username || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        professional_title: profile.professional_title || '',
        years_of_experience: profile.years_of_experience?.toString() || '',
        preferred_contact_method: (profile.preferred_contact_method as 'email' | 'phone' | 'app' | 'whatsapp') || 'app',
        response_time_expectation: profile.response_time_expectation || 'within_hours',
        phone_visibility: profile.phone_visibility || 'contacts',
        email_visibility: profile.email_visibility || 'private',
        show_online_status: profile.show_online_status ?? true,
        show_last_seen: profile.show_last_seen ?? true,
        // Business fields
        business_name: profile.business_name || '',
        business_type: profile.business_type || '',
        business_description: profile.business_description || '',
        business_phone: profile.business_phone || '',
        business_email: profile.business_email || '',
        business_website: profile.business_website || '',
        display_business_name: profile.display_business_name ?? false,
        business_name_priority: profile.business_name_priority || 'secondary',
      });
      setAvatar(profile.avatar_url || null);
    }
  }, [profile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.first_name.trim()) {
      Alert.alert('Error', 'Please enter your first name');
      return;
    }

    // Validate names
    const firstNameValidation = validateName(formData.first_name, 'First name');
    if (!firstNameValidation.isValid) {
      Alert.alert('Validation Error', firstNameValidation.error!);
      return;
    }

    const lastNameValidation = validateName(formData.last_name, 'Last name');
    if (!lastNameValidation.isValid) {
      Alert.alert('Validation Error', lastNameValidation.error!);
      return;
    }

    // Validate username if provided
    if (formData.username.trim()) {
      const usernameValidation = validateUsername(formData.username);
      if (!usernameValidation.isValid) {
        Alert.alert('Validation Error', usernameValidation.error!);
        return;
      }
    }

    try {
      // Check uniqueness for fields that changed
      const fieldsToCheck: { email?: string; username?: string; phone?: string } = {};
      
      if (formData.email.trim() && formData.email.trim() !== profile?.email) {
        fieldsToCheck.email = formData.email.trim();
      }
      
      if (formData.username.trim() && formData.username.trim() !== profile?.username) {
        fieldsToCheck.username = formData.username.trim();
      }
      
      if (formData.phone.trim() && formData.phone.trim() !== profile?.phone) {
        fieldsToCheck.phone = formData.phone.trim();
      }

      // Only check uniqueness if there are fields to check
      if (Object.keys(fieldsToCheck).length > 0) {
        const uniquenessCheck = await checkMultipleUniqueness(fieldsToCheck, user?.id);
        
        if (!uniquenessCheck.isValid) {
          const firstError = Object.values(uniquenessCheck.errors)[0];
          Alert.alert('Update Error', firstError);
          return;
        }
      }

      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      
      const updateData = {
        ...formData,
        full_name: fullName,
        years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : undefined,
        avatar_url: avatar || undefined,
        preferred_contact_method: formData.preferred_contact_method as 'email' | 'phone' | 'app' | 'whatsapp',
        response_time_expectation: formData.response_time_expectation as 'within_hours' | 'within_minutes' | 'within_day' | 'within_week',
        phone_visibility: formData.phone_visibility as 'public' | 'contacts' | 'private',
        email_visibility: formData.email_visibility as 'public' | 'contacts' | 'private',
        business_name_priority: formData.business_name_priority as 'secondary' | 'primary' | 'hidden',
      };

      // Remove first_name and last_name from update data as they're not in the profile schema
      delete (updateData as any).first_name;
      delete (updateData as any).last_name;

      await updateProfile(updateData);
      setToastMessage('Profile updated successfully!');
      setToastVariant('success');
      setShowToast(true);
      await refetch();
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      // Handle specific database constraint errors
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        if (error.message.includes('username')) {
          setToastMessage('This username is already taken. Please choose a different one.');
        } else if (error.message.includes('email')) {
          setToastMessage('This email address is already registered.');
        } else if (error.message.includes('phone')) {
          setToastMessage('This phone number is already registered.');
        } else {
          setToastMessage('Some information is already in use. Please check your details.');
        }
      } else {
        setToastMessage(error.message || 'Failed to update profile');
      }
      
      setToastVariant('error');
      setShowToast(true);
    }
  };

  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBusinessProfileCreated = () => {
    setShowBusinessSetupModal(false);
    refetch();
  };

  const handleAvatarSelected = (uri: string) => {
    setAvatar(uri);
    setShowAvatarPicker(false);
  };

  const getCompletionColor = () => {
    if (completion.percentage >= 80) return theme.colors.success;
    if (completion.percentage >= 50) return theme.colors.warning;
    return theme.colors.error;
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
          <LoadingSkeleton />
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
            <Text style={{ fontSize: 24, fontWeight: '600', textAlign: 'center' }}>
              Profile Not Found
            </Text>
            <Text style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
              Unable to load your profile information.
            </Text>
            <Button variant="primary" onPress={refetch}>
                Try Again
            </Button>
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  const renderCollapsibleSection = (
    key: keyof typeof expandedSections,
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode
  ) => {
    const isExpanded = expandedSections[key];
    
    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
      }}>
        <TouchableOpacity
          onPress={() => toggleSection(key)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.lg,
            backgroundColor: isExpanded ? theme.colors.surfaceVariant : 'transparent',
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            {icon}
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{title}</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={20} color={theme.colors.text.muted} />
          ) : (
            <ChevronDown size={20} color={theme.colors.text.muted} />
          )}
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={{ padding: theme.spacing.lg, paddingTop: 0 }}>
            {content}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Edit Profile"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="save"
            variant="primary"
            size="sm"
            onPress={handleSave}
            loading={updating}
            icon={<Save size={16} color="#FFFFFF" />}
          >
            Save
          </Button>
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Container style={{ paddingTop: theme.spacing.lg }}>
          {/* Profile Completion Header */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              marginBottom: theme.spacing.xl,
              ...theme.shadows.sm,
            }}
          >
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Profile Completion</Text>
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
            }}>
              <View style={{
                height: '100%',
                width: `${completion.percentage}%`,
                backgroundColor: getCompletionColor(),
                borderRadius: 4,
              }} />
            </View>
            </View>

          {/* Avatar Section */}
          <View style={{
            alignItems: 'center',
            marginBottom: theme.spacing.xl,
          }}>
            <TouchableOpacity
              onPress={() => setShowAvatarPicker(true)}
              style={{
                position: 'relative',
                marginBottom: theme.spacing.sm,
              }}
              activeOpacity={0.7}
            >
              <Avatar
                source={avatar || undefined}
                name={`${formData.first_name} ${formData.last_name}`.trim() || 'User'}
                size="xl"
                showBorder
              />
              <View style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: theme.colors.primary,
                borderRadius: 16,
                padding: 8,
                borderWidth: 2,
                borderColor: theme.colors.surface,
              }}>
                <Camera size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, color: theme.colors.text.muted }}>
              Tap to change profile photo
                  </Text>
          </View>

          {/* Collapsible Sections */}
          {renderCollapsibleSection(
            'personal',
            'Personal Information',
            <User size={20} color={theme.colors.primary} />,
            <View style={{ gap: theme.spacing.lg }}>
              <Input
                label="First Name *"
                value={formData.first_name}
                onChangeText={(value) => updateFormField('first_name', value)}
                placeholder="Enter your first name"
              />

              <Input
                label="Last Name"
                value={formData.last_name}
                onChangeText={(value) => updateFormField('last_name', value)}
                placeholder="Enter your last name"
              />

              <Input
                label="Username"
                value={formData.username}
                onChangeText={(value) => updateFormField('username', value)}
                placeholder="Choose a unique username"
              />

              <Input
                label="Bio"
                value={formData.bio}
                onChangeText={(value) => updateFormField('bio', value)}
                placeholder="Tell others about yourself"
                multiline
                numberOfLines={4}
              />
            </View>
          )}

          {renderCollapsibleSection(
            'contact',
            'Contact Information',
            <Phone size={20} color={theme.colors.primary} />,
            <View style={{ gap: theme.spacing.lg }}>
              <Input
                label="Email"
                value={formData.email}
                onChangeText={(value) => updateFormField('email', value)}
                placeholder="Enter your email"
                keyboardType="email-address"
              />

              <Input
                label="Phone Number"
                value={formData.phone}
                onChangeText={(value) => updateFormField('phone', value)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />

              <View>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '500', 
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.text.primary 
                }}>
                  Location
                </Text>
                <LocationPicker
                  value={formData.location}
                  onLocationSelect={(location) => updateFormField('location', location)}
                  placeholder="Select your location"
              />
            </View>
          </View>
          )}

          {renderCollapsibleSection(
            'professional',
            'Professional Information',
            <Briefcase size={20} color={theme.colors.primary} />,
            <View style={{ gap: theme.spacing.lg }}>
              <Input
                label="Professional Title"
                value={formData.professional_title}
                onChangeText={(value) => updateFormField('professional_title', value)}
                placeholder="e.g. Software Developer, Teacher"
              />

              <Input
                label="Years of Experience"
                value={formData.years_of_experience}
                onChangeText={(value) => updateFormField('years_of_experience', value)}
                placeholder="Enter years of experience"
                keyboardType="numeric"
              />

              <View>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '500', 
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.text.primary 
                }}>
                  Preferred Contact Method
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {[
                    { value: 'app', label: 'In-App' },
                    { value: 'phone', label: 'Phone' },
                    { value: 'email', label: 'Email' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => updateFormField('preferred_contact_method', option.value)}
                      style={{
                        backgroundColor: formData.preferred_contact_method === option.value 
                          ? theme.colors.primary 
                          : theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.md,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderWidth: 1,
                        borderColor: formData.preferred_contact_method === option.value 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      }}
                    >
                      <Text style={{
                        color: formData.preferred_contact_method === option.value 
                          ? '#FFFFFF' 
                          : theme.colors.text.primary,
                        fontSize: 14,
                        fontWeight: '500',
                      }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
            </View>

              <View>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '500', 
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.text.primary 
                }}>
                  Response Time Expectation
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {[
                    { value: 'within_minutes', label: 'Within Minutes' },
                    { value: 'within_hours', label: 'Within Hours' },
                    { value: 'within_day', label: 'Within a Day' },
                    { value: 'within_week', label: 'Within a Week' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => updateFormField('response_time_expectation', option.value)}
              style={{
                        backgroundColor: formData.response_time_expectation === option.value 
                          ? theme.colors.primary 
                          : theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.md,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                borderWidth: 1,
                        borderColor: formData.response_time_expectation === option.value 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      }}
                    >
                      <Text style={{
                        color: formData.response_time_expectation === option.value 
                          ? '#FFFFFF' 
                          : theme.colors.text.primary,
                        fontSize: 14,
                        fontWeight: '500',
                      }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {renderCollapsibleSection(
            'business',
            'Business Profile',
            <Building size={20} color={theme.colors.primary} />,
            <View style={{ gap: theme.spacing.lg }}>
              {profile?.is_business ? (
                <>
                  <Input
                    label="Business Name"
                    value={formData.business_name}
                    onChangeText={(value) => updateFormField('business_name', value)}
                    placeholder="Enter your business name"
                  />

                  <Input
                    label="Business Description"
                    value={formData.business_description}
                    onChangeText={(value) => updateFormField('business_description', value)}
                    placeholder="Describe your business"
                    multiline
                    numberOfLines={3}
                  />

                  <Input
                    label="Business Type"
                    value={formData.business_type}
                    onChangeText={(value) => updateFormField('business_type', value)}
                    placeholder="e.g. Retail, Service, Manufacturing"
                  />

                  <Input
                    label="Business Phone"
                    value={formData.business_phone}
                    onChangeText={(value) => updateFormField('business_phone', value)}
                    placeholder="Business phone number"
                    keyboardType="phone-pad"
                  />

                  <Input
                    label="Business Email"
                    value={formData.business_email}
                    onChangeText={(value) => updateFormField('business_email', value)}
                    placeholder="Business email address"
                    keyboardType="email-address"
                  />

                  <Input
                    label="Business Website"
                    value={formData.business_website}
                    onChangeText={(value) => updateFormField('business_website', value)}
                    placeholder="https://www.yourbusiness.com"
                    keyboardType="url"
                  />

                  {/* Business Name Display Toggle */}
                  {formData.business_name && (
                    <View style={{
                      backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: theme.spacing.sm }}>
                        Business Name Display
                      </Text>
                      
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: theme.spacing.sm,
                      }}>
                        <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                          <Text style={{ fontSize: 14, marginBottom: 4 }}>Show business name publicly</Text>
                          <Text style={{ fontSize: 12, color: theme.colors.text.muted }}>
                            Display "{formData.business_name}" on your posts, listings, and profile
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => updateFormField('display_business_name', !formData.display_business_name)}
                          style={{
                            backgroundColor: formData.display_business_name ? theme.colors.primary : theme.colors.border,
                            borderRadius: 16,
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            minWidth: 60,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{
                            color: formData.display_business_name ? '#FFFFFF' : theme.colors.text.muted,
                            fontSize: 12,
                            fontWeight: '600',
                          }}>
                            {formData.display_business_name ? 'ON' : 'OFF'}
                          </Text>
                        </TouchableOpacity>
            </View>
          </View>
                  )}
                </>
              ) : (
          <View style={{
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.xl,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
            gap: theme.spacing.md,
          }}>
                  <Building size={48} color={theme.colors.primary} />
                  <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
                    Upgrade to Business
                  </Text>
                  <Text style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
                    Unlock business features, analytics, and professional tools
                  </Text>
                  
                  {hasBusinessPlan() ? (
              <Button
                variant="primary"
                  onPress={() => setShowBusinessSetupModal(true)}
                      icon={<Crown size={16} color="#FFFFFF" />}
                    >
                      Setup Business Profile
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onPress={() => router.push('/subscription-plans')}
                      icon={<Crown size={16} color={theme.colors.primary} />}
                    >
                      View Business Plans
                    </Button>
                  )}
                </View>
              )}
            </View>
          )}

          {renderCollapsibleSection(
            'privacy',
            'Privacy Settings',
            <Shield size={20} color={theme.colors.primary} />,
            <View style={{ gap: theme.spacing.lg }}>
              <View>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '500', 
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.text.primary 
                }}>
                  Phone Visibility
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {[
                    { value: 'public', label: 'Public' },
                    { value: 'contacts', label: 'Contacts Only' },
                    { value: 'private', label: 'Private' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => updateFormField('phone_visibility', option.value)}
                  style={{ 
                        backgroundColor: formData.phone_visibility === option.value 
                          ? theme.colors.primary 
                          : theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.md,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderWidth: 1,
                        borderColor: formData.phone_visibility === option.value 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      }}
                    >
                      <Text style={{
                        color: formData.phone_visibility === option.value 
                          ? '#FFFFFF' 
                          : theme.colors.text.primary,
                        fontSize: 14,
                        fontWeight: '500',
                      }}>
                        {option.label}
                </Text>
                    </TouchableOpacity>
                  ))}
            </View>
            </View>

              <View>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '500', 
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.text.primary 
                }}>
                  Email Visibility
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {[
                    { value: 'public', label: 'Public' },
                    { value: 'contacts', label: 'Contacts Only' },
                    { value: 'private', label: 'Private' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => updateFormField('email_visibility', option.value)}
                    style={{ 
                        backgroundColor: formData.email_visibility === option.value 
                          ? theme.colors.primary 
                          : theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.md,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderWidth: 1,
                        borderColor: formData.email_visibility === option.value 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      }}
                    >
                      <Text style={{
                        color: formData.email_visibility === option.value 
                          ? '#FFFFFF' 
                          : theme.colors.text.primary,
                        fontSize: 14,
                        fontWeight: '500',
                      }}>
                        {option.label}
                  </Text>
                    </TouchableOpacity>
                  ))}
              </View>
          </View>

              <View style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: theme.spacing.md }}>
                  Online Status
                </Text>
                
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  marginBottom: theme.spacing.sm,
                }}>
                  <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                    <Text style={{ fontSize: 14, marginBottom: 4 }}>Show when I'm online</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text.muted }}>
                      Let others see when you're active
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => updateFormField('show_online_status', !formData.show_online_status)}
                    style={{
                      backgroundColor: formData.show_online_status ? theme.colors.primary : theme.colors.border,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      minWidth: 60,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      color: formData.show_online_status ? '#FFFFFF' : theme.colors.text.muted,
                      fontSize: 12,
                      fontWeight: '600',
                    }}>
                      {formData.show_online_status ? 'ON' : 'OFF'}
            </Text>
                  </TouchableOpacity>
                </View>

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                }}>
                  <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                    <Text style={{ fontSize: 14, marginBottom: 4 }}>Show last seen</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text.muted }}>
                      Display when you were last active
              </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => updateFormField('show_last_seen', !formData.show_last_seen)}
                    style={{
                      backgroundColor: formData.show_last_seen ? theme.colors.primary : theme.colors.border,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      minWidth: 60,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      color: formData.show_last_seen ? '#FFFFFF' : theme.colors.text.muted,
                      fontSize: 12,
                      fontWeight: '600',
                    }}>
                      {formData.show_last_seen ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
            </View>
          </View>
          )}
        </Container>
      </ScrollView>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            margin: theme.spacing.xl,
            width: '80%',
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: theme.spacing.lg, textAlign: 'center' }}>
              Change Profile Photo
            </Text>
            
            <View style={{ gap: theme.spacing.md }}>
              <Button
                variant="primary"
                icon={<Camera size={20} color="#FFFFFF" />}
                onPress={async () => {
                  // Handle camera
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status === 'granted') {
                    const result = await ImagePicker.launchCameraAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.8,
                    });
                    
                    if (!result.canceled && result.assets[0]) {
                      setAvatar(result.assets[0].uri);
                    }
                  }
                  setShowAvatarPicker(false);
                }}
                fullWidth
              >
                Take Photo
              </Button>

                <Button
                variant="secondary"
                icon={<ImageIcon size={20} color={theme.colors.primary} />}
                onPress={async () => {
                  // Handle gallery
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status === 'granted') {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.8,
                    });
                    
                    if (!result.canceled && result.assets[0]) {
                      setAvatar(result.assets[0].uri);
                    }
                  }
                  setShowAvatarPicker(false);
                }}
                fullWidth
              >
                Choose from Gallery
                </Button>
              
              <Button
                variant="ghost"
                onPress={() => setShowAvatarPicker(false)}
                fullWidth
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Business Profile Setup Modal */}
      <BusinessProfileSetupModal
        visible={showBusinessSetupModal}
        onClose={() => setShowBusinessSetupModal(false)}
        onBusinessProfileCreated={handleBusinessProfileCreated}
      />

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}
