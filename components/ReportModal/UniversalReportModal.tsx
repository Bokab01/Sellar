import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, Dimensions } from 'react-native';
import { 
  Flag, 
  X, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  MessageSquare,
  ShoppingBag,
  User,
  FileText
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppModal } from '@/components/Modal/Modal';
import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'listing' | 'post' | 'comment' | 'message' | 'user';

interface UniversalReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface ModerationCategory {
  name: string;
  display_name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const reportCategories: ModerationCategory[] = [
  {
    name: 'spam',
    display_name: 'Spam',
    description: 'Repetitive, unwanted, or promotional content',
    priority: 'high'
  },
  {
    name: 'harassment',
    display_name: 'Harassment',
    description: 'Bullying, threats, or abusive behavior',
    priority: 'urgent'
  },
  {
    name: 'inappropriate',
    display_name: 'Inappropriate Content',
    description: 'Offensive, explicit, or inappropriate material',
    priority: 'high'
  },
  {
    name: 'fraud',
    display_name: 'Fraud/Scam',
    description: 'Deceptive practices, fake listings, or scams',
    priority: 'urgent'
  },
  {
    name: 'copyright',
    display_name: 'Copyright Violation',
    description: 'Unauthorized use of copyrighted material',
    priority: 'medium'
  },
  {
    name: 'violence',
    display_name: 'Violence/Threats',
    description: 'Content promoting violence or making threats',
    priority: 'urgent'
  },
  {
    name: 'hate_speech',
    display_name: 'Hate Speech',
    description: 'Content promoting hatred or discrimination',
    priority: 'urgent'
  },
  {
    name: 'fake_listing',
    display_name: 'Fake Listing',
    description: 'Misleading or fraudulent product listings',
    priority: 'high'
  },
  {
    name: 'price_manipulation',
    display_name: 'Price Manipulation',
    description: 'Artificially inflated or misleading prices',
    priority: 'medium'
  },
  {
    name: 'other',
    display_name: 'Other',
    description: 'Other violations not covered above',
    priority: 'low'
  }
];

export function UniversalReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetTitle,
  targetUser
}: UniversalReportModalProps) {
  const { theme } = useTheme();
  const { height: screenHeight } = Dimensions.get('window');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'category' | 'details' | 'success'>('category');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setSelectedCategory(null);
      setReason('');
      setDescription('');
      setStep('category');
    }
  }, [visible]);

  const getTargetIcon = () => {
    switch (targetType) {
      case 'listing':
        return <ShoppingBag size={20} color={theme.colors.primary} />;
      case 'post':
        return <FileText size={20} color={theme.colors.primary} />;
      case 'comment':
        return <MessageSquare size={20} color={theme.colors.primary} />;
      case 'message':
        return <MessageSquare size={20} color={theme.colors.primary} />;
      case 'user':
        return <User size={20} color={theme.colors.primary} />;
      default:
        return <Flag size={20} color={theme.colors.primary} />;
    }
  };

  const getTargetDisplayName = () => {
    if (targetType === 'user' && targetUser) {
      return targetUser.name;
    }
    return targetTitle || `${targetType} content`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return theme.colors.error;
      case 'high':
        return theme.colors.warning;
      case 'medium':
        return theme.colors.primary;
      case 'low':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setStep('details');
  };

  const handleSubmitReport = async () => {
    if (!selectedCategory || !reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your report.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('submit_report', {
        p_reporter_id: user.id,
        p_target_type: targetType,
        p_target_id: targetId,
        p_category: selectedCategory,
        p_reason: reason.trim(),
        p_description: description.trim() || null,
        p_evidence_urls: JSON.stringify([])
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        setStep('success');
      } else {
        throw new Error(data?.[0]?.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Report submission error:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const renderCategorySelection = () => (
    <View style={{ height: '100%' }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        {getTargetIcon()}
        <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
          <Text variant="h4" style={{ color: theme.colors.text.primary }}>
            Report {targetType}
          </Text>
          <Text variant="body" color="secondary">
            {getTargetDisplayName()}
          </Text>
        </View>
      </View>

      <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
        What's the issue?
      </Text>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {reportCategories.map((category) => (
          <TouchableOpacity
            key={category.name}
            onPress={() => handleCategorySelect(category.name)}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.sm,
              borderWidth: 1,
              borderColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: theme.spacing.xs,
              }}>
                <Text variant="body" style={{ color: theme.colors.text.primary, flex: 1, fontWeight: '600' }}>
                  {category.display_name}
                </Text>
                <View style={{
                  backgroundColor: getPriorityColor(category.priority),
                  paddingHorizontal: theme.spacing.xs,
                  paddingVertical: 2,
                  borderRadius: theme.borderRadius.sm,
                }}>
                  <Text variant="caption" style={{ color: 'white', textTransform: 'uppercase' }}>
                    {category.priority}
                  </Text>
                </View>
              </View>
              <Text variant="body" style={{ color: theme.colors.textSecondary }}>
                {category.description}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDetailsForm = () => (
    <View style={{ height: '100%' }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <TouchableOpacity
          onPress={() => setStep('category')}
          style={{
            padding: theme.spacing.xs,
            marginRight: theme.spacing.sm,
          }}
        >
          <ChevronRight size={20} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="h4" style={{ color: theme.colors.text.primary }}>
            Report Details
          </Text>
          <Text variant="body" color="secondary">
            {reportCategories.find(c => c.name === selectedCategory)?.display_name}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ marginBottom: theme.spacing.lg }}>
          <Text variant="body" style={{ marginBottom: theme.spacing.sm, fontWeight: '600' }}>
            Reason *
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Briefly describe the issue..."
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              color: theme.colors.text.primary,
              fontSize: 16,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
            multiline
            maxLength={200}
          />
          <Text variant="caption" style={{ color: theme.colors.textSecondary, textAlign: 'right', marginTop: theme.spacing.xs }}>
            {reason.length}/200
          </Text>
        </View>

        <View style={{ marginBottom: theme.spacing.lg }}>
          <Text variant="body" style={{ marginBottom: theme.spacing.sm, fontWeight: '600' }}>
            Additional Details (Optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Provide any additional context or evidence..."
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              color: theme.colors.text.primary,
              fontSize: 16,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            multiline
            maxLength={500}
          />
          <Text variant="caption" style={{ color: theme.colors.textSecondary, textAlign: 'right', marginTop: theme.spacing.xs }}>
            {description.length}/500
          </Text>
        </View>

        <View style={{
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: theme.spacing.lg,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <Shield size={16} color={theme.colors.primary} />
            <Text variant="body" style={{ marginLeft: theme.spacing.xs, fontWeight: '600' }}>
              What happens next?
            </Text>
          </View>
          <Text variant="body" style={{ color: theme.colors.textSecondary }}>
            Your report will be reviewed by our moderation team. We take all reports seriously and will take appropriate action if violations are found.
          </Text>
        </View>

        <Button
          onPress={handleSubmitReport}
          loading={loading}
          disabled={!reason.trim()}
          style={{ marginBottom: theme.spacing.md }}
        >
          Submit Report
        </Button>
      </ScrollView>
    </View>
  );

  const renderSuccess = () => (
    <View style={{ height: '100%', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg }}>
      <CheckCircle size={64} color={theme.colors.success} style={{ marginBottom: theme.spacing.lg }} />
      <Text variant="h3" style={{ color: theme.colors.text.primary, textAlign: 'center', marginBottom: theme.spacing.md }}>
        Report Submitted
      </Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
        Thank you for helping keep our community safe. Your report has been submitted and will be reviewed by our moderation team.
      </Text>
      <Button
        onPress={handleClose}
        style={{ minWidth: 120 }}
      >
        Close
      </Button>
    </View>
  );

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title=""
      showCloseButton={step !== 'success'}
      size="lg"
    >
      <View style={{ height: Math.min(screenHeight * 0.7, 600) }}>
        {step === 'category' && renderCategorySelection()}
        {step === 'details' && renderDetailsForm()}
        {step === 'success' && renderSuccess()}
      </View>
    </AppModal>
  );
}
