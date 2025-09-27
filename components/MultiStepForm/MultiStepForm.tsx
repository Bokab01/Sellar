import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { StepIndicator } from '@/components/StepIndicator/StepIndicator';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  isValid?: boolean;
  isOptional?: boolean;
}

interface MultiStepFormProps {
  steps: FormStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  loading?: boolean;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
}

export function MultiStepForm({
  steps,
  currentStep,
  onStepChange,
  onSubmit,
  onCancel,
  submitLabel = "Submit",
  loading = false,
  canGoNext = true,
  canGoPrevious = true,
}: MultiStepFormProps) {
  const { theme } = useTheme();
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      handleNext();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Progress Indicator */}
      <View style={{
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <StepIndicator
          steps={steps.map(step => ({
            title: step.title,
            completed: steps.indexOf(step) < currentStep,
            active: steps.indexOf(step) === currentStep,
          }))}
          currentStep={currentStep}
        />
      </View>

      {/* Step Header */}
      <View style={{
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Text variant="h2" style={{ marginBottom: theme.spacing.xs }}>
          {currentStepData.title}
        </Text>
        {currentStepData.description && (
          <Text variant="body" color="secondary">
            {currentStepData.description}
          </Text>
        )}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: theme.spacing.sm,
        }}>
          <Text variant="caption" color="muted">
            Step {currentStep + 1} of {steps.length}
          </Text>
          {currentStepData.isOptional && (
            <View style={{
              backgroundColor: theme.colors.warning + '20',
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              marginLeft: theme.spacing.sm,
            }}>
              <Text variant="caption" style={{ color: theme.colors.warning }}>
                Optional
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Step Content */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, padding: theme.spacing.lg }}>
          {typeof currentStepData.component === 'function' ? 
            React.createElement(currentStepData.component) : 
            currentStepData.component}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: theme.spacing.md,
      }}>
        {/* Previous/Cancel Button */}
        <View style={{ flex: 1 }}>
          {!isFirstStep ? (
            <Button
              variant="secondary"
              onPress={handlePrevious}
              disabled={!canGoPrevious || loading}
              icon={<ChevronLeft size={18} color={theme.colors.text.primary} />}
            >
              Previous
            </Button>
          ) : onCancel ? (
            <Button
              variant="tertiary"
              onPress={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          ) : (
            <View />
          )}
        </View>

        {/* Next/Submit Button */}
        <View style={{ flex: 1 }}>
          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={(!canGoNext && !currentStepData.isOptional) || loading}
            loading={loading && isLastStep}
            icon={!isLastStep ? <ChevronRight size={18} color={theme.colors.primaryForeground} /> : undefined}
            fullWidth
          >
            {isLastStep ? submitLabel : 'Next'}
          </Button>
        </View>
      </View>
    </View>
  );
}

// Hook for managing multi-step form state
export function useMultiStepForm(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const markStepCompleted = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const isStepCompleted = (step: number) => {
    return completedSteps.has(step);
  };

  const reset = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  };

  return {
    currentStep,
    completedSteps,
    goToStep,
    nextStep,
    previousStep,
    markStepCompleted,
    isStepCompleted,
    reset,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    progress: (currentStep + 1) / totalSteps,
  };
}
