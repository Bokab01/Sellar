import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AppSetting {
  key: string;
  value: any;
  value_type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;
  description: string | null;
}

interface UseAppSettingsReturn {
  settings: Record<string, any>;
  loading: boolean;
  error: Error | null;
  getSetting: <T = any>(key: string, defaultValue?: T) => T;
  getSettingsByCategory: (category: string) => Record<string, any>;
  refreshSettings: () => Promise<void>;
}

/**
 * Hook to fetch and use app settings from the database
 * Settings are cached and can be refreshed on demand
 */
export function useAppSettings(category?: string): UseAppSettingsReturn {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('app_settings')
        .select('key, value, value_type, category, description')
        .eq('is_active', true);

      // Filter by category if provided
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Parse settings into a key-value object with proper types
      const parsedSettings: Record<string, any> = {};
      data?.forEach((setting: AppSetting) => {
        parsedSettings[setting.key] = parseSettingValue(setting.value, setting.value_type);
      });

      setSettings(parsedSettings);
    } catch (err: any) {
      console.error('Error fetching app settings:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [category]);

  /**
   * Parse setting value based on its type
   */
  const parseSettingValue = (value: any, valueType: string): any => {
    try {
      // JSONB values come as objects/arrays, extract the actual value
      if (typeof value === 'object' && value !== null) {
        // If it's already parsed JSON, return as is
        return value;
      }

      // Parse string representations
      const strValue = String(value);
      
      switch (valueType) {
        case 'number':
          return parseFloat(strValue);
        case 'boolean':
          return strValue === 'true' || strValue === '1';
        case 'json':
        case 'array':
          try {
            return JSON.parse(strValue);
          } catch {
            return value;
          }
        case 'string':
        default:
          // Remove surrounding quotes if present
          return strValue.replace(/^"|"$/g, '');
      }
    } catch (err) {
      console.error(`Error parsing setting value:`, err);
      return value;
    }
  };

  /**
   * Get a specific setting by key with optional default value
   */
  const getSetting = <T = any>(key: string, defaultValue?: T): T => {
    if (key in settings) {
      return settings[key] as T;
    }
    return defaultValue as T;
  };

  /**
   * Get all settings for a specific category
   */
  const getSettingsByCategory = (cat: string): Record<string, any> => {
    // If we're already filtering by category, return all settings
    if (category === cat) {
      return settings;
    }
    
    // Otherwise, this would require fetching settings again
    // For now, return empty object and log a warning
    console.warn(`getSettingsByCategory called with category "${cat}", but hook was initialized without category filter. Consider using useAppSettings("${cat}") instead.`);
    return {};
  };

  /**
   * Refresh settings from the database
   */
  const refreshSettings = async () => {
    await fetchSettings();
  };

  return {
    settings,
    loading,
    error,
    getSetting,
    getSettingsByCategory,
    refreshSettings,
  };
}

/**
 * Hook to get a single setting value
 * Useful when you only need one specific setting
 */
export function useAppSetting<T = any>(
  key: string,
  defaultValue?: T
): { value: T; loading: boolean; error: Error | null; refresh: () => Promise<void> } {
  const [value, setValue] = useState<T>(defaultValue as T);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSetting = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('value, value_type')
        .eq('key', key)
        .eq('is_active', true)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        const parsedValue = parseValue(data.value, data.value_type);
        setValue(parsedValue);
      } else if (defaultValue !== undefined) {
        setValue(defaultValue);
      }
    } catch (err: any) {
      console.error(`Error fetching app setting "${key}":`, err);
      setError(err);
      if (defaultValue !== undefined) {
        setValue(defaultValue);
      }
    } finally {
      setLoading(false);
    }
  };

  const parseValue = (val: any, valueType: string): any => {
    try {
      if (typeof val === 'object' && val !== null) {
        return val;
      }

      const strValue = String(val);
      
      switch (valueType) {
        case 'number':
          return parseFloat(strValue);
        case 'boolean':
          return strValue === 'true' || strValue === '1';
        case 'json':
        case 'array':
          try {
            return JSON.parse(strValue);
          } catch {
            return val;
          }
        case 'string':
        default:
          return strValue.replace(/^"|"$/g, '');
      }
    } catch {
      return val;
    }
  };

  useEffect(() => {
    fetchSetting();
  }, [key]);

  return {
    value,
    loading,
    error,
    refresh: fetchSetting,
  };
}

