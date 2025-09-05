import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { markUserAsExisting } from '@/hooks/useNewUserDetection';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Button,
} from '@/components';
import { router } from 'expo-router';
import { 
  ShoppingBag, 
  MessageCircle, 
  Users, 
  Shield, 
  Zap,
  ChevronRight,
  ArrowRight,
  CheckCircle
} from 'lucide-react-native';

// const { width: screenWidth } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'marketplace',
      icon: <ShoppingBag size={64} color={theme.colors.primary} />,
      title: 'Buy & Sell Anything',
      description: 'Ghana\'s premier marketplace for buying and selling everything from electronics to services.',
      color: theme.colors.primary,
    },
    {
      id: 'community',
      icon: <Users size={64} color={theme.colors.secondary} />,
      title: 'Join the Community',
      description: 'Connect with buyers and sellers, share experiences, and build lasting relationships.',
      color: theme.colors.secondary,
    },
    {
      id: 'messaging',
      icon: <MessageCircle size={64} color={theme.colors.success} />,
      title: 'Chat Securely',
      description: 'Communicate safely with built-in messaging, offers, and secure payment options.',
      color: theme.colors.success,
    },
    {
      id: 'features',
      icon: <Zap size={64} color={theme.colors.warning} />,
      title: 'Boost Your Listings',
      description: 'Get more visibility with boosted listings, premium features, and seller tools.',
      color: theme.colors.warning,
    },
  ];

  const currentStepData = onboardingSteps[currentStep];

  const handleNext = async () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step, mark user as existing and go to home
      if (user) {
        await markUserAsExisting(user.id);
      }
      router.replace('/(tabs)/home');
    }
  };

  const handleSkip = async () => {
    // Skip onboarding, mark user as existing and go to home
    if (user) {
      await markUserAsExisting(user.id);
    }
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>
          <View
            style={{
              flex: 1,
              paddingVertical: theme.spacing['2xl'],
            }}
          >
            {/* Skip Button */}
            <View style={{ alignItems: 'flex-end', marginBottom: theme.spacing.xl }}>
              <Button
                variant="ghost"
                onPress={handleSkip}
                size="sm"
              >
                Skip Tour
              </Button>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {/* Icon */}
              <View
                style={{
                  backgroundColor: `${currentStepData.color}15`,
                  borderRadius: 80,
                  padding: theme.spacing['2xl'],
                  marginBottom: theme.spacing['3xl'],
                }}
              >
                {currentStepData.icon}
              </View>

              {/* Title */}
              <Text 
                variant="h1" 
                style={{ 
                  marginBottom: theme.spacing.lg,
                  textAlign: 'center',
                  fontSize: 28,
                  fontWeight: '700',
                }}
              >
                {currentStepData.title}
              </Text>

              {/* Description */}
              <Text 
                variant="body" 
                color="secondary" 
                style={{ 
                  textAlign: 'center',
                  lineHeight: 24,
                  paddingHorizontal: theme.spacing.lg,
                  marginBottom: theme.spacing['4xl'],
                }}
              >
                {currentStepData.description}
              </Text>

              {/* Step Indicators */}
              <View 
                style={{ 
                  flexDirection: 'row', 
                  gap: theme.spacing.sm,
                  marginBottom: theme.spacing['4xl'],
                }}
              >
                {onboardingSteps.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: index === currentStep ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: index === currentStep 
                        ? currentStepData.color 
                        : theme.colors.border,
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={{ gap: theme.spacing.lg }}>
              {/* Primary Action */}
              <Button
                variant="primary"
                onPress={handleNext}
                fullWidth
                size="lg"
                icon={currentStep === onboardingSteps.length - 1 ? <CheckCircle size={20} /> : <ChevronRight size={20} />}
                style={{ backgroundColor: currentStepData.color }}
              >
                {currentStep === onboardingSteps.length - 1 ? 'Start Exploring' : 'Continue'}
              </Button>
            </View>

            {/* Welcome Message (Last Step) */}
            {currentStep === onboardingSteps.length - 1 && (
              <View 
                style={{ 
                  marginTop: theme.spacing['2xl'],
                  padding: theme.spacing.lg,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.lg,
                }}
              >
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
                  Welcome to Sellar! 🎉
                </Text>
                <Text variant="caption" color="secondary" style={{ textAlign: 'center', lineHeight: 20 }}>
                  You're all set to start buying and selling. Your account is verified and ready to go!
                </Text>
              </View>
            )}
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}


