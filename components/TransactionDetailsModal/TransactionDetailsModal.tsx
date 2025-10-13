import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { Badge } from '@/components/Badge/Badge';
import { 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  Hash,
  FileText,
  CreditCard,
  CheckCircle,
  Package,
  Info,
  Link as LinkIcon
} from 'lucide-react-native';
import { FinancialTransaction as Transaction } from '@/hooks/useFinancialTransactions';

interface TransactionDetailsModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailsModal({ 
  visible, 
  transaction, 
  onClose 
}: TransactionDetailsModalProps) {
  const { theme } = useTheme();

  if (!transaction) return null;

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
        case 'listing_creation':
          return 'Listing Creation';
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
        case 'refund':
          return 'Refund';
        default:
          return transaction.reference_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
    }
    return isIncoming ? 'Credits Earned' : 'Credits Spent';
  };

  const formatFeatureName = (featureName: string): string => {
    // Map feature keys to proper display names
    const featureNameMap: Record<string, string> = {
      'pulse_boost_24h': 'Pulse Boost (24h)',
      'mega_pulse_7d': 'Mega Pulse (7 days)',
      'category_spotlight_3d': 'Category Spotlight (3 days)',
      'ad_refresh': 'Ad Refresh',
      'listing_highlight': 'Listing Highlight (7 days)',
      'urgent_badge': 'Urgent Badge (3 days)',
    };
    
    return featureNameMap[featureName] || featureName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const getTransactionDescription = () => {
    if (transaction.metadata?.description) {
      return transaction.metadata.description;
    }
    if (transaction.metadata?.feature_name) {
      return `Applied ${formatFeatureName(transaction.metadata.feature_name)} to listing`;
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
          return 'Premium feature activated on your listing';
        case 'community_reward':
          return 'Reward for active community engagement';
        case 'referral_bonus':
          return 'Bonus for referring a friend to Sellar';
        case 'payment_purchase':
          return 'Credits purchased successfully via Paystack';
        case 'subscription_upgrade':
          return 'Upgraded to Sellar Pro business plan';
        case 'listing_creation':
          return 'Credits used to create a new listing';
        case 'first_post_bonus':
          return 'Welcome bonus for your first community post';
        case 'viral_post_bonus':
          return 'Bonus for creating a viral community post';
        case 'positive_review_bonus':
          return 'Bonus for leaving a positive review';
        case 'anniversary_bonus':
          return 'Anniversary celebration bonus';
        case 'business_plan_bonus':
          return 'Monthly business plan credit allocation';
        case 'refund':
          return 'Credits refunded to your account';
        default:
          return transaction.reference_type.replace('_', ' ');
      }
    }
    return isIncoming ? 'Credits added to your account' : 'Credits deducted from your account';
  };

  const formatAmount = () => {
    const sign = isIncoming ? '+' : '-';
    return `${sign}${transaction.amount}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const InfoRow = ({ 
    icon, 
    label, 
    value, 
    valueColor 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: string | number; 
    valueColor?: string;
  }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '40',
    }}>
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="secondary" style={{ marginBottom: 2 }}>
          {label}
        </Text>
        <Text 
          variant="body" 
          style={{ 
            fontWeight: '600',
            color: valueColor || theme.colors.text.primary,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Transaction Details"
      size="lg"
      position="bottom"
    >
      <ScrollView 
        style={{ maxHeight: 600 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: theme.spacing.lg }}>
          {/* Transaction Header */}
          <View style={{
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
            backgroundColor: isIncoming ? theme.colors.success + '10' : theme.colors.error + '10',
            borderRadius: theme.borderRadius.lg,
            marginBottom: theme.spacing.xl,
          }}>
            {/* Icon */}
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isIncoming ? theme.colors.success + '20' : theme.colors.error + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.md,
            }}>
              {isIncoming ? (
                <ArrowDownLeft size={32} color={theme.colors.success} />
              ) : (
                <ArrowUpRight size={32} color={theme.colors.error} />
              )}
            </View>

            {/* Amount */}
            <Text 
              variant="h1" 
              style={{ 
                color: isIncoming ? theme.colors.success : theme.colors.error,
                fontWeight: '700',
                marginBottom: theme.spacing.xs,
              }}
            >
              {formatAmount()} Credits
            </Text>

            {/* Type Badge */}
            <Badge
              text={isIncoming ? 'Earned' : 'Spent'}
              variant={isIncoming ? 'success' : 'error'}
              size="md"
            />
          </View>

          {/* Transaction Title & Description */}
          <View style={{
            marginBottom: theme.spacing.xl,
          }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
              {getTransactionTitle()}
            </Text>
            <Text variant="body" color="secondary" style={{ lineHeight: 22 }}>
              {getTransactionDescription()}
            </Text>
          </View>

          {/* Transaction Details */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Transaction Information
            </Text>

            <InfoRow
              icon={<Calendar size={18} color={theme.colors.primary} />}
              label="Date & Time"
              value={formatDate(transaction.created_at)}
            />

            <InfoRow
              icon={<Hash size={18} color={theme.colors.primary} />}
              label="Transaction ID"
              value={transaction.id.split('-')[0].toUpperCase()}
            />

            <InfoRow
              icon={<CreditCard size={18} color={theme.colors.primary} />}
              label="Balance Before"
              value={`${transaction.balance_before} credits`}
            />

            <InfoRow
              icon={<CreditCard size={18} color={theme.colors.primary} />}
              label="Balance After"
              value={`${transaction.balance_after} credits`}
              valueColor={theme.colors.primary}
            />

            <InfoRow
              icon={<CheckCircle size={18} color={theme.colors.success} />}
              label="Status"
              value="Completed"
              valueColor={theme.colors.success}
            />

            {transaction.reference_type && (
              <InfoRow
                icon={<FileText size={18} color={theme.colors.primary} />}
                label="Transaction Type"
                value={transaction.reference_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              />
            )}
          </View>

          {/* Additional Details from Metadata */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Additional Details
              </Text>

              {/* Feature Name */}
              {transaction.metadata.feature_name && (
                <InfoRow
                  icon={<Package size={18} color={theme.colors.primary} />}
                  label="Feature"
                  value={formatFeatureName(transaction.metadata.feature_name)}
                />
              )}

              {/* Payment Amount */}
              {(transaction.metadata.payment_amount || transaction.metadata.amount_paid) && (
                <InfoRow
                  icon={<CreditCard size={18} color={theme.colors.primary} />}
                  label="Amount Paid"
                  value={`GHS ${(transaction.metadata.payment_amount || transaction.metadata.amount_paid).toFixed(2)}`}
                />
              )}

              {/* Plan Name */}
              {transaction.metadata.plan_name && (
                <InfoRow
                  icon={<Package size={18} color={theme.colors.primary} />}
                  label="Plan"
                  value={transaction.metadata.plan_name}
                />
              )}

              {/* Reward Type */}
              {transaction.metadata.reward_type && (
                <InfoRow
                  icon={<Package size={18} color={theme.colors.primary} />}
                  label="Reward Type"
                  value={transaction.metadata.reward_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                />
              )}

              {/* Features (for listing creation) */}
              {transaction.metadata.features && Array.isArray(transaction.metadata.features) && transaction.metadata.features.length > 0 && (
                <View style={{
                  paddingVertical: theme.spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border + '40',
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: theme.spacing.sm,
                  }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.colors.primary + '15',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: theme.spacing.md,
                    }}>
                      <Package size={18} color={theme.colors.primary} />
                    </View>
                    <Text variant="caption" color="secondary">
                      Features Applied
                    </Text>
                  </View>
                  <View style={{ marginLeft: 52 }}>
                    {transaction.metadata.features.map((feature: any, index: number) => (
                      <View 
                        key={index}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: theme.spacing.xs,
                        }}
                      >
                        <Text variant="body" style={{ flex: 1 }}>
                          • {feature.name ? formatFeatureName(feature.name) : (feature.key ? formatFeatureName(feature.key) : 'Unknown Feature')}
                        </Text>
                        <Text variant="bodySmall" color="secondary">
                          {feature.credits} credits
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Reference ID (if not UUID) */}
              {transaction.reference_id && !transaction.reference_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) && (
                <InfoRow
                  icon={<LinkIcon size={18} color={theme.colors.primary} />}
                  label="Reference"
                  value={transaction.reference_id}
                />
              )}
            </View>
          )}

          {/* Info Banner */}
          <View style={{
            backgroundColor: theme.colors.primary + '10',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}>
            <Info size={20} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm, marginTop: 2 }} />
            <Text variant="caption" color="secondary" style={{ flex: 1, lineHeight: 18 }}>
              This transaction has been completed and recorded in your account history. Credits {isIncoming ? 'earned' : 'spent'} are reflected in your current balance.
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}

