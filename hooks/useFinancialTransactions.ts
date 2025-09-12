import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase-client';

// Financial Transaction Types (from migration 18)
export type TransactionType = 
  | 'credit_purchase' 
  | 'credit_usage' 
  | 'credit_refund' 
  | 'listing_boost' 
  | 'listing_promotion' 
  | 'feature_unlock' 
  | 'subscription_payment' 
  | 'commission_earned' 
  | 'referral_bonus' 
  | 'verification_fee' 
  | 'withdrawal' 
  | 'deposit' 
  | 'penalty' 
  | 'bonus' 
  | 'adjustment';

export type TransactionStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'refunded';

export type PaymentMethod = 
  | 'credits' 
  | 'mobile_money' 
  | 'bank_transfer' 
  | 'card' 
  | 'paystack' 
  | 'system' 
  | 'manual';

export interface FinancialTransaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  credits_amount?: number;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  payment_provider?: string;
  title: string;
  description?: string;
  category?: string;
  related_listing_id?: string;
  related_order_id?: string;
  related_subscription_id?: string;
  related_user_id?: string;
  balance_before?: number;
  balance_after?: number;
  metadata?: any;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  totalCredits: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
}

export interface TransactionAnalytics {
  transactionsByType: Array<{
    type: TransactionType;
    count: number;
    totalAmount: number;
  }>;
  transactionsByStatus: Array<{
    status: TransactionStatus;
    count: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
  totals: {
    transaction_count: number;
    credits_spent: number;
    credits_earned: number;
  };
  by_type: Record<TransactionType, {
    count: number;
    totalAmount: number;
  }>;
}

// Main hook for fetching financial transactions
export function useFinancialTransactions(options: {
  filters?: TransactionFilters;
  limit?: number;
  offset?: number;
} = {}) {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { filters = {}, limit = 20, offset = 0 } = options;

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.type) {
        query = query.eq('transaction_type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTransactions(data || []);
      setHasMore((data || []).length === limit);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [user, filters, limit, offset]);

  const refresh = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    // Implementation for pagination would go here
  }, [hasMore, loading]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    hasMore,
    refresh,
    loadMore
  };
}

// Hook for fetching a single transaction
export function useFinancialTransaction(transactionId: string) {
  const [transaction, setTransaction] = useState<FinancialTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!transactionId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setTransaction(data);
    } catch (err) {
      console.error('Error fetching transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction');
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  const refresh = useCallback(async () => {
    await fetchTransaction();
  }, [fetchTransaction]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  return {
    transaction,
    loading,
    error,
    refresh
  };
}

// Hook for transaction summary
export function useTransactionSummary(userId?: string) {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchSummary = useCallback(async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_transaction_summary', { user_id: targetUserId });

      if (fetchError) {
        throw fetchError;
      }

      setSummary(data);
    } catch (err) {
      console.error('Error fetching transaction summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction summary');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh: fetchSummary,
    refetch: fetchSummary // Alias for compatibility
  };
}

// Hook for transaction analytics
export function useTransactionAnalytics(userId?: string) {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<TransactionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchAnalytics = useCallback(async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_transaction_analytics', { user_id: targetUserId });

      if (fetchError) {
        throw fetchError;
      }

      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching transaction analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction analytics');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refresh: fetchAnalytics,
    refetch: fetchAnalytics // Alias for compatibility
  };
}

// Hook for transaction categories
export function useTransactionCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('category')
        .not('category', 'is', null)
        .order('category');

      if (fetchError) {
        throw fetchError;
      }

      const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching transaction categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories
  };
}

// Helper functions
export function getTransactionTypeInfo(type: TransactionType) {
  const typeInfo = {
    credit_purchase: { label: 'Credit Purchase', icon: '💰', color: 'success' },
    credit_usage: { label: 'Credit Usage', icon: '💸', color: 'warning' },
    credit_refund: { label: 'Credit Refund', icon: '↩️', color: 'info' },
    listing_boost: { label: 'Listing Boost', icon: '🚀', color: 'primary' },
    listing_promotion: { label: 'Listing Promotion', icon: '📢', color: 'primary' },
    feature_unlock: { label: 'Feature Unlock', icon: '🔓', color: 'success' },
    subscription_payment: { label: 'Subscription', icon: '📅', color: 'primary' },
    commission_earned: { label: 'Commission', icon: '💼', color: 'success' },
    referral_bonus: { label: 'Referral Bonus', icon: '🎁', color: 'success' },
    verification_fee: { label: 'Verification Fee', icon: '✅', color: 'warning' },
    withdrawal: { label: 'Withdrawal', icon: '💸', color: 'warning' },
    deposit: { label: 'Deposit', icon: '💰', color: 'success' },
    penalty: { label: 'Penalty', icon: '⚠️', color: 'error' },
    bonus: { label: 'Bonus', icon: '🎁', color: 'success' },
    adjustment: { label: 'Adjustment', icon: '⚖️', color: 'info' }
  };

  return typeInfo[type] || { label: type, icon: '📄', color: 'default' };
}

export function isIncomingTransaction(type: TransactionType): boolean {
  const incomingTypes: TransactionType[] = [
    'credit_purchase',
    'commission_earned',
    'referral_bonus',
    'deposit',
    'bonus',
    'credit_refund'
  ];
  return incomingTypes.includes(type);
}

export function formatTransactionType(type: TransactionType): string {
  return getTransactionTypeInfo(type).label;
}

export function formatPaymentMethod(method: PaymentMethod): string {
  const methodLabels = {
    credits: 'Credits',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
    card: 'Card',
    paystack: 'Paystack',
    system: 'System',
    manual: 'Manual'
  };
  return methodLabels[method] || method;
}

export function formatAmount(amount: number, currency: string = 'GHS'): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatCredits(credits: number): string {
  return `${credits.toLocaleString()} credits`;
}

export function formatTransactionStatus(status: TransactionStatus): string {
  const statusLabels = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded'
  };
  return statusLabels[status] || status;
}

export function getTransactionStatusColor(status: TransactionStatus): string {
  const statusColors = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
    cancelled: '#6b7280',
    refunded: '#8b5cf6'
  };
  return statusColors[status] || '#6b7280';
}

export function groupTransactionsByDate(transactions: FinancialTransaction[]): Record<string, FinancialTransaction[]> {
  const grouped: Record<string, FinancialTransaction[]> = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.created_at).toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(transaction);
  });
  
  return grouped;
}

export function searchTransactions(transactions: FinancialTransaction[], query: string): FinancialTransaction[] {
  if (!query.trim()) return transactions;
  
  const lowercaseQuery = query.toLowerCase();
  return transactions.filter(transaction => 
    transaction.title.toLowerCase().includes(lowercaseQuery) ||
    transaction.description?.toLowerCase().includes(lowercaseQuery) ||
    transaction.transaction_type.toLowerCase().includes(lowercaseQuery)
  );
}
