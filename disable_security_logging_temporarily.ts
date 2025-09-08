// =============================================
// TEMPORARY SECURITY LOGGING DISABLE
// Run this to stop all security logging until database is fixed
// =============================================

import { securityLogger } from '@/utils/securityLogger';

// Disable all security logging temporarily
export function disableAllSecurityLogging() {
  console.log('🛑 DISABLING ALL SECURITY LOGGING TEMPORARILY');
  
  // Disable the main security logger
  securityLogger.disableDatabaseLogging();
  
  // Set a global flag to disable all security logging
  (global as any).__SECURITY_LOGGING_DISABLED__ = true;
  
  console.log('✅ All security logging disabled. Re-enable after fixing database.');
}

// Re-enable security logging
export function enableAllSecurityLogging() {
  console.log('🔄 RE-ENABLING ALL SECURITY LOGGING');
  
  // Re-enable the main security logger
  securityLogger.enableDatabaseLogging();
  
  // Remove the global flag
  delete (global as any).__SECURITY_LOGGING_DISABLED__;
  
  console.log('✅ All security logging re-enabled.');
}

// Check if security logging is disabled
export function isSecurityLoggingDisabled(): boolean {
  return !!(global as any).__SECURITY_LOGGING_DISABLED__;
}
