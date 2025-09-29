import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './useAuthStore';

interface FavoritesStore {
  favoritesCount: number;
  loading: boolean;
  error: string | null;
  fetchFavoritesCount: () => Promise<void>;
  incrementFavoritesCount: () => void;
  decrementFavoritesCount: () => void;
  refreshFavoritesCount: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favoritesCount: 0,
  loading: false,
  error: null,

  fetchFavoritesCount: async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ favoritesCount: 0 });
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
