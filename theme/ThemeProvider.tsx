import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Theme } from './types';
import { lightTheme, darkTheme, amoledTheme } from './themes';
import { ThemeStorage } from './ThemeStorage';

export type ThemeMode = 'light' | 'dark' | 'amoled' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  themeMode: ThemeMode;
  isThemeReady: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  
  // Initialize with cached theme for immediate availability
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return ThemeStorage.getThemeSync() as ThemeMode;
  });
  
  const [isThemeReady, setIsThemeReady] = useState(() => {
    return ThemeStorage.isReady();
  });

  // Initialize theme storage if not already ready
  useEffect(() => {
    if (!ThemeStorage.isReady()) {
      ThemeStorage.initialize().then(() => {
        const cachedTheme = ThemeStorage.getThemeSync() as ThemeMode;
        setThemeMode(cachedTheme);
        setIsThemeReady(true);
      });
    } else {
      setIsThemeReady(true);
    }
  }, []);

  // Save theme preference when it changes
  useEffect(() => {
    if (isThemeReady) {
      ThemeStorage.saveTheme(themeMode);
    }
  }, [themeMode, isThemeReady]);

  const isDarkMode = themeMode === 'system' 
    ? systemColorScheme === 'dark'
    : (themeMode === 'dark' || themeMode === 'amoled');
  
  // Select theme based on mode
  const theme = useMemo(() => {
    if (themeMode === 'amoled') return amoledTheme;
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  const toggleTheme = useCallback(() => {
    setThemeMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'amoled';
      if (current === 'amoled') return 'system';
      return 'light';
    });
  }, []);

  const handleSetThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  const value: ThemeContextType = useMemo(() => ({
    theme,
    isDarkMode,
    toggleTheme,
    setThemeMode: handleSetThemeMode,
    themeMode,
    isThemeReady,
  }), [theme, isDarkMode, toggleTheme, handleSetThemeMode, themeMode, isThemeReady]);

  // Render immediately with cached theme to prevent flashing
  // The theme will update when storage is ready if needed

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
