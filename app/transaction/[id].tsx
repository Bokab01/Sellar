import React from 'react';
import { View, ScrollView, Share, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  LoadingSkeleton,
  Badge,
} from '@/components';
import { useTransaction } from '@/hooks/useTransactions';
import { 
  formatTransactionType, 
  formatTransactionStatus, 
  formatAmount, 
  formatCredits,
  formatPaymentMethod,
  getTransactionStatusColor,
  getTransactionTypeInfo,
  isIncomingTransaction 
} from '@/lib/transactionService';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  CreditCard,
  Hash,
  User,
  FileText,
  Share2,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react-native';

export default function TransactionDetailsScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transaction, loading, error, refetch } = useTransaction(id!);

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Transaction Details"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </Container>
      </SafeAreaWrapper>
    );
  }

  if (error || !transaction) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Transaction Details"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text variant="h3" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
            Transaction Not Found
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
            {error || 'The transaction you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
          </Text>
          <Button
            variant="primary"
            size="lg"
            onPress={() => router.back()}
          >
            Go Back
          </Button>
        </Container>
      </SafeAreaWrapper>
    );
  }

  const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
  const isIncoming = isIncomingTransaction(transaction.transaction_type);
  const statusColor = getTransactionStatusColor(transaction.status);

  const getStatusIcon = () => {
    const iconProps = { size: 24, color: statusColor };
    
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
        return <RefreshCw {...iconProps} color={theme.colors.purple} />;
      default:
        return <AlertTriangle {...iconProps} />;
    }
  };

  const handleShare = async () => {
    try {
      const message = `Transaction Details\n\n` +
        `Title: ${transaction.title}\n` +
        `Type: ${formatTransactionType(transaction.transaction_type)}\n` +
        `Amount: ${formatAmount(Math.abs(transaction.amount), transaction.currency)}\n` +
        `Status: ${formatTransactionStatus(transaction.status)}\n` +
        `Date: ${new Date(transaction.created_at).toLocaleString()}\n` +
        `Reference: ${transaction.id}`;

      await Share.share({
        message,
        title: 'Transaction Details',
      });
    } catch (error) {
      console.error('Error sharing transaction:', error);
    }
  };

  const handleDownloadReceipt = () => {
    if (transaction.receipt_url) {
      // TODO: Implement receipt download
      Alert.alert('Download Receipt', 'Receipt download will be implemented soon.');
    } else {
      Alert.alert('No Receipt', 'No receipt is available for this transaction.');
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
    <SafeAreaWrapper>
      <AppHeader
        title="Transaction Details"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="share"
            variant="ghost"
            size="sm"
            onPress={handleShare}
            icon={<Share2 size={20} color={theme.colors.text.primary} />}
          />
        ]}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>
          {/* Transaction Header */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
            alignItems: 'center',
          }}>
            {/* Transaction Icon */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: typeInfo.color + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: theme.spacing.lg,
              }}
            >
              {isIncoming ? (
                <ArrowDownLeft size={40} color={theme.colors.success} />
              ) : (
                <ArrowUpRight size={40} color={theme.colors.error} />
              )}
            </View>

            {/* Amount */}
            <Text 
              variant="h1" 
              style={{ 
                color: isIncoming ? theme.colors.success : theme.colors.error,
                marginBottom: theme.spacing.sm,
                textAlign: 'center',
              }}
            >
              {formatTransactionAmount()}
            </Text>

            {/* Credits */}
            {transaction.credits_amount && (
              <Text 
                variant="h3" 
                style={{ 
                  color: isIncoming ? theme.colors.success : theme.colors.error,
                  opacity: 0.8,
                  marginBottom: theme.spacing.md,
                  textAlign: 'center',
                }}
              >
                {formatCreditsText()}
              </Text>
            )}

            {/* Title */}
            <Text variant="h2" style={{ marginBottom: theme.spacing.sm, textAlign: 'center' }}>
              {transaction.title}
            </Text>

            {/* Status */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {getStatusIcon()}
              <Text 
                variant="h4" 
                style={{ 
                  marginLeft: theme.spacing.sm,
                  color: statusColor,
                }}
              >
                {formatTransactionStatus(transaction.status)}
              </Text>
            </View>
          </View>

          {/* Transaction Details */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
          }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Transaction Details
            </Text>

            {/* Transaction Type */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <FileText size={20} color={theme.colors.text.secondary} />
              <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                <Text variant="bodySmall" color="secondary">Transaction Type</Text>
                <Text variant="body">{formatTransactionType(transaction.transaction_type)}</Text>
              </View>
            </View>

            {/* Transaction ID */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <Hash size={20} color={theme.colors.text.secondary} />
              <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                <Text variant="bodySmall" color="secondary">Transaction ID</Text>
                <Text variant="body" style={{ fontFamily: 'monospace' }}>
                  {transaction.id}
                </Text>
              </View>
            </View>

            {/* Date & Time */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <Calendar size={20} color={theme.colors.text.secondary} />
              <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                <Text variant="bodySmall" color="secondary">Date & Time</Text>
                <Text variant="body">
                  {new Date(transaction.created_at).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            {/* Payment Method */}
            {transaction.payment_method && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}>
                <CreditCard size={20} color={theme.colors.text.secondary} />
                <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                  <Text variant="bodySmall" color="secondary">Payment Method</Text>
                  <Text variant="body">{formatPaymentMethod(transaction.payment_method)}</Text>
                </View>
              </View>
            )}

            {/* Payment Reference */}
            {transaction.payment_reference && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}>
                <Hash size={20} color={theme.colors.text.secondary} />
                <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                  <Text variant="bodySmall" color="secondary">Payment Reference</Text>
                  <Text variant="body" style={{ fontFamily: 'monospace' }}>
                    {transaction.payment_reference}
                  </Text>
                </View>
              </View>
            )}

            {/* Description */}
            {transaction.description && (
              <View style={{
                marginTop: theme.spacing.md,
                padding: theme.spacing.md,
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
              }}>
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                  Description
                </Text>
                <Text variant="body">{transaction.description}</Text>
              </View>
            )}
          </View>

          {/* Balance Information */}
          {(transaction.balance_before !== null || transaction.balance_after !== null) && (
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadows.sm,
            }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
                Balance Information
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {transaction.balance_before !== null && (
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                      Balance Before
                    </Text>
                    <Text variant="h3">
                      {formatCredits(transaction.balance_before)}
                    </Text>
                  </View>
                )}

                {transaction.balance_after !== null && (
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
                      Balance After
                    </Text>
                    <Text variant="h3">
                      {formatCredits(transaction.balance_after)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xl,
          }}>
            {transaction.receipt_url && (
              <Button
                variant="tertiary"
                size="lg"
                onPress={handleDownloadReceipt}
                icon={<Download size={20} color={theme.colors.primary} />}
                style={{ flex: 1 }}
              >
                Download Receipt
              </Button>
            )}

            <Button
              variant="primary"
              size="lg"
              onPress={handleShare}
              icon={<Share2 size={20} color={theme.colors.white} />}
              style={{ flex: 1 }}
            >
              Share Details
            </Button>
          </View>

          {/* Related Actions */}
          {transaction.status === 'failed' && (
            <View style={{
              backgroundColor: theme.colors.error + '10',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
            }}>
              <Text variant="h4" style={{ color: theme.colors.error, marginBottom: theme.spacing.md }}>
                Transaction Failed
              </Text>
              <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
                This transaction could not be completed. You can try again or contact support if the problem persists.
              </Text>
              <Button
                variant="primary"
                size="md"
                onPress={() => {
                  // TODO: Implement retry logic based on transaction type
                  Alert.alert('Retry Transaction', 'Retry functionality will be implemented soon.');
                }}
              >
                Try Again
              </Button>
            </View>
          )}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
