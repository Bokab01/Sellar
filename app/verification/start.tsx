import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  Input,
  MultiStepForm,
  useMultiStepForm,
  DocumentUpload,
  MultiDocumentUpload,
} from '@/components';
import { 
  Phone, 
  Mail, 
  User, 
  Building, 
  MapPin, 
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react-native';
import { 
  useVerificationTemplates, 
  useCreateVerificationRequest,
  usePhoneVerification,
  useEmailVerification,
  VerificationTemplate 
} from '@/hooks/useVerification';
import { formatVerificationType, formatDocumentType } from '@/lib/verificationService';

export default function VerificationStartScreen() {
  const { theme } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { templates } = useVerificationTemplates();
  const { createRequest, loading: createLoading } = useCreateVerificationRequest();
  const { sendVerificationCode, verifyCode, loading: phoneLoading } = usePhoneVerification();
  const { sendVerificationEmail, verifyToken, loading: emailLoading } = useEmailVerification();

  const [template, setTemplate] = useState<VerificationTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationStep, setVerificationStep] = useState<'form' | 'documents' | 'code' | 'success'>('form');

  const { currentStep, nextStep, prevStep, goToStep } = useMultiStepForm({
    totalSteps: 3,
  });

  useEffect(() => {
    if (type && templates.length > 0) {
      const foundTemplate = templates.find(t => t.verification_type === type);
      if (foundTemplate) {
        setTemplate(foundTemplate);
      } else {
        Alert.alert('Error', 'Verification type not found');
        router.back();
      }
    }
  }, [type, templates]);

  const getVerificationIcon = (verificationType: string, size: number = 60) => {
    const iconProps = { size, color: theme.colors.primary };
    
    switch (verificationType) {
      case 'phone':
        return <Phone {...iconProps} />;
      case 'email':
        return <Mail {...iconProps} />;
      case 'identity':
        return <User {...iconProps} />;
      case 'business':
        return <Building {...iconProps} />;
      case 'address':
        return <MapPin {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  const handleFormSubmit = async () => {
    if (!template) return;

    // Validate required fields
    const missingFields = template.required_fields.filter(field => !formData[field]?.trim());
    if (missingFields.length > 0) {
      Alert.alert('Missing Information', `Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    try {
      const request = await createRequest({
        verification_type: template.verification_type as any,
        submitted_data: formData,
      });

      setVerificationId(request.id);

      // Handle auto-verification for phone and email
      if (template.verification_type === 'phone' && formData.phone_number) {
        await sendVerificationCode(formData.phone_number);
        setVerificationStep('code');
      } else if (template.verification_type === 'email' && formData.email_address) {
        await sendVerificationEmail(formData.email_address);
        setVerificationStep('code');
      } else if (template.required_documents.length > 0) {
        setVerificationStep('documents');
      } else {
        setVerificationStep('success');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create verification request');
    }
  };

  const handleCodeVerification = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      if (template?.verification_type === 'phone') {
        await verifyCode(verificationCode);
      } else if (template?.verification_type === 'email') {
        await verifyToken(verificationCode);
      }
      setVerificationStep('success');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid verification code');
    }
  };

  const handleDocumentUploadComplete = () => {
    // Check if all required documents are uploaded
    setVerificationStep('success');
  };

  const renderFormFields = () => {
    if (!template) return null;

    return (
      <View style={{ gap: theme.spacing.lg }}>
        {template.required_fields.map((field) => {
          const fieldConfig = getFieldConfig(field);
          return (
            <Input
              key={field}
              label={fieldConfig.label}
              placeholder={fieldConfig.placeholder}
              value={formData[field] || ''}
              onChangeText={(value) => setFormData(prev => ({ ...prev, [field]: value }))}
              keyboardType={fieldConfig.keyboardType}
              multiline={fieldConfig.multiline}
              style={fieldConfig.multiline ? { minHeight: 80 } : undefined}
            />
          );
        })}
      </View>
    );
  };

  const getFieldConfig = (field: string) => {
    const fieldConfigs: Record<string, any> = {
      phone_number: {
        label: 'Phone Number',
        placeholder: 'Enter your phone number',
        keyboardType: 'phone-pad',
      },
      email_address: {
        label: 'Email Address',
        placeholder: 'Enter your email address',
        keyboardType: 'email-address',
      },
      full_name: {
        label: 'Full Name',
        placeholder: 'Enter your full name as shown on ID',
      },
      date_of_birth: {
        label: 'Date of Birth',
        placeholder: 'DD/MM/YYYY',
      },
      id_number: {
        label: 'ID Number',
        placeholder: 'Enter your ID number',
      },
      id_type: {
        label: 'ID Type',
        placeholder: 'National ID, Passport, Driver\'s License',
      },
      business_name: {
        label: 'Business Name',
        placeholder: 'Enter your registered business name',
      },
      business_type: {
        label: 'Business Type',
        placeholder: 'e.g., Limited Company, Partnership, Sole Proprietorship',
      },
      registration_number: {
        label: 'Registration Number',
        placeholder: 'Enter business registration number',
      },
      tax_id: {
        label: 'Tax ID',
        placeholder: 'Enter tax identification number',
      },
      business_address: {
        label: 'Business Address',
        placeholder: 'Enter complete business address',
        multiline: true,
      },
      street_address: {
        label: 'Street Address',
        placeholder: 'Enter your street address',
        multiline: true,
      },
      city: {
        label: 'City',
        placeholder: 'Enter your city',
      },
      region: {
        label: 'Region/State',
        placeholder: 'Enter your region or state',
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: 'Enter postal code',
      },
    };

    return fieldConfigs[field] || {
      label: field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      placeholder: `Enter ${field.replace('_', ' ')}`,
    };
  };

  const renderFormStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          {getVerificationIcon(template?.verification_type || '')}
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          {template?.title}
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          {template?.description}
        </Text>
      </View>

      {/* Instructions */}
      {template?.instructions && template.instructions.length > 0 && (
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.xl,
          }}
        >
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Instructions
          </Text>
          {template.instructions.map((instruction, index) => (
            <View key={index} style={{
              flexDirection: 'row',
              marginBottom: theme.spacing.sm,
            }}>
              <Text variant="body" style={{ marginRight: theme.spacing.sm }}>
                {index + 1}.
              </Text>
              <Text variant="body" style={{ flex: 1 }}>
                {instruction}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Form Fields */}
      {renderFormFields()}

      <Button
        variant="primary"
        size="lg"
        onPress={handleFormSubmit}
        loading={createLoading}
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
      >
        Continue
      </Button>
    </View>
  );

  const renderDocumentsStep = () => (
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
          Upload Documents
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Please upload the required documents to complete your verification.
        </Text>
      </View>

      {template && verificationId && (
        <MultiDocumentUpload
          verificationId={verificationId}
          documentTypes={template.required_documents.map(docType => ({
            type: docType as any,
            title: formatDocumentType(docType),
            required: true,
            acceptedTypes: docType.includes('selfie') ? ['image'] : ['image', 'pdf'],
          }))}
          onUploadComplete={handleDocumentUploadComplete}
        />
      )}

      <Button
        variant="primary"
        size="lg"
        onPress={() => setVerificationStep('success')}
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
      >
        Complete Verification
      </Button>
    </View>
  );

  const renderCodeStep = () => (
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
          {template?.verification_type === 'phone' ? (
            <Phone size={40} color={theme.colors.primary} />
          ) : (
            <Mail size={40} color={theme.colors.primary} />
          )}
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Enter Verification Code
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          {template?.verification_type === 'phone' 
            ? `We've sent a code to ${formData.phone_number}`
            : `We've sent a verification link to ${formData.email_address}`}
        </Text>
      </View>

      <Input
        label={template?.verification_type === 'phone' ? 'SMS Code' : 'Verification Code/Token'}
        placeholder={template?.verification_type === 'phone' ? 'Enter 6-digit code' : 'Enter code or paste token'}
        value={verificationCode}
        onChangeText={setVerificationCode}
        keyboardType={template?.verification_type === 'phone' ? 'number-pad' : 'default'}
        style={{ marginBottom: theme.spacing.lg }}
      />

      <Button
        variant="primary"
        size="lg"
        onPress={handleCodeVerification}
        loading={phoneLoading || emailLoading}
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
      >
        Verify Code
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={() => {
          if (template?.verification_type === 'phone') {
            sendVerificationCode(formData.phone_number);
          } else {
            sendVerificationEmail(formData.email_address);
          }
        }}
        fullWidth
      >
        Resend Code
      </Button>
    </View>
  );

  const renderSuccessStep = () => (
    <View>
      <View style={{
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
      }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.success + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <CheckCircle size={60} color={theme.colors.success} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Verification Submitted!
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          {template?.verification_type === 'phone' || template?.verification_type === 'email'
            ? 'Your verification has been completed successfully!'
            : 'Your verification request has been submitted and is under review. We&apos;ll notify you once it&apos;s processed.'}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.success + '10',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h4" style={{ color: theme.colors.success, marginBottom: theme.spacing.md }}>
          What&apos;s Next?
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="body" style={{ color: theme.colors.success }}>
            • Your trust score has been updated
          </Text>
          <Text variant="body" style={{ color: theme.colors.success }}>
            • You&apos;ll receive notifications about status changes
          </Text>
          <Text variant="body" style={{ color: theme.colors.success }}>
            • New features may be unlocked based on verification level
          </Text>
        </View>
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={() => router.push('/verification')}
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
      >
        View All Verifications
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={() => router.back()}
        fullWidth
      >
        Back to Profile
      </Button>
    </View>
  );

  if (!template) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Verification"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text variant="body" color="secondary">
            Loading verification details...
          </Text>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={formatVerificationType(template.verification_type)}
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container style={{ flex: 1 }}>
          {verificationStep === 'form' && renderFormStep()}
          {verificationStep === 'documents' && renderDocumentsStep()}
          {verificationStep === 'code' && renderCodeStep()}
          {verificationStep === 'success' && renderSuccessStep()}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
