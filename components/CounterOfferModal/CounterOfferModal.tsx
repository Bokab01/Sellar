import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { AppModal } from '@/components/Modal/Modal';
import { PriceDisplay } from '@/components/PriceDisplay/PriceDisplay';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Clock } from 'lucide-react-native';

interface CounterOfferModalProps {
  visible: boolean;
  onClose: () => void;
  originalOffer: {
    id: string;
    amount: number;
    currency: string;
    buyer: {
      name: string;
      avatar?: string;
      rating?: number;
    };
    message?: string;
    expiresAt?: string;
  };
  listingPrice: number;
  onSubmitCounter: (counterOffer: {
    amount: number;
    message: string;
    parentOfferId: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function CounterOfferModal({
  visible,
  onClose,
  originalOffer,
  listingPrice,
  onSubmitCounter,
  loading = false,
}: CounterOfferModalProps) {
  const { theme } = useTheme();
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCounterAmount('');
      setCounterMessage('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!counterAmount.trim()) {
      Alert.alert('Error', 'Please enter a counter offer amount');
      return;
    }

    const amount = Number(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount >= listingPrice) {
      Alert.alert('Invalid Counter Offer', 'Your counter offer should be less than the listing price');
      return;
    }

    if (amount <= originalOffer.amount) {
      Alert.alert(
        'Counter Offer Too Low',
        'Your counter offer should be higher than the original offer to be meaningful',
        [
          { text: 'Continue Anyway', onPress: () => submitCounter(amount) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    await submitCounter(amount);
  };

  const submitCounter = async (amount: number) => {
    setSubmitting(true);
    try {
      await onSubmitCounter({
        amount,
        message: counterMessage.trim(),
        parentOfferId: originalOffer.id,
      });
      onClose();
    } catch (error) {
      console.error('Counter offer error:', error);
      Alert.alert('Error', 'Failed to send counter offer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDifference = () => {
    const amount = Number(counterAmount);
    if (isNaN(amount)) return null;
    
    const difference = amount - originalOffer.amount;
    const percentage = ((difference / originalOffer.amount) * 100).toFixed(1);
    
    return {
      amount: Math.abs(difference),
      percentage: Math.abs(Number(percentage)),
      isIncrease: difference > 0,
    };
  };

  const difference = calculateDifference();

  const getTimeRemaining = () => {
    if (!originalOffer.expiresAt) return null;
    
    const now = new Date();
    const expires = new Date(originalOffer.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const timeRemaining = getTimeRemaining();
  const isExpired = timeRemaining === 'Expired';

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Make Counter Offer"
      size="lg"
    >
      <ScrollView style={{ maxHeight: 600 }}>
        <View style={{ padding: theme.spacing.lg }}>
          {/* Original Offer Summary */}
          <View style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              Original Offer
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <Avatar 
                source={originalOffer.buyer.avatar} 
                name={originalOffer.buyer.name}
                size="md"
              />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {originalOffer.buyer.name}
                </Text>
                {originalOffer.buyer.rating && (
                  <Text variant="caption" color="muted">
                    ⭐ {originalOffer.buyer.rating.toFixed(1)}
                  </Text>
                )}
              </View>
              <PriceDisplay 
                amount={originalOffer.amount} 
                currency={originalOffer.currency}
                size="lg"
              />
            </View>

            {originalOffer.message && (
              <View style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.sm,
                padding: theme.spacing.sm,
                marginTop: theme.spacing.sm,
              }}>
                <Text variant="body" style={{ fontStyle: 'italic' }}>
                  &quot;{originalOffer.message}&quot;
                </Text>
              </View>
            )}

            {timeRemaining && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
                <Clock size={14} color={isExpired ? theme.colors.error : theme.colors.warning} />
                <Text 
                  variant="caption" 
                  style={{ 
                    color: isExpired ? theme.colors.error : theme.colors.warning,
                    fontWeight: '500',
                  }}
                >
                  {timeRemaining}
                </Text>
              </View>
            )}
          </View>

          {/* Counter Offer Form */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Your Counter Offer
            </Text>

            {/* Price Comparison */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.sm,
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text variant="caption" color="muted">Original Offer</Text>
                <PriceDisplay 
                  amount={originalOffer.amount} 
                  currency={originalOffer.currency}
                  size="sm"
                />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="caption" color="muted">Listing Price</Text>
                <PriceDisplay 
                  amount={listingPrice} 
                  currency={originalOffer.currency}
                  size="sm"
                />
              </View>
            </View>

            {/* Counter Amount Input */}
            <Input
              label="Counter Offer Amount"
              value={counterAmount}
              onChangeText={setCounterAmount}
              placeholder="Enter your counter offer"
              keyboardType="numeric"
              leftIcon={<DollarSign size={20} color={theme.colors.text.secondary} />}
              style={{ marginBottom: theme.spacing.md }}
            />

            {/* Price Difference Indicator */}
            {difference && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                padding: theme.spacing.sm,
                backgroundColor: difference.isIncrease 
                  ? theme.colors.success + '15' 
                  : theme.colors.error + '15',
                borderRadius: theme.borderRadius.sm,
                marginBottom: theme.spacing.md,
              }}>
                {difference.isIncrease ? (
                  <TrendingUp size={16} color={theme.colors.success} />
                ) : (
                  <TrendingDown size={16} color={theme.colors.error} />
                )}
                <Text 
                  variant="caption" 
                  style={{ 
                    color: difference.isIncrease ? theme.colors.success : theme.colors.error,
                    fontWeight: '600',
                  }}
                >
                  {difference.isIncrease ? '+' : '-'}GHS {(difference.amount || 0).toLocaleString()} 
                  ({difference.percentage}% {difference.isIncrease ? 'higher' : 'lower'})
                </Text>
              </View>
            )}

            {/* Counter Message */}
            <Input
              label="Message (Optional)"
              value={counterMessage}
              onChangeText={setCounterMessage}
              placeholder="Explain your counter offer..."
              autoExpand
              minHeight={80}
              maxHeight={150}
              maxLength={300}
              style={{ marginBottom: theme.spacing.md }}
            />

            {/* Guidelines */}
            <View style={{
              backgroundColor: theme.colors.info + '15',
              borderRadius: theme.borderRadius.sm,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
                <AlertCircle size={16} color={theme.colors.info} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" style={{ color: theme.colors.info, fontWeight: '600', marginBottom: theme.spacing.xs }}>
                    Counter Offer Tips:
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.info, lineHeight: 16 }}>
                    • Be reasonable - extreme counters are often rejected{'\n'}
                    • Explain your reasoning in the message{'\n'}
                    • Consider the item&apos;s condition and market value{'\n'}
                    • Counter offers expire in 3 days
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              onPress={handleSubmit}
              loading={submitting || loading}
              disabled={!counterAmount.trim() || isExpired}
              fullWidth
            >
              Send Counter Offer
            </Button>
            
            <Button
              variant="ghost"
              onPress={onClose}
              disabled={submitting || loading}
              fullWidth
            >
              Cancel
            </Button>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}
