/**
 * Debug Registration - Targeted Fix for False Positive Email Errors
 */

import { checkMultipleUniqueness, checkEmailUniqueness } from './uniquenessValidation';

/**
 * Debug the exact uniqueness validation that's failing
 */
export async function debugUniquenessValidation(email: string, phone?: string) {
  console.log('🔍 Debugging uniqueness validation for:', { email, phone });
  
  try {
    // Test individual email check
    console.log('1. Testing individual email check...');
    const emailResult = await checkEmailUniqueness(email);
    console.log('   Email check result:', emailResult);
    
    // Test multiple uniqueness check
    console.log('2. Testing multiple uniqueness check...');
    const multipleResult = await checkMultipleUniqueness({
      email: email.trim(),
      phone: phone?.trim() || undefined,
    });
    console.log('   Multiple check result:', multipleResult);
    
    // Compare results
    if (emailResult.isUnique && !multipleResult.isValid) {
      console.log('⚠️  INCONSISTENCY DETECTED!');
      console.log('   Individual email check: PASSED');
      console.log('   Multiple uniqueness check: FAILED');
      console.log('   This is the source of your issue!');
    }
    
    return {
      emailCheck: emailResult,
      multipleCheck: multipleResult,
      hasInconsistency: emailResult.isUnique && !multipleResult.isValid
    };
    
  } catch (error) {
    console.error('Debug validation failed:', error);
    return {
      error: error,
      emailCheck: null,
      multipleCheck: null,
      hasInconsistency: false
    };
  }
}

/**
 * Bypass uniqueness validation for testing
 */
export function createBypassedUniquenessCheck() {
  return {
    isValid: true,
    errors: {}
  };
}

/**
 * Enhanced uniqueness check with better error handling
 */
export async function enhancedUniquenessCheck(fields: {
  email?: string;
  phone?: string;
}): Promise<{
  isValid: boolean;
  errors: Record<string, string>;
  debugInfo?: any;
}> {
  try {
    console.log('🔍 Enhanced uniqueness check starting...', fields);
    
    // Individual checks for better debugging
    const results = [];
    
    if (fields.email) {
      console.log('   Checking email:', fields.email);
      const emailResult = await checkEmailUniqueness(fields.email);
      console.log('   Email result:', emailResult);
      results.push(emailResult);
    }
    
    // Process results
    const errors: Record<string, string> = {};
    results.forEach(result => {
      if (!result.isUnique && result.field && result.error) {
        errors[result.field] = result.error;
      }
    });
    
    const isValid = Object.keys(errors).length === 0;
    
    console.log('   Final result:', { isValid, errors });
    
    return {
      isValid,
      errors,
      debugInfo: {
        individualResults: results,
        processedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Enhanced uniqueness check failed:', error);
    return {
      isValid: false,
      errors: {
        general: 'Unable to verify field availability. Please try again.'
      },
      debugInfo: { error }
    };
  }
}
