import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  Input,
  DocumentUpload,
  StepIndicator,
} from '@/components';
import { MapPin, FileText, CheckCircle, AlertTriangle, Home } from 'lucide-react-native';
import { 
  useCreateVerificationRequest,
  useVerificationDocuments,
} from '@/hooks/useVerification';

export default function AddressVerificationScreen() {
  const { theme } = useTheme();
  const { createRequest, loading: createLoading } = useCreateVerificationRequest();
  const { uploadDocument, loading: uploadLoading } = useVerificationDocuments();

  const [currentStep, setCurrentStep] = useState(0);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    street_address: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'Ghana',
    address_type: 'residential',
    duration_at_address: '',
  });
  const [uploadedDocument, setUploadedDocument] = useState(false);

  const steps = [
    { title: 'Address Information', description: 'Enter your address' },
    { title: 'Upload Proof', description: 'Provide address proof' },
    { title: 'Review & Submit', description: 'Confirm information' },
  ];

  const addressTypes = [
    { value: 'residential', label: 'Residential Address' },
    { value: 'business', label: 'Business Address' },
    { value: 'mailing', label: 'Mailing Address' },
  ];

  const ghanaRegions = [
    'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Northern',
    'Upper East', 'Upper West', 'Volta', 'Brong Ahafo', 'Western North',
    'Ahafo', 'Bono East', 'Oti', 'North East', 'Savannah'
  ];

  const handleAddressInfoSubmit = async () => {
    // Validate required fields
    const requiredFields = ['street_address', 'city', 'region'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]?.trim());
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required address information');
      return;
    }

    try {
      const request = await createRequest({
        verification_type: 'address',
        submitted_data: formData,
      });

      setVerificationId(request.id);
      setCurrentStep(1);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create verification request');
    }
  };

  const handleDocumentUpload = () => {
    setUploadedDocument(true);
    setCurrentStep(2);
  };

  const handleFinalSubmit = () => {
    Alert.alert(
      'Address Verification Submitted',
      'Your address verification has been submitted for review. We\'ll notify you within 2-3 business days.',
      [
        {
          text: 'OK',
          onPress: () => router.push('/verification'),
        },
      ]
    );
  };

  const renderAddressInfoStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <MapPin size={40} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Address Information
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Enter your complete address details. This will be verified against your proof of address document.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <Input
          label="Street Address *"
          placeholder="Enter your complete street address"
          value={formData.street_address}
          onChangeText={(value) => setFormData(prev => ({ ...prev, street_address: value }))}
          multiline
          style={{ minHeight: 80 }}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Input
            label="City *"
            placeholder="Enter city"
            value={formData.city}
            onChangeText={(value) => setFormData(prev => ({ ...prev, city: value }))}
            style={{ flex: 1 }}
          />

          <Input
            label="Postal Code"
            placeholder="Postal code"
            value={formData.postal_code}
            onChangeText={(value) => setFormData(prev => ({ ...prev, postal_code: value }))}
            style={{ flex: 1 }}
          />
        </View>

        <View>
          <Text variant="bodySmall" style={{ 
            marginBottom: theme.spacing.sm,
            fontWeight: '500',
            color: theme.colors.text.primary,
          }}>
            Region *
          </Text>
          <View style={{ gap: theme.spacing.xs }}>
            {ghanaRegions.map((region) => (
              <Button
                key={region}
                variant={formData.region === region ? 'primary' : 'tertiary'}
                size="sm"
                onPress={() => setFormData(prev => ({ ...prev, region }))}
                style={{ justifyContent: 'flex-start' }}
              >
                {region}
              </Button>
            ))}
          </View>
        </View>

        <View>
          <Text variant="bodySmall" style={{ 
            marginBottom: theme.spacing.sm,
            fontWeight: '500',
            color: theme.colors.text.primary,
          }}>
            Address Type
          </Text>
          <View style={{ gap: theme.spacing.sm }}>
            {addressTypes.map((type) => (
              <Button
                key={type.value}
                variant={formData.address_type === type.value ? 'primary' : 'tertiary'}
                size="md"
                onPress={() => setFormData(prev => ({ ...prev, address_type: type.value }))}
                style={{ justifyContent: 'flex-start' }}
              >
                {type.label}
              </Button>
            ))}
          </View>
        </View>

        <Input
          label="How long have you lived at this address?"
          placeholder="e.g., 2 years, 6 months"
          value={formData.duration_at_address}
          onChangeText={(value) => setFormData(prev => ({ ...prev, duration_at_address: value }))}
        />
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={handleAddressInfoSubmit}
        loading={createLoading}
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
      >
        Continue
      </Button>
    </View>
  );

  const renderDocumentStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <FileText size={40} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Upload Proof of Address
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Upload a recent document that shows your name and address clearly.
        </Text>
      </View>

      {/* Accepted Documents */}
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Accepted Documents
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="body" color="secondary">
            • Utility bill (electricity, water, gas, internet)
          </Text>
          <Text variant="body" color="secondary">
            • Bank statement
          </Text>
          <Text variant="body" color="secondary">
            • Government correspondence
          </Text>
          <Text variant="body" color="secondary">
            • Rental agreement or lease
          </Text>
          <Text variant="body" color="secondary">
            • Insurance statement
          </Text>
          <Text variant="body" color="secondary">
            • Tax assessment notice
          </Text>
        </View>
      </View>

      {/* Document Requirements */}
      <View
        style={{
          backgroundColor: theme.colors.warning + '10',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <AlertTriangle size={20} color={theme.colors.warning} />
          <Text variant="h4" style={{ marginLeft: theme.spacing.sm, color: theme.colors.warning }}>
            Document Requirements
          </Text>
        </View>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodySmall" color="secondary">
            • Document must be dated within the last 3 months
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Your name must be clearly visible
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Address must match the information you provided
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Document must be clear and readable
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Accept PDF or high-quality images
          </Text>
        </View>
      </View>

      {verificationId && (
        <DocumentUpload
          verificationId={verificationId}
          documentType="utility_bill"
          title="Proof of Address Document"
          description="Upload a recent utility bill, bank statement, or other accepted document"
          required
          acceptedTypes={['image', 'pdf']}
          onUploadComplete={handleDocumentUpload}
        />
      )}
    </View>
  );

  const renderReviewStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.success + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <CheckCircle size={40} color={theme.colors.success} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Review & Submit
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Please review your address information before submitting for verification.
        </Text>
      </View>

      {/* Address Information Review */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
          <Home size={20} color={theme.colors.primary} />
          <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
            Address Information
          </Text>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <View>
            <Text variant="bodySmall" color="muted">Complete Address</Text>
            <Text variant="body">
              {formData.street_address}
              {'\n'}{formData.city}, {formData.region}
              {formData.postal_code && `, ${formData.postal_code}`}
              {'\n'}{formData.country}
            </Text>
          </View>

          <View>
            <Text variant="bodySmall" color="muted">Address Type</Text>
            <Text variant="body">
              {addressTypes.find(t => t.value === formData.address_type)?.label}
            </Text>
          </View>

          {formData.duration_at_address && (
            <View>
              <Text variant="bodySmall" color="muted">Duration at Address</Text>
              <Text variant="body">{formData.duration_at_address}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Document Status */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
          Document Uploaded
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CheckCircle size={16} color={theme.colors.success} />
          <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
            Proof of Address Document
          </Text>
        </View>
      </View>

      {/* Processing Information */}
      <View
        style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.md, color: theme.colors.primary }}>
          Address Verification Process
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodySmall" color="secondary">
            • We'll verify your address against the uploaded document
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Document date and address details will be checked
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Review process typically takes 2-3 business days
          </Text>
          <Text variant="bodySmall" color="secondary">
            • You'll receive notifications about verification status
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Location-based features will be enhanced upon approval
          </Text>
        </View>
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={handleFinalSubmit}
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
      >
        Submit Address Verification
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={() => setCurrentStep(0)}
        fullWidth
      >
        Edit Information
      </Button>
    </View>
  );

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Address Verification"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>
          {/* Step Indicator */}
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            style={{ marginBottom: theme.spacing.xl }}
          />

          {/* Step Content */}
          {currentStep === 0 && renderAddressInfoStep()}
          {currentStep === 1 && renderDocumentStep()}
          {currentStep === 2 && renderReviewStep()}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
