/**
 * Step 1: Basic Information
 * Shop name, type, description, contact details
 */

import React, { memo, useCallback } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { TextInput } from '@/components/Input/TextInput';
import { Picker } from '@/components/Picker/Picker';
import { BUSINESS_TYPES } from '../types';
import type { ShopSetupData } from '../types';

interface Step1BasicInfoProps {
  data: Partial<ShopSetupData>;
  updateData: <K extends keyof ShopSetupData>(key: K, value: ShopSetupData[K]) => void;
  updateMultiple: (updates: Partial<ShopSetupData>) => void;
}

const Step1BasicInfo = memo<Step1BasicInfoProps>(({ data, updateData }) => {
  const { theme } = useTheme();

  const handleBusinessNameChange = useCallback((value: string) => {
    updateData('business_name', value);
  }, [updateData]);

  const handleBusinessTypeChange = useCallback((value: string) => {
    updateData('business_type', value);
  }, [updateData]);

  const handleDescriptionChange = useCallback((value: string) => {
    updateData('business_description', value);
  }, [updateData]);

  const handlePhoneChange = useCallback((value: string) => {
    updateData('business_phone', value);
  }, [updateData]);

  const handleEmailChange = useCallback((value: string) => {
    updateData('business_email', value);
  }, [updateData]);

  const handleWebsiteChange = useCallback((value: string) => {
    updateData('business_website', value);
  }, [updateData]);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Header */}
      <View>
        <Text variant="h3" style={{ marginBottom: theme.spacing.xs }}>
          Tell us about your shop
        </Text>
        <Text variant="body" color="secondary">
          This information helps buyers find and trust your business
        </Text>
      </View>

      {/* Business Name */}
      <TextInput
        label="Shop Name *"
        placeholder="e.g., Tech Haven Electronics"
        value={data.business_name || ''}
        onChangeText={handleBusinessNameChange}
        maxLength={100}
        autoCapitalize="words"
      />

      {/* Business Type */}
      <Picker
        label="Business Type *"
        placeholder="Select business type"
        value={data.business_type || ''}
        onValueChange={handleBusinessTypeChange}
        items={BUSINESS_TYPES.map(type => ({ label: type, value: type }))}
      />

      {/* Business Description */}
      <TextInput
        label="Shop Description *"
        placeholder="Describe what you sell and what makes your shop special..."
        value={data.business_description || ''}
        onChangeText={handleDescriptionChange}
        multiline
        numberOfLines={4}
        maxLength={500}
        helperText={`${data.business_description?.length || 0}/500 characters (minimum 20)`}
      />

      {/* Business Phone */}
      <TextInput
        label="Business Phone *"
        placeholder="0XX XXX XXXX"
        value={data.business_phone || ''}
        onChangeText={handlePhoneChange}
        keyboardType="phone-pad"
        maxLength={15}
      />

      {/* Business Email (Optional) */}
      <TextInput
        label="Business Email"
        placeholder="shop@example.com (optional)"
        value={data.business_email || ''}
        onChangeText={handleEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Business Website (Optional) */}
      <TextInput
        label="Website"
        placeholder="https://yourshop.com (optional)"
        value={data.business_website || ''}
        onChangeText={handleWebsiteChange}
        keyboardType="url"
        autoCapitalize="none"
      />

      {/* Info Box */}
      <View style={{
        backgroundColor: theme.colors.primary + '10',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
      }}>
        <Text variant="bodySmall" style={{ lineHeight: 20 }}>
          💡 <Text style={{ fontWeight: '600' }}>Pro Tip:</Text> A detailed description and complete contact information increases buyer trust by up to 60%!
        </Text>
      </View>
    </View>
  );
});

Step1BasicInfo.displayName = 'Step1BasicInfo';

export default Step1BasicInfo;

