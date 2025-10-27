import { create } from 'zustand';

interface BlockStore {
  // Cached Set of blocked user IDs for O(1) lookup (much faster than Array)
  blockedUserIds: Set<string>;
  
  // Cached Set of users who blocked me (for privacy checks)
  blockingUserIds: Set<string>;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  setBlockedUserIds: (ids: string[]) => void;
  addBlockedUser: (id: string) => void;
  removeBlockedUser: (id: string) => void;
  setBlockingUserIds: (ids: string[]) => void;
  isUserBlocked: (id: string) => boolean;
  isBlockedBy: (id: string) => boolean;
  getBlockedUserIdsArray: () => string[]; // Helper to get array when needed
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  blockedUserIds: new Set<string>(),
  blockingUserIds: new Set<string>(),
  isLoading: false,
};

export const useBlockStore = create<BlockStore>((set, get) => ({
  ...initialState,

  setBlockedUserIds: (ids) => set({ blockedUserIds: new Set(ids) }),

  addBlockedUser: (id) =>
    set((state) => {
      const newSet = new Set(state.blockedUserIds);
      newSet.add(id);
      return { blockedUserIds: newSet };
    }),

  removeBlockedUser: (id) =>
    set((state) => {
      const newSet = new Set(state.blockedUserIds);
      newSet.delete(id);
      return { blockedUserIds: newSet };
    }),

  setBlockingUserIds: (ids) => set({ blockingUserIds: new Set(ids) }),

  isUserBlocked: (id) => get().blockedUserIds.has(id), // O(1) lookup

  isBlockedBy: (id) => get().blockingUserIds.has(id), // O(1) lookup

  getBlockedUserIdsArray: () => Array.from(get().blockedUserIds), // Convert Set to Array when needed

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () => set(initialState),
}));

