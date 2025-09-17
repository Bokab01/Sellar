import React from 'react';
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
  const [listings, setListings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchListings = React.useCallback(async (isRefresh = false) => {
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
  }, [options]);

  // Real-time updates
  useListingsRealtime((newListing) => {
    React.startTransition(() => {
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
  });

  React.useEffect(() => {
    fetchListings();
  }, [
    options.userId,
    options.category,
    options.location,
    options.priceMin,
    options.priceMax,
    options.search,
    JSON.stringify(options.condition),
  ]);

  const refresh = React.useCallback(() => fetchListings(true), [fetchListings]);

  return {
    listings,
    loading,
    error,
    refreshing,
    refresh,
    refetch: fetchListings,
  };
}