import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Single source of truth for clearing all authentication data
 * Combines logic from authErrorHandler, refreshTokenHandler, and securityService
 */
export async function clearAllAuthData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('🧹 Starting complete auth data cleanup...');
    
    // 1. Sign out from Supabase (clears tokens)
    try {
      await supabase.auth.signOut({ scope: 'local' });
      console.log('✅ Supabase session cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear Supabase session:', error);
    }
    
    // 2. Clear all auth-related AsyncStorage items
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.startsWith('session_') || 
        key === 'current_session_id' ||
        key.startsWith('device_') ||
        key.includes('auth_') ||
        key === 'device_fingerprint' ||
        key.startsWith('security_')
      );
      
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log(`✅ Cleared ${authKeys.length} AsyncStorage items`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear AsyncStorage:', error);
    }
    
    // 3. Clear Zustand auth store
    try {
      const { setUser, setSession, setLoading } = useAuthStore.getState();
      setUser(null);
      setSession(null);
      setLoading(false);
      console.log('✅ Zustand auth store cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear Zustand store:', error);
    }
    
    console.log('✅ Complete auth data cleanup finished');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Auth cleanup failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Backward-compatible exports for existing code
export { clearAllAuthData as clearStoredAuthData };
export { clearAllAuthData as clearCorruptedSession };

