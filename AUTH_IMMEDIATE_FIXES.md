# 🔧 IMMEDIATE AUTH FIXES - ACTION PLAN

## 🔴 CRITICAL FIX #1: Enable Security Event Logging (15 minutes)

### Problem:
Security events are not being logged to the database due to disabled code.

### Files to Fix:
1. `lib/securityService.ts` (line 302-328)

### Solution:
Either fix RLS policies or use service role for system logging.

**Option A: Fix RLS Policies (Recommended)**
```sql
-- Add policy to allow authenticated users to log their own security events
CREATE POLICY "Users can insert their own security events" ON security_events
FOR INSERT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage all security events" ON security_events
FOR ALL
TO service_role
USING (true);
```

**Option B: Use Service Role Client**
```typescript
// In securityService.ts, use service role for logging
private async logSecurityEvent(...) {
  // Remove the return statement
  // return;
  
  try {
    const { error } = await supabaseAdmin // Use admin client
      .from('security_events')
      .insert({...});
      
    if (error) {
      console.error('Error logging security event:', error);
      // Fallback to AsyncStorage
      await this.logToAsyncStorageFallback(eventData);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}
```

---

## 🔴 CRITICAL FIX #2: Fix Race Condition in Auth Init (30 minutes)

### Problem:
`onAuthStateChange` listener might fire during or before `initializeAuth()` completes, causing duplicate or conflicting state updates.

### File to Fix:
`hooks/useAuth.ts`

### Solution:
```typescript
import { useEffect, useRef } from 'react';
// ... imports ...

export function useAuth() {
  const { /* ... */ } = useAuthStore();
  
  // Add this ref
  const hasInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    const initializeAuth = async () => {
      if (isInitializingRef.current) return; // Prevent double init
      isInitializingRef.current = true;
      
      try {
        console.log('Initializing authentication...');
        
        // ... existing retry logic ...
        
        // Session retrieved successfully (or null)
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Mark as initialized
        hasInitializedRef.current = true;
        
      } catch (error: any) {
        // ... existing error handling ...
        hasInitializedRef.current = true; // Mark initialized even on error
      } finally {
        isInitializingRef.current = false;
      }
    };

    initializeAuth();

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session ? 'session exists' : 'no session');
        
        // Skip INITIAL_SESSION if we haven't finished initializing
        // This prevents race condition
        if (event === 'INITIAL_SESSION' && !hasInitializedRef.current) {
          console.log('Skipping INITIAL_SESSION - still initializing');
          return;
        }
        
        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (!session && event !== 'INITIAL_SESSION') {
          console.log('User signed out or session cleared');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in');
        }
        
        // ... rest of existing logic ...
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { /* ... */ };
}
```

---

## 🔴 CRITICAL FIX #3: Standardize Timeouts (10 minutes)

### Problem:
Different timeouts across auth initialization can cause premature failures.

### Files to Fix:
1. `hooks/useAuth.ts`
2. `hooks/useNewUserDetection.ts`
3. `app/index.tsx`

### Solution:

**Create shared timeout constants:**
```typescript
// constants/auth.ts (NEW FILE)
export const AUTH_TIMEOUTS = {
  SESSION_FETCH: 10000,      // 10 seconds per attempt
  SESSION_FETCH_RETRIES: 3,  // 3 attempts = 30 seconds max
  PROFILE_FETCH: 8000,       // 8 seconds (less than session fetch)
  APP_INIT_MAX: 35000,       // 35 seconds total (session + profile + buffer)
};
```

**Update hooks/useAuth.ts:**
```typescript
import { AUTH_TIMEOUTS } from '@/constants/auth';

// Line 46: Change timeout
setTimeout(() => {
  console.warn(`⚠️ Auth initialization timeout reached (attempt ${attempts})`);
  resolve({ data: { session: null }, error: new Error('Auth initialization timeout') });
}, AUTH_TIMEOUTS.SESSION_FETCH);
```

**Update hooks/useNewUserDetection.ts:**
```typescript
import { AUTH_TIMEOUTS } from '@/constants/auth';

// Line 41: Change timeout
setTimeout(() => {
  console.warn('⚠️ User profile fetch timeout reached');
  resolve({ data: null, error: { message: 'Profile fetch timeout' } });
}, AUTH_TIMEOUTS.PROFILE_FETCH);
```

**Update app/index.tsx:**
```typescript
import { AUTH_TIMEOUTS } from '@/constants/auth';

// Line 9: Change timeout
const MAX_LOADING_TIME = AUTH_TIMEOUTS.APP_INIT_MAX;
```

---

## 🟠 HIGH PRIORITY FIX #4: Remove Redundant Sign-In Call (20 minutes)

### Problem:
Sign-in happens twice: once in `securityService.secureLogin()` and again in `useAuthStore.signIn()`.

### Files to Fix:
1. `hooks/useSecureAuth.ts`
2. `app/(auth)/sign-in.tsx`

### Solution:

**Update hooks/useSecureAuth.ts:**
```typescript
const secureSignIn = async (options: LoginOptions): Promise<{
  success: boolean;
  error?: string;
  requiresMFA?: boolean;
}> => {
  const { email, password, mfaCode, rememberDevice = false, trustDevice = false } = options;

  try {
    // Validate input
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { success: false, error: emailValidation.error };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.error };
    }

    // Check rate limiting
    if (!rateLimiter.isAllowed(email)) {
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime(email) / 1000 / 60);
      return {
        success: false,
        error: `Too many failed attempts. Please try again in ${remainingTime} minutes.`
      };
    }

    setSecureState(prev => ({ ...prev, isLoading: true }));

    // ✅ FIXED: Call signIn directly, not through securityService
    // This prevents double authentication
    const signInResult = await signIn(email, password);
    
    if (signInResult.error) {
      setLoginAttempts(prev => prev + 1);
      setSecureState(prev => ({ ...prev, isLoading: false }));
      
      // Check if MFA required (would need to be added to signIn response)
      if (signInResult.error.includes('MFA') || signInResult.error.includes('verification')) {
        setSecureState(prev => ({ 
          ...prev, 
          requiresMFA: true, 
          isLoading: false 
        }));
        return { success: false, requiresMFA: true };
      }
      
      return { success: false, error: signInResult.error };
    }

    // Trust device if requested
    if (trustDevice && user?.id) {
      await trustCurrentDevice(user.id);
    }

    // Reset login attempts on success
    setLoginAttempts(0);
    rateLimiter.reset(email);

    await initializeSecureAuth();
    return { success: true };

  } catch (error) {
    console.error('Secure sign in error:', error);
    setSecureState(prev => ({ ...prev, isLoading: false }));
    return { success: false, error: 'An unexpected error occurred' };
  }
};
```

---

## 🟠 HIGH PRIORITY FIX #5: Fix Memory Leak (15 minutes)

### Problem:
Security event listeners accumulate on every `user` or `session` change.

### File to Fix:
`hooks/useSecureAuth.ts`

### Solution:

```typescript
// Line 57-65: Fix initialization deps
useEffect(() => {
  // Prevent concurrent initializations
  if (initializingRef.current) return;
  
  initializingRef.current = true;
  initializeSecureAuth().finally(() => {
    initializingRef.current = false;
  });
}, [user?.id]); // ✅ FIXED: Only depend on user ID, not full objects

// Line 67-86: Already has cleanup, but ensure it's working
useEffect(() => {
  const handleSecurityEvent = (event: SecurityEvent) => {
    setSecureState(prev => ({
      ...prev,
      lastSecurityEvent: event,
    }));

    if (event.eventType === 'suspicious_activity') {
      handleSuspiciousActivity(event);
    }
  };

  securityService.addSecurityEventListener(handleSecurityEvent);

  return () => {
    // ✅ This cleanup is correct, just verify it's being called
    console.log('Cleaning up security event listener');
    securityService.removeSecurityEventListener(handleSecurityEvent);
  };
}, []); // Keep empty deps since listener function doesn't depend on external state
```

---

## 🟡 MEDIUM PRIORITY FIX #6: Optimize New User Detection (25 minutes)

### Problem:
Profile fetch adds unnecessary delay before navigation.

### Files to Fix:
1. `app/index.tsx`
2. `hooks/useNewUserDetection.ts`

### Solution:

**Update app/index.tsx:**
```typescript
export default function IndexScreen() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [forceReady, setForceReady] = useState(false);

  // ✅ REMOVED useNewUserDetection from here

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout reached. Forcing navigation to prevent stuck screen.');
        setForceReady(true);
      }
    }, AUTH_TIMEOUTS.APP_INIT_MAX);
    return () => clearTimeout(timeoutId);
  }, [loading]);

  if ((loading || !isReady) && !forceReady) {
    return (
      <SafeAreaWrapper backgroundColor={theme.colors.background}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="body" color="secondary">Loading...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  // ✅ SIMPLIFIED: Navigate immediately based on auth state
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  } else {
    return <Redirect href="/(auth)/onboarding" />;
  }
}
```

**Update app/(tabs)/home/index.tsx (or create a wrapper):**
```typescript
// Add new user detection AFTER navigation
export default function HomeScreen() {
  const { user } = useAuth();
  const { isNewUser, loading } = useNewUserDetection();
  const router = useRouter();

  useEffect(() => {
    // Check if user should see welcome screen after mounting
    if (!loading && isNewUser === true) {
      router.replace('/(auth)/welcome');
    }
  }, [isNewUser, loading]);

  // ... rest of home screen ...
}
```

---

## 🟡 MEDIUM PRIORITY FIX #7: Consolidate Auth Cleanup (30 minutes)

### Problem:
Three different functions clean auth data, might miss some items.

### Solution:

**Create new file: `utils/authCleanup.ts`**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

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

// Backward-compatible exports
export { clearAllAuthData as clearStoredAuthData };
export { clearAllAuthData as clearCorruptedSession };
```

**Update all files to use this:**
```typescript
// In authErrorHandler.ts
import { clearAllAuthData } from './authCleanup';

export async function handleAuthError(error: any) {
  // ... existing logic ...
  if (errorInfo.shouldSignOut) {
    await clearAllAuthData(); // ✅ Use unified function
  }
}

// In refreshTokenHandler.ts
import { clearAllAuthData } from './authCleanup';

private static async clearCorruptedSession(): Promise<void> {
  await clearAllAuthData(); // ✅ Use unified function
}

// In securityService.ts
import { clearAllAuthData } from '@/utils/authCleanup';

async invalidateSession(sessionId?: string): Promise<void> {
  await clearAllAuthData(); // ✅ Use unified function
}
```

---

## 📋 TESTING CHECKLIST

After implementing these fixes, test:

- [ ] **App restart with valid session** → Should go to home immediately
- [ ] **App restart with expired session** → Should clear and show onboarding
- [ ] **Sign in** → Should work in one attempt, no duplicates
- [ ] **Sign in with wrong password** → Should show user-friendly error
- [ ] **Sign in with rate limiting** → Should block after 5 attempts
- [ ] **Security events** → Should be logged to database
- [ ] **Token refresh** → Should happen automatically before expiration
- [ ] **Sign out** → Should clear all auth data completely
- [ ] **New user detection** → Should not delay app navigation
- [ ] **Memory leak test** → Mount/unmount auth hooks 50 times, check memory

---

## 🎯 IMPLEMENTATION ORDER

1. **Fix #3 (Timeouts)** - 10 min - Create constants file
2. **Fix #1 (Security Logging)** - 15 min - Enable logging
3. **Fix #2 (Race Condition)** - 30 min - Add refs to useAuth
4. **Fix #5 (Memory Leak)** - 15 min - Fix deps in useSecureAuth
5. **Fix #7 (Cleanup)** - 30 min - Create unified cleanup
6. **Fix #4 (Redundant Call)** - 20 min - Update secureSignIn
7. **Fix #6 (New User)** - 25 min - Move detection after navigation

**Total Time**: ~2.5 hours for all critical and high-priority fixes

---

## 📞 NEED HELP?

If any fix causes issues:
1. Check console logs for specific errors
2. Verify database RLS policies are correct
3. Test in isolation (comment out other auth logic)
4. Use `console.log` to trace execution flow
5. Check that Supabase client is properly configured

---

**Good luck! 🚀**

