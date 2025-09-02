import React, { useState } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Text,
  SafeAreaWrapper,
  Container,
  Button,
  LinkButton,
} from '@/components';
import { router } from 'expo-router';
import { 
  ShoppingBag, 
  MessageCircle, 
  Users, 
  Shield, 
  Zap,
  ChevronRight,
  ArrowRight
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

export default function WelcomeScreen() {
  const { theme } = useTheme();
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

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step, go to sign up
      router.push('/(auth)/sign-up');
    }
  };

  const handleSkip = () => {
    router.push('/(auth)/sign-up');
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
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
                Skip
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
                icon={currentStep === onboardingSteps.length - 1 ? <ArrowRight size={20} /> : <ChevronRight size={20} />}
                style={{ backgroundColor: currentStepData.color }}
              >
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Continue'}
              </Button>

              {/* Secondary Action */}
              {currentStep === onboardingSteps.length - 1 && (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <Text variant="body" color="secondary">
                      Already have an account?
                    </Text>
                    <LinkButton
                      variant="primary"
                      onPress={handleSignIn}
                    >
                      Sign In
                    </LinkButton>
                  </View>
                </View>
              )}
            </View>

            {/* Features Preview (Last Step) */}
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
                  What you get with Sellar:
                </Text>
                <View style={{ gap: theme.spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <Shield size={16} color={theme.colors.success} />
                    <Text variant="caption" color="secondary">Secure transactions & verified sellers</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <MessageCircle size={16} color={theme.colors.success} />
                    <Text variant="caption" color="secondary">Built-in chat & offer system</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <Zap size={16} color={theme.colors.success} />
                    <Text variant="caption" color="secondary">Boost listings for better visibility</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}


