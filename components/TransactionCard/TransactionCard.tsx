import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Badge } from '@/components';
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
import { Transaction } from '@/hooks/useTransactions';
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
  const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
  const isIncoming = isIncomingTransaction(transaction.transaction_type);
  const statusColor = getTransactionStatusColor(transaction.status);

  const getStatusIcon = () => {
    const iconProps = { size: 16, color: statusColor };
    
    switch (transaction.status) {
      case 'completed':
        return <CheckCircle {...iconProps} color={theme.colors.success} />;
      case 'pending':
        return <Clock {...iconProps} color={theme.colors.warning} />;
      case 'processing':
        return <RefreshCw {...iconProps} color={theme.colors.primary} />;
      case 'failed':
        return <XCircle {...iconProps} color={theme.colors.error} />;
      case 'cancelled':
        return <XCircle {...iconProps} color={theme.colors.text.secondary} />;
      case 'refunded':
        return <RefreshCw {...iconProps} color={theme.colors.secondary} />;
      default:
        return <Circle {...iconProps} />;
    }
  };

  const getTransactionIcon = () => {
    const iconProps = { size: compact ? 20 : 24, color: typeInfo.color };
    
    if (isIncoming) {
      return <ArrowDownLeft {...iconProps} color={theme.colors.success} />;
    } else {
      return <ArrowUpRight {...iconProps} color={theme.colors.error} />;
    }
  };

  const formatTransactionAmount = () => {
    const sign = isIncoming ? '+' : '-';
    const amountText = formatAmount(Math.abs(transaction.amount), transaction.currency);
    return `${sign}${amountText}`;
  };

  const formatCreditsText = () => {
    if (!transaction.credits_amount) return null;
    const sign = isIncoming ? '+' : '-';
    return `${sign}${formatCredits(Math.abs(transaction.credits_amount))}`;
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
              backgroundColor: typeInfo.color + '20',
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
                {transaction.title}
              </Text>
              
              {/* Status Icon */}
              {getStatusIcon()}
            </View>

            {/* Transaction Type and Description */}
            <Text 
              variant="bodySmall" 
              color="secondary"
              numberOfLines={compact ? 1 : 2}
              style={{ marginBottom: theme.spacing.xs }}
            >
              {formatTransactionType(transaction.transaction_type)}
              {transaction.description && ` • ${transaction.description}`}
            </Text>

            {/* Date and Status */}
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
                  text={formatTransactionStatus(transaction.status)}
                  variant={transaction.status === 'completed' ? 'success' : 
                          transaction.status === 'failed' ? 'error' : 'warning'}
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
              color: isIncoming ? theme.colors.success : theme.colors.error,
              fontWeight: '600',
              marginBottom: theme.spacing.xs,
            }}
          >
            {formatTransactionAmount()}
          </Text>
          
          {/* Credits amount if applicable */}
          {transaction.credits_amount && (
            <Text 
              variant="caption" 
              style={{ 
                color: isIncoming ? theme.colors.success : theme.colors.error,
                opacity: 0.8,
              }}
            >
              {formatCreditsText()}
            </Text>
          )}
        </View>
      </View>

      {/* Payment method if available */}
      {transaction.payment_method && transaction.payment_method !== 'credits' && (
        <View style={{
          marginTop: theme.spacing.md,
          paddingTop: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}>
          <Text variant="caption" color="muted">
            Payment method: {transaction.payment_method.replace('_', ' ').toUpperCase()}
            {transaction.payment_reference && ` • Ref: ${transaction.payment_reference}`}
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
  const isIncoming = isIncomingTransaction(transaction.transaction_type);
  const typeInfo = getTransactionTypeInfo(transaction.transaction_type);

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
          backgroundColor: typeInfo.color + '20',
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
          {transaction.title}
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
        {isIncoming ? '+' : '-'}{formatAmount(Math.abs(transaction.amount), transaction.currency)}
      </Text>
    </TouchableOpacity>
  );
}
