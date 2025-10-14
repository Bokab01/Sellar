import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Animated, Dimensions } from 'react-native';
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
  CheckCircle,
  Sparkles
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  gradient: string[];
}

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'marketplace',
      icon: <ShoppingBag size={72} color="#ffffff" strokeWidth={2.5} />,
      title: 'Buy & Sell Anything',
      description: 'Ghana\'s premier marketplace for buying and selling everything from electronics to services.',
      color: theme.colors.primary,
      gradient: [theme.colors.primary, theme.colors.primary + 'DD', theme.colors.primary + 'BB'],
    },
    {
      id: 'community',
      icon: <Users size={72} color="#ffffff" strokeWidth={2.5} />,
      title: 'Join the Community',
      description: 'Connect with buyers and sellers, share experiences, and build lasting relationships.',
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#7C3AED', '#6D28D9'],
    },
    {
      id: 'messaging',
      icon: <MessageCircle size={72} color="#ffffff" strokeWidth={2.5} />,
      title: 'Chat Securely',
      description: 'Communicate safely with built-in messaging, offers, and secure payment options.',
      color: theme.colors.success,
      gradient: [theme.colors.success, '#10B981', '#059669'],
    },
    {
      id: 'features',
      icon: <Zap size={72} color="#ffffff" strokeWidth={2.5} />,
      title: 'Boost Your Listings',
      description: 'Get more visibility with boosted listings, premium features, and seller tools.',
      color: theme.colors.warning,
      gradient: [theme.colors.warning, '#F59E0B', '#D97706'],
    },
  ];

  const currentStepData = onboardingSteps[currentStep];

  // Animate on step change
  useEffect(() => {
    // Reset animations
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    slideAnim.setValue(50);
    iconRotate.setValue(0);

    // Run animations in parallel
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(iconRotate, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const rotateInterpolate = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

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
      <LinearGradient
        colors={[
          currentStepData.gradient[0] + '05',
          currentStepData.gradient[1] + '08',
          theme.colors.background,
        ]}
        style={{ flex: 1 }}
        locations={[0, 0.3, 0.7]}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Container>
            <View
              style={{
                flex: 1,
                paddingVertical: theme.spacing['2xl'],
              }}
            >
              {/* Skip Button */}
              <View style={{ alignItems: 'flex-end', marginBottom: theme.spacing.lg }}>
                <Button
                  variant="ghost"
                  onPress={handleSkip}
                  size="sm"
                  style={{
                    backgroundColor: theme.colors.surface + '80',
                    paddingHorizontal: theme.spacing.lg,
                  }}
                >
                  <Text 
                    variant="bodySmall" 
                    style={{ 
                      color: theme.colors.text.secondary,
                      fontWeight: '600',
                    }}
                  >
                    Skip
                  </Text>
                </Button>
              </View>

              {/* Main Content with Animation */}
              <Animated.View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center',
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}>
                {/* Animated Icon with Gradient Background */}
                <Animated.View
                  style={{
                    marginBottom: theme.spacing['3xl'],
                    transform: [{ scale: scaleAnim }, { rotate: rotateInterpolate }],
                  }}
                >
                  <LinearGradient
                    colors={currentStepData.gradient as any}
                    style={{
                      borderRadius: 100,
                      padding: theme.spacing['3xl'],
                      ...theme.shadows.lg,
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {currentStepData.icon}
                  </LinearGradient>
                  
                  {/* Floating Sparkles */}
                  <View style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                  }}>
                    <Sparkles size={24} color={currentStepData.color} fill={currentStepData.color} />
                  </View>
                </Animated.View>

                {/* Title with Animation */}
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <Text 
                    variant="h1" 
                    style={{ 
                      marginBottom: theme.spacing.md,
                      textAlign: 'center',
                      fontSize: 32,
                      fontWeight: '800',
                      letterSpacing: -0.5,
                      color: theme.colors.text.primary,
                    }}
                  >
                    {currentStepData.title}
                  </Text>
                </Animated.View>

                {/* Description */}
                <Text 
                  variant="body" 
                  color="secondary" 
                  style={{ 
                    textAlign: 'center',
                    lineHeight: 26,
                    paddingHorizontal: theme.spacing.xl,
                    marginBottom: theme.spacing['3xl'],
                    fontSize: 16,
                  }}
                >
                  {currentStepData.description}
                </Text>

                {/* Animated Step Indicators */}
                <View 
                  style={{ 
                    flexDirection: 'row', 
                    gap: theme.spacing.sm,
                    marginBottom: theme.spacing['3xl'],
                  }}
                >
                  {onboardingSteps.map((step, index) => (
                    <Animated.View
                      key={index}
                      style={{
                        width: index === currentStep ? 32 : 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: index === currentStep 
                          ? currentStepData.color 
                          : theme.colors.border,
                        opacity: index === currentStep ? 1 : 0.5,
                      }}
                    />
                  ))}
                </View>
              </Animated.View>

              {/* Bottom Actions */}
              <View style={{ gap: theme.spacing.sm }}>
                {/* Primary Action with Gradient */}
                <LinearGradient
                  colors={currentStepData.gradient as any}
                  style={{
                    borderRadius: theme.borderRadius.xl,
                    ...theme.shadows.lg,
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Button
                    variant="primary"
                    onPress={handleNext}
                    fullWidth
                    size="lg"
                    style={{ 
                      backgroundColor: 'transparent',
                      paddingVertical: theme.spacing.lg,
                    }}
                  >
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}>
                      <Text 
                        variant="body" 
                        style={{ 
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: 17,
                        }}
                      >
                        {currentStep === onboardingSteps.length - 1 ? 'Start Exploring' : 'Continue'}
                      </Text>
                      {currentStep === onboardingSteps.length - 1 ? (
                        <CheckCircle size={20} color="#ffffff" />
                      ) : (
                        <ArrowRight size={20} color="#ffffff" />
                      )}
                    </View>
                  </Button>
                </LinearGradient>
              </View>

              {/* Welcome Message (Last Step) with Animation */}
              {currentStep === onboardingSteps.length - 1 && (
                <Animated.View 
                  style={{ 
                    marginTop: theme.spacing.xl,
                    padding: theme.spacing.lg,
                    backgroundColor: currentStepData.color + '15',
                    borderRadius: theme.borderRadius.xl,
                    borderWidth: 1,
                    borderColor: currentStepData.color + '30',
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  }}
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.sm,
                    marginBottom: theme.spacing.sm,
                  }}>
                    <Sparkles size={20} color={currentStepData.color} fill={currentStepData.color} />
                    <Text 
                      variant="body" 
                      style={{ 
                        color: currentStepData.color,
                        fontWeight: '700',
                        fontSize: 16,
                      }}
                    >
                      Welcome to Sellar!
                    </Text>
                    <Sparkles size={20} color={currentStepData.color} fill={currentStepData.color} />
                  </View>
                  <Text 
                    variant="bodySmall" 
                    color="secondary" 
                    style={{ 
                      textAlign: 'center', 
                      lineHeight: 22,
                    }}
                  >
                    You're all set to start buying and selling. Your account is verified and ready to go!
                  </Text>
                </Animated.View>
              )}
            </View>
          </Container>
        </ScrollView>
      </LinearGradient>
    </SafeAreaWrapper>
  );
}


