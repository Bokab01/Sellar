import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toggleFavorite, checkFavoriteStatus, trackListingView, getListingViewCount, getListingsStats } from '@/lib/favoritesAndViews';

interface UseListingStatsOptions {
  listingId: string;
  sellerId?: string;
  autoTrackView?: boolean;
}

interface UseListingStatsReturn {
  isFavorited: boolean;
  viewCount: number;
  loading: boolean;
  error: string | null;
  toggleFavoriteStatus: () => Promise<void>;
  trackView: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useListingStats({ 
  listingId, 
  sellerId, 
  autoTrackView = true 
}: UseListingStatsOptions): UseListingStatsReturn {
  const [isFavorited, setIsFavorited] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasTrackedView = useRef(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load favorite status and view count in parallel
      const [favoriteResult, viewCountResult] = await Promise.all([
        checkFavoriteStatus(listingId),
        getListingViewCount(listingId)
      ]);

      if (favoriteResult.error) {
        setError(favoriteResult.error);
      } else {
        setIsFavorited(favoriteResult.isFavorited);
      }

      if (viewCountResult.error) {
        setError(viewCountResult.error);
      } else {
        setViewCount(viewCountResult.count);
      }
    } catch (err) {
      setError('Failed to load listing stats');
      console.error('Error loading listing stats:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  const toggleFavoriteStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await toggleFavorite(listingId);
      
      if (result.error) {
        setError(result.error);
      } else {
        setIsFavorited(result.isFavorited);
      }
    } catch (err) {
      setError('Failed to toggle favorite');
      console.error('Error toggling favorite:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  const trackView = useCallback(async () => {
    try {
      const result = await trackListingView(listingId, sellerId);
      
      if (result.error) {
        console.error('Error tracking view:', result.error);
      } else if (result.success) {
        // Refresh view count after tracking
        const viewCountResult = await getListingViewCount(listingId);
        if (!viewCountResult.error) {
          setViewCount(viewCountResult.count);
        }
      }
    } catch (err) {
      console.error('Error tracking view:', err);
    }
  }, [listingId, sellerId]);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Auto-track view when component mounts (if enabled)
  useEffect(() => {
    if (autoTrackView && !hasTrackedView.current && listingId) {
      hasTrackedView.current = true;
      trackView();
    }
  }, [autoTrackView, listingId, trackView]);

  return {
    isFavorited,
    viewCount,
    loading,
    error,
    toggleFavoriteStatus,
    trackView,
    refreshStats,
  };
}

// Hook for multiple listings
interface UseMultipleListingStatsOptions {
  listingIds: string[];
}

interface UseMultipleListingStatsReturn {
  favorites: Record<string, boolean>;
  viewCounts: Record<string, number>;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

export function useMultipleListingStats({ 
  listingIds 
}: UseMultipleListingStatsOptions): UseMultipleListingStatsReturn {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the listingIds to prevent unnecessary re-renders
  const stableListingIds = useMemo(() => listingIds, [listingIds.join(',')]);

  const loadStats = useCallback(async () => {
    if (stableListingIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getListingsStats(stableListingIds);
      
      if (result.error) {
        setError(result.error);
      } else {
        setFavorites(result.favorites);
        setViewCounts(result.viewCounts);
      }
    } catch (err) {
      setError('Failed to load listing stats');
      console.error('Error loading multiple listing stats:', err);
    } finally {
      setLoading(false);
    }
  }, [stableListingIds]);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  // Load stats when listingIds change
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    favorites,
    viewCounts,
    loading,
    error,
    refreshStats,
  };
}
