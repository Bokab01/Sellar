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
  DocumentUpload,
  StepIndicator,
  CalendarDatePicker,
} from '@/components';
import { User, Camera, FileText, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { 
  useCreateVerificationRequest,
  useVerificationDocuments,
  useVerificationRequests,
} from '@/hooks/useVerification';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function IdentityVerificationScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { createRequest, loading: createLoading } = useCreateVerificationRequest();
  const { uploadDocument, loading: uploadLoading } = useVerificationDocuments();
  const { requests, loading: requestsLoading, refetch: refetchRequests } = useVerificationRequests();
  const { id: existingRequestId } = useLocalSearchParams<{ id?: string }>();

  const [currentStep, setCurrentStep] = useState(0);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: null as Date | null,
    id_number: '',
    id_type: 'national_id',
  });
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  // Get current verification request and its documents
  const currentRequest = verificationId ? requests.find(r => r.id === verificationId) : null;
  const existingDocuments = currentRequest?.documents || [];

  // Handle continuing an existing request
  useEffect(() => {
    if (existingRequestId && requests.length > 0) {
      const existingRequest = requests.find(r => r.id === existingRequestId);
      if (existingRequest) {
        setVerificationId(existingRequestId);
        
        // Populate form data from existing request
        if (existingRequest.submitted_data) {
          setFormData({
            full_name: existingRequest.submitted_data.full_name || '',
            date_of_birth: existingRequest.submitted_data.date_of_birth ? new Date(existingRequest.submitted_data.date_of_birth) : null,
            id_number: existingRequest.submitted_data.id_number || '',
            id_type: existingRequest.submitted_data.id_type || 'national_id',
          });
        }
        
        // Determine current step based on uploaded documents
        const documents = existingRequest.documents || [];
        const hasIdDocument = documents.some(doc => 
          doc.document_type === 'national_id' || 
          doc.document_type === 'passport' || 
          doc.document_type === 'drivers_license' || 
          doc.document_type === 'voters_id'
        );
        const hasSelfie = documents.some(doc => doc.document_type === 'selfie_with_id');
        
        if (hasIdDocument && hasSelfie) {
          setCurrentStep(3); // Review step
        } else if (hasIdDocument) {
          setCurrentStep(2); // Selfie step
        } else {
          setCurrentStep(1); // ID document step
        }
      }
    }
  }, [existingRequestId, requests]);

  const steps = [
    { title: 'Personal Information', description: 'Enter your details' },
    { title: 'ID Document', description: 'Upload your ID' },
    { title: 'Selfie Verification', description: 'Take a selfie with ID' },
    { title: 'Review & Submit', description: 'Confirm your information' },
  ];

  const idTypes = [
    { value: 'national_id', label: 'National ID Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'voters_id', label: 'Voter ID Card' },
  ];

  const handlePersonalInfoSubmit = async () => {
    // Validate required fields
    if (!formData.full_name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!formData.date_of_birth) {
      Alert.alert('Error', 'Please select your date of birth');
      return;
    }
    if (!formData.id_number.trim()) {
      Alert.alert('Error', 'Please enter your ID number');
      return;
    }

    try {
      const request = await createRequest({
        verification_type: 'identity',
        submitted_data: {
          ...formData,
          date_of_birth: formData.date_of_birth?.toISOString().split('T')[0], // Format as YYYY-MM-DD
        },
      });

      setVerificationId(request.id);
      setCurrentStep(1);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create verification request');
    }
  };

  const handleDocumentUpload = async (documentType: string) => {
    setUploadedDocuments(prev => [...prev, documentType]);
    
    // Refresh verification requests to get updated documents
    await refetchRequests();
    
    // Auto-advance when both documents are uploaded
    if (documentType === 'national_id' && uploadedDocuments.includes('selfie_with_id')) {
      setCurrentStep(3);
    } else if (documentType === 'selfie_with_id' && uploadedDocuments.includes('national_id')) {
      setCurrentStep(3);
    } else if (documentType === 'national_id') {
      setCurrentStep(2);
    }
  };

  const handleFinalSubmit = async () => {
    if (!verificationId) {
      Alert.alert('Error', 'No verification request found');
      return;
    }

    try {
      // Update the verification request status to indicate it's been submitted
      const { error } = await supabase
        .from('user_verification')
        .update({ 
          status: 'in_review',
          submitted_at: new Date().toISOString()
        })
        .eq('id', verificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Refresh the requests to get the updated status
      await refetchRequests();

      Alert.alert(
        'Verification Submitted',
        'Your identity verification has been submitted for review. We\'ll notify you within 24-48 hours.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/verification'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit verification request');
      console.error('Error submitting verification:', error);
    }
  };

  const renderPersonalInfoStep = () => (
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
          <User size={40} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Personal Information
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Enter your details exactly as they appear on your ID document.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <Input
          label="Full Name"
          placeholder="Enter your full name as shown on ID"
          value={formData.full_name}
          onChangeText={(value) => setFormData(prev => ({ ...prev, full_name: value }))}
        />

        <CalendarDatePicker
          label="Date of Birth"
          placeholder="Select your date of birth"
          value={formData.date_of_birth}
          onChange={(date) => setFormData(prev => ({ ...prev, date_of_birth: date }))}
          maximumDate={new Date()}
          helper="You must be at least 18 years old to verify your identity"
        />

        <View>
          <Text variant="bodySmall" style={{ 
            marginBottom: theme.spacing.sm,
            fontWeight: '500',
            color: theme.colors.text.primary,
          }}>
            ID Type
          </Text>
          <View style={{ gap: theme.spacing.sm }}>
            {idTypes.map((type) => (
              <Button
                key={type.value}
                variant={formData.id_type === type.value ? 'primary' : 'tertiary'}
                size="md"
                onPress={() => setFormData(prev => ({ ...prev, id_type: type.value }))}
                style={{ justifyContent: 'flex-start' }}
              >
                {type.label}
              </Button>
            ))}
          </View>
        </View>

        <Input
          label="ID Number"
          placeholder="Enter your ID number"
          value={formData.id_number}
          onChangeText={(value) => setFormData(prev => ({ ...prev, id_number: value }))}
        />
      </View>

      <Button
        variant="primary"
        size="lg"
        onPress={handlePersonalInfoSubmit}
        loading={createLoading}
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
      >
        Continue
      </Button>
    </View>
  );

  const renderIdDocumentStep = () => (
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
          Upload ID Document
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Take a clear photo of your {idTypes.find(t => t.value === formData.id_type)?.label.toLowerCase()}.
        </Text>
      </View>

      {/* Document Upload Tips */}
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
            Photo Guidelines
          </Text>
        </View>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodySmall" color="secondary">
            • Ensure all text is clearly visible and readable
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Take photo in good lighting conditions
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Avoid glare, shadows, or blurry images
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Include all four corners of the document
          </Text>
        </View>
      </View>

      {verificationId && (
        <DocumentUpload
          verificationId={verificationId}
          documentType={formData.id_type as any}
          title={`${idTypes.find(t => t.value === formData.id_type)?.label} Photo`}
          description="Upload a clear photo of your ID document"
          required
          acceptedTypes={['image']}
          existingDocuments={existingDocuments}
          onUploadComplete={() => handleDocumentUpload('national_id')}
        />
      )}
    </View>
  );

  const renderSelfieStep = () => (
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
          <Camera size={40} color={theme.colors.primary} />
        </View>

        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Selfie Verification
        </Text>

        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Take a selfie while holding your ID document next to your face.
        </Text>
      </View>

      {/* Selfie Guidelines */}
      <View
        style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h4" style={{ marginBottom: theme.spacing.md, color: theme.colors.primary }}>
          Selfie Guidelines
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodySmall" color="secondary">
            • Hold your ID document next to your face
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Ensure your face and ID are clearly visible
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Look directly at the camera
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Remove sunglasses or face coverings
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Use good lighting, avoid shadows
          </Text>
        </View>
      </View>

      {verificationId && (
        <DocumentUpload
          verificationId={verificationId}
          documentType="selfie_with_id"
          title="Selfie with ID"
          description="Take a selfie while holding your ID document"
          required
          acceptedTypes={['image']}
          existingDocuments={existingDocuments}
          onUploadComplete={() => handleDocumentUpload('selfie_with_id')}
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
          Please review your information before submitting for verification.
        </Text>
      </View>

      {/* Review Information */}
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
          Personal Information
        </Text>

        <View style={{ gap: theme.spacing.md }}>
          <View>
            <Text variant="bodySmall" color="muted">Full Name</Text>
            <Text variant="body">{formData.full_name}</Text>
          </View>

          <View>
            <Text variant="bodySmall" color="muted">Date of Birth</Text>
            <Text variant="body">
              {formData.date_of_birth ? formData.date_of_birth.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }) : 'Not selected'}
            </Text>
          </View>

          <View>
            <Text variant="bodySmall" color="muted">ID Type</Text>
            <Text variant="body">{idTypes.find(t => t.value === formData.id_type)?.label}</Text>
          </View>

          <View>
            <Text variant="bodySmall" color="muted">ID Number</Text>
            <Text variant="body">{formData.id_number}</Text>
          </View>
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
              ID Document Photo
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CheckCircle size={16} color={theme.colors.success} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
              Selfie with ID
            </Text>
          </View>
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
          What Happens Next?
        </Text>
        
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodySmall" color="secondary">
            • Our team will review your documents within 24-48 hours
          </Text>
          <Text variant="bodySmall" color="secondary">
            • You&apos;ll receive a notification when verification is complete
          </Text>
          <Text variant="bodySmall" color="secondary">
            • Your trust score will be updated upon approval
          </Text>
          <Text variant="bodySmall" color="secondary">
            • New features will be unlocked based on verification level
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
        Submit for Verification
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
        title="Identity Verification"
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
          {currentStep === 0 && renderPersonalInfoStep()}
          {currentStep === 1 && renderIdDocumentStep()}
          {currentStep === 2 && renderSelfieStep()}
          {currentStep === 3 && renderReviewStep()}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
