import React, { useState } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Badge } from '@/components/Badge/Badge';
import { Avatar } from '@/components/Avatar/Avatar';
import { 
  Flag, 
  AlertTriangle, 
  Shield, 
  MessageSquare,
  User,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase-client';

interface ReviewModerationModalProps {
  visible: boolean;
  onClose: () => void;
  review: {
    id: string;
    reviewer_id: string;
    reviewed_user_id: string;
    rating: number;
    comment: string;
    verification_level: string;
    reviewer: {
      full_name: string;
      avatar_url?: string;
    };
  };
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or fake review', description: 'Review appears to be spam or fake' },
  { id: 'inappropriate', label: 'Inappropriate content', description: 'Contains offensive or inappropriate language' },
  { id: 'harassment', label: 'Harassment or abuse', description: 'Review is harassing or abusive' },
  { id: 'fake_transaction', label: 'Fake transaction', description: 'No real transaction took place' },
  { id: 'misleading', label: 'Misleading information', description: 'Contains false or misleading information' },
  { id: 'personal_attack', label: 'Personal attack', description: 'Attacks the person rather than the transaction' },
  { id: 'other', label: 'Other', description: 'Other reason not listed above' },
];

export function ReviewModerationModal({
  visible,
  onClose,
  review,
  onSuccess,
}: ReviewModerationModalProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [step, setStep] = useState<'reason' | 'details' | 'success'>('reason');

  const handleSubmitReport = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    setLoading(true);
    try {
      // Flag the review
      const { error: flagError } = await supabase
        .from('reviews')
        .update({
          is_flagged: true,
          flagged_reason: selectedReason,
          flagged_at: new Date().toISOString(),
          flagged_by: user!.id,
        })
        .eq('id', review.id);

      if (flagError) throw flagError;

      // Create a moderation record (if you have a moderation table)
      // This would be useful for tracking reports and moderation actions
      
      setStep('success');
    } catch (error) {
      console.error('Error reporting review:', error);
      Alert.alert('Error', 'Failed to report review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setAdditionalDetails('');
    setStep('reason');
    onClose();
  };

  const renderReasonStep = () => (
    <ScrollView style={{ maxHeight: 400 }}>
      <View style={{ gap: theme.spacing.lg }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.colors.error + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.md,
          }}>
            <Flag size={30} color={theme.colors.error} />
          </View>
          <Text variant="h3" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
            Report Review
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            Help us maintain a trustworthy community by reporting inappropriate reviews
          </Text>
        </View>

        {/* Review Preview */}
        <View style={{
          backgroundColor: theme.colors.surfaceVariant,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.warning,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <Avatar
              source={review.reviewer.avatar_url}
              name={review.reviewer.full_name}
              size="xs"
            />
            <Text variant="bodySmall" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
              {review.reviewer.full_name}
            </Text>
            <Badge
              text={review.verification_level === 'mutual_confirmed' ? 'Verified' : 'Unverified'}
              variant={review.verification_level === 'mutual_confirmed' ? 'success' : 'neutral'}
              size="small"
              style={{ marginLeft: theme.spacing.sm }}
            />
          </View>
          <Text variant="bodySmall" numberOfLines={3}>
            {review.comment}
          </Text>
        </View>

        {/* Report Reasons */}
        <View>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Why are you reporting this review?
          </Text>
          <View style={{ gap: theme.spacing.sm }}>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => setSelectedReason(reason.id)}
                style={{
                  padding: theme.spacing.md,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: selectedReason === reason.id 
                    ? theme.colors.primary 
                    : theme.colors.border,
                  backgroundColor: selectedReason === reason.id 
                    ? theme.colors.primary + '10' 
                    : theme.colors.surface,
                }}
                activeOpacity={0.7}
              >
                <Text variant="body" style={{ 
                  fontWeight: selectedReason === reason.id ? '600' : '400',
                  marginBottom: theme.spacing.xs,
                }}>
                  {reason.label}
                </Text>
                <Text variant="caption" color="secondary">
                  {reason.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Additional Details */}
        {selectedReason && (
          <View>
            <Input
              label="Additional Details (Optional)"
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              placeholder="Provide any additional context..."
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Warning */}
        <View style={{
          backgroundColor: theme.colors.warning + '10',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color={theme.colors.warning} style={{ marginTop: 2 }} />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                False Reports
              </Text>
              <Text variant="caption" color="secondary">
                False or malicious reports may result in restrictions on your account. 
                Please only report reviews that genuinely violate our community guidelines.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderSuccessStep = () => (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.success + '20',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Shield size={40} color={theme.colors.success} />
      </View>

      <View style={{ alignItems: 'center' }}>
        <Text variant="h3" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
          Report Submitted
        </Text>
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Thank you for helping us maintain a safe community
        </Text>
      </View>

      <View style={{
        backgroundColor: theme.colors.info + '10',
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        width: '100%',
      }}>
        <Text variant="body" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          What happens next?
        </Text>
        <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
          • Our moderation team will review the report{'\n'}
          • We'll investigate the review and transaction{'\n'}
          • Appropriate action will be taken if violations are found{'\n'}
          • You'll be notified of the outcome
        </Text>
      </View>
    </View>
  );

  const getModalTitle = () => {
    switch (step) {
      case 'reason':
        return 'Report Review';
      case 'success':
        return 'Report Submitted';
      default:
        return 'Report Review';
    }
  };

  const getPrimaryAction = () => {
    switch (step) {
      case 'reason':
        return {
          text: 'Submit Report',
          onPress: handleSubmitReport,
          loading,
          disabled: !selectedReason,
          icon: <Flag size={16} color={theme.colors.primaryForeground} />,
        };
      case 'success':
        return {
          text: 'Done',
          onPress: () => {
            onSuccess?.();
            handleClose();
          },
        };
      default:
        return undefined;
    }
  };

  const getSecondaryAction = () => {
    if (step === 'reason') {
      return {
        text: 'Cancel',
        onPress: handleClose,
      };
    }
    return undefined;
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title={getModalTitle()}
      size="lg"
      primaryAction={getPrimaryAction()}
      secondaryAction={getSecondaryAction()}
      dismissOnBackdrop={step !== 'success'}
    >
      {step === 'reason' && renderReasonStep()}
      {step === 'success' && renderSuccessStep()}
    </AppModal>
  );
}

// Quick report button component
export function QuickReportButton({ 
  reviewId, 
  onReport 
}: { 
  reviewId: string; 
  onReport?: () => void; 
}) {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={{
          padding: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
        }}
        activeOpacity={0.7}
      >
        <Flag size={14} color={theme.colors.text.muted} />
      </TouchableOpacity>

      {/* You would need to pass the review data here */}
      {/* <ReviewModerationModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        review={review}
        onSuccess={onReport}
      /> */}
    </>
  );
}
