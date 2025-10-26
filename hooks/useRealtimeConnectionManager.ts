import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';

// Optional NetInfo import with safe fallback to avoid crashes if missing
let NetInfo: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NetInfo = require('@react-native-community/netinfo');
} catch (_err) {
  NetInfo = null;
}

// Global guards to avoid reconnection storms across re-renders
const isReconnectingGloballyRef: { current: boolean } = { current: false };
const lastReconnectAtRef: { current: number } = { current: 0 };

async function forceReconnectAllChannels(): Promise<void> {
  try {
    const channels = supabase.getChannels();
    for (const ch of channels) {
      await supabase.removeChannel(ch);
    }
  } catch (err) {
    console.warn('Realtime forceReconnect error:', err);
  }
}

async function refreshRealtimeAuthToken(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (accessToken) {
      const rt: any = (supabase as any).realtime;
      if (rt?.setAuth) {
        rt.setAuth(accessToken);
      }
    }
  } catch (err) {
    console.warn('Failed to refresh realtime auth token:', err);
  }
}

async function refreshSessionIfNearExpiry(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session as any;
    const expiresAt: number | undefined = session?.expires_at; // seconds epoch
    if (!expiresAt) return;
    const nowSec = Math.floor(Date.now() / 1000);
    // If token expires in the next 60s (or already expired), refresh
    if (expiresAt - nowSec <= 60) {
      await supabase.auth.refreshSession();
      await refreshRealtimeAuthToken();
    }
  } catch (err) {
    console.warn('refreshSessionIfNearExpiry failed:', err);
  }
}

export function useRealtimeConnectionManager() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // 1) Keep Realtime auth in sync with access token
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const token = session?.access_token;
        if (token) {
          const rt: any = (supabase as any).realtime;
          if (rt?.setAuth) {
            rt.setAuth(token);
          }
        }
      } catch (err) {
        console.warn('onAuthStateChange setAuth failed:', err);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // 2) Reconnect on app resume with debounce
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        const now = Date.now();
        if (isReconnectingGloballyRef.current || now - lastReconnectAtRef.current < 1500) {
          appStateRef.current = nextState;
          return;
        }
        isReconnectingGloballyRef.current = true;
        lastReconnectAtRef.current = now;

        try {
          // Give the app a small window to settle
          await new Promise(r => setTimeout(r, 600));
          await refreshSessionIfNearExpiry();
          await refreshRealtimeAuthToken();
          await forceReconnectAllChannels();
        } finally {
          isReconnectingGloballyRef.current = false;
        }
      }
      appStateRef.current = nextState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // 3) Reconnect on network regain
    if (!NetInfo?.addEventListener) return;

    const unsubscribe = NetInfo.addEventListener(async (state: any) => {
      const isOnline = !!(state?.isConnected && (state?.isInternetReachable ?? true));
      if (!isOnline) return;

      const now = Date.now();
      if (isReconnectingGloballyRef.current || now - lastReconnectAtRef.current < 1500) {
        return;
      }
      isReconnectingGloballyRef.current = true;
      lastReconnectAtRef.current = now;
      try {
        await refreshSessionIfNearExpiry();
        await refreshRealtimeAuthToken();
        await forceReconnectAllChannels();
      } finally {
        isReconnectingGloballyRef.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // 4) Periodic health sweep while foregrounded
    const interval = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      const channels = supabase.getChannels();
      const unhealthy = channels.filter((ch: any) => ch.state === 'closed' || ch.state === 'errored');
      if (unhealthy.length === 0) return;
      const now = Date.now();
      if (isReconnectingGloballyRef.current || now - lastReconnectAtRef.current < 1500) return;
      isReconnectingGloballyRef.current = true;
      lastReconnectAtRef.current = now;
      try {
        await forceReconnectAllChannels();
      } finally {
        isReconnectingGloballyRef.current = false;
      }
    }, 7000);

    return () => clearInterval(interval);
  }, []);
}

// Export helpers for diagnostics if needed
export const RealtimeConnectionDebug = {
  refreshRealtimeAuthToken,
  forceReconnectAllChannels,
};


