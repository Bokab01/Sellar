import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Badge } from '@/components';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  FileText,
  Eye,
  UserCheck,
  Calendar,
  MessageSquare
} from 'lucide-react-native';
import { VerificationRequest, VerificationHistory } from '@/hooks/useVerification';
import { formatVerificationStatus, getVerificationStatusColor } from '@/lib/verificationService';

interface VerificationStatusTrackerProps {
  request: VerificationRequest;
  history?: VerificationHistory[];
  onViewDetails?: () => void;
  style?: any;
}

export function VerificationStatusTracker({
  request,
  history = [],
  onViewDetails,
  style,
}: VerificationStatusTrackerProps) {
  const { theme } = useTheme();

  const getStatusIcon = (status: string, size: number = 24) => {
    const color = getVerificationStatusColor(status);
    
    switch (status) {
      case 'approved':
        return <CheckCircle size={size} color={color} />;
      case 'rejected':
        return <XCircle size={size} color={color} />;
      case 'expired':
        return <AlertCircle size={size} color={color} />;
      case 'in_review':
        return <Eye size={size} color={color} />;
      case 'pending':
      default:
        return <Clock size={size} color={color} />;
    }
  };

  const getStepIcon = (action: string, size: number = 16) => {
    const color = theme.colors.text.secondary;
    
    switch (action) {
      case 'submitted':
        return <FileText size={size} color={color} />;
      case 'document_uploaded':
        return <FileText size={size} color={color} />;
      case 'reviewed':
      case 'in_review':
        return <Eye size={size} color={color} />;
      case 'approved':
        return <UserCheck size={size} color={theme.colors.success} />;
      case 'rejected':
        return <XCircle size={size} color={theme.colors.error} />;
      default:
        return <MessageSquare size={size} color={color} />;
    }
  };

  const formatActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      submitted: 'Application Submitted',
      document_uploaded: 'Document Uploaded',
      updated: 'Application Updated',
      reviewed: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      expired: 'Expired',
      cancelled: 'Cancelled',
      document_removed: 'Document Removed',
    };
    return actionMap[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTimelineSteps = () => {
    const steps = [
      {
        key: 'submitted',
        title: 'Application Submitted',
        description: 'Your verification request has been received',
        completed: true,
        timestamp: request.submitted_at,
      },
      {
        key: 'documents',
        title: 'Documents Uploaded',
        description: 'Required documents have been uploaded',
        completed: request.documents && request.documents.length > 0,
        timestamp: request.documents?.[0]?.uploaded_at,
      },
      {
        key: 'review',
        title: 'Under Review',
        description: 'Our team is reviewing your application',
        completed: ['in_review', 'approved', 'rejected'].includes(request.status),
        timestamp: request.status === 'in_review' ? new Date().toISOString() : request.reviewed_at,
      },
      {
        key: 'decision',
        title: request.status === 'approved' ? 'Approved' : request.status === 'rejected' ? 'Rejected' : 'Decision Pending',
        description: request.status === 'approved' 
          ? 'Your verification has been approved' 
          : request.status === 'rejected'
          ? 'Your verification was rejected'
          : 'Waiting for final decision',
        completed: ['approved', 'rejected'].includes(request.status),
        timestamp: request.approved_at || request.reviewed_at,
      },
    ];

    return steps;
  };

  const timelineSteps = getTimelineSteps();
  const currentStepIndex = timelineSteps.findIndex(step => !step.completed);
  const activeStepIndex = currentStepIndex === -1 ? timelineSteps.length - 1 : currentStepIndex;

  return (
    <View style={[
      {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      },
      style,
    ]}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {getStatusIcon(request.status)}
          <View style={{ marginLeft: theme.spacing.sm }}>
            <Text variant="h4">
              {formatVerificationStatus(request.status)}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {request.verification_type.charAt(0).toUpperCase() + request.verification_type.slice(1)} Verification
            </Text>
          </View>
        </View>

        <Badge
          text={formatVerificationStatus(request.status)}
          variant={
            request.status === 'approved' ? 'success' :
            request.status === 'rejected' ? 'error' :
            request.status === 'in_review' ? 'warning' : 'default'
          }
        />
      </View>

      {/* Timeline */}
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Progress Timeline
        </Text>

        {timelineSteps.map((step, index) => (
          <View key={step.key} style={{ flexDirection: 'row', marginBottom: theme.spacing.md }}>
            {/* Timeline Line */}
            <View style={{ alignItems: 'center', marginRight: theme.spacing.md }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: step.completed 
                    ? theme.colors.success 
                    : index === activeStepIndex 
                    ? theme.colors.primary 
                    : theme.colors.surfaceVariant,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: step.completed 
                    ? theme.colors.success 
                    : index === activeStepIndex 
                    ? theme.colors.primary 
                    : theme.colors.border,
                }}
              >
                {step.completed ? (
                  <CheckCircle size={16} color={theme.colors.surface} />
                ) : index === activeStepIndex ? (
                  <Clock size={16} color={theme.colors.surface} />
                ) : (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.colors.text.muted,
                    }}
                  />
                )}
              </View>

              {index < timelineSteps.length - 1 && (
                <View
                  style={{
                    width: 2,
                    height: 40,
                    backgroundColor: step.completed ? theme.colors.success : theme.colors.border,
                    marginTop: theme.spacing.xs,
                  }}
                />
              )}
            </View>

            {/* Step Content */}
            <View style={{ flex: 1 }}>
              <Text
                variant="body"
                style={{
                  fontWeight: step.completed || index === activeStepIndex ? '600' : '400',
                  color: step.completed 
                    ? theme.colors.text.primary 
                    : index === activeStepIndex 
                    ? theme.colors.primary 
                    : theme.colors.text.secondary,
                }}
              >
                {step.title}
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                {step.description}
              </Text>
              {step.timestamp && (
                <Text variant="caption" color="muted">
                  {new Date(step.timestamp).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Additional Information */}
      {request.status === 'rejected' && request.rejection_reason && (
        <View
          style={{
            backgroundColor: theme.colors.error + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: '600', marginBottom: theme.spacing.xs }}>
            Rejection Reason:
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {request.rejection_reason}
          </Text>
        </View>
      )}

      {request.reviewer_notes && (
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            Reviewer Notes:
          </Text>
          <Text variant="bodySmall" color="secondary">
            {request.reviewer_notes}
          </Text>
        </View>
      )}

      {/* Expiry Information */}
      {request.expires_at && request.status === 'pending' && (
        <View
          style={{
            backgroundColor: theme.colors.warning + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Calendar size={16} color={theme.colors.warning} />
            <Text variant="bodySmall" style={{ color: theme.colors.warning, marginLeft: theme.spacing.xs }}>
              Expires on {new Date(request.expires_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}

      {/* Action Button */}
      {onViewDetails && (
        <TouchableOpacity
          onPress={onViewDetails}
          style={{
            backgroundColor: theme.colors.primary + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            alignItems: 'center',
          }}
        >
          <Text variant="body" style={{ color: theme.colors.primary, fontWeight: '600' }}>
            View Full Details
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Compact status tracker for lists
export function CompactVerificationStatus({
  request,
  onPress,
  style,
}: {
  request: VerificationRequest;
  onPress?: () => void;
  style?: any;
}) {
  const { theme } = useTheme();

  const getStatusIcon = (status: string) => {
    const color = getVerificationStatusColor(status);
    const size = 16;
    
    switch (status) {
      case 'approved':
        return <CheckCircle size={size} color={color} />;
      case 'rejected':
        return <XCircle size={size} color={color} />;
      case 'expired':
        return <AlertCircle size={size} color={color} />;
      case 'in_review':
        return <Eye size={size} color={color} />;
      case 'pending':
      default:
        return <Clock size={size} color={color} />;
    }
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {getStatusIcon(request.status)}
      
      <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          {request.verification_type.charAt(0).toUpperCase() + request.verification_type.slice(1)} Verification
        </Text>
        <Text variant="bodySmall" color="secondary">
          {formatVerificationStatus(request.status)} • {new Date(request.submitted_at).toLocaleDateString()}
        </Text>
      </View>

      <Badge
        text={formatVerificationStatus(request.status)}
        variant={
          request.status === 'approved' ? 'success' :
          request.status === 'rejected' ? 'error' :
          request.status === 'in_review' ? 'warning' : 'default'
        }
        size="small"
      />
    </Container>
  );
}

// Activity feed component for verification history
export function VerificationActivityFeed({
  history,
  style,
}: {
  history: VerificationHistory[];
  style?: any;
}) {
  const { theme } = useTheme();

  if (history.length === 0) {
    return (
      <View style={[
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.lg,
          alignItems: 'center',
        },
        style,
      ]}>
        <Text variant="body" color="secondary">
          No activity history available
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      style,
    ]}>
      <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
        Activity History
      </Text>

      {history.map((item, index) => (
        <View
          key={item.id}
          style={{
            flexDirection: 'row',
            marginBottom: index < history.length - 1 ? theme.spacing.md : 0,
          }}
        >
          <View style={{ alignItems: 'center', marginRight: theme.spacing.md }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.colors.surfaceVariant,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getStepIcon(item.action)}
            </View>

            {index < history.length - 1 && (
              <View
                style={{
                  width: 1,
                  height: 32,
                  backgroundColor: theme.colors.border,
                  marginTop: theme.spacing.xs,
                }}
              />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {formatActionText(item.action)}
            </Text>
            {item.notes && (
              <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.xs }}>
                {item.notes}
              </Text>
            )}
            <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  function getStepIcon(action: string, size: number = 16) {
    const color = theme.colors.text.secondary;
    
    switch (action) {
      case 'submitted':
        return <FileText size={size} color={color} />;
      case 'document_uploaded':
        return <FileText size={size} color={color} />;
      case 'reviewed':
      case 'in_review':
        return <Eye size={size} color={color} />;
      case 'approved':
        return <UserCheck size={size} color={theme.colors.success} />;
      case 'rejected':
        return <XCircle size={size} color={theme.colors.error} />;
      default:
        return <MessageSquare size={size} color={color} />;
    }
  }
}
