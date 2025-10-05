import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './useAuthStore';

interface FavoritesStore {
  favoritesCount: number;
  favorites: Record<string, boolean>; // Track individual listing favorites
  listingFavoriteCounts: Record<string, number>; // Track favorite counts per listing
  loading: boolean;
  error: string | null;
  fetchFavoritesCount: () => Promise<void>;
  fetchFavorites: () => Promise<void>; // Fetch all user favorites
  toggleFavorite: (listingId: string) => void; // Optimistically toggle favorite
  setFavorite: (listingId: string, isFavorited: boolean) => void; // Set specific favorite state
  updateListingFavoriteCount: (listingId: string, count: number) => void; // Update listing favorite count
  incrementListingFavoriteCount: (listingId: string) => void; // Increment listing favorite count
  decrementListingFavoriteCount: (listingId: string) => void; // Decrement listing favorite count
  incrementFavoritesCount: () => void;
  decrementFavoritesCount: () => void;
  refreshFavoritesCount: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favoritesCount: 0,
  favorites: {},
  listingFavoriteCounts: {},
  loading: false,
  error: null,

  fetchFavoritesCount: async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ favoritesCount: 0, favorites: {} });
      return;
    }

    try {
      set({ loading: true, error: null });

      const { count, error: fetchError } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Error fetching favorites count:', fetchError);
        set({ error: fetchError.message });
      } else {
        set({ favoritesCount: count || 0 });
      }
    } catch (err) {
      console.error('Error in fetchFavoritesCount:', err);
      set({ error: 'Failed to fetch favorites count' });
    } finally {
      set({ loading: false });
    }
  },

  fetchFavorites: async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ favorites: {} });
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Error fetching favorites:', fetchError);
      } else {
        const favoritesMap: Record<string, boolean> = {};
        data?.forEach((fav) => {
          favoritesMap[fav.listing_id] = true;
        });
        set({ favorites: favoritesMap, favoritesCount: data?.length || 0 });
      }
    } catch (err) {
      console.error('Error in fetchFavorites:', err);
    }
  },

  toggleFavorite: (listingId: string) => {
    set((state) => {
      const currentFavorite = state.favorites[listingId] || false;
      const newFavorites = { ...state.favorites, [listingId]: !currentFavorite };
      
      // Also update the total favorites count automatically
      const newCount = currentFavorite 
        ? Math.max(0, state.favoritesCount - 1)
        : state.favoritesCount + 1;
      
      return { 
        favorites: newFavorites,
        favoritesCount: newCount // This updates the header badge
      };
    });
  },

  setFavorite: (listingId: string, isFavorited: boolean) => {
    set((state) => {
      const wasAlreadyFavorited = state.favorites[listingId] || false;
      const newFavorites = { ...state.favorites, [listingId]: isFavorited };
      
      let newCount = state.favoritesCount;
      if (!wasAlreadyFavorited && isFavorited) {
        newCount = state.favoritesCount + 1;
      } else if (wasAlreadyFavorited && !isFavorited) {
        newCount = Math.max(0, state.favoritesCount - 1);
      }
      
      return { 
        favorites: newFavorites,
        favoritesCount: newCount
      };
    });
  },

  updateListingFavoriteCount: (listingId: string, count: number) => {
    set((state) => ({
      listingFavoriteCounts: {
        ...state.listingFavoriteCounts,
        [listingId]: count
      }
    }));
  },

  incrementListingFavoriteCount: (listingId: string) => {
    set((state) => {
      const currentCount = state.listingFavoriteCounts[listingId] || 0;
      return {
        listingFavoriteCounts: {
          ...state.listingFavoriteCounts,
          [listingId]: currentCount + 1
        }
      };
    });
  },

  decrementListingFavoriteCount: (listingId: string) => {
    set((state) => {
      const currentCount = state.listingFavoriteCounts[listingId] || 0;
      return {
        listingFavoriteCounts: {
          ...state.listingFavoriteCounts,
          [listingId]: Math.max(0, currentCount - 1)
        }
      };
    });
  },

  incrementFavoritesCount: () => {
    set((state) => ({ favoritesCount: state.favoritesCount + 1 }));
  },

  decrementFavoritesCount: () => {
    set((state) => ({ favoritesCount: Math.max(0, state.favoritesCount - 1) }));
  },

  refreshFavoritesCount: async () => {
    await get().fetchFavoritesCount();
  },
}));
