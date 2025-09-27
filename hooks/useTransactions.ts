import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase-client';

// Re-export financial transaction types and functions
export {
  useFinancialTransactions,
  useTransactionSummary,
  useTransactionAnalytics,
  useTransactionCategories
} from './useFinancialTransactions';

// Re-export types from the financial transactions module
export type {
  TransactionType,
  TransactionStatus,
  FinancialTransaction,
  TransactionFilters,
  TransactionSummary,
  TransactionAnalytics,
} from './useFinancialTransactions';

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  conversation_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'disputed';
  confirmed_by: string[];
  agreed_price: number;
  currency: string;
  meetup_location?: string;
  meetup_time?: string;
  buyer_confirmed_at?: string;
  seller_confirmed_at?: string;
  verification_code?: string;
  buyer_notes?: string;
  seller_notes?: string;
  created_at: string;
  updated_at: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    images?: string[];
  };
  buyer?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  seller?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface CreateTransactionData {
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  conversation_id: string;
  agreed_price: number;
  meetup_location?: string;
  meetup_time?: string;
  buyer_notes?: string;
  seller_notes?: string;
}

// Hook to get user's transactions
export function useTransactions(options: {
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const { user } = useAuthStore();

  const fetchTransactions = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const userId = options.userId || user?.id;
      if (!userId) return;

      let query = supabase
        .from('meetup_transactions')
        .select(`
          *,
          listing:listings(id, title, price, images),
          buyer:profiles!meetup_transactions_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!meetup_transactions_seller_id_fkey(id, full_name, avatar_url)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }

      // Pagination
      const limit = options.limit || 20;
      const offset = reset ? 0 : (options.offset || 0);
      query = query.range(offset, offset + limit - 1);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const newTransactions = data || [];
      
      if (reset) {
        setTransactions(newTransactions);
      } else {
        setTransactions(prev => [...prev, ...newTransactions]);
      }

      setHasMore(newTransactions.length === limit);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.status, options.limit, options.offset, user?.id]);

  useEffect(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  const refresh = useCallback(() => {
    return fetchTransactions(true);
  }, [fetchTransactions]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      return fetchTransactions(false);
    }
  }, [loading, hasMore, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    hasMore,
    refresh,
    refetch: refresh, // Alias for compatibility
    loadMore,
  };
}

// Hook to create a transaction
export function useCreateTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTransaction = useCallback(async (transactionData: CreateTransactionData) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: createError } = await supabase
        .from('meetup_transactions')
        .insert({
          ...transactionData,
          verification_code: generateVerificationCode(),
          verification_code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select(`
          *,
          listing:listings(id, title, price, images),
          buyer:profiles!meetup_transactions_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!meetup_transactions_seller_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (createError) throw createError;

      return data;
    } catch (err) {
      console.error('Error creating transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTransaction, loading, error };
}

// Hook to confirm a transaction
export function useConfirmTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const confirmTransaction = useCallback(async (transactionId: string) => {
    if (!user) {
      throw new Error('Must be logged in to confirm transaction');
    }

    try {
      setLoading(true);
      setError(null);

      // Get current transaction
      const { data: transaction, error: fetchError } = await supabase
        .from('meetup_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) throw fetchError;

      // Determine which field to update
      const isBuyer = transaction.buyer_id === user.id;
      const confirmationField = isBuyer ? 'buyer_confirmed_at' : 'seller_confirmed_at';

      const { data, error: updateError } = await supabase
        .from('meetup_transactions')
        .update({
          [confirmationField]: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select(`
          *,
          listing:listings(id, title, price, images),
          buyer:profiles!meetup_transactions_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!meetup_transactions_seller_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (updateError) throw updateError;

      return data;
    } catch (err) {
      console.error('Error confirming transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { confirmTransaction, loading, error };
}

// Hook to get transaction by ID
export function useTransaction(transactionId: string) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transactionId) {
      fetchTransaction();
    }
  }, [transactionId]);

  const fetchTransaction = useCallback(async () => {
    if (!transactionId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('meetup_transactions')
        .select(`
          *,
          listing:listings(id, title, price, images),
          buyer:profiles!meetup_transactions_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!meetup_transactions_seller_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', transactionId)
        .single();

      if (fetchError) throw fetchError;

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

  return { transaction, loading, error, refresh, refetch: refresh };
}

// Hook to get transaction stats for a user
export function useTransactionStats(userId: string) {
  const [stats, setStats] = useState<{
    total_transactions: number;
    confirmed_transactions: number;
    pending_transactions: number;
    success_rate: number;
    total_value: number;
    average_value: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: transactions, error: fetchError } = await supabase
          .from('meetup_transactions')
          .select('status, agreed_price')
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

        if (fetchError) throw fetchError;

        if (!transactions || transactions.length === 0) {
          setStats({
            total_transactions: 0,
            confirmed_transactions: 0,
            pending_transactions: 0,
            success_rate: 0,
            total_value: 0,
            average_value: 0,
          });
          return;
        }

        const total_transactions = transactions.length;
        const confirmed_transactions = transactions.filter(t => t.status === 'confirmed').length;
        const pending_transactions = transactions.filter(t => t.status === 'pending').length;
        const success_rate = total_transactions > 0 ? (confirmed_transactions / total_transactions) * 100 : 0;
        const total_value = transactions.reduce((sum, t) => sum + (t.agreed_price || 0), 0);
        const average_value = total_transactions > 0 ? total_value / total_transactions : 0;

        setStats({
          total_transactions,
          confirmed_transactions,
          pending_transactions,
          success_rate: Math.round(success_rate * 10) / 10,
          total_value,
          average_value: Math.round(average_value * 100) / 100,
        });
      } catch (err) {
        console.error('Error fetching transaction stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch transaction stats');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchStats();
    }
  }, [userId]);

  return { stats, loading, error };
}

// Helper function to generate verification code
function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Hook to verify transaction with QR code
export function useVerifyTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyTransaction = useCallback(async (verificationCode: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: verifyError } = await supabase
        .from('meetup_transactions')
        .select(`
          *,
          listing:listings(id, title, price),
          buyer:profiles!meetup_transactions_buyer_id_fkey(id, full_name),
          seller:profiles!meetup_transactions_seller_id_fkey(id, full_name)
        `)
        .eq('verification_code', verificationCode)
        .gt('verification_code_expires_at', new Date().toISOString())
        .single();

      if (verifyError) {
        if (verifyError.code === 'PGRST116') {
          throw new Error('Invalid or expired verification code');
        }
        throw verifyError;
      }

      return data;
    } catch (err) {
      console.error('Error verifying transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { verifyTransaction, loading, error };
}