import { create } from 'zustand';

interface AppState {
  // Location
  currentLocation: string;
  setCurrentLocation: (location: string) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Categories
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  
  // Filters
  filters: {
    priceRange: { min?: number; max?: number };
    condition: string[];
    categories: string[];
    location: string;
    sortBy: string;
    attributeFilters?: Record<string, any>;
  };
  setFilters: (filters: Partial<AppState['filters']>) => void;
  
  // UI State
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Location
  currentLocation: 'Accra, Greater Accra',
  setCurrentLocation: (location) => set({ currentLocation: location }),
  
  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // Categories
  selectedCategories: [],
  setSelectedCategories: (categories) => set({ selectedCategories: categories }),
  
  // Filters
  filters: {
    priceRange: { min: undefined, max: undefined },
    condition: [],
    categories: [],
    location: '',
    sortBy: 'newest',
    attributeFilters: {},
  },
  setFilters: (newFilters) => 
    set((state) => ({ 
      filters: { ...state.filters, ...newFilters } 
    })),
  
  // UI State
  showFilters: false,
  setShowFilters: (show) => set({ showFilters: show }),
}));