import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase-client';

// Financial Transaction Types (from migration 18)
export type TransactionType = 
  | 'credit_purchase' | 'credit_usage' | 'credit_refund'
  | 'listing_boost' | 'listing_promotion' | 'feature_unlock'
  | 'subscription_payment' | 'commission_earned' | 'referral_bonus'
  | 'verification_fee' | 'withdrawal' | 'deposit'
  | 'penalty' | 'bonus' | 'adjustment';

export type TransactionStatus = 
  | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface FinancialTransaction {
  id: string;
  user_id: string;
  type: 'earned' | 'spent';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id?: string;
  reference_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
  // Additional properties for transaction details
  transaction_type?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  title?: string;
  description?: string;
  currency?: string;
  credits_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  receipt_url?: string;
}

export interface TransactionFilters {
  id?: string;
  type?: 'earned' | 'spent';
  reference_type?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface TransactionSummary {
  credits: {
    current_balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
  };
  transactions: {
    total_count: number;
    earned_count: number;
    spent_count: number;
    total_earned_amount: number;
    total_spent_amount: number;
  };
  recent_transactions: FinancialTransaction[];
}

export interface TransactionAnalytics {
  transaction_type: 'earned' | 'spent';
  total_count: number;
  total_amount: number;
  avg_amount: number;
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

  // Stabilize user ID and pagination params
  const stableUserId = user?.id;
  const stableLimit = limit;
  const stableOffset = offset;
  
  // Stabilize filters with proper dependency tracking
  const filterKey = `${filters.type || ''}-${filters.reference_type || ''}-${filters.dateFrom || ''}-${filters.dateTo || ''}-${filters.minAmount || ''}-${filters.maxAmount || ''}`;
  const stableFilters = useMemo(() => filters, [filterKey]);

  const fetchTransactions = useCallback(async () => {
    if (!stableUserId) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', stableUserId)
        .order('created_at', { ascending: false })
        .range(stableOffset, stableOffset + stableLimit - 1);

      // Apply filters
      if (stableFilters.type) {
        query = query.eq('type', stableFilters.type);
      }
      if (stableFilters.reference_type) {
        query = query.eq('reference_type', stableFilters.reference_type);
      }
      if (stableFilters.dateFrom) {
        query = query.gte('created_at', stableFilters.dateFrom);
      }
      if (stableFilters.dateTo) {
        query = query.lte('created_at', stableFilters.dateTo);
      }
      if (stableFilters.minAmount !== undefined) {
        query = query.gte('amount', stableFilters.minAmount);
      }
      if (stableFilters.maxAmount !== undefined) {
        query = query.lte('amount', stableFilters.maxAmount);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTransactions(data || []);
      setHasMore((data || []).length === stableLimit);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [stableUserId, stableFilters, stableLimit, stableOffset]);

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

// Hook for transaction summary
export function useTransactionSummary(userId?: string) {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = useMemo(() => userId || user?.id, [userId, user?.id]);

  const fetchSummary = useCallback(async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_user_transaction_summary', { p_user_id: targetUserId });

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

  const refresh = useCallback(async () => {
    await fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh,
    refetch: refresh // Alias for compatibility
  };
}

// Hook for transaction analytics
export function useTransactionAnalytics(userId?: string) {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<TransactionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = useMemo(() => userId || user?.id, [userId, user?.id]);

  const fetchAnalytics = useCallback(async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_transaction_analytics', { p_user_id: targetUserId });

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

  const refresh = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refresh,
    refetch: refresh // Alias for compatibility
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
        .from('transaction_categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) {
        throw fetchError;
      }

      setCategories(data?.map(cat => cat.name) || []);
    } catch (err) {
      console.error('Error fetching transaction categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
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
