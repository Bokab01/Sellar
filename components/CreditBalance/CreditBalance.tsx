import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Zap, Plus, Building } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface CreditBalanceProps {
  balance: number;
  maxCredits?: number;
  onTopUp?: () => void;
  onBusinessPlans?: () => void;
  loading?: boolean;
}

export function CreditBalance({
  balance,
  maxCredits = 1000, // Default max for progress calculation
  onTopUp,
  onBusinessPlans,
  loading = false,
}: CreditBalanceProps) {
  const { theme } = useTheme();
  
  // Animation values
  const scaleValue = useSharedValue(0);
  const fadeValue = useSharedValue(0);
  const progressValue = useSharedValue(0);
  
  // Calculate progress percentage (0-100)
  const progressPercentage = Math.min((balance / maxCredits) * 100, 100);
  
  useEffect(() => {
    // Animate entrance
    scaleValue.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 150 }));
    fadeValue.value = withDelay(100, withSpring(1, { damping: 20, stiffness: 100 }));
    progressValue.value = withDelay(400, withSpring(progressPercentage, { damping: 20, stiffness: 80 }));
  }, [balance, progressPercentage]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: fadeValue.value,
  }));

  const balanceTextAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          scaleValue.value,
          [0, 0.8, 1],
          [0, 1.1, 1],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const buttonContainerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      fadeValue.value,
      [0, 0.5, 1],
      [0, 0, 1],
      Extrapolate.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(
          fadeValue.value,
          [0, 1],
          [20, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Credit Balance Circle */}
      <View style={styles.circleContainer}>
        <AnimatedCircularProgress
          size={200}
          width={12}
          fill={progressPercentage}
          tintColor={theme.colors.primary}
          backgroundColor={theme.colors.surfaceVariant}
          rotation={0}
          lineCap="round"
          duration={1000}
          delay={400}
        >
          {() => (
            <View style={styles.centerContent}>
              <Animated.View style={balanceTextAnimatedStyle}>
                <View style={styles.balanceContainer}>
                  <Zap 
                    size={24} 
                    color={theme.colors.primary} 
                    style={{ marginBottom: 4 }}
                  />
                  <Text 
                    style={[styles.balanceText, { color: theme.colors.text.primary }]}
                  >
                    {loading ? '...' : balance.toLocaleString()}
                  </Text>
                  <Text 
                    style={[styles.creditsLabel, { color: theme.colors.text.muted, textTransform: 'uppercase' }]}
                  >
                    Credits
                  </Text>
                </View>
              </Animated.View>
            </View>
          )}
        </AnimatedCircularProgress>
        
        {/* Progress indicator dots */}
        <View style={styles.progressDots}>
          {[...Array(4)].map((_, index) => {
            const dotProgress = (index + 1) * 25;
            const isActive = progressPercentage >= dotProgress;
            return (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: isActive 
                      ? theme.colors.primary 
                      : theme.colors.surfaceVariant,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Action Buttons */}
      <Animated.View style={[styles.buttonContainer, buttonContainerAnimatedStyle]}>
        <Button
          variant="primary"
          onPress={onTopUp}
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          icon={<Plus size={20} color="#FFFFFF" />}
        >
          Top Up Credits
        </Button>
        
        <Button
          variant="tertiary"
          onPress={onBusinessPlans}
          style={[styles.actionButton, { borderColor: theme.colors.primary }]}
          icon={<Building size={20} color={theme.colors.primary} />}
        >
          Business Plans
        </Button>
      </Animated.View>

      {/* Credit Value Display */}
      <Animated.View style={[styles.valueContainer, buttonContainerAnimatedStyle]}>
        <View style={[styles.valueCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={{ color: theme.colors.text.muted, fontSize: 12 }}>
            Estimated Value
          </Text>
          <Text 
            style={[styles.valueText, { color: theme.colors.success }]}
          >
            GHS {(balance * 0.154).toFixed(2)}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 32,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 2,
  },
  creditsLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  progressDots: {
    position: 'absolute',
    bottom: -20,
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  valueContainer: {
    width: '100%',
  },
  valueCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
});
