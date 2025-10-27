import React, { useRef, useEffect } from 'react';
import { dbHelpers } from '@/lib/supabase';
import { useOptimizedListingsRealtime } from './useOptimizedRealtime';
import { useRealtimeConnection } from './useRealtimeConnection';
import { useBlockStore } from '@/store/useBlockStore';

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
  sortBy?: string;
}

export function useListings(options: UseListingsOptions = {}) {
  const [listings, setListings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialDataRef = useRef(false);
  const forceReconnectRef = useRef<(() => void) | null>(null);
  const hasAppliedInitialFilter = useRef(false); // Track if we've filtered after initial load
  
  // Get blocked user IDs from store
  const { blockedUserIds } = useBlockStore();

  // Monitor real-time connection
  const { isConnected, isReconnecting, forceReconnect } = useRealtimeConnection({
    onConnectionLost: () => {
    },
    onConnectionRestored: () => {
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

    // Reset filter flag when fetching new data
    hasAppliedInitialFilter.current = false;

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
        // Client-side filtering for security (prevents SQL injection)
        // Using Set for O(1) lookup performance
        // Lazy evaluation: Skip filtering if no blocked users
        const filteredData = blockedUserIds.size === 0
          ? (data || [])
          : (data || []).filter((listing: any) => {
              const sellerId = listing.user_id || listing.profiles?.id;
              return !blockedUserIds.has(sellerId);
            });
        setListings(filteredData);
        hasInitialDataRef.current = true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load listings';
      setError(errorMessage);
      
      // If it's a timeout or connection error, try to reconnect real-time
      if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
        forceReconnectRef.current?.();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    options.userId,
    options.category,
    options.location,
    options.priceMin,
    options.priceMax,
    options.search,
    options.sortBy,
    options.limit,
    JSON.stringify(options.condition),
    JSON.stringify(options.categories),
    JSON.stringify(options.attributeFilters),
    // Note: blockedUserIds.size intentionally NOT included here
    // We use in-memory filtering (see effect below) instead of re-fetching
    // This avoids double-fetching hundreds of items on app load
  ]);

  // Real-time updates
  useOptimizedListingsRealtime((newListing) => {
    React.startTransition(() => {
      setListings(prev => {
        // Lazy evaluation: Only check blocked users if any exist
        const isBlocked = blockedUserIds.size > 0 
          ? blockedUserIds.has(newListing.user_id || newListing.profiles?.id)
          : false;
        
        // Handle removal (delete or status change to inactive OR blocked user)
        if (newListing._shouldRemove || isBlocked) {
          return prev.filter(item => item.id !== newListing.id);
        }
        
        const exists = prev.find(item => item.id === newListing.id);
        if (exists) {
          // Update existing listing
          return prev.map(item => item.id === newListing.id ? newListing : item);
        } else {
          // Add new listing (only if not from blocked user)
          return [newListing, ...prev];
        }
      });
    });
  });

  // Filter existing listings when blocked users change (immediate UI update)
  // This ensures listings from newly blocked users are removed immediately
  // Also handles the initial load race condition (blockedUserIds loads after listings)
  React.useEffect(() => {
    console.log('🔍 [useListings] Block check effect triggered. Blocked users:', blockedUserIds.size, 'Listings:', listings.length, 'hasAppliedInitialFilter:', hasAppliedInitialFilter.current);
    
    // Apply initial filter if:
    // 1. We have blocked users AND listings
    // 2. We haven't applied the initial filter yet
    const shouldApplyInitialFilter = blockedUserIds.size > 0 && listings.length > 0 && !hasAppliedInitialFilter.current;
    
    // Apply subsequent filter if:
    // 1. We've already applied initial filter (so we're in "live" mode)
    // 2. Blocked users size changed (someone was blocked/unblocked)
    const shouldApplySubsequentFilter = hasAppliedInitialFilter.current && blockedUserIds.size > 0;
    
    if (shouldApplyInitialFilter || shouldApplySubsequentFilter) {
      console.log('🛡️ [useListings] Applying filter...', shouldApplyInitialFilter ? '(Initial)' : '(Subsequent)');
      
      setListings(prev => {
        // Check if any listings need to be filtered
        const hasBlockedListings = prev.some(listing => {
          const sellerId = listing.user_id || listing.profiles?.id;
          return blockedUserIds.has(sellerId);
        });
        
        if (!hasBlockedListings) {
          console.log('✅ [useListings] No blocked listings found');
          if (shouldApplyInitialFilter) {
            hasAppliedInitialFilter.current = true; // Mark as applied even if no filtering needed
          }
          return prev; // No changes needed
        }
        
        // Filter out blocked listings
        const filtered = prev.filter(listing => {
          const sellerId = listing.user_id || listing.profiles?.id;
          const isBlocked = blockedUserIds.has(sellerId);
          if (isBlocked) {
            console.log('🚫 [useListings] Removing listing from blocked user:', sellerId);
          }
          return !isBlocked;
        });
        
        console.log(`🛡️ [useListings] Filtered out ${prev.length - filtered.length} listings from blocked users`);
        
        if (shouldApplyInitialFilter) {
          hasAppliedInitialFilter.current = true; // Mark initial filter as applied
        }
        
        return filtered;
      });
    }
  }, [blockedUserIds.size, listings.length]);

  React.useEffect(() => {
    fetchListings();
  }, [
    fetchListings, // Include the callback itself to re-run when blockedUserIds changes
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