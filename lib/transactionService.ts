import { TransactionType, TransactionStatus, PaymentMethod } from '@/hooks/useTransactions';

// Transaction formatting utilities
export const formatTransactionType = (type: TransactionType): string => {
  const typeMap: Record<TransactionType, string> = {
    credit_purchase: 'Credit Purchase',
    credit_usage: 'Credit Usage',
    credit_refund: 'Credit Refund',
    listing_boost: 'Listing Boost',
    listing_promotion: 'Listing Promotion',
    feature_unlock: 'Feature Unlock',
    subscription_payment: 'Subscription Payment',
    commission_earned: 'Commission Earned',
    referral_bonus: 'Referral Bonus',
    verification_fee: 'Verification Fee',
    withdrawal: 'Withdrawal',
    deposit: 'Deposit',
    penalty: 'Penalty',
    bonus: 'Bonus',
    adjustment: 'Adjustment',
  };
  return typeMap[type] || type;
};

export const formatTransactionStatus = (status: TransactionStatus): string => {
  const statusMap: Record<TransactionStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return statusMap[status] || status;
};

export const formatPaymentMethod = (method: PaymentMethod): string => {
  const methodMap: Record<PaymentMethod, string> = {
    credits: 'Credits',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
    card: 'Card Payment',
    paystack: 'Paystack',
    system: 'System',
    manual: 'Manual',
  };
  return methodMap[method] || method;
};

// Transaction status colors
export const getTransactionStatusColor = (status: TransactionStatus): string => {
  const colorMap: Record<TransactionStatus, string> = {
    pending: '#F59E0B', // amber
    processing: '#3B82F6', // blue
    completed: '#10B981', // emerald
    failed: '#EF4444', // red
    cancelled: '#6B7280', // gray
    refunded: '#8B5CF6', // purple
  };
  return colorMap[status] || '#6B7280';
};

// Transaction type colors and icons
export const getTransactionTypeInfo = (type: TransactionType) => {
  const typeInfo: Record<TransactionType, { color: string; icon: string; category: string }> = {
    credit_purchase: { color: '#10B981', icon: 'plus-circle', category: 'credits' },
    credit_usage: { color: '#EF4444', icon: 'minus-circle', category: 'credits' },
    credit_refund: { color: '#8B5CF6', icon: 'refresh-ccw', category: 'credits' },
    listing_boost: { color: '#F59E0B', icon: 'trending-up', category: 'listings' },
    listing_promotion: { color: '#F59E0B', icon: 'megaphone', category: 'promotions' },
    feature_unlock: { color: '#3B82F6', icon: 'unlock', category: 'features' },
    subscription_payment: { color: '#8B5CF6', icon: 'crown', category: 'subscriptions' },
    commission_earned: { color: '#10B981', icon: 'dollar-sign', category: 'earnings' },
    referral_bonus: { color: '#10B981', icon: 'users', category: 'earnings' },
    verification_fee: { color: '#6B7280', icon: 'shield-check', category: 'services' },
    withdrawal: { color: '#EF4444', icon: 'arrow-up-right', category: 'payments' },
    deposit: { color: '#10B981', icon: 'arrow-down-left', category: 'payments' },
    penalty: { color: '#EF4444', icon: 'alert-triangle', category: 'adjustments' },
    bonus: { color: '#10B981', icon: 'gift', category: 'earnings' },
    adjustment: { color: '#6B7280', icon: 'settings', category: 'adjustments' },
  };
  return typeInfo[type] || { color: '#6B7280', icon: 'circle', category: 'other' };
};

// Amount formatting
export const formatAmount = (amount: number, currency: string = 'GHS'): string => {
  const formatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};

export const formatCredits = (credits: number): string => {
  return `${credits.toLocaleString()} credits`;
};

// Transaction direction helpers
export const isIncomingTransaction = (type: TransactionType): boolean => {
  const incomingTypes: TransactionType[] = [
    'credit_purchase',
    'credit_refund',
    'commission_earned',
    'referral_bonus',
    'deposit',
    'bonus',
  ];
  return incomingTypes.includes(type);
};

export const isOutgoingTransaction = (type: TransactionType): boolean => {
  const outgoingTypes: TransactionType[] = [
    'credit_usage',
    'listing_boost',
    'listing_promotion',
    'feature_unlock',
    'subscription_payment',
    'verification_fee',
    'withdrawal',
    'penalty',
  ];
  return outgoingTypes.includes(type);
};

// Transaction grouping
export const groupTransactionsByDate = (transactions: any[]) => {
  const groups: Record<string, any[]> = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupKey: string;
    
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(transaction);
  });
  
  return groups;
};

// Transaction filtering helpers
export const filterTransactionsByType = (transactions: any[], types: TransactionType[]) => {
  return transactions.filter(t => types.includes(t.transaction_type));
};

export const filterTransactionsByStatus = (transactions: any[], statuses: TransactionStatus[]) => {
  return transactions.filter(t => statuses.includes(t.status));
};

export const filterTransactionsByDateRange = (
  transactions: any[], 
  startDate: Date, 
  endDate: Date
) => {
  return transactions.filter(t => {
    const transactionDate = new Date(t.created_at);
    return transactionDate >= startDate && transactionDate <= endDate;
  });
};

// Transaction search
export const searchTransactions = (transactions: any[], query: string) => {
  const lowercaseQuery = query.toLowerCase();
  return transactions.filter(t => 
    t.title.toLowerCase().includes(lowercaseQuery) ||
    t.description?.toLowerCase().includes(lowercaseQuery) ||
    formatTransactionType(t.transaction_type).toLowerCase().includes(lowercaseQuery) ||
    t.payment_reference?.toLowerCase().includes(lowercaseQuery)
  );
};

// Transaction statistics
export const calculateTransactionStats = (transactions: any[]) => {
  const stats = {
    totalTransactions: transactions.length,
    totalIncoming: 0,
    totalOutgoing: 0,
    totalCreditsEarned: 0,
    totalCreditsSpent: 0,
    averageTransactionAmount: 0,
    mostCommonType: '',
    successRate: 0,
  };

  if (transactions.length === 0) return stats;

  let totalAmount = 0;
  const typeCounts: Record<string, number> = {};
  let completedCount = 0;

  transactions.forEach(transaction => {
    totalAmount += Math.abs(transaction.amount);
    
    // Count by type
    typeCounts[transaction.transaction_type] = (typeCounts[transaction.transaction_type] || 0) + 1;
    
    // Track incoming/outgoing
    if (isIncomingTransaction(transaction.transaction_type)) {
      stats.totalIncoming += transaction.amount;
      if (transaction.credits_amount) {
        stats.totalCreditsEarned += transaction.credits_amount;
      }
    } else if (isOutgoingTransaction(transaction.transaction_type)) {
      stats.totalOutgoing += Math.abs(transaction.amount);
      if (transaction.credits_amount) {
        stats.totalCreditsSpent += Math.abs(transaction.credits_amount);
      }
    }
    
    // Count completed transactions
    if (transaction.status === 'completed') {
      completedCount++;
    }
  });

  stats.averageTransactionAmount = totalAmount / transactions.length;
  stats.successRate = (completedCount / transactions.length) * 100;
  
  // Find most common type
  const mostCommonTypeEntry = Object.entries(typeCounts).reduce((a, b) => 
    typeCounts[a[0]] > typeCounts[b[0]] ? a : b
  );
  stats.mostCommonType = mostCommonTypeEntry[0];

  return stats;
};

// Date range presets
export const getDateRangePresets = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const lastThreeMonths = new Date(today);
  lastThreeMonths.setMonth(lastThreeMonths.getMonth() - 3);
  
  const lastYear = new Date(today);
  lastYear.setFullYear(lastYear.getFullYear() - 1);

  return {
    today: { start: today, end: today, label: 'Today' },
    yesterday: { start: yesterday, end: yesterday, label: 'Yesterday' },
    lastWeek: { start: lastWeek, end: today, label: 'Last 7 days' },
    lastMonth: { start: lastMonth, end: today, label: 'Last 30 days' },
    lastThreeMonths: { start: lastThreeMonths, end: today, label: 'Last 3 months' },
    lastYear: { start: lastYear, end: today, label: 'Last year' },
  };
};

// Transaction validation
export const validateTransactionAmount = (amount: number, type: TransactionType): boolean => {
  if (amount <= 0) return false;
  
  // Add specific validation rules based on transaction type
  switch (type) {
    case 'credit_purchase':
      return amount >= 1 && amount <= 10000; // Min 1 GHS, Max 10,000 GHS
    case 'withdrawal':
      return amount >= 5 && amount <= 5000; // Min 5 GHS, Max 5,000 GHS
    default:
      return amount > 0;
  }
};

export const validateCreditsAmount = (credits: number, type: TransactionType): boolean => {
  if (credits <= 0) return false;
  
  switch (type) {
    case 'listing_boost':
      return credits >= 10 && credits <= 1000;
    case 'listing_promotion':
      return credits >= 50 && credits <= 5000;
    case 'feature_unlock':
      return credits >= 5 && credits <= 500;
    default:
      return credits > 0;
  }
};

// Export all utilities
export const transactionUtils = {
  formatTransactionType,
  formatTransactionStatus,
  formatPaymentMethod,
  getTransactionStatusColor,
  getTransactionTypeInfo,
  formatAmount,
  formatCredits,
  isIncomingTransaction,
  isOutgoingTransaction,
  groupTransactionsByDate,
  filterTransactionsByType,
  filterTransactionsByStatus,
  filterTransactionsByDateRange,
  searchTransactions,
  calculateTransactionStats,
  getDateRangePresets,
  validateTransactionAmount,
  validateCreditsAmount,
};
