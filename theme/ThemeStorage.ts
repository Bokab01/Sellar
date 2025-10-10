import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@sellar_theme_mode';

// Cache for synchronous access
let cachedTheme: 'light' | 'dark' | 'amoled' | 'system' | null = null;
let isInitialized = false;

export const ThemeStorage = {
  // Initialize theme cache synchronously
  async initialize(): Promise<void> {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'amoled', 'system'].includes(savedTheme)) {
        cachedTheme = savedTheme as 'light' | 'dark' | 'amoled' | 'system';
      } else {
        cachedTheme = 'system'; // Default
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
      cachedTheme = 'system'; // Fallback
    } finally {
      isInitialized = true;
    }
  },

  // Get theme synchronously (returns cached value)
  getThemeSync(): 'light' | 'dark' | 'amoled' | 'system' {
    return cachedTheme || 'system';
  },

  // Check if theme is ready
  isReady(): boolean {
    return isInitialized;
  },

  // Save theme (async)
  async saveTheme(theme: 'light' | 'dark' | 'amoled' | 'system'): Promise<void> {
    try {
      cachedTheme = theme;
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  },

  // Preload theme for faster startup
  preload(): void {
    // Try to get theme synchronously from AsyncStorage cache
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(savedTheme => {
        if (savedTheme && ['light', 'dark', 'amoled', 'system'].includes(savedTheme)) {
          cachedTheme = savedTheme as 'light' | 'dark' | 'amoled' | 'system';
        } else {
          cachedTheme = 'system';
        }
        isInitialized = true;
      })
      .catch(() => {
        cachedTheme = 'system';
        isInitialized = true;
      });
  }
};

// Preload immediately when module is imported
ThemeStorage.preload();
