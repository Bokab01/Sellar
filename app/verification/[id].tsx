import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  LoadingSkeleton,
  Badge,
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
  Calendar
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

  const fetchRequest = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the request in the existing requests
      const foundRequest = requests.find(r => r.id === id);
      
      if (foundRequest) {
        setRequest(foundRequest);
      } else {
        // If not found in current requests, refetch and try again
        await refetch();
        const updatedRequests = await refetch();
        const foundAfterRefetch = requests.find(r => r.id === id);
        
        if (foundAfterRefetch) {
          setRequest(foundAfterRefetch);
        } else {
          throw new Error('Verification request not found');
        }
      }
    } catch (err) {
      console.error('Error fetching verification request:', err);
      setError(err instanceof Error ? err.message : 'Failed to load verification request');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
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

  const handleResubmit = () => {
    if (!request) return;
    
    Alert.alert(
      'Resubmit Verification',
      'Are you sure you want to resubmit this verification request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resubmit', 
          onPress: () => {
            // Navigate to the appropriate verification type screen
            router.push(`/verification/${request.verification_type}`);
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchRequest();
  }, [id, requests]);

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Loading..."
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <LoadingSkeleton height={200} />
          <View style={{ marginTop: theme.spacing.lg }}>
            <LoadingSkeleton height={100} />
          </View>
          <View style={{ marginTop: theme.spacing.lg }}>
            <LoadingSkeleton height={300} />
          </View>
        </Container>
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
              marginBottom: theme.spacing.md,
            }}>
              {getVerificationIcon(request.verification_type)}
              <Text variant="h2" style={{ marginLeft: theme.spacing.sm }}>
                {formatVerificationType(request.verification_type)}
              </Text>
            </View>

            {/* Meta Information */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: theme.spacing.lg,
              }}>
                <Calendar size={16} color={theme.colors.text.muted} />
                <Text variant="bodySmall" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                  Submitted {formatDate(request.created_at)}
                </Text>
              </View>
              
              {request.updated_at !== request.created_at && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Clock size={16} color={theme.colors.text.muted} />
                  <Text variant="bodySmall" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                    Updated {formatDate(request.updated_at)}
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
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Submitted Information
              </Text>
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                {Object.entries(request.submitted_data).map(([key, value]) => (
                  <View key={key} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: theme.spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}>
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    <Text variant="body" color="muted">
                      {String(value)}
                    </Text>
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
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Documents
              </Text>
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                {request.documents.map((doc, index) => (
                  <View key={index} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: theme.spacing.sm,
                    borderBottomWidth: index < request.documents.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <FileText size={20} color={theme.colors.primary} />
                      <View style={{ marginLeft: theme.spacing.sm }}>
                        <Text variant="body" style={{ fontWeight: '500' }}>
                          {formatDocumentType(doc.document_type)}
                        </Text>
                        <Text variant="bodySmall" color="muted">
                          {doc.file_name}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <Badge
                        text={formatVerificationStatus(doc.status)}
                        variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'error' : 'secondary'}
                        style={{ marginRight: theme.spacing.sm }}
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          // Handle document view/download
                          Alert.alert('Document', 'Document viewing functionality would be implemented here');
                        }}
                      >
                        <Eye size={16} />
                      </Button>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviewer Notes */}
          {request.reviewer_notes && (
            <View style={{
              marginBottom: theme.spacing.xl,
            }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Reviewer Notes
              </Text>
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderLeftWidth: 4,
                borderLeftColor: theme.colors.primary,
              }}>
                <Text variant="body">
                  {request.reviewer_notes}
                </Text>
              </View>
            </View>
          )}

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
    </SafeAreaWrapper>
  );
}
