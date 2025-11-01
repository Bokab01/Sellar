/**
 * ShopSetupWizard Component
 * Multi-step wizard for physical shop configuration
 * Optimized with lazy loading and memoization
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { SafeAreaWrapper } from '@/components/SafeAreaWrapper/SafeAreaWrapper';
import { useShopSetup } from '@/hooks/useShopSetup';
import { Check, ChevronRight } from 'lucide-react-native';

// Lazy load step components for better performance
const Step1BasicInfo = React.lazy(() => import('./steps/Step1BasicInfo'));
const Step2Location = React.lazy(() => import('./steps/Step2Location'));
const Step3BusinessHours = React.lazy(() => import('./steps/Step3BusinessHours'));
const Step4Photos = React.lazy(() => import('./steps/Step4Photos'));
const Step5Review = React.lazy(() => import('./steps/Step5Review'));

interface ShopSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const ShopSetupWizard = memo<ShopSetupWizardProps>(({ 
  onComplete, 
  onCancel 
}) => {
  const { theme } = useTheme();
  const {
    currentStep,
    setupData,
    steps,
    isDirty,
    isSaving,
    goToNextStep,
    goToPreviousStep,
    updateData,
    updateMultiple,
    validateCurrentStep,
    canProceed,
    publishShop,
    saveDraft,
    progress,
  } = useShopSetup();

  // =============================================
  // HANDLERS
  // =============================================

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      if (isDirty) {
        Alert.alert(
          'Save Draft?',
          'You have unsaved changes. Would you like to save them as a draft?',
          [
            { text: 'Discard', style: 'destructive', onPress: () => onCancel?.() || router.back() },
            { text: 'Save Draft', onPress: async () => {
              await saveDraft();
              onCancel?.() || router.back();
            }},
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        onCancel?.() || router.back();
      }
    } else {
      goToPreviousStep();
    }
  }, [currentStep, isDirty, goToPreviousStep, saveDraft, onCancel]);

  const handleNext = useCallback(() => {
    const validation = validateCurrentStep();
    
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).join('\n');
      Alert.alert('Please fix the following errors:', errorMessages);
      return;
    }
    
    goToNextStep();
  }, [validateCurrentStep, goToNextStep]);

  const handlePublish = useCallback(async () => {
    Alert.alert(
      'Publish Shop?',
      'Your physical shop will be visible to buyers. You can edit it anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'default',
          onPress: async () => {
            const result = await publishShop();
            
            if (result.success) {
              Alert.alert(
                'Success! 🎉',
                'Your physical shop is now live!',
                [{ text: 'Done', onPress: () => onComplete?.() || router.back() }]
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to publish shop. Please try again.');
            }
          },
        },
      ]
    );
  }, [publishShop, onComplete]);

  // =============================================
  // RENDER STEP CONTENT
  // =============================================

  const renderStepContent = useMemo(() => {
    const commonProps = {
      data: setupData,
      updateData,
      updateMultiple,
    };

    switch (currentStep) {
      case 1:
        return (
          <React.Suspense fallback={<LoadingStep />}>
            <Step1BasicInfo {...commonProps} />
          </React.Suspense>
        );
      case 2:
        return (
          <React.Suspense fallback={<LoadingStep />}>
            <Step2Location {...commonProps} />
          </React.Suspense>
        );
      case 3:
        return (
          <React.Suspense fallback={<LoadingStep />}>
            <Step3BusinessHours {...commonProps} />
          </React.Suspense>
        );
      case 4:
        return (
          <React.Suspense fallback={<LoadingStep />}>
            <Step4Photos {...commonProps} />
          </React.Suspense>
        );
      case 5:
        return (
          <React.Suspense fallback={<LoadingStep />}>
            <Step5Review {...commonProps} />
          </React.Suspense>
        );
      default:
        return null;
    }
  }, [currentStep, setupData, updateData, updateMultiple]);

  // =============================================
  // RENDER
  // =============================================

  return (
    <SafeAreaWrapper edges={['top', 'bottom']}>
      <AppHeader
        title="Setup Physical Shop"
        onBackPress={handleBack}
        showBack
      />

      {/* Progress Bar */}
      <View style={{
        height: 4,
        backgroundColor: theme.colors.surfaceVariant,
      }}>
        <View style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: theme.colors.primary,
          transition: 'width 0.3s ease',
        }} />
      </View>

      {/* Step Indicators */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.sm,
        }}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        {steps.map((step, index) => (
          <StepIndicator
            key={step.id}
            step={step}
            isActive={currentStep === step.id}
            isLast={index === steps.length - 1}
          />
        ))}
      </ScrollView>

      {/* Step Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={{
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: theme.spacing.md,
      }}>
        {/* Auto-save indicator */}
        {isDirty && (
          <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
            {isSaving ? 'Saving draft...' : 'Draft saved automatically'}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {currentStep > 1 && (
            <Button
              variant="outline"
              onPress={goToPreviousStep}
              style={{ flex: 1 }}
            >
              Back
            </Button>
          )}
          
          {currentStep < steps.length ? (
            <Button
              variant="primary"
              onPress={handleNext}
              disabled={!canProceed}
              style={{ flex: 1 }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onPress={handlePublish}
              disabled={!canProceed || isSaving}
              loading={isSaving}
              style={{ flex: 1 }}
            >
              Publish Shop
            </Button>
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
});

ShopSetupWizard.displayName = 'ShopSetupWizard';

// =============================================
// SUB-COMPONENTS (Memoized for performance)
// =============================================

const StepIndicator = memo<{
  step: any;
  isActive: boolean;
  isLast: boolean;
}>(({ step, isActive, isLast }) => {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        backgroundColor: isActive 
          ? theme.colors.primary
          : step.isComplete
          ? theme.colors.success
          : theme.colors.surfaceVariant,
      }}>
        <Text style={{ fontSize: 20, marginRight: theme.spacing.xs }}>
          {step.isComplete ? '✅' : step.icon}
        </Text>
        <View>
          <Text
            variant="bodySmall"
            style={{
              fontWeight: '600',
              color: isActive || step.isComplete
                ? theme.colors.primaryForeground
                : theme.colors.text.secondary,
            }}
          >
            {step.title}
          </Text>
        </View>
      </View>
      
      {!isLast && (
        <ChevronRight
          size={16}
          color={theme.colors.text.muted}
          style={{ marginHorizontal: theme.spacing.xs }}
        />
      )}
    </View>
  );
});

StepIndicator.displayName = 'StepIndicator';

const LoadingStep = memo(() => {
  const { theme } = useTheme();
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    }}>
      <Text variant="body" color="secondary">
        Loading...
      </Text>
    </View>
  );
});

LoadingStep.displayName = 'LoadingStep';

