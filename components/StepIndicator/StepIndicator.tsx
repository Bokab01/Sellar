import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Check } from 'lucide-react-native';

interface StepIndicatorProps {
  steps: Array<{
    title: string;
    completed?: boolean;
    active?: boolean;
  }>;
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
}

export function StepIndicator({
  steps,
  currentStep,
  orientation = 'horizontal',
  showLabels = true,
}: StepIndicatorProps) {
  const { theme } = useTheme();

  const getStepColor = (index: number, step: any) => {
    if (step.completed || index < currentStep) {
      return theme.colors.success;
    } else if (step.active || index === currentStep) {
      return theme.colors.primary;
    } else {
      return theme.colors.border;
    }
  };

  const getStepBackgroundColor = (index: number, step: any) => {
    if (step.completed || index < currentStep) {
      return theme.colors.success;
    } else if (step.active || index === currentStep) {
      return theme.colors.primary;
    } else {
      return theme.colors.surface;
    }
  };

  const getStepTextColor = (index: number, step: any) => {
    if (step.completed || index < currentStep || step.active || index === currentStep) {
      return theme.colors.surface;
    } else {
      return theme.colors.text.muted;
    }
  };

  if (orientation === 'vertical') {
    return (
      <View style={{ paddingVertical: theme.spacing.md }}>
        {steps.map((step, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Step Circle */}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getStepBackgroundColor(index, step),
                borderWidth: 2,
                borderColor: getStepColor(index, step),
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: theme.spacing.md,
              }}
            >
              {(step.completed || index < currentStep) ? (
                <Check size={16} color={getStepTextColor(index, step)} />
              ) : (
                <Text
                  variant="bodySmall"
                  style={{
                    color: getStepTextColor(index, step),
                    fontWeight: '600',
                  }}
                >
                  {index + 1}
                </Text>
              )}
            </View>

            {/* Step Label */}
            {showLabels && (
              <View style={{ flex: 1 }}>
                <Text
                  variant="body"
                  style={{
                    color: (step.active || index === currentStep) 
                      ? theme.colors.text.primary 
                      : theme.colors.text.muted,
                    fontWeight: (step.active || index === currentStep) ? '600' : '400',
                  }}
                >
                  {step.title}
                </Text>
              </View>
            )}

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <View
                style={{
                  position: 'absolute',
                  left: 15,
                  top: 32,
                  width: 2,
                  height: 40,
                  backgroundColor: index < currentStep 
                    ? theme.colors.success 
                    : theme.colors.border,
                }}
              />
            )}
          </View>
        ))}
      </View>
    );
  }

  // Horizontal orientation
  return (
    <View style={{ paddingVertical: theme.spacing.md }}>
      {/* Step Circles */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: showLabels ? theme.spacing.md : 0,
        }}
      >
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step Circle */}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getStepBackgroundColor(index, step),
                borderWidth: 2,
                borderColor: getStepColor(index, step),
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {(step.completed || index < currentStep) ? (
                <Check size={16} color={getStepTextColor(index, step)} />
              ) : (
                <Text
                  variant="bodySmall"
                  style={{
                    color: getStepTextColor(index, step),
                    fontWeight: '600',
                  }}
                >
                  {index + 1}
                </Text>
              )}
            </View>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: index < currentStep 
                    ? theme.colors.success 
                    : theme.colors.border,
                  marginHorizontal: theme.spacing.sm,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Step Labels */}
      {showLabels && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {steps.map((step, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingHorizontal: theme.spacing.xs,
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: (step.active || index === currentStep) 
                    ? theme.colors.text.primary 
                    : theme.colors.text.muted,
                  fontWeight: (step.active || index === currentStep) ? '600' : '400',
                  textAlign: 'center',
                }}
                numberOfLines={2}
              >
                {step.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}


