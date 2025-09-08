import { supabase } from './supabase';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Toggle favorite status for a listing
 */
export async function toggleFavorite(listingId: string): Promise<{ isFavorited: boolean; error?: string }> {
  try {
    const { user } = useAuthStore.getState();
    if (!user) {
      return { isFavorited: false, error: 'User not authenticated' };
    }

    // Check if already favorited
    const { data: existingFavorite, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking favorite status:', checkError);
      return { isFavorited: false, error: 'Failed to check favorite status' };
    }

    if (existingFavorite) {
      // Remove from favorites
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);

      if (deleteError) {
        console.error('Error removing favorite:', deleteError);
        return { isFavorited: false, error: 'Failed to remove favorite' };
      }

      return { isFavorited: false };
    } else {
      // Add to favorites
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          listing_id: listingId,
        });

      if (insertError) {
        console.error('Error adding favorite:', insertError);
        return { isFavorited: false, error: 'Failed to add favorite' };
      }

      return { isFavorited: true };
    }
  } catch (error) {
    console.error('Error in toggleFavorite:', error);
    return { isFavorited: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Check if a listing is favorited by the current user
 */
export async function checkFavoriteStatus(listingId: string): Promise<{ isFavorited: boolean; error?: string }> {
  try {
    const { user } = useAuthStore.getState();
    if (!user) {
      return { isFavorited: false };
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking favorite status:', error);
      return { isFavorited: false, error: 'Failed to check favorite status' };
    }

    return { isFavorited: !!data };
  } catch (error) {
    console.error('Error in checkFavoriteStatus:', error);
    return { isFavorited: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Track a view for a listing (only once per user, excludes seller)
 */
export async function trackListingView(listingId: string, sellerId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = useAuthStore.getState();
    
    // Don't track views for unauthenticated users or if user is the seller
    if (!user || (sellerId && user.id === sellerId)) {
      return { success: true }; // Not an error, just don't track
    }

    // Check if user has already viewed this listing
    const { data: existingView, error: checkError } = await supabase
      .from('listing_views')
      .select('id')
      .eq('listing_id', listingId)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking view status:', checkError);
      return { success: false, error: 'Failed to check view status' };
    }

    // If user hasn't viewed this listing yet, record the view
    if (!existingView) {
      const { error: insertError } = await supabase
        .from('listing_views')
        .insert({
          listing_id: listingId,
          user_id: user.id,
        });

      if (insertError) {
        console.error('Error tracking view:', insertError);
        return { success: false, error: 'Failed to track view' };
      }

      console.log('✅ View tracked for listing:', listingId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in trackListingView:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get view count for a listing
 */
export async function getListingViewCount(listingId: string): Promise<{ count: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('listing_views')
      .select('id', { count: 'exact' })
      .eq('listing_id', listingId);

    if (error) {
      console.error('Error getting view count:', error);
      return { count: 0, error: 'Failed to get view count' };
    }

    return { count: data?.length || 0 };
  } catch (error) {
    console.error('Error in getListingViewCount:', error);
    return { count: 0, error: 'An unexpected error occurred' };
  }
}

/**
 * Get favorite status and view count for multiple listings
 */
export async function getListingsStats(listingIds: string[]): Promise<{
  favorites: Record<string, boolean>;
  viewCounts: Record<string, number>;
  error?: string;
}> {
  try {
    const { user } = useAuthStore.getState();
    
    const favorites: Record<string, boolean> = {};
    const viewCounts: Record<string, number> = {};

    // Initialize all listings as not favorited and 0 views
    listingIds.forEach(id => {
      favorites[id] = false;
      viewCounts[id] = 0;
    });

    // Get favorites for authenticated users
    if (user) {
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id)
        .in('listing_id', listingIds);

      if (!favoriteError && favoriteData) {
        favoriteData.forEach(fav => {
          favorites[fav.listing_id] = true;
        });
      }
    }

    // Get view counts
    const { data: viewData, error: viewError } = await supabase
      .from('listing_views')
      .select('listing_id')
      .in('listing_id', listingIds);

    if (!viewError && viewData) {
      // Count views per listing
      viewData.forEach(view => {
        viewCounts[view.listing_id] = (viewCounts[view.listing_id] || 0) + 1;
      });
    }

    return { favorites, viewCounts };
  } catch (error) {
    console.error('Error in getListingsStats:', error);
    return { 
      favorites: {}, 
      viewCounts: {}, 
      error: 'An unexpected error occurred' 
    };
  }
}
