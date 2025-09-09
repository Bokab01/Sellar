import { useState, useEffect } from 'react';
import { dbHelpers } from '@/lib/supabase';
import { useListingsRealtime } from './useRealtime';

interface UseListingsOptions {
  category?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  condition?: string[];
  search?: string;
  limit?: number;
  userId?: string;
}

export function useListings(options: UseListingsOptions = {}) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);

      const { data, error: fetchError } = await dbHelpers.getListings({
        ...options,
        limit: options.limit || 20,
      });

      if (fetchError) {
        setError(typeof fetchError === 'string' ? fetchError : (fetchError as any)?.message || 'Failed to load listings');
      } else {
        setListings(data || []);
      }
    } catch (err) {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Real-time updates
  useListingsRealtime((newListing) => {
    setListings(prev => {
      // Handle removal (delete or status change to inactive)
      if (newListing._shouldRemove) {
        console.log('🔗 Removing listing from UI:', newListing.id);
        return prev.filter(item => item.id !== newListing.id);
      }
      
      const exists = prev.find(item => item.id === newListing.id);
      if (exists) {
        // Update existing listing
        console.log('🔗 Updating existing listing in UI:', newListing.id);
        return prev.map(item => item.id === newListing.id ? newListing : item);
      } else {
        // Add new listing
        console.log('🔗 Adding new listing to UI:', newListing.id);
        return [newListing, ...prev];
      }
    });
  });

  useEffect(() => {
    fetchListings();
  }, [
    options.category,
    options.location,
    options.priceMin,
    options.priceMax,
    options.search,
    JSON.stringify(options.condition),
  ]);

  const refresh = () => fetchListings(true);

  return {
    listings,
    loading,
    error,
    refreshing,
    refresh,
    refetch: fetchListings,
  };
}