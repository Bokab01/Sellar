import { useState, useEffect, useMemo } from 'react';
import { supabase, db } from '@/lib/supabase';
import { useAuth } from './useAuth';

// Transaction types
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

export interface Transaction {
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
  metadata?: Record<string, any>;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  sort_order: number;
}

export interface TransactionSummary {
  total_transactions: number;
  total_spent: number;
  total_earned: number;
  credits_purchased: number;
  credits_used: number;
  last_transaction_date?: string;
  pending_transactions: number;
}

export interface TransactionAnalytics {
  period: {
    start_date: string;
    end_date: string;
  };
  totals: {
    transaction_count: number;
    total_amount: number;
    credits_spent: number;
    credits_earned: number;
  };
  by_type: Record<string, {
    count: number;
    total_amount: number;
    total_credits: number;
  }>;
  by_status: Record<string, number>;
}

export interface CreateTransactionParams {
  transaction_type: TransactionType;
  amount: number;
  credits_amount?: number;
  title: string;
  description?: string;
  category?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  metadata?: Record<string, any>;
  related_listing_id?: string;
  related_order_id?: string;
  related_subscription_id?: string;
  related_user_id?: string;
}

// Hook for managing user transactions
export function useTransactions(filters?: {
  type?: TransactionType;
  status?: TransactionStatus;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.type) {
        query = query.eq('transaction_type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Memoize filters to prevent infinite re-renders from JSON.stringify
  const memoizedFilters = useMemo(() => filters, [
    filters?.type,
    filters?.status, 
    filters?.category,
    filters?.startDate,
    filters?.endDate,
    filters?.limit
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [user, memoizedFilters]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
}

// Hook for creating transactions
export function useCreateTransaction() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTransaction = async (params: CreateTransactionParams): Promise<Transaction> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: createError } = await supabase
        .rpc('create_transaction', {
          p_user_id: user.id,
          p_transaction_type: params.transaction_type,
          p_amount: params.amount,
          p_credits_amount: params.credits_amount,
          p_title: params.title,
          p_description: params.description,
          p_category: params.category,
          p_payment_method: params.payment_method,
          p_payment_reference: params.payment_reference,
          p_metadata: params.metadata || {}
        });

      if (createError) throw createError;

      // Fetch the created transaction
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      return transaction;
    } catch (err) {
      console.error('Error creating transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createTransaction,
    loading,
    error,
  };
}

// Hook for transaction summary
export function useTransactionSummary() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_user_transaction_summary', {
          p_user_id: user.id
        });

      if (fetchError) {
        // If function doesn't exist, provide fallback summary
        if (fetchError.message.includes('Could not find the function') || 
            fetchError.message.includes('schema cache')) {
          console.warn('get_user_transaction_summary function not found, using fallback summary');
          setSummary({
            total_transactions: 0,
            total_spent: 0,
            total_earned: 0,
            credits_purchased: 0,
            credits_used: 0,
            pending_transactions: 0,
            last_transaction_date: undefined
          });
          return;
        }
        throw fetchError;
      }
      setSummary(data);
    } catch (err) {
      console.error('Error fetching transaction summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [user]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}

// Hook for transaction analytics
export function useTransactionAnalytics(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<TransactionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_transaction_analytics', {
          p_user_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (fetchError) {
        if (fetchError.message.includes('Could not find the function') || fetchError.message.includes('schema cache')) {
          console.warn('get_transaction_analytics function not found, using fallback analytics');
          setAnalytics({
            period: {
              start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end_date: endDate || new Date().toISOString()
            },
            totals: {
              transaction_count: 0,
              total_amount: 0,
              credits_spent: 0,
              credits_earned: 0
            },
            by_type: {},
            by_status: {}
          });
          return;
        }
        throw fetchError;
      }
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching transaction analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, startDate, endDate]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

// Hook for transaction categories
export function useTransactionCategories() {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await db.transaction_categories
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) {
        // If table doesn't exist, provide fallback categories
        if (fetchError.message.includes('Could not find the table') || 
            fetchError.message.includes('schema cache')) {
          console.warn('Transaction categories table not found, using fallback categories');
          setCategories([
            {
              id: '1',
              name: 'credit_operations',
              display_name: 'Credit Operations',
              description: 'All credit-related transactions',
              icon: 'credit-card',
              color: '#3B82F6',
              is_active: true,
              sort_order: 1
            },
            {
              id: '2',
              name: 'listing_operations',
              display_name: 'Listing Operations',
              description: 'Listing boost and promotion transactions',
              icon: 'trending-up',
              color: '#10B981',
              is_active: true,
              sort_order: 2
            },
            {
              id: '3',
              name: 'earnings',
              display_name: 'Earnings',
              description: 'Commission and bonus earnings',
              icon: 'dollar-sign',
              color: '#F59E0B',
              is_active: true,
              sort_order: 3
            }
          ]);
          return;
        }
        throw fetchError;
      }
      setCategories((data as unknown as TransactionCategory[]) || []);
    } catch (err) {
      console.error('Error fetching transaction categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
}

// Hook for single transaction details
export function useTransaction(transactionId: string) {
  const { user } = useAuth();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransaction = async () => {
    if (!user || !transactionId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setTransaction(data);
    } catch (err) {
      console.error('Error fetching transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, [user, transactionId]);

  return {
    transaction,
    loading,
    error,
    refetch: fetchTransaction,
  };
}

// Hook for updating transaction status
export function useUpdateTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTransaction = async (
    transactionId: string,
    updates: Partial<Pick<Transaction, 'status' | 'payment_reference' | 'metadata' | 'processed_at'>>
  ): Promise<Transaction> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err) {
      console.error('Error updating transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    updateTransaction,
    loading,
    error,
  };
}
