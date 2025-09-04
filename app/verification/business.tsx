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
import { Building, FileText, CheckCircle, AlertTriangle, MapPin } from 'lucide-react-native';
import { 
  useCreateVerificationRequest,
  useVerificationDocuments,
} from '@/hooks/useVerification';

export default function BusinessVerificationScreen() {
  const { theme } = useTheme();
  const { createRequest, loading: createLoading } = useCreateVerificationRequest();
  const { uploadDocument, loading: uploadLoading } = useVerificationDocuments();

  const [currentStep, setCurrentStep] = useState(0);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
    registration_number: '',
    tax_id: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    years_in_operation: '',
    business_description: '',
  });
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  const steps = [
    { title: 'Business Information', description: 'Enter business details' },
    { title: 'Registration Documents', description: 'Upload certificates' },
    { title: 'Additional Documents', description: 'Tax & other docs' },
    { title: 'Review & Submit', description: 'Confirm information' },
  ];

  const businessTypes = [
    'Sole Proprietorship',
    'Partnership',
    'Limited Liability Company (LLC)',
    'Corporation',
    'Cooperative',
    'Non-Profit Organization',
    'Other',
  ];

  const handleBusinessInfoSubmit = async () => {
    // Validate required fields
    const requiredFields = ['business_name', 'business_type', 'registration_number', 'business_address'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]?.trim());
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required business information');
      return;
    }

    try {
      const request = await createRequest({
        verification_type: 'business',
        submitted_data: formData,
      });

      setVerificationId(request.id);
      setCurrentStep(1);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create verification request');
    }
  };

  const handleDocumentUpload = (documentType: string) => {
    setUploadedDocuments(prev => [...prev, documentType]);
    
    // Auto-advance based on uploaded documents
    if (documentType === 'business_registration' && currentStep === 1) {
      setCurrentStep(2);
    } else if (documentType === 'tax_certificate' && currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleFinalSubmit = () => {
    Alert.alert(
      'Business Verification Submitted',
      'Your business verification has been submitted for review. We&apos;ll notify you within 3-5 business days.',
      [
        {
          text: 'OK',
          onPress: () => router.push('/verification'),
        },
      ]
    );
  };

  const renderBusinessInfoStep = () => (
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
          <Building size={40} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Business Information
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Enter your business details exactly as they appear on your registration documents.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <Input
          label="Business Name *"
          placeholder="Enter your registered business name"
          value={formData.business_name}
          onChangeText={(value) => setFormData(prev => ({ ...prev, business_name: value }))}
        />

        <View>
          <Text variant="bodySmall" style={{ 
            marginBottom: theme.spacing.sm,
            fontWeight: '500',
            color: theme.colors.text.primary,
          }}>
            Business Type *
          </Text>
          <View style={{ gap: theme.spacing.xs }}>
            {businessTypes.map((type) => (
              <Button
                key={type}
                variant={formData.business_type === type ? 'primary' : 'tertiary'}
                size="sm"
                onPress={() => setFormData(prev => ({ ...prev, business_type: type }))}
                style={{ justifyContent: 'flex-start' }}
              >
                {type}
              </Button>
            ))}
          </View>
        </View>

        <Input
          label="Registration Number *"
          placeholder="Enter business registration number"
          value={formData.registration_number}
          onChangeText={(value) => setFormData(prev => ({ ...prev, registration_number: value }))}
        />

        <Input
          label="Tax ID"
          placeholder="Enter tax identification number"
          value={formData.tax_id}
          onChangeText={(value) => setFormData(prev => ({ ...prev, tax_id: value }))}
        />

        <Input
          label="Business Address *"
          placeholder="Enter complete business address"
          value={formData.business_address}
          onChangeText={(value) => setFormData(prev => ({ ...prev, business_address: value }))}
          multiline
          style={{ minHeight: 80 }}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Input
            label="Business Phone"
            placeholder="Business phone number"
            value={formData.business_phone}
            onChangeText={(value) => setFormData(prev => ({ ...prev, business_phone: value }))}
            keyboardType="phone-pad"
            style={{ flex: 1 }}
          />

          <Input
            label="Business Email"
            placeholder="Business email address"
            value={formData.business_email}
            onChangeText={(value) => setFormData(prev => ({ ...prev, business_email: value }))}
            keyboardType="email-address"
            style={{ flex: 1 }}
          />
        </View>

        <Input
          label="Years in Operation"
          placeholder="How long has your business been operating?"
          value={formData.years_in_operation}
          onChangeText={(value) => setFormData(prev => ({ ...prev, years_in_operation: value }))}
          keyboardType="numeric"
        />

        <Input
          label="Business Description"
          placeholder="Briefly describe what your business does"
          value={formData.business_description}
          onChangeText={(value) => setFormData(prev => ({ ...prev, business_description: value }))}
          multiline
          style={{ minHeight: 100 }}
        />
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={handleBusinessInfoSubmit}
        loading={createLoading}
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
      >
        Continue
      </Button>
    </View>
  );

  const renderRegistrationDocumentsStep = () => (
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
          Registration Documents
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Upload your business registration certificate or incorporation documents.
        </Text>
      </View>

      {/* Document Guidelines */}
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
            • Business registration certificate
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Certificate of incorporation (for companies)
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Partnership agreement (for partnerships)
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Documents must be clear and readable
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Accept PDF or high-quality images
          </Text>
        </View>
      </View>

      {verificationId && (
        <DocumentUpload
          verificationId={verificationId}
          documentType="business_registration"
          title="Business Registration Certificate"
          description="Upload your official business registration document"
          required
          acceptedTypes={['image', 'pdf']}
          onUploadComplete={() => handleDocumentUpload('business_registration')}
        />
      )}
    </View>
  );

  const renderAdditionalDocumentsStep = () => (
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
          Tax & Additional Documents
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Upload your tax identification certificate and any other relevant business documents.
        </Text>
      </View>

      {/* Tax Certificate */}
      {verificationId && (
        <View style={{ marginBottom: theme.spacing.xl }}>
          <DocumentUpload
            verificationId={verificationId}
            documentType="tax_certificate"
            title="Tax Identification Certificate"
            description="Upload your tax ID certificate or VAT registration"
            acceptedTypes={['image', 'pdf']}
            onUploadComplete={() => handleDocumentUpload('tax_certificate')}
          />
        </View>
      )}

      {/* Optional: Business License */}
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Optional Documents
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodySmall" color="secondary">
            • Business license or permits
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Bank account verification letter
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Professional certifications
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Insurance certificates
          </Text>
        </View>

        <Text variant="bodySmall" style={{ 
          marginTop: theme.spacing.md,
          fontStyle: 'italic',
          color: theme.colors.text.secondary,
        }}>
          These documents can help speed up the verification process and may unlock additional features.
        </Text>
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={() => setCurrentStep(3)}
        fullWidth
      >
        Continue to Review
      </Button>
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
          Please review your business information before submitting for verification.
        </Text>
      </View>

      {/* Business Information Review */}
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
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
          Business Information
        </Text>

        <View style={{ gap: theme.spacing.md }}>
          <View>
            <Text variant="bodySmall" color="muted">Business Name</Text>
            <Text variant="body">{formData.business_name}</Text>
          </View>

          <View>
            <Text variant="bodySmall" color="muted">Business Type</Text>
            <Text variant="body">{formData.business_type}</Text>
          </View>

          <View>
            <Text variant="bodySmall" color="muted">Registration Number</Text>
            <Text variant="body">{formData.registration_number}</Text>
          </View>

          {formData.tax_id && (
            <View>
              <Text variant="bodySmall" color="muted">Tax ID</Text>
              <Text variant="body">{formData.tax_id}</Text>
            </View>
          )}

          <View>
            <Text variant="bodySmall" color="muted">Business Address</Text>
            <Text variant="body">{formData.business_address}</Text>
          </View>

          {formData.years_in_operation && (
            <View>
              <Text variant="bodySmall" color="muted">Years in Operation</Text>
              <Text variant="body">{formData.years_in_operation} years</Text>
            </View>
          )}
        </View>
      </View>

      {/* Documents Status */}
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
          Documents Uploaded
        </Text>

        <View style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CheckCircle size={16} color={theme.colors.success} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
              Business Registration Certificate
            </Text>
          </View>

          {uploadedDocuments.includes('tax_certificate') && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CheckCircle size={16} color={theme.colors.success} />
              <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
                Tax Identification Certificate
              </Text>
            </View>
          )}
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
          Business Verification Process
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodySmall" color="secondary">
            • Our team will verify your business registration
          </Text>
          <Text variant="bodySmall" color="secondary">
            • We may contact your business for additional verification
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Review process typically takes 3-5 business days
          </Text>
          <Text variant="bodySmall" color="secondary">
            • You&apos;ll receive email updates on verification status
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Business features will be unlocked upon approval
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
        Submit Business Verification
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
        title="Business Verification"
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
          {currentStep === 0 && renderBusinessInfoStep()}
          {currentStep === 1 && renderRegistrationDocumentsStep()}
          {currentStep === 2 && renderAdditionalDocumentsStep()}
          {currentStep === 3 && renderReviewStep()}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
