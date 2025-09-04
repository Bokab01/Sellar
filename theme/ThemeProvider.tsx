import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Theme } from './types';
import { lightTheme, darkTheme } from './themes';
import { ThemeStorage } from './ThemeStorage';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
  isThemeReady: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  
  // Initialize with cached theme for immediate availability
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    return ThemeStorage.getThemeSync();
  });
  
  const [isThemeReady, setIsThemeReady] = useState(() => {
    return ThemeStorage.isReady();
  });

  // Initialize theme storage if not already ready
  useEffect(() => {
    if (!ThemeStorage.isReady()) {
      ThemeStorage.initialize().then(() => {
        const cachedTheme = ThemeStorage.getThemeSync();
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
    : themeMode === 'dark';
  
  const theme = isDarkMode ? darkTheme : lightTheme;

  const toggleTheme = useCallback(() => {
    setThemeMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const handleSetThemeMode = useCallback((mode: 'light' | 'dark' | 'system') => {
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
