// =============================================
// APP STARTUP SECURITY DISABLE
// Add this to your app startup to immediately stop infinite loops
// =============================================

// Set global flag to disable all security logging immediately
(global as any).__SECURITY_LOGGING_DISABLED__ = true;

console.log('🛑 EMERGENCY: All security logging disabled globally on app startup');
console.log('✅ This should stop the infinite loop immediately');
console.log('🔄 Re-enable after running the database fix script');

// Export for use in other parts of the app
export const isSecurityLoggingDisabled = () => !!(global as any).__SECURITY_LOGGING_DISABLED__;
export const enableSecurityLogging = () => {
  delete (global as any).__SECURITY_LOGGING_DISABLED__;
  console.log('✅ Security logging re-enabled');
};
export const disableSecurityLogging = () => {
  (global as any).__SECURITY_LOGGING_DISABLED__ = true;
  console.log('🛑 Security logging disabled');
};
