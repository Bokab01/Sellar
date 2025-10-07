import React, { useRef, useEffect } from 'react';
import { dbHelpers } from '@/lib/supabase';
import { useListingsRealtime } from './useRealtime';
import { useRealtimeConnection } from './useRealtimeConnection';

interface UseListingsOptions {
  category?: string;
  categories?: string[];
  location?: string;
  priceMin?: number;
  priceMax?: number;
  condition?: string[];
  attributeFilters?: Record<string, any>;
  search?: string;
  limit?: number;
  userId?: string;
}

export function useListings(options: UseListingsOptions = {}) {
  const [listings, setListings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialDataRef = useRef(false);
  const forceReconnectRef = useRef<(() => void) | null>(null);

  // Monitor real-time connection
  const { isConnected, isReconnecting, forceReconnect } = useRealtimeConnection({
    onConnectionLost: () => {
      console.log('🔗 Real-time connection lost, will retry...');
    },
    onConnectionRestored: () => {
      console.log('🔗 Real-time connection restored');
      // If we don't have initial data yet, try to fetch
      if (!hasInitialDataRef.current && listings.length === 0) {
        fetchListings();
      }
    },
  });

  // Store forceReconnect in ref to avoid dependency issues
  React.useEffect(() => {
    forceReconnectRef.current = forceReconnect;
  }, [forceReconnect]);

  const fetchListings = React.useCallback(async (isRefresh = false) => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);

      // Set a timeout for the fetch operation
      const fetchPromise = dbHelpers.getListings({
        ...options,
        limit: options.limit || 20,
      });

      const timeoutPromise = new Promise((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          reject(new Error('Request timeout - please check your connection'));
        }, 15000); // 15 second timeout
      });

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      // Clear timeout on success
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }

      if (fetchError) {
        setError(typeof fetchError === 'string' ? fetchError : (fetchError as any)?.message || 'Failed to load listings');
      } else {
        setListings(data || []);
        hasInitialDataRef.current = true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load listings';
      setError(errorMessage);
      
      // If it's a timeout or connection error, try to reconnect real-time
      if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
        console.log('🔗 Fetch failed due to connection issue, attempting to reconnect...');
        forceReconnectRef.current?.();
      }
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
    JSON.stringify(options.categories), // Add categories to dependencies
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  const refresh = React.useCallback(() => fetchListings(true), [fetchListings]);

  return {
    listings,
    loading,
    error,
    refreshing,
    refresh,
    refetch: fetchListings,
    // Real-time connection status
    isRealtimeConnected: isConnected,
    isRealtimeReconnecting: isReconnecting,
    forceReconnect,
  };
}