import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  Button,
  Modal,
  Input,
  ListItem,
} from '@/components';
import { Flag, AlertTriangle, Shield, Zap, MessageSquare } from 'lucide-react-native';
import { useContentModeration } from '@/hooks/useContentModeration';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

const reportCategories = [
  {
    id: 'illegal_items',
    name: 'Illegal Items',
    description: 'Drugs, weapons, stolen goods',
    icon: AlertTriangle,
    color: '#ef4444',
  },
  {
    id: 'adult_content',
    name: 'Adult Content',
    description: 'Sexual or inappropriate content',
    icon: Shield,
    color: '#f97316',
  },
  {
    id: 'scams',
    name: 'Fraud/Scam',
    description: 'Fake items, misleading information',
    icon: Zap,
    color: '#eab308',
  },
  {
    id: 'offensive_material',
    name: 'Offensive Content',
    description: 'Hate speech, harassment',
    icon: MessageSquare,
    color: '#8b5cf6',
  },
  {
    id: 'spam',
    name: 'Spam',
    description: 'Repetitive or irrelevant content',
    icon: Flag,
    color: '#6b7280',
  },
];

export function ReportModal({
  visible,
  onClose,
  listingId,
  listingTitle,
}: ReportModalProps) {
  const { theme } = useTheme();
  const { reportContent, loading } = useContentModeration();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'category' | 'details' | 'success'>('category');

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setSelectedCategory(null);
      setReason('');
      setDescription('');
      setStep('category');
    }
  }, [visible]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep('details');
  };

  const handleSubmitReport = async () => {
    if (!selectedCategory || !reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your report.');
      return;
    }

    const success = await reportContent({
      listing_id: listingId,
      category: selectedCategory,
      reason: reason.trim(),
      description: description.trim() || undefined,
    });

    if (success) {
      setStep('success');
    } else {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const renderCategorySelection = () => (
    <View>
      <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
        <View
          style={{
            backgroundColor: `${theme.colors.error}20`,
            borderRadius: 50,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
          }}
        >
          <Flag size={48} color={theme.colors.error} />
        </View>
        <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          Report Listing
        </Text>
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Help keep our community safe by reporting inappropriate content
        </Text>
      </View>

      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
          Reporting: "{listingTitle}"
        </Text>
      </View>

      <Text variant="body" style={{ marginBottom: theme.spacing.lg }}>
        What's wrong with this listing?
      </Text>

      <ScrollView style={{ maxHeight: 300, marginBottom: theme.spacing.xl }}>
        {reportCategories.map((category) => {
          const Icon = category.icon;
          return (
            <ListItem
              key={category.id}
              title={category.name}
              subtitle={category.description}
              leftIcon={
                <View
                  style={{
                    backgroundColor: `${category.color}20`,
                    borderRadius: theme.borderRadius.sm,
                    padding: theme.spacing.sm,
                  }}
                >
                  <Icon size={20} color={category.color} />
                </View>
              }
              onPress={() => handleCategorySelect(category.id)}
              style={{ marginBottom: theme.spacing.sm }}
            />
          );
        })}
      </ScrollView>

      <Button
        variant="secondary"
        onPress={handleClose}
        fullWidth
      >
        Cancel
      </Button>
    </View>
  );

  const renderDetailsForm = () => {
    const selectedCategoryData = reportCategories.find(c => c.id === selectedCategory);
    const Icon = selectedCategoryData?.icon || Flag;

    return (
      <View>
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <View
            style={{
              backgroundColor: `${selectedCategoryData?.color || theme.colors.error}20`,
              borderRadius: 50,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Icon size={48} color={selectedCategoryData?.color || theme.colors.error} />
          </View>
          <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
            {selectedCategoryData?.name}
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            Please provide more details about this issue
          </Text>
        </View>

        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="body" style={{ marginBottom: theme.spacing.md }}>
            Reason for report *
          </Text>
          <Input
            value={reason}
            onChangeText={setReason}
            placeholder="Briefly explain the issue..."
            multiline
            numberOfLines={3}
            style={{ marginBottom: theme.spacing.lg }}
          />

          <Text variant="body" style={{ marginBottom: theme.spacing.md }}>
            Additional details (optional)
          </Text>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Any additional context or evidence..."
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Button
            variant="primary"
            onPress={handleSubmitReport}
            loading={loading}
            disabled={!reason.trim()}
            fullWidth
          >
            Submit Report
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => setStep('category')}
            fullWidth
          >
            Back
          </Button>
        </View>
      </View>
    );
  };

  const renderSuccess = () => (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          backgroundColor: `${theme.colors.success}20`,
          borderRadius: 50,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
        }}
      >
        <Flag size={64} color={theme.colors.success} />
      </View>
      
      <Text variant="h2" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
        Report Submitted
      </Text>
      
      <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
        Thank you for helping keep our community safe. We'll review this report and take appropriate action.
      </Text>

      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.xl,
          width: '100%',
        }}
      >
        <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
          What happens next?
        </Text>
        <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
          • Our moderation team will review the report
        </Text>
        <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
          • We may remove the content if it violates our guidelines
        </Text>
        <Text variant="bodySmall" color="secondary">
          • You'll be notified of any actions taken
        </Text>
      </View>

      <Button
        variant="primary"
        onPress={handleClose}
        fullWidth
      >
        Done
      </Button>
    </View>
  );

  return (
    <Modal visible={visible} onClose={handleClose}>
      <View style={{ padding: theme.spacing.xl }}>
        {step === 'category' && renderCategorySelection()}
        {step === 'details' && renderDetailsForm()}
        {step === 'success' && renderSuccess()}
      </View>
    </Modal>
  );
}
