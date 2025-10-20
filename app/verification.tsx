import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  EmptyState,
  LoadingSkeleton,
  HomeScreenSkeleton,
  Badge,
} from '@/components';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  Phone, 
  Mail, 
  User, 
  Building,
  MapPin,
  Plus,
  Award
} from 'lucide-react-native';
import { 
  useVerificationRequests, 
  useUserVerificationStatus,
  useVerificationTemplates,
  VerificationRequest 
} from '@/hooks/useVerification';
import { formatVerificationType, formatVerificationStatus, formatDocumentType, getVerificationStatusColor, getTrustScoreColor, getTrustScoreLabel } from '@/lib/verificationService';

export default function VerificationScreen() {
  const { theme } = useTheme();
  const { requests, loading: requestsLoading, error, refetch, deleteRequest } = useVerificationRequests();
  const { status, loading: statusLoading, refetch: refetchStatus } = useUserVerificationStatus();
  const { templates } = useVerificationTemplates();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchStatus()]);
    setRefreshing(false);
  };

  // Note: Removed useFocusEffect to prevent infinite loops
  // Manual refresh is available via pull-to-refresh

  const getVerificationIcon = (type: string, size: number = 24) => {
    const iconProps = { size, color: theme.colors.primary };
    
    switch (type) {
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
        return <Shield {...iconProps} />;
    }
  };

  const getStatusIcon = (status: string, size: number = 20) => {
    const color = getVerificationStatusColor(status);
    
    switch (status) {
      case 'approved':
        return <CheckCircle size={size} color={color} />;
      case 'pending':
      case 'in_review':
        return <Clock size={size} color={color} />;
      case 'incomplete':
        return <AlertTriangle size={size} color={color} />;
      case 'rejected':
      case 'expired':
        return <AlertCircle size={size} color={color} />;
      default:
        return <Clock size={size} color={color} />;
    }
  };

  const handleStartVerification = (type: string) => {
    // Route to specific verification screens for better UX
    switch (type) {
      case 'phone':
        router.push('/verification/phone');
        break;
      case 'email':
        router.push('/verification/email');
        break;
      case 'identity':
        router.push('/verification/identity');
        break;
      case 'business':
        router.push('/verification/business');
        break;
      case 'address':
        router.push('/verification/address');
        break;
      default:
        router.push(`/verification/start?type=${type}`);
    }
  };

  const handleViewRequest = (request: VerificationRequest) => {
    router.push(`/verification/${request.id}` as any);
  };

  const handleContinueRequest = (request: VerificationRequest) => {
    // Route to the appropriate verification screen to continue
    switch (request.verification_type) {
      case 'identity':
        router.push(`/verification/identity?id=${request.id}` as any);
        break;
      case 'phone':
        router.push(`/verification/phone?id=${request.id}` as any);
        break;
      case 'email':
        router.push(`/verification/email?id=${request.id}` as any);
        break;
      case 'business':
        router.push(`/verification/business?id=${request.id}` as any);
        break;
      case 'address':
        router.push(`/verification/address?id=${request.id}` as any);
        break;
      default:
        router.push(`/verification/${request.id}` as any);
    }
  };

  const handleDeleteRequest = async (request: VerificationRequest) => {
    Alert.alert(
      'Delete Verification Request',
      'Are you sure you want to delete this incomplete verification request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRequest(request.id);
              Alert.alert('Success', 'Verification request deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete verification request');
            }
          }
        }
      ]
    );
  };

  // Helper function to determine if a request is actually submitted
  const isRequestSubmitted = (request: VerificationRequest): boolean => {
    if (request.status === 'approved' || request.status === 'rejected' || request.status === 'in_review') {
      return true;
    }
    
    if (request.status === 'pending') {
      // For identity verification, check if the user has actually submitted
      // We need to check if the request has been moved to 'in_review' status
      // But since we're in the 'pending' block, we need to check other indicators
      if (request.verification_type === 'identity') {
        // For identity verification, we need to check if the user has actually submitted
        // The key indicator is whether the status has been changed from 'pending' to 'in_review'
        // But since we're checking 'pending' requests, we need to look at other indicators
        
        // Check if both documents are uploaded AND the request has been explicitly submitted
        const documents = request.documents || [];
        const hasIdDocument = documents.some(doc => 
          doc.document_type === 'national_id' || 
          doc.document_type === 'passport' || 
          doc.document_type === 'drivers_license' || 
          doc.document_type === 'voters_id'
        );
        const hasSelfie = documents.some(doc => doc.document_type === 'selfie_with_id');
        
        // For now, let's be more conservative - only consider it submitted if it's actually 'in_review'
        // This means we should never consider 'pending' identity verifications as submitted
        const isActuallySubmitted = false; // Pending identity verifications are never "submitted"
        
        // Debug logging
        
        return isActuallySubmitted;
      }
      
      // For other verification types, consider them submitted if they have submitted_data
      const hasSubmittedData = request.submitted_data && Object.keys(request.submitted_data).length > 0;
      
      // Debug logging for other types
      
      return hasSubmittedData;
    }
    
    return false;
  };

  // Helper function to get the display status for a request
  const getRequestDisplayStatus = (request: VerificationRequest): string => {
    if (request.status === 'approved') return 'approved';
    if (request.status === 'rejected') return 'rejected';
    if (request.status === 'in_review') return 'in_review';
    if (request.status === 'expired') return 'expired';
    if (request.status === 'cancelled') return 'cancelled';
    
    // For pending status, check if it's actually submitted
    if (request.status === 'pending') {
      const isSubmitted = isRequestSubmitted(request);
      const displayStatus = isSubmitted ? 'pending' : 'incomplete';
      
      // Debug logging
      
      return displayStatus;
    }
    
    return request.status;
  };

  const getAvailableVerifications = () => {
    const completedTypes = requests
      .filter(r => r.status === 'approved')
      .map(r => r.verification_type);
    
    // Only consider requests as "pending" if they have been properly submitted
    const pendingTypes = requests
      .filter(r => {
        const displayStatus = getRequestDisplayStatus(r);
        return displayStatus === 'pending' || displayStatus === 'in_review';
      })
      .map(r => r.verification_type);
    
    // Also exclude incomplete requests to prevent multiple incomplete requests
    const incompleteTypes = requests
      .filter(r => getRequestDisplayStatus(r) === 'incomplete')
      .map(r => r.verification_type);
    
    // Also check if email is verified through auth (signup process)
    if (status?.email_verified) {
      completedTypes.push('email');
    }
    
    // Filter out completed, pending, and incomplete verifications
    const unavailableTypes = [...completedTypes, ...pendingTypes, ...incompleteTypes];
    
    return templates.filter(t => !unavailableTypes.includes(t.verification_type as any));
  };

  if (requestsLoading && statusLoading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Verification"
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
          <HomeScreenSkeleton loadingText="Loading verification status..." />
          </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Verification"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Container>
          {/* Trust Score Section */}
          {status && (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
                ...theme.shadows.sm,
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing.md,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Award size={24} color={getTrustScoreColor(status.trust_score || 0)} />
                  <Text variant="h3" style={{ marginLeft: theme.spacing.sm }}>
                    Trust Score
                  </Text>
                </View>
                <Badge 
                  text={getTrustScoreLabel(status.trust_score || 0)} 
                  variant={(status.trust_score || 0) >= 70 ? 'success' : (status.trust_score || 0) >= 50 ? 'warning' : 'error'}
                />
              </View>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: theme.spacing.sm,
              }}>
                <Text variant="h1" style={{ 
                  color: getTrustScoreColor(status.trust_score || 0),
                  marginRight: theme.spacing.sm,
                }}>
                  {status.trust_score || 0}
                </Text>
                <Text variant="body" color="secondary">
                  / 100
                </Text>
              </View>

              <Text variant="bodySmall" color="secondary">
                Your trust score is based on completed verifications and account activity.
              </Text>

              {/* Verification Badges */}
              {status.verification_badges && status.verification_badges.length > 0 && (
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: theme.spacing.sm,
                  marginTop: theme.spacing.md,
                }}>
                  {status.verification_badges?.map((badge) => (
                    <Badge
                      key={badge}
                      text={badge.replace('_', ' ').toUpperCase()}
                      variant="success"
                      size="small"
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Current Verifications */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>
              Your Verifications
            </Text>

            {(requests.length > 0 || status?.email_verified) ? (
              <View style={{ gap: theme.spacing.md }}>
                {/* Show email verification from signup if not in requests */}
                {status?.email_verified && !requests.some(r => r.verification_type === 'email') && (
                  <View
                    key="email-signup"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.lg,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      ...theme.shadows.sm,
                    }}
                  >
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: theme.spacing.md,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {getVerificationIcon('email')}
                        <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                          {formatVerificationType('email')}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {getStatusIcon('approved')}
                        <Text 
                          variant="bodySmall" 
                          style={{ 
                            marginLeft: theme.spacing.xs,
                            color: getVerificationStatusColor('approved'),
                            fontWeight: '600',
                          }}
                        >
                          {formatVerificationStatus('approved')}
                        </Text>
                      </View>
                    </View>

                    <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                      Verified during account signup {status.email_verified_at ? new Date(status.email_verified_at).toLocaleDateString() : ''}
                    </Text>

                    <View
                      style={{
                        backgroundColor: theme.colors.success + '10',
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                      }}
                    >
                      <Text variant="bodySmall" style={{ color: theme.colors.success }}>
                        ✓ Email verified through account confirmation
                      </Text>
                    </View>
                  </View>
                )}

                {requests.map((request) => (
                  <View
                    key={request.id}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.lg,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      ...theme.shadows.sm,
                    }}
                  >
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: theme.spacing.md,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {getVerificationIcon(request.verification_type)}
                        <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                          {formatVerificationType(request.verification_type)}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {getStatusIcon(getRequestDisplayStatus(request))}
                        <Text 
                          variant="bodySmall" 
                          style={{ 
                            marginLeft: theme.spacing.xs,
                            color: getVerificationStatusColor(getRequestDisplayStatus(request)),
                            fontWeight: '600',
                          }}
                        >
                          {formatVerificationStatus(getRequestDisplayStatus(request))}
                        </Text>
                      </View>
                    </View>

                    <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                      {getRequestDisplayStatus(request) === 'incomplete' 
                        ? `Started ${new Date(request.created_at).toLocaleDateString()}`
                        : `Submitted ${new Date(request.submitted_at).toLocaleDateString()}`
                      }
                    </Text>

                    {request.status === 'rejected' && request.rejection_reason && (
                      <View
                        style={{
                          backgroundColor: theme.colors.error + '10',
                          borderRadius: theme.borderRadius.md,
                          padding: theme.spacing.md,
                          marginBottom: theme.spacing.md,
                        }}
                      >
                        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                          Rejection Reason: {request.rejection_reason}
                        </Text>
                      </View>
                    )}

                    {/* Action buttons for incomplete requests */}
                    {getRequestDisplayStatus(request) === 'incomplete' && (
                      <View style={{ 
                        flexDirection: 'row', 
                        gap: theme.spacing.sm, 
                        marginBottom: theme.spacing.md 
                      }}>
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => handleContinueRequest(request)}
                          style={{ flex: 1 }}
                        >
                          Continue
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => handleDeleteRequest(request)}
                          style={{ flex: 1 }}
                        >
                          Delete
                        </Button>
                      </View>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => handleViewRequest(request)}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      View Details
                    </Button>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon={<Shield size={48} color={theme.colors.text.muted} />}
                title="No Verifications Yet"
                description="Start verifying your account to build trust and unlock features."
              />
            )}
          </View>

          {/* Available Verifications */}
          <View>
            <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>
              Available Verifications
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              {getAvailableVerifications().map((template) => (
                <View
                  key={template.id}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    ...theme.shadows.sm,
                  }}
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.md,
                  }}>
                    <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: theme.spacing.sm,
                      }}>
                        {getVerificationIcon(template.verification_type)}
                        <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                          {template.title}
                        </Text>
                      </View>

                      <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md }}>
                        {template.description}
                      </Text>

                      <Text variant="bodySmall" color="muted">
                        Required documents: {template.required_documents.length > 0 
                          ? template.required_documents.map(doc => formatDocumentType(doc)).join(', ')
                          : 'None'}
                      </Text>
                    </View>

                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() => handleStartVerification(template.verification_type)}
                      icon={<Plus size={16} color={theme.colors.surface} />}
                    >
                      Start
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Error State */}
          {error && (
            <View
              style={{
                backgroundColor: theme.colors.error + '10',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
                marginTop: theme.spacing.lg,
              }}
            >
              <Text variant="body" style={{ color: theme.colors.error, textAlign: 'center' }}>
                {error}
              </Text>
            </View>
          )}

          {/* Help Section */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginTop: theme.spacing.xl,
            }}
          >
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Why Verify Your Account?
            </Text>
            
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="body" color="secondary">
                • Build trust with other users
              </Text>
              <Text variant="body" color="secondary">
                • Access premium features
              </Text>
              <Text variant="body" color="secondary">
                • Increase your visibility in search
              </Text>
              <Text variant="body" color="secondary">
                • Get priority customer support
              </Text>
              <Text variant="body" color="secondary">
                • Unlock higher transaction limits
              </Text>
            </View>

            <Button
              variant="ghost"
              size="md"
              onPress={() => router.push('/help')}
              style={{
                marginTop: theme.spacing.md,
                alignSelf: 'flex-start',
              }}
            >
              Learn More
            </Button>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
