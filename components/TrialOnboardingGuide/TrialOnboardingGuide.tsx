import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { Button } from '@/components/Button/Button';
import { 
  CheckCircle, 
  Upload, 
  BarChart3, 
  RefreshCw,
  Video,
  X
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  completed: boolean;
}

interface TrialOnboardingGuideProps {
  userId: string;
  trialDay: number;
}

export function TrialOnboardingGuide({ userId, trialDay }: TrialOnboardingGuideProps) {
  const { theme } = useTheme();
  const [showGuide, setShowGuide] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  useEffect(() => {
    checkIfShouldShow();
  }, [userId, trialDay]);

  const checkIfShouldShow = async () => {
    try {
      const key = `trial_onboarding_seen_${userId}`;
      const seen = await AsyncStorage.getItem(key);
      
      if (!seen && trialDay === 1) {
        setShowGuide(true);
      }
      setHasSeenGuide(seen === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleClose = async () => {
    try {
      const key = `trial_onboarding_seen_${userId}`;
      await AsyncStorage.setItem(key, 'true');
      setShowGuide(false);
      setHasSeenGuide(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'list',
      icon: <Upload size={24} color={theme.colors.primary} />,
      title: 'List Your Items',
      description: 'Create unlimited listings with videos and photos',
      completed: false,
    },
    {
      id: 'refresh',
      icon: <RefreshCw size={24} color={theme.colors.primary} />,
      title: 'Auto-Refresh Working',
      description: 'Your listings refresh every 2 hours automatically',
      completed: false,
    },
    {
      id: 'video',
      icon: <Video size={24} color={theme.colors.primary} />,
      title: 'Upload Videos',
      description: 'Add videos to your listings for better engagement',
      completed: false,
    },
    {
      id: 'analytics',
      icon: <BarChart3 size={24} color={theme.colors.primary} />,
      title: 'Check Analytics',
      description: 'Track views, messages, and performance',
      completed: false,
    },
  ];

  if (!showGuide || hasSeenGuide) {
    return null;
  }

  return (
    <AppModal
      visible={showGuide}
      onClose={handleClose}
      title="Welcome to Your Free Trial! 🎉"
      position="center"
      size="lg"
    >
      <View style={{ padding: theme.spacing.lg }}>
        {/* Intro Text */}
        <Text variant="body" style={{ marginBottom: theme.spacing.xl, lineHeight: 22 }}>
          You now have full access to all Sellar Pro features for 14 days. Here's how to get the most out of your trial:
        </Text>

        {/* Checklist */}
        <View style={{ marginBottom: theme.spacing.xl, gap: theme.spacing.md }}>
          {steps.map((step, index) => (
            <View
              key={step.id}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.md,
                borderLeftWidth: 3,
                borderLeftColor: theme.colors.primary,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.primary + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: theme.spacing.md,
                }}
              >
                {step.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: 4 }}>
                  {index + 1}. {step.title}
                </Text>
                <Text variant="bodySmall" color="secondary" style={{ lineHeight: 18 }}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pro Tip */}
        <View
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.success + '10',
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.success + '30',
            marginBottom: theme.spacing.xl,
          }}
        >
          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: 4, color: theme.colors.success }}>
            💡 Pro Tip
          </Text>
          <Text variant="caption" color="secondary" style={{ lineHeight: 16 }}>
            List at least 10 items in your first 3 days to see the full benefit of auto-refresh and analytics!
          </Text>
        </View>

        {/* Action Button */}
        <Button
          variant="primary"
          onPress={handleClose}
          fullWidth
        >
          Got It, Let's Start!
        </Button>
      </View>
    </AppModal>
  );
}

