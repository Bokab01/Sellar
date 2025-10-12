/**
 * Authentication Timeout Constants
 * Standardized timeout values across all auth-related operations
 */
export const AUTH_TIMEOUTS = {
  /** Timeout for each session fetch attempt (10 seconds) */
  SESSION_FETCH: 10000,
  
  /** Number of retry attempts for session fetch */
  SESSION_FETCH_RETRIES: 3,
  
  /** Timeout for profile fetch (8 seconds, less than session fetch) */
  PROFILE_FETCH: 8000,
  
  /** Maximum time for complete app initialization (35 seconds total) */
  APP_INIT_MAX: 35000,
};

