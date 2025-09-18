import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export function useFavoritesCount() {
  const { user } = useAuthStore();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavoritesCount = useCallback(async () => {
    if (!user) {
      setFavoritesCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { count, error: fetchError } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Error fetching favorites count:', fetchError);
        setError(fetchError.message);
      } else {
        setFavoritesCount(count || 0);
      }
    } catch (err) {
      console.error('Error in fetchFavoritesCount:', err);
      setError('Failed to fetch favorites count');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const incrementFavoritesCount = useCallback(() => {
    setFavoritesCount(prev => prev + 1);
  }, []);

  const decrementFavoritesCount = useCallback(() => {
    setFavoritesCount(prev => Math.max(0, prev - 1));
  }, []);

  const refreshFavoritesCount = useCallback(() => {
    fetchFavoritesCount();
  }, [fetchFavoritesCount]);

  useEffect(() => {
    fetchFavoritesCount();
  }, [fetchFavoritesCount]);

  return {
    favoritesCount,
    loading,
    error,
    refreshFavoritesCount,
    incrementFavoritesCount,
    decrementFavoritesCount,
  };
}
