import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Alert, TouchableOpacity, Clipboard } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  LoadingSkeleton,
  HomeScreenSkeleton,
  Badge,
  AppModal,
} from '@/components';
import { 
  ArrowLeft, 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Phone, 
  Mail, 
  User, 
  Building,
  MapPin,
  FileText,
  Download,
  Eye,
  Calendar,
  Copy
} from 'lucide-react-native';
import { 
  useVerificationRequests, 
  VerificationRequest 
} from '@/hooks/useVerification';
import { 
  formatVerificationType, 
  formatVerificationStatus, 
  formatDocumentType, 
  getVerificationStatusColor, 
  getTrustScoreColor, 
  getTrustScoreLabel 
} from '@/lib/verificationService';

export default function VerificationRequestScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requests, refetch } = useVerificationRequests();
  
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);

  // Effect to find and set the request when requests array updates
  useEffect(() => {
    if (!id) return;
    
    const foundRequest = requests.find(r => r.id === id);
    
    if (foundRequest) {
      setRequest(foundRequest);
      setLoading(false);
      setError(null);
      setHasInitialized(true);
    } else if (requests.length > 0 && !foundRequest) {
      // Only show error if we have requests but couldn't find this one
      setError('Verification request not found');
      setLoading(false);
      setHasInitialized(true);
    }
  }, [requests, id]);

  const fetchRequest = async () => {
    if (!id || hasInitialized) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Only refetch if we don't have the data already
      await refetch();
    } catch (err) {
      console.error('Error fetching verification request:', err);
      setError(err instanceof Error ? err.message : 'Failed to load verification request');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setHasInitialized(false); // Reset initialization to allow refetch
    await fetchRequest();
    setRefreshing(false);
  };

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
      case 'rejected':
      case 'expired':
        return <AlertCircle size={size} color={color} />;
      default:
        return <Clock size={size} color={color} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProcessingTime = (createdAt: string, updatedAt: string) => {
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    const diffMs = updated.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  };

  const formatRequestId = (id: string) => {
    // Shorter format for mobile display
    return `${id.slice(0, 8).toUpperCase()}-${id.slice(-4).toUpperCase()}`;
  };

  const copyRequestId = async () => {
    if (!request) return;
    try {
      Clipboard.setString(request.id);
      Alert.alert('Copied', 'Request ID copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy ID');
    }
  };

  const formatFieldName = (key: string, verificationType: string) => {
    // ID verification specific field mappings
    if (verificationType === 'identity') {
      const fieldMappings: Record<string, string> = {
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'middle_name': 'Middle Name',
        'date_of_birth': 'Date of Birth',
        'gender': 'Gender',
        'nationality': 'Nationality',
        'id_number': 'ID Number',
        'id_type': 'ID Type',
        'id_issuer': 'ID Issuer',
        'id_issue_date': 'ID Issue Date',
        'id_expiry_date': 'ID Expiry Date',
        'address': 'Address',
        'city': 'City',
        'state': 'State/Region',
        'postal_code': 'Postal Code',
        'country': 'Country',
        'phone_number': 'Phone Number',
        'email': 'Email Address',
        'occupation': 'Occupation',
        'marital_status': 'Marital Status',
        'emergency_contact': 'Emergency Contact',
        'emergency_phone': 'Emergency Phone',
        'document_front': 'ID Document (Front)',
        'document_back': 'ID Document (Back)',
        'selfie': 'Selfie Photo',
        'proof_of_address': 'Proof of Address',
      };
      return fieldMappings[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Default transformation for other verification types
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldValue = (key: string, value: any, verificationType: string) => {
    // Handle special formatting for ID verification
    if (verificationType === 'identity') {
      // Format dates
      if (key.includes('date') && value) {
        try {
          const date = new Date(value);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch {
          return String(value);
        }
      }
      
      // Handle ID types
      if (key === 'id_type' && value) {
        const idTypeMappings: Record<string, string> = {
          'national_id': 'National ID',
          'passport': 'Passport',
          'drivers_license': 'Driver\'s License',
          'voters_id': 'Voter\'s ID',
          'ssn': 'Social Security Number',
          'birth_certificate': 'Birth Certificate',
          'work_permit': 'Work Permit',
          'student_id': 'Student ID',
          'military_id': 'Military ID',
        };
        return idTypeMappings[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      
      // Handle gender values
      if (key === 'gender' && value) {
        const genderMappings: Record<string, string> = {
          'male': 'Male',
          'female': 'Female',
          'other': 'Other',
          'prefer_not_to_say': 'Prefer not to say',
        };
        return genderMappings[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      
      // Handle marital status
      if (key === 'marital_status' && value) {
        const maritalMappings: Record<string, string> = {
          'single': 'Single',
          'married': 'Married',
          'divorced': 'Divorced',
          'widowed': 'Widowed',
          'separated': 'Separated',
        };
        return maritalMappings[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      
      // Handle file/document references
      if (key.includes('document') || key.includes('selfie') || key.includes('proof')) {
        return 'Document uploaded ✓';
      }
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined || value === '') {
        return 'Not provided';
      }
    }
    
    return String(value);
  };

  const handleResubmit = () => {
    if (!request) return;
    setShowResubmitModal(true);
  };

  const confirmResubmit = () => {
    if (!request) return;
    setShowResubmitModal(false);
    // Navigate to the appropriate verification type screen
    router.push(`/verification/${request.verification_type}`);
  };

  // Only fetch if we haven't initialized and no requests are available
  useEffect(() => {
    if (id && !hasInitialized && requests.length === 0) {
      fetchRequest();
    }
  }, [id, hasInitialized, requests.length]);

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Loading..."
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
          backgroundColor: theme.colors.background 
        }}>
          <HomeScreenSkeleton loadingText="Loading verification details..." />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (error || !request) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Request Not Found"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
          }}>
            <Shield size={64} color={theme.colors.text.muted} />
            <Text variant="h3" style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}>
              Request Not Found
            </Text>
            <Text variant="body" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
              {error || 'The verification request you\'re looking for doesn\'t exist or has been removed.'}
            </Text>
            <Button
              variant="primary"
              onPress={() => router.back()}
              style={{ marginTop: theme.spacing.lg }}
            >
              Go Back
            </Button>
          </View>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={formatVerificationType(request.verification_type)}
        showBackButton
        onBackPress={() => router.back()}
      />
      
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Container>
          {/* Request Header */}
          <View style={{
            marginBottom: theme.spacing.xl,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
          }}>
            {/* Status Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              {getStatusIcon(request.status)}
              <Badge
                text={formatVerificationStatus(request.status)}
                variant="secondary"
                style={{
                  marginLeft: theme.spacing.sm,
                  backgroundColor: getVerificationStatusColor(request.status) + '20',
                }}
              />
            </View>

            {/* Title */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              {getVerificationIcon(request.verification_type)}
              <Text variant="h2" style={{ marginLeft: theme.spacing.sm }}>
                {formatVerificationType(request.verification_type)}
              </Text>
            </View>

            {/* Comprehensive Meta Information */}
            <View style={{
              gap: theme.spacing.sm,
            }}>
              {/* Submission Date */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.sm,
              }}>
                <Calendar size={16} color={theme.colors.primary} />
                <Text variant="bodySmall" style={{ marginLeft: theme.spacing.sm, fontWeight: '500' }}>
                  Submitted:
                </Text>
                <Text variant="bodySmall" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                  {formatDate(request.created_at)}
                </Text>
              </View>
              
              {/* Last Updated */}
              {request.updated_at !== request.created_at && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: theme.colors.background,
                  borderRadius: theme.borderRadius.sm,
                }}>
                  <Clock size={16} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={{ marginLeft: theme.spacing.sm, fontWeight: '500' }}>
                    Last Updated:
                  </Text>
                  <Text variant="bodySmall" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                    {formatDate(request.updated_at)}
                  </Text>
                </View>
              )}

              {/* Processing Time */}
              {request.status === 'approved' && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: theme.colors.background,
                  borderRadius: theme.borderRadius.sm,
                }}>
                  <CheckCircle size={16} color={theme.colors.success} />
                  <Text variant="bodySmall" style={{ marginLeft: theme.spacing.sm, fontWeight: '500' }}>
                    Processing Time:
                  </Text>
                  <Text variant="bodySmall" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                    {getProcessingTime(request.created_at, request.updated_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Submitted Data */}
          {request.submitted_data && Object.keys(request.submitted_data).length > 0 && (
            <View style={{
              marginBottom: theme.spacing.xl,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: theme.spacing.md,
              }}>
                <FileText size={20} color={theme.colors.primary} />
                <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                  Submitted Information
                </Text>
              </View>
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}>
                {Object.entries(request.submitted_data).map(([key, value], index) => (
                  <View key={key} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingVertical: theme.spacing.md,
                    borderBottomWidth: index < Object.keys(request.submitted_data).length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                        {formatFieldName(key, request.verification_type)}
                      </Text>
                      <Text variant="body" color="muted" style={{ 
                        flex: 1,
                        textAlign: 'right',
                        maxWidth: '60%',
                        lineHeight: 20,
                      }}>
                        {formatFieldValue(key, value, request.verification_type)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Documents */}
          {request.documents && request.documents.length > 0 && (
            <View style={{
              marginBottom: theme.spacing.xl,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing.md,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <FileText size={20} color={theme.colors.primary} />
                  <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                    Documents ({request.documents.length})
                  </Text>
                </View>
                
                {/* Document Summary */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}>
                  {request.documents.filter(doc => doc.status === 'approved').length > 0 && (
                    <Badge text={`${request.documents.filter(doc => doc.status === 'approved').length} Approved`} variant="success" />
                  )}
                  {request.documents.filter(doc => doc.status === 'rejected').length > 0 && (
                    <Badge text={`${request.documents.filter(doc => doc.status === 'rejected').length} Rejected`} variant="error" />
                  )}
                  {request.documents.filter(doc => doc.status === 'pending').length > 0 && (
                    <Badge text={`${request.documents.filter(doc => doc.status === 'pending').length} Pending`} variant="secondary" />
                  )}
                </View>
              </View>
              
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}>
                {request.documents.map((doc, index) => (
                  <View key={index} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: theme.spacing.md,
                    borderBottomWidth: index < request.documents.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                    }}>
                      <FileText size={20} color={theme.colors.primary} />
                      <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
                        <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                          {formatDocumentType(doc.document_type)}
                        </Text>
                        <Text variant="bodySmall" color="muted" numberOfLines={1}>
                          {doc.file_name}
                        </Text>
                        {doc.file_size && (
                          <Text variant="caption" color="muted">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}>
                      <Badge
                        text={formatVerificationStatus(doc.status)}
                        variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'error' : 'secondary'}
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          // Handle document view/download
                          Alert.alert('Document', 'Document viewing functionality would be implemented here');
                        }}
                        style={{ padding: theme.spacing.sm }}
                      >
                        <Eye size={16} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          // Handle document download
                          Alert.alert('Download', 'Document download functionality would be implemented here');
                        }}
                        style={{ padding: theme.spacing.sm }}
                      >
                        <Download size={16} />
                      </Button>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Status Timeline */}
          <View style={{
            marginBottom: theme.spacing.xl,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <Clock size={20} color={theme.colors.primary} />
              <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                Status Timeline
              </Text>
            </View>
            
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadows.sm,
            }}>
              {/* Submitted */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: theme.spacing.md,
              }}>
                <View style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: theme.colors.primary,
                  marginRight: theme.spacing.md,
                }} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    Request Submitted
                  </Text>
                  <Text variant="bodySmall" color="muted">
                    {formatDate(request.created_at)}
                  </Text>
                </View>
              </View>
              
              {/* Status Updates */}
              {request.updated_at !== request.created_at && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: theme.spacing.md,
                }}>
                  <View style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: getVerificationStatusColor(request.status),
                    marginRight: theme.spacing.md,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {formatVerificationStatus(request.status)}
                    </Text>
                    <Text variant="bodySmall" color="muted">
                      {formatDate(request.updated_at)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Rejection Reason */}
          {request.status === 'rejected' && request.rejection_reason && (
            <View style={{
              marginBottom: theme.spacing.xl,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: theme.spacing.md,
              }}>
                <Shield size={20} color={theme.colors.text.primary} />
                <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                  Verification Feedback
                </Text>
              </View>
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.warning,
                ...theme.shadows.sm,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: theme.spacing.sm,
                }}>
                  <AlertCircle size={16} color={theme.colors.warning} style={{ marginTop: 2, marginRight: theme.spacing.sm }} />
                  <Text variant="bodySmall" color="muted" style={{ flex: 1 }}>
                    The following issues were identified during the verification process:
                  </Text>
                </View>
                <Text variant="body" style={{ 
                  lineHeight: 22,
                  color: theme.colors.text.primary,
                }}>
                  {request.rejection_reason}
                </Text>
              </View>
            </View>
          )}

          {/* Reviewer Notes */}
          {request.reviewer_notes && (
            <View style={{
              marginBottom: theme.spacing.xl,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: theme.spacing.md,
              }}>
                <User size={20} color={theme.colors.primary} />
                <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                  Reviewer Notes
                </Text>
              </View>
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.primary,
                ...theme.shadows.sm,
              }}>
                <Text variant="body">
                  {request.reviewer_notes}
                </Text>
              </View>
            </View>
          )}

          {/* Additional Information */}
          <View style={{
            marginBottom: theme.spacing.xl,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <Shield size={20} color={theme.colors.primary} />
              <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
                Additional Information
              </Text>
            </View>
            
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadows.sm,
            }}>
              <View style={{
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                  Request ID
                </Text>
                <TouchableOpacity onPress={copyRequestId} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  backgroundColor: theme.colors.background,
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Text variant="body" color="muted" style={{ 
                    fontFamily: 'monospace', 
                    flex: 1,
                    fontSize: 12,
                  }}>
                    {formatRequestId(request.id)}
                  </Text>
                  <Copy size={14} color={theme.colors.text.muted} />
                </TouchableOpacity>
              </View>
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  Verification Type
                </Text>
                <Text variant="body" color="muted">
                  {formatVerificationType(request.verification_type)}
                </Text>
              </View>
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  Current Status
                </Text>
                <Badge
                  text={formatVerificationStatus(request.status)}
                  variant={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'error' : 'secondary'}
                />
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xl,
          }}>
            {request.status === 'rejected' && (
              <Button
                variant="primary"
                onPress={handleResubmit}
                style={{ flex: 1 }}
              >
                Resubmit
              </Button>
            )}
            
            <Button
              variant="secondary"
              onPress={() => router.push('/verification')}
              leftIcon={<ArrowLeft size={16} />}
              style={{ flex: 1 }}
            >
              Back to Verification
            </Button>
          </View>
        </Container>
      </ScrollView>

      {/* Resubmit Verification Modal */}
      <AppModal
        visible={showResubmitModal}
        onClose={() => setShowResubmitModal(false)}
        title="Resubmit Verification"
        primaryAction={{
          text: 'Resubmit',
          onPress: confirmResubmit,
          variant: 'primary',
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowResubmitModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.md, paddingHorizontal: theme.spacing.md }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
          }}>
            <Shield size={24} color={theme.colors.primary} />
            <Text variant="h4" style={{ marginLeft: theme.spacing.sm }}>
              {formatVerificationType(request?.verification_type || '')}
            </Text>
          </View>
          
          <Text variant="body" color="muted" style={{ lineHeight: 22 }}>
            Are you sure you want to resubmit this verification request? This will create a new verification request and you'll need to provide all the required information again.
          </Text>
          
          {request?.status === 'rejected' && (
            <View style={{
              backgroundColor: theme.colors.warning + '10',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.sm,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.warning,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: theme.spacing.xs,
              }}>
                <AlertCircle size={16} color={theme.colors.warning} style={{ marginTop: 2, marginRight: theme.spacing.sm }} />
                <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.warning }}>
                  Previous Issues
                </Text>
              </View>
              <Text variant="bodySmall" color="muted" style={{ marginLeft: 24 }}>
                Please review the feedback from your previous submission to ensure you address any issues before resubmitting.
              </Text>
            </View>
          )}
        </View>
      </AppModal>
    </SafeAreaWrapper>
  );
}
