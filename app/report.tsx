import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  Flag, 
  ChevronRight, 
  CheckCircle, 
  Shield,
  MessageSquare,
  ShoppingBag,
  User,
  FileText
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
} from '@/components';
import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'listing' | 'post' | 'comment' | 'message' | 'user';

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

export default function ReportScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  
  const targetType = params.targetType as ReportTargetType;
  const targetId = params.targetId as string;
  const targetTitle = params.targetTitle as string | undefined;
  const targetUserData = params.targetUser ? JSON.parse(params.targetUser as string) : null;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'category' | 'details' | 'success'>('category');
  const [loading, setLoading] = useState(false);

  const getTargetIcon = () => {
    const size = 24;
    switch (targetType) {
      case 'listing':
        return <ShoppingBag size={size} color={theme.colors.primary} />;
      case 'post':
        return <FileText size={size} color={theme.colors.primary} />;
      case 'comment':
        return <MessageSquare size={size} color={theme.colors.primary} />;
      case 'message':
        return <MessageSquare size={size} color={theme.colors.primary} />;
      case 'user':
        return <User size={size} color={theme.colors.primary} />;
      default:
        return <Flag size={size} color={theme.colors.primary} />;
    }
  };

  const getTargetDisplayName = () => {
    if (targetType === 'user' && targetUserData) {
      return targetUserData.name;
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
        return theme.colors.text.muted;
      default:
        return theme.colors.text.muted;
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

  const renderCategorySelection = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.border,
      }}>
        <View style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: theme.colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}>
          {getTargetIcon()}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3" style={{ color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}>
            Report {targetType}
          </Text>
          <Text variant="body" color="muted" numberOfLines={1}>
            {getTargetDisplayName()}
          </Text>
        </View>
      </View>

      <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
        What's the issue?
      </Text>

      {reportCategories.map((category) => (
        <TouchableOpacity
          key={category.name}
          onPress={() => handleCategorySelect(category.name)}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}>
              <Text variant="body" style={{ color: theme.colors.text.primary, flex: 1, fontWeight: '700', fontSize: 16 }}>
                {category.display_name}
              </Text>
              <View style={{
                backgroundColor: getPriorityColor(category.priority) + '20',
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.sm,
                borderWidth: 1,
                borderColor: getPriorityColor(category.priority),
              }}>
                <Text variant="caption" style={{ color: getPriorityColor(category.priority), textTransform: 'uppercase', fontWeight: '700', fontSize: 10 }}>
                  {category.priority}
                </Text>
              </View>
            </View>
            <Text variant="body" style={{ color: theme.colors.text.muted, lineHeight: 20 }}>
              {category.description}
            </Text>
          </View>
          <ChevronRight size={24} color={theme.colors.text.muted} style={{ marginLeft: theme.spacing.md }} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderDetailsForm = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
    >
      <View style={{
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.border,
      }}>
        <Text variant="h3" style={{ color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}>
          Report Details
        </Text>
        <Text variant="body" color="muted">
          {reportCategories.find(c => c.name === selectedCategory)?.display_name}
        </Text>
      </View>

      <View style={{ marginBottom: theme.spacing.xl }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Reason <Text style={{ color: theme.colors.error }}>*</Text>
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Briefly describe the issue..."
          placeholderTextColor={theme.colors.text.muted}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            color: theme.colors.text.primary,
            fontSize: 16,
            minHeight: 120,
            textAlignVertical: 'top',
          }}
          multiline
          maxLength={200}
        />
        <Text variant="caption" style={{ color: theme.colors.text.muted, textAlign: 'right', marginTop: theme.spacing.sm }}>
          {reason.length}/200
        </Text>
      </View>

      <View style={{ marginBottom: theme.spacing.xl }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
          Additional Details (Optional)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Provide any additional context or evidence..."
          placeholderTextColor={theme.colors.text.muted}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            color: theme.colors.text.primary,
            fontSize: 16,
            minHeight: 150,
            textAlignVertical: 'top',
          }}
          multiline
          maxLength={500}
        />
        <Text variant="caption" style={{ color: theme.colors.text.muted, textAlign: 'right', marginTop: theme.spacing.sm }}>
          {description.length}/500
        </Text>
      </View>

      <View style={{
        backgroundColor: theme.colors.primary + '10',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary + '30',
        marginBottom: theme.spacing.xl,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
          <Shield size={20} color={theme.colors.primary} />
          <Text variant="body" style={{ marginLeft: theme.spacing.sm, fontWeight: '700', color: theme.colors.primary }}>
            What happens next?
          </Text>
        </View>
        <Text variant="body" style={{ color: theme.colors.text.primary, lineHeight: 22 }}>
          Your report will be reviewed by our moderation team. We take all reports seriously and will take appropriate action if violations are found.
        </Text>
      </View>

      <Button
        variant="primary"
        onPress={handleSubmitReport}
        loading={loading}
        disabled={!reason.trim()}
        style={{ paddingVertical: theme.spacing.lg }}
      >
        Submit Report
      </Button>
    </ScrollView>
  );

  const renderSuccess = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
      <View style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.success + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.xl,
        borderWidth: 3,
        borderColor: theme.colors.success + '30',
      }}>
        <CheckCircle size={64} color={theme.colors.success} />
      </View>
      <Text variant="h2" style={{ color: theme.colors.text.primary, textAlign: 'center', marginBottom: theme.spacing.md }}>
        Report Submitted
      </Text>
      <Text variant="body" color="muted" style={{ textAlign: 'center', marginBottom: theme.spacing.xl, lineHeight: 24 }}>
        Thank you for helping keep our community safe. Your report has been submitted and will be reviewed by our moderation team.
      </Text>
      <Button
        variant="primary"
        onPress={() => router.back()}
        style={{ minWidth: 200, paddingVertical: theme.spacing.lg }}
      >
        Done
      </Button>
    </View>
  );

  if (!targetType || !targetId) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Report"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl }}>
          <Text variant="body" style={{ color: theme.colors.text.muted, textAlign: 'center' }}>
            Invalid report parameters
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={step === 'success' ? '' : 'Report Content'}
        showBackButton={step !== 'success'}
        onBackPress={() => {
          if (step === 'details') {
            setStep('category');
          } else {
            router.back();
          }
        }}
      />

      {step === 'category' && renderCategorySelection()}
      {step === 'details' && renderDetailsForm()}
      {step === 'success' && renderSuccess()}
    </SafeAreaWrapper>
  );
}
