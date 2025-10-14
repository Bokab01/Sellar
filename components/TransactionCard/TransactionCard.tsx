import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Badge } from '@/components/Badge/Badge';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Circle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react-native';
import { FinancialTransaction as Transaction } from '@/hooks/useFinancialTransactions';
import { 
  formatTransactionType, 
  formatTransactionStatus, 
  formatAmount, 
  formatCredits,
  getTransactionStatusColor,
  getTransactionTypeInfo,
  isIncomingTransaction 
} from '@/lib/transactionService';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  showDate?: boolean;
  compact?: boolean;
}

export function TransactionCard({ 
  transaction, 
  onPress, 
  showDate = true,
  compact = false 
}: TransactionCardProps) {
  const { theme } = useTheme();
  const isIncoming = transaction.type === 'earned';
  const isSubscriptionPayment = transaction.type === 'subscription_payment';

  const getTransactionIcon = () => {
    const iconProps = { size: compact ? 20 : 24 };
    
    if (isIncoming) {
      return <ArrowDownLeft {...iconProps} color={theme.colors.success} />;
    } else {
      return <ArrowUpRight {...iconProps} color={theme.colors.error} />;
    }
  };

  const formatTransactionAmount = () => {
    // For subscription payments, show the GHS amount paid instead of credits
    if (isSubscriptionPayment) {
      const amountPaid = transaction.metadata?.amount_paid || transaction.metadata?.payment_amount;
      return amountPaid ? `GHS ${Number(amountPaid).toFixed(2)}` : 'Subscription';
    }
    
    const sign = isIncoming ? '+' : '-';
    return `${sign}${transaction.amount} credits`;
  };

  const getTransactionTitle = () => {
    // For subscription payments, show plan name
    if (isSubscriptionPayment) {
      return transaction.metadata?.plan_name || 'Sellar Pro Subscription';
    }
    
    if (transaction.metadata?.reason) {
      return transaction.metadata.reason;
    }
    if (transaction.reference_type) {
      switch (transaction.reference_type) {
        case 'feature_purchase':
          return 'Feature Purchase';
        case 'community_reward':
          return 'Community Reward';
        case 'referral_bonus':
          return 'Referral Bonus';
        case 'payment_purchase':
          return 'Credit Purchase';
        case 'subscription_upgrade':
          return 'Business Plan Upgrade';
        case 'first_post_bonus':
          return 'First Post Bonus';
        case 'viral_post_bonus':
          return 'Viral Post Bonus';
        case 'positive_review_bonus':
          return 'Positive Review Bonus';
        case 'anniversary_bonus':
          return 'Anniversary Bonus';
        case 'business_plan_bonus':
          return 'Business Plan Bonus';
        default:
          return transaction.reference_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
    }
    return isIncoming ? 'Credits Earned' : 'Credits Spent';
  };

  const getTransactionDescription = () => {
    // For subscription payments, show specific message
    if (isSubscriptionPayment) {
      const isTrialConversion = transaction.metadata?.is_trial_conversion || transaction.metadata?.source === 'trial_conversion';
      return isTrialConversion 
        ? 'Free trial converted to paid subscription' 
        : 'Subscription payment processed successfully';
    }
    
    if (transaction.metadata?.description) {
      return transaction.metadata.description;
    }
    if (transaction.metadata?.feature_name) {
      return `Applied ${transaction.metadata.feature_name} to listing`;
    }
    if (transaction.metadata?.reward_type) {
      switch (transaction.metadata.reward_type) {
        case 'first_post':
          return 'Congratulations on your first post!';
        case 'viral_post':
          return 'Your post went viral!';
        case 'positive_review':
          return 'Thank you for the positive review!';
        case 'anniversary':
          return 'Happy anniversary with Sellar!';
        default:
          return 'Community engagement reward';
      }
    }
    if (transaction.reference_type) {
      switch (transaction.reference_type) {
        case 'feature_purchase':
          return 'Premium feature activated';
        case 'community_reward':
          return 'Reward for community engagement';
        case 'referral_bonus':
          return 'Bonus for referring a friend';
        case 'payment_purchase':
          return 'Credits purchased successfully';
        case 'subscription_upgrade':
          return 'Upgraded to business plan';
        case 'first_post_bonus':
          return 'Welcome bonus for your first post';
        case 'viral_post_bonus':
          return 'Bonus for creating a viral post';
        case 'positive_review_bonus':
          return 'Bonus for leaving a positive review';
        case 'anniversary_bonus':
          return 'Anniversary celebration bonus';
        case 'business_plan_bonus':
          return 'Monthly business plan allocation';
        default:
          return transaction.reference_type.replace('_', ' ');
      }
    }
    return isIncoming ? 'Credits added to your account' : 'Credits deducted from your account';
  };

  const getReferenceDisplay = () => {
    if (!transaction.reference_id) return null;
    
    // For feature purchases, show the feature name if available
    if (transaction.reference_type === 'feature_purchase' && transaction.metadata?.feature_name) {
      return `Feature: ${transaction.metadata.feature_name}`;
    }
    
    // For community rewards, show the reward type
    if (transaction.reference_type === 'community_reward' && transaction.metadata?.reward_type) {
      return `Reward: ${transaction.metadata.reward_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`;
    }
    
    // For referral bonuses, show it's a referral
    if (transaction.reference_type === 'referral_bonus') {
      return 'Referral Bonus';
    }
    
    // For payment purchases, show the amount paid
    if (transaction.reference_type === 'payment_purchase' && transaction.metadata?.payment_amount) {
      return `Payment: GHS ${transaction.metadata.payment_amount}`;
    }
    
    // For subscription upgrades, show the plan
    if (transaction.reference_type === 'subscription_upgrade' && transaction.metadata?.plan_name) {
      return `Plan: ${transaction.metadata.plan_name}`;
    }
    
    // Default: show reference ID if it's not a UUID (which would be user-unfriendly)
    if (transaction.reference_id && !transaction.reference_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return `Ref: ${transaction.reference_id}`;
    }
    
    return null;
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(transaction)}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: compact ? theme.spacing.md : theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      }}
      activeOpacity={0.7}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Left side - Icon and details */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {/* Transaction Icon */}
          <View
            style={{
              width: compact ? 40 : 48,
              height: compact ? 40 : 48,
              borderRadius: compact ? 20 : 24,
              backgroundColor: isIncoming ? theme.colors.success + '20' : theme.colors.error + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: theme.spacing.md,
            }}
          >
            {getTransactionIcon()}
          </View>

          {/* Transaction Details */}
          <View style={{ flex: 1 }}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              marginBottom: theme.spacing.xs,
            }}>
              <Text 
                variant={compact ? "body" : "h4"} 
                style={{ 
                  flex: 1,
                  marginRight: theme.spacing.sm,
                }}
                numberOfLines={1}
              >
                {getTransactionTitle()}
              </Text>
              
              {/* Status Icon - Always completed for credit transactions */}
              <CheckCircle size={16} color={theme.colors.success} />
            </View>

            {/* Transaction Description */}
            <Text 
              variant="bodySmall" 
              color="secondary"
              numberOfLines={compact ? 1 : 2}
              style={{ marginBottom: theme.spacing.xs }}
            >
              {getTransactionDescription()}
            </Text>

            {/* Date */}
            {showDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="caption" color="muted">
                  {new Date(transaction.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.text.muted,
                    marginHorizontal: theme.spacing.xs,
                  }}
                />
                
                <Badge
                  text="Completed"
                  variant="success"
                  size="small"
                />
              </View>
            )}
          </View>
        </View>

        {/* Right side - Amount */}
        <View style={{ alignItems: 'flex-end', marginLeft: theme.spacing.md }}>
          <Text 
            variant={compact ? "body" : "h4"}
            style={{ 
              color: isSubscriptionPayment ? theme.colors.primary : (isIncoming ? theme.colors.success : theme.colors.error),
              fontWeight: '600',
              marginBottom: theme.spacing.xs,
            }}
          >
            {formatTransactionAmount()}
          </Text>
          
          {/* Balance info - Only show for credit transactions */}
          {!isSubscriptionPayment && (
            <Text 
              variant="caption" 
              style={{ 
                color: theme.colors.text.secondary,
                opacity: 0.8,
              }}
            >
              Balance: {transaction.balance_after}
            </Text>
          )}
        </View>
      </View>

      {/* Reference info if available */}
      {getReferenceDisplay() && (
        <View style={{
          marginTop: theme.spacing.md,
          paddingTop: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}>
          <Text variant="caption" color="muted">
            {getReferenceDisplay()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Compact version for smaller spaces
export function CompactTransactionCard(props: Omit<TransactionCardProps, 'compact'>) {
  return <TransactionCard {...props} compact showDate={false} />;
}

// Transaction list item for simple lists
export function TransactionListItem({ transaction, onPress }: TransactionCardProps) {
  const { theme } = useTheme();
  const isIncoming = transaction.type === 'earned';

  const getTransactionTitle = () => {
    if (transaction.metadata?.reason) {
      return transaction.metadata.reason;
    }
    if (transaction.reference_type) {
      switch (transaction.reference_type) {
        case 'feature_purchase':
          return 'Feature Purchase';
        case 'community_reward':
          return 'Community Reward';
        case 'referral_bonus':
          return 'Referral Bonus';
        case 'payment_purchase':
          return 'Credit Purchase';
        case 'subscription_upgrade':
          return 'Business Plan Upgrade';
        case 'first_post_bonus':
          return 'First Post Bonus';
        case 'viral_post_bonus':
          return 'Viral Post Bonus';
        case 'positive_review_bonus':
          return 'Positive Review Bonus';
        case 'anniversary_bonus':
          return 'Anniversary Bonus';
        case 'business_plan_bonus':
          return 'Business Plan Bonus';
        default:
          return transaction.reference_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
    }
    return isIncoming ? 'Credits Earned' : 'Credits Spent';
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(transaction)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isIncoming ? theme.colors.success + '20' : theme.colors.error + '20',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}
      >
        {isIncoming ? (
          <ArrowDownLeft size={16} color={theme.colors.success} />
        ) : (
          <ArrowUpRight size={16} color={theme.colors.error} />
        )}
      </View>

      {/* Details */}
      <View style={{ flex: 1 }}>
        <Text variant="body" numberOfLines={1} style={{ marginBottom: 2 }}>
          {getTransactionTitle()}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {new Date(transaction.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Amount */}
      <Text 
        variant="body"
        style={{ 
          color: isIncoming ? theme.colors.success : theme.colors.error,
          fontWeight: '600',
        }}
      >
        {isIncoming ? '+' : '-'}{transaction.amount} credits
      </Text>
    </TouchableOpacity>
  );
}
