import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { CompactTransactionCard } from '@/components/TransactionCard/TransactionCard';
import { supabase } from '@/lib/supabase';
import { Zap, Plus, Building, History, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

interface CreditBalanceProps {
  balance: number;
  maxCredits?: number;
  onTopUp?: () => void;
  onBusinessPlans?: () => void;
  loading?: boolean;
  showRecentTransactions?: boolean;
}

export function CreditBalance({
  balance,
  maxCredits = 1000, // Default max for progress calculation
  onTopUp,
  onBusinessPlans,
  loading = false,
  showRecentTransactions = true,
}: CreditBalanceProps) {
  const { theme } = useTheme();

  
  
  // Use simple state management instead of the problematic useTransactions hook
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = React.useState(false);
  const recentTransactions = transactions.slice(0, 3);
  
  // Fetch transactions once when component mounts
  React.useEffect(() => {
    const fetchTransactions = async () => {
      if (!showRecentTransactions) return;
      
      try {
        setTransactionsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, []); // Only run once on mount
  
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
  }, [balance]); // Remove progressPercentage from dependencies as it's derived from balance

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
          'clamp'
        ),
      },
    ],
  }));

  const buttonContainerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      fadeValue.value,
      [0, 0.5, 1],
      [0, 0, 1],
      'clamp'
    ),
    transform: [
      {
        translateY: interpolate(
          fadeValue.value,
          [0, 1],
          [20, 0],
          'clamp'
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
                    style={{ marginBottom: theme.spacing.md }}
                  />
                  <Text 
                    style={[styles.balanceText, { color: theme.colors.text.primary }]}
                  >
                    {loading ? '...' : (balance || 0).toLocaleString()}
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
          style={[styles.actionButton, { 
            backgroundColor: theme.colors.primary,
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          }]}
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
          Sellar Pro Plan
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

      {/* Recent Transactions */}
      {showRecentTransactions && recentTransactions.length > 0 && (
        <Animated.View style={[{ width: '100%', marginTop: 24 }, buttonContainerAnimatedStyle]}>
          {/* Section Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <History size={20} color={theme.colors.text.primary} />
              <Text 
                variant="h4"
                style={{
                  marginLeft: 8,
                }}
              >
                Recent Activity
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => router.push('/transactions')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 4,
                paddingHorizontal: 8,
              }}
            >
              <Text 
                variant="bodySmall"
                style={{
                  color: theme.colors.primary,
                  marginRight: 4,
                }}
              >
                View All
              </Text>
              <ArrowRight size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Transaction List */}
          <View style={{ gap: 8 }}>
            {recentTransactions.map((transaction) => (
              <CompactTransactionCard
                key={transaction.id}
                transaction={transaction}
                onPress={(t) => router.push('/transactions')}
              />
            ))}
          </View>
        </Animated.View>
      )}
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
  },
  valueContainer: {
    width: '100%',
  },
  valueCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
});
