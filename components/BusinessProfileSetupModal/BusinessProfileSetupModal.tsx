import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { Badge } from '@/components/Badge/Badge';
import { Picker } from '@react-native-picker/picker';
import { 
  useBusinessCategories, 
  useBusinessProfileSetup, 
  useUpdateProfile,
  UserProfile 
} from '@/hooks/useProfile';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { Building, CreditCard, Crown } from 'lucide-react-native';

interface BusinessProfileSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onBusinessProfileCreated?: (profile: UserProfile) => void;
}

const BUSINESS_TYPES = [
  { value: '', label: 'Select Business Type' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_liability', label: 'Limited Liability Company' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'non_profit', label: 'Non-Profit Organization' },
  { value: 'other', label: 'Other' },
];

const EMPLOYEE_COUNT_OPTIONS = [
  { value: '', label: 'Select Team Size' },
  { value: '1', label: 'Just me (1)' },
  { value: '2-5', label: 'Small team (2-5)' },
  { value: '6-10', label: 'Growing team (6-10)' },
  { value: '11-25', label: 'Medium business (11-25)' },
  { value: '26-50', label: 'Large team (26-50)' },
  { value: '51-100', label: 'Enterprise (51-100)' },
  { value: '100+', label: 'Large enterprise (100+)' },
];

export function BusinessProfileSetupModal({ 
  visible, 
  onClose, 
  onBusinessProfileCreated 
}: BusinessProfileSetupModalProps) {
  const { theme } = useTheme();
  const { categories } = useBusinessCategories();
  const { enableBusinessProfile, loading } = useBusinessProfileSetup();
  const { updateProfile } = useUpdateProfile();
  const { hasBusinessPlan, creditBalance } = useMonetizationStore();

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
    business_category_id: '',
    business_description: '',
    business_phone: '',
    business_email: '',
    business_website: '',
    business_address: '',
    business_registration_number: '',
    business_established_year: '',
    business_employee_count: '',
  });

  const [services, setServices] = useState<string>('');
  const [coverageAreas, setCoverageAreas] = useState<string>('');

  const hasPlan = hasBusinessPlan();
  const needsCredits = !hasPlan && creditBalance < 50;

  const resetForm = () => {
    setFormData({
      business_name: '',
      business_type: '',
      business_category_id: '',
      business_description: '',
      business_phone: '',
      business_email: '',
      business_website: '',
      business_address: '',
      business_registration_number: '',
      business_established_year: '',
      business_employee_count: '',
    });
    setServices('');
    setCoverageAreas('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.business_name.trim()) {
      Alert.alert('Error', 'Business name is required.');
      return;
    }

    if (!formData.business_description.trim()) {
      Alert.alert('Error', 'Business description is required.');
      return;
    }

    if (needsCredits) {
      Alert.alert(
        'Insufficient Credits',
        'You need 50 credits to activate your business profile. Please purchase credits first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => {
            handleClose();
            // Navigate to buy credits screen
          }},
        ]
      );
      return;
    }

    try {
      const businessData = {
        business_name: formData.business_name.trim(),
        business_type: formData.business_type || undefined,
        business_category_id: formData.business_category_id || undefined,
        business_description: formData.business_description.trim(),
        business_phone: formData.business_phone.trim() || undefined,
        business_email: formData.business_email.trim() || undefined,
        business_website: formData.business_website.trim() || undefined,
      };

      const updatedProfile = await enableBusinessProfile(businessData);

      // Update additional business fields
      const additionalUpdates: Partial<UserProfile> = {};

      if (formData.business_address.trim()) {
        additionalUpdates.business_address = formData.business_address.trim();
      }

      if (formData.business_registration_number.trim()) {
        additionalUpdates.business_registration_number = formData.business_registration_number.trim();
      }

      if (formData.business_established_year) {
        additionalUpdates.business_established_year = parseInt(formData.business_established_year);
      }

      if (formData.business_employee_count) {
        additionalUpdates.business_employee_count = formData.business_employee_count;
      }

      if (services.trim()) {
        additionalUpdates.business_services = services.split(',').map(s => s.trim()).filter(s => s);
      }

      if (coverageAreas.trim()) {
        additionalUpdates.business_coverage_areas = coverageAreas.split(',').map(s => s.trim()).filter(s => s);
      }

      // Apply additional updates if any
      if (Object.keys(additionalUpdates).length > 0) {
        await updateProfile(additionalUpdates);
      }

      Alert.alert(
        'Business Profile Activated! 🎉',
        hasPlan 
          ? 'Your business profile has been activated with your business plan benefits!'
          : 'Your business profile has been activated! 50 credits have been deducted from your account.',
        [{ text: 'Great!', onPress: handleClose }]
      );

      onBusinessProfileCreated?.(updatedProfile);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to activate business profile. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title="Setup Business Profile"
      primaryAction={{
        text: hasPlan ? 'Activate Business Profile' : 'Activate (50 Credits)',
        onPress: handleSubmit,
        loading,
        disabled: needsCredits,
      }}
      secondaryAction={{
        text: 'Cancel',
        onPress: handleClose,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: theme.spacing.lg }}>
          {/* Benefits Header */}
          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.md,
            }}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <Building size={24} color={theme.colors.primary} />
              <Text variant="h4" style={{ 
                marginLeft: theme.spacing.sm,
                color: theme.colors.primary,
              }}>
                Business Profile Benefits
              </Text>
            </View>

            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                • Business badge on your profile and listings
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                • Enhanced business information display
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                • Business hours and contact preferences
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                • Better visibility in business searches
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                • Professional credibility and trust
              </Text>
            </View>

            {/* Cost Information */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: theme.spacing.md,
              paddingTop: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.colors.primary + '30',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {hasPlan ? (
                  <>
                    <Crown size={16} color={theme.colors.success} />
                    <Text variant="bodySmall" style={{ 
                      marginLeft: theme.spacing.xs,
                      color: theme.colors.success,
                      fontWeight: '600',
                    }}>
                      FREE with Business Plan
                    </Text>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} color={theme.colors.primary} />
                    <Text variant="bodySmall" style={{ 
                      marginLeft: theme.spacing.xs,
                      color: theme.colors.primary,
                      fontWeight: '600',
                    }}>
                      50 Credits (One-time)
                    </Text>
                  </>
                )}
              </View>

              {!hasPlan && (
                <Badge 
                  text={`${creditBalance} credits`}
                  variant={needsCredits ? 'error' : 'success'}
                  size="small"
                />
              )}
            </View>
          </View>

          {needsCredits && (
            <View
              style={{
                backgroundColor: theme.colors.error + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
              }}
            >
              <Text variant="bodySmall" style={{ 
                color: theme.colors.error,
                textAlign: 'center',
              }}>
                ⚠️ You need 50 credits to activate business profile. You currently have {creditBalance} credits.
              </Text>
            </View>
          )}

          {/* Basic Business Information */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Basic Information
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              <Input
                label="Business Name *"
                placeholder="Enter your business name"
                value={formData.business_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, business_name: text }))}
              />

              <Input
                variant="multiline"
                label="Business Description *"
                placeholder="Describe your business, products, or services..."
                value={formData.business_description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, business_description: text }))}
                style={{ minHeight: 100 }}
                maxLength={2000}
              />

              {/* Business Type */}
              <View>
                <Text variant="bodySmall" style={{ 
                  marginBottom: theme.spacing.sm,
                  fontWeight: '500',
                  color: theme.colors.text.primary,
                }}>
                  Business Type
                </Text>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Picker
                    selectedValue={formData.business_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, business_type: value }))}
                    style={{
                      color: theme.colors.text.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <Picker.Item
                        key={type.value}
                        label={type.label}
                        value={type.value}
                        color={theme.colors.text.primary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Business Category */}
              <View>
                <Text variant="bodySmall" style={{ 
                  marginBottom: theme.spacing.sm,
                  fontWeight: '500',
                  color: theme.colors.text.primary,
                }}>
                  Business Category
                </Text>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Picker
                    selectedValue={formData.business_category_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, business_category_id: value }))}
                    style={{
                      color: theme.colors.text.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    <Picker.Item
                      label="Select Category"
                      value=""
                      color={theme.colors.text.muted}
                    />
                    {categories.map((category) => (
                      <Picker.Item
                        key={category.id}
                        label={category.name}
                        value={category.id}
                        color={theme.colors.text.primary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Contact Information
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              <Input
                label="Business Phone"
                placeholder="Business phone number"
                value={formData.business_phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, business_phone: text }))}
                keyboardType="phone-pad"
              />

              <Input
                label="Business Email"
                placeholder="Business email address"
                value={formData.business_email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, business_email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Business Website"
                placeholder="https://your-website.com"
                value={formData.business_website}
                onChangeText={(text) => setFormData(prev => ({ ...prev, business_website: text }))}
                keyboardType="url"
                autoCapitalize="none"
              />

              <Input
                variant="multiline"
                label="Business Address"
                placeholder="Full business address"
                value={formData.business_address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, business_address: text }))}
                style={{ minHeight: 80 }}
              />
            </View>
          </View>

          {/* Additional Details */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Additional Details
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              <Input
                label="Registration Number"
                placeholder="Business registration number (optional)"
                value={formData.business_registration_number}
                onChangeText={(text) => setFormData(prev => ({ ...prev, business_registration_number: text }))}
              />

              <Input
                label="Established Year"
                placeholder="Year business was established"
                value={formData.business_established_year}
                onChangeText={(text) => setFormData(prev => ({ ...prev, business_established_year: text }))}
                keyboardType="numeric"
              />

              {/* Employee Count */}
              <View>
                <Text variant="bodySmall" style={{ 
                  marginBottom: theme.spacing.sm,
                  fontWeight: '500',
                  color: theme.colors.text.primary,
                }}>
                  Team Size
                </Text>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Picker
                    selectedValue={formData.business_employee_count}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, business_employee_count: value }))}
                    style={{
                      color: theme.colors.text.primary,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {EMPLOYEE_COUNT_OPTIONS.map((option) => (
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

              <Input
                label="Services Offered"
                placeholder="Comma-separated list of services"
                value={services}
                onChangeText={setServices}
              />

              <Input
                label="Coverage Areas"
                placeholder="Areas you serve (comma-separated)"
                value={coverageAreas}
                onChangeText={setCoverageAreas}
              />
            </View>
          </View>

          {/* Help Text */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', lineHeight: 18 }}>
              💡 You can update your business information anytime after activation. Complete information helps customers find and trust your business.
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}
