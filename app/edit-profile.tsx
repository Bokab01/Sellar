import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
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
import { LoadingSkeleton, HomeScreenSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
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
  Camera,
  Check
} from 'lucide-react-native';
import { AppModal } from '@/components/Modal/Modal';
import { 
  useProfile, 
  useUpdateProfile,
  useProfileCompletion, 
  useSocialMediaLinks,
  useBusinessHours 
} from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useAppStore } from '@/store/useAppStore';
import { BusinessProfileSetupModal } from '@/components/BusinessProfileSetupModal/BusinessProfileSetupModal';
import { validateName, validateUsername, validatePhoneNumber } from '@/utils/validation';
import { checkMultipleUniqueness } from '@/utils/uniquenessValidation';
import { storageHelpers } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon } from 'lucide-react-native';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const { updateProfile, loading: updating } = useUpdateProfile();
  const { completion } = useProfileCompletion();
  const { hasBusinessPlan } = useMonetizationStore();
  const { setCurrentLocation } = useAppStore();

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
    shop: false,
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
  const [phoneError, setPhoneError] = useState<string>('');
  
  // Business types
  const [businessTypes, setBusinessTypes] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [loadingBusinessTypes, setLoadingBusinessTypes] = useState(false);

  // Fetch business types from backend
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      setLoadingBusinessTypes(true);
      try {
        const { data, error } = await supabase
          .from('business_types')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        setBusinessTypes(data || []);
      } catch (error) {
        console.error('Error fetching business types:', error);
      } finally {
        setLoadingBusinessTypes(false);
      }
    };
    
    fetchBusinessTypes();
  }, []);

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

    // Validate phone number if provided
    if (formData.phone.trim()) {
      const phoneValidation = validatePhoneNumber(formData.phone);
      if (!phoneValidation.isValid) {
        Alert.alert('Invalid Phone Number', phoneValidation.error!);
        setPhoneError(phoneValidation.error!);
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
      
      const updateData: any = {
        // Only include fields that have actually changed or have values
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        location: formData.location.trim() || undefined,
        professional_title: formData.professional_title.trim() || undefined,
        years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : undefined,
        avatar_url: avatar || undefined,
        preferred_contact_method: formData.preferred_contact_method as 'email' | 'phone' | 'app' | 'whatsapp',
        response_time_expectation: formData.response_time_expectation as 'within_hours' | 'within_minutes' | 'within_day' | 'within_week',
        phone_visibility: formData.phone_visibility as 'public' | 'contacts' | 'private',
        email_visibility: formData.email_visibility as 'public' | 'contacts' | 'private',
        show_online_status: formData.show_online_status,
        show_last_seen: formData.show_last_seen,
        // Business fields
        business_name: formData.business_name.trim() || undefined,
        business_type: formData.business_type.trim() || undefined,
        business_description: formData.business_description.trim() || undefined,
        business_phone: formData.business_phone.trim() || undefined,
        business_email: formData.business_email.trim() || undefined,
        business_website: formData.business_website.trim() || undefined,
        display_business_name: formData.display_business_name,
        business_name_priority: formData.business_name_priority as 'secondary' | 'primary' | 'hidden',
      };

      // Auto-set is_business to true if user has business information
      if (formData.business_name.trim() || formData.business_type.trim() || formData.business_description.trim()) {
        updateData.is_business = true;
      }

      // Only include username if it has a value and is different from current
      if (formData.username.trim() && formData.username.trim() !== profile?.username) {
        updateData.username = formData.username.trim();
      }

      
      await updateProfile(updateData);
      
      // Update app store location if location was changed
      if (formData.location.trim() && formData.location.trim() !== profile?.location) {
        setCurrentLocation(formData.location.trim());
      }
      
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
    const percentage = completion?.percentage || 0;
    if (percentage >= 80) return theme.colors.success;
    if (percentage >= 50) return theme.colors.warning;
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
        <View style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}>
          <HomeScreenSkeleton loadingText="Loading profile..." />
        </View>
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          keyboardShouldPersistTaps="handled"
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
                text={`${completion?.percentage || 0}%`}
                variant={(completion?.percentage || 0) >= 80 ? 'success' : (completion?.percentage || 0) >= 50 ? 'warning' : 'error'}
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
                width: `${completion?.percentage || 0}%`,
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
                autoExpand
                minHeight={80}
                maxHeight={200}
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
                onChangeText={(value) => {
                  updateFormField('phone', value);
                  // Validate on change
                  if (value.trim()) {
                    const validation = validatePhoneNumber(value);
                    setPhoneError(validation.error || '');
                  } else {
                    setPhoneError('');
                  }
                }}
                onBlur={() => {
                  // Validate on blur
                  if (formData.phone.trim()) {
                    const validation = validatePhoneNumber(formData.phone);
                    setPhoneError(validation.error || '');
                  }
                }}
                placeholder="e.g., 0244002233"
                keyboardType="phone-pad"
                error={phoneError}
                helper={phoneError || "10 digits starting with 0 (e.g., 0244002233)"}
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
                  showAllOptions={false}
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
              {hasBusinessPlan() ? (
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
                    autoExpand
                    minHeight={80}
                    maxHeight={150}
                  />

                  {/* Business Type Selector */}
                  <View>
                    <Text variant="bodySmall" style={{ 
                      marginBottom: theme.spacing.sm,
                      fontWeight: '500',
                      color: theme.colors.text.primary,
                    }}>
                      Business Type
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowBusinessTypeModal(true)}
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        borderWidth: 1,
                        borderRadius: theme.borderRadius.md,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.md,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 52,
                      }}
                    >
                      <Text style={{
                        color: formData.business_type ? theme.colors.text.primary : theme.colors.text.muted,
                        fontSize: 16,
                      }}>
                        {formData.business_type || 'Select business type'}
                      </Text>
                      <ChevronDown size={20} color={theme.colors.text.muted} />
                    </TouchableOpacity>
                  </View>

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
                            Display &quot;{formData.business_name}&quot; on your posts, listings, and profile
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

            {/* Business Name Priority Selection */}
            {formData.display_business_name && (
              <View style={{ marginTop: theme.spacing.lg }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '500', 
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.text.primary 
                }}>
                  Display Priority
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {[
                    { 
                      value: 'primary', 
                      label: 'Business Name Only',
                      description: `"${formData.business_name}"`
                    },
                    { 
                      value: 'secondary', 
                      label: 'Both Names',
                      description: `"${formData.first_name} ${formData.last_name} • ${formData.business_name}"`
                    },
                    { 
                      value: 'hidden', 
                      label: 'Personal Name Only',
                      description: `"${formData.first_name} ${formData.last_name}"`
                    },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => updateFormField('business_name_priority', option.value)}
                      style={{ 
                        backgroundColor: formData.business_name_priority === option.value 
                          ? theme.colors.primary 
                          : theme.colors.surfaceVariant,
                        borderRadius: theme.borderRadius.md,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderWidth: 1,
                        borderColor: formData.business_name_priority === option.value 
                          ? theme.colors.primary 
                          : theme.colors.border,
                        flex: 1,
                        minWidth: '30%',
                      }}
                    >
                      <Text style={{
                        color: formData.business_name_priority === option.value 
                          ? '#FFFFFF' 
                          : theme.colors.text.primary,
                        fontSize: 12,
                        fontWeight: '600',
                        textAlign: 'center',
                        marginBottom: 2,
                      }}>
                        {option.label}
                      </Text>
                      <Text style={{
                        color: formData.business_name_priority === option.value 
                          ? '#FFFFFF' 
                          : theme.colors.text.muted,
                        fontSize: 10,
                        textAlign: 'center',
                        opacity: 0.8,
                      }}>
                        {option.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
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

          {/* Physical Shop Section - Pro Sellers Only */}
          {renderCollapsibleSection(
            'shop',
            'Physical Shop',
            <Building size={20} color={theme.colors.primary} />,
            <View style={{ gap: theme.spacing.lg }}>
              {hasBusinessPlan() ? (
                <>
                  {profile?.has_physical_shop ? (
                    <View style={{ gap: theme.spacing.md }}>
                      {/* Shop Status */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        padding: theme.spacing.md,
                        backgroundColor: theme.colors.success + '20',
                        borderRadius: theme.borderRadius.md,
                        borderLeftWidth: 4,
                        borderLeftColor: theme.colors.success,
                      }}>
                        <CheckCircle size={20} color={theme.colors.success} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', color: theme.colors.success }}>
                            Physical Shop Active
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 }}>
                            {profile.business_name || 'Your shop'} is visible to buyers
                          </Text>
                        </View>
                      </View>

                      {/* Quick Shop Info */}
                      {profile.business_address && (
                        <View style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.surfaceVariant,
                          borderRadius: theme.borderRadius.md,
                          gap: theme.spacing.sm,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                            <MapPin size={16} color={theme.colors.text.secondary} />
                            <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                              {profile.business_address}
                            </Text>
                          </View>
                          {profile.business_phone && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                              <Phone size={16} color={theme.colors.text.secondary} />
                              <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                                {profile.business_phone}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Edit Shop Button */}
                      <Button
                        variant="outline"
                        onPress={() => router.push('/setup-physical-shop')}
                        icon={<Edit3 size={16} color={theme.colors.primary} />}
                      >
                        Edit Shop Information
                      </Button>
                    </View>
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
                        Setup Your Physical Shop
                      </Text>
                      <Text style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
                        Let buyers visit you in person! Add your shop location, hours, and photos.
                      </Text>
                      
                      <View style={{
                        backgroundColor: theme.colors.primary + '10',
                        padding: theme.spacing.md,
                        borderRadius: theme.borderRadius.md,
                        width: '100%',
                        gap: theme.spacing.xs,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.primary }}>
                          ✨ Benefits:
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                          • Increase foot traffic to your store
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                          • Build trust with shop photos
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                          • Show business hours & location
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                          • Enable pickup & walk-in options
                        </Text>
                      </View>

                      <Button
                        variant="primary"
                        onPress={() => router.push('/setup-physical-shop')}
                        icon={<Plus size={16} color="#FFFFFF" />}
                      >
                        Setup Physical Shop
                      </Button>
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
                  <Crown size={48} color={theme.colors.warning} />
                  <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
                    Sellar Pro Feature
                  </Text>
                  <Text style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
                    Physical shop features are exclusive to Sellar Pro sellers. Upgrade to showcase your store!
                  </Text>
                  
                  <Button
                    variant="secondary"
                    onPress={() => router.push('/sellar-pro' as any)}
                    icon={<Crown size={16} color={theme.colors.primary} />}
                  >
                    Upgrade to Sellar Pro
                  </Button>
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
                    <Text style={{ fontSize: 14, marginBottom: 4 }}>Show when I&apos;m online</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text.muted }}>
                      Let others see when you&apos;re active
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
      </KeyboardAvoidingView>

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
                  try {
                    // Handle camera
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status === 'granted') {
                      const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ['images'],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                      });
                      
                      if (!result.canceled && result.assets[0]) {
                        const localUri = result.assets[0].uri;
                        
                        // Show loading state
                        setShowAvatarPicker(false);
                        setToastMessage('Uploading profile photo...');
                        setToastVariant('success');
                        setShowToast(true);
                        
                        // Upload to Supabase Storage
                        const uploadResult = await storageHelpers.uploadProfileAvatar(localUri, user!.id);
                        
                        if (uploadResult && uploadResult.url) {
                          setAvatar(uploadResult.url);
                          setToastMessage('Profile photo uploaded successfully!');
                          setShowToast(true);
                        } else {
                          throw new Error('Failed to upload image');
                        }
                      }
                    }
                  } catch (error: any) {
                    console.error('Error uploading profile photo:', error);
                    setToastMessage(error.message || 'Failed to upload profile photo');
                    setToastVariant('error');
                    setShowToast(true);
                    setShowAvatarPicker(false);
                  }
                }}
                fullWidth
              >
                Take Photo
              </Button>

                <Button
                variant="secondary"
                icon={<ImageIcon size={20} color={theme.colors.primary} />}
                onPress={async () => {
                  try {
                    // Handle gallery
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status === 'granted') {
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                      });
                      
                      if (!result.canceled && result.assets[0]) {
                        const localUri = result.assets[0].uri;
                        
                        // Show loading state
                        setShowAvatarPicker(false);
                        setToastMessage('Uploading profile photo...');
                        setToastVariant('success');
                        setShowToast(true);
                        
                        // Upload to Supabase Storage
                        const uploadResult = await storageHelpers.uploadProfileAvatar(localUri, user!.id);
                        
                        if (uploadResult && uploadResult.url) {
                          setAvatar(uploadResult.url);
                          setToastMessage('Profile photo uploaded successfully!');
                          setShowToast(true);
                        } else {
                          throw new Error('Failed to upload image');
                        }
                      }
                    }
                  } catch (error: any) {
                    console.error('Error uploading profile photo:', error);
                    setToastMessage(error.message || 'Failed to upload profile photo');
                    setToastVariant('error');
                    setShowToast(true);
                    setShowAvatarPicker(false);
                  }
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
      
      {/* Business Type Selection Modal */}
      <AppModal
        visible={showBusinessTypeModal}
        onClose={() => setShowBusinessTypeModal(false)}
        title="Select Business Type"
        position='bottom'
      >
        <ScrollView style={{ maxHeight: 500 }}>
          {loadingBusinessTypes ? (
            <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
              <Text variant="body" color="muted">Loading business types...</Text>
            </View>
          ) : businessTypes.length === 0 ? (
            <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
              <Text variant="body" color="muted">No business types available</Text>
            </View>
          ) : (
            businessTypes.map((type) => {
              const isSelected = formData.business_type === type.name;
              
              return (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    updateFormField('business_type', type.name);
                    setShowBusinessTypeModal(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    backgroundColor: isSelected ? theme.colors.primary + '10' : 'transparent',
                  }}
                >
                  <Text
                    variant="body"
                    style={{
                      color: isSelected ? theme.colors.primary : theme.colors.text.primary,
                      fontWeight: isSelected ? '600' : '400',
                    }}
                  >
                    {type.name}
                  </Text>
                  {isSelected && (
                    <Check size={20} color={theme.colors.primary} strokeWidth={3} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </AppModal>

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
