/**
 * Registration Diagnostics Tool
 * Helps diagnose "email already exists" issues during registration
 */

import { supabase } from '@/lib/supabase';
import { checkEmailUniqueness, checkMultipleUniqueness } from './uniquenessValidation';

export interface RegistrationDiagnostic {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

/**
 * Run comprehensive diagnostics on registration system
 */
export async function runRegistrationDiagnostics(email: string): Promise<RegistrationDiagnostic[]> {
  const results: RegistrationDiagnostic[] = [];
  
  // Step 1: Check Supabase connection
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      results.push({
        step: 'Database Connection',
        status: 'error',
        message: 'Cannot connect to Supabase database',
        details: error
      });
    } else {
      results.push({
        step: 'Database Connection',
        status: 'success',
        message: 'Successfully connected to Supabase'
      });
    }
  } catch (error) {
    results.push({
      step: 'Database Connection',
      status: 'error',
      message: 'Database connection failed',
      details: error
    });
  }

  // Step 2: Check if email exists in profiles table
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .eq('email', email.trim().toLowerCase());
    
    if (error) {
      results.push({
        step: 'Profile Check',
        status: 'error',
        message: 'Error checking profiles table',
        details: error
      });
    } else if (profiles && profiles.length > 0) {
      results.push({
        step: 'Profile Check',
        status: 'warning',
        message: `Email found in profiles table (${profiles.length} records)`,
        details: profiles
      });
    } else {
      results.push({
        step: 'Profile Check',
        status: 'success',
        message: 'Email not found in profiles table'
      });
    }
  } catch (error) {
    results.push({
      step: 'Profile Check',
      status: 'error',
      message: 'Failed to check profiles table',
      details: error
    });
  }

  // Step 3: Check auth.users table (if accessible)
  try {
    // Note: This might not work due to RLS policies
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      results.push({
        step: 'Auth Users Check',
        status: 'warning',
        message: 'Cannot access auth.users table (normal for client-side)',
        details: error
      });
    } else {
      const existingUser = authUsers.users.find(user => 
        user.email?.toLowerCase() === email.trim().toLowerCase()
      );
      
      if (existingUser) {
        results.push({
          step: 'Auth Users Check',
          status: 'warning',
          message: 'Email found in auth.users table',
          details: {
            id: existingUser.id,
            email: existingUser.email,
            created_at: existingUser.created_at,
            email_confirmed_at: existingUser.email_confirmed_at
          }
        });
      } else {
        results.push({
          step: 'Auth Users Check',
          status: 'success',
          message: 'Email not found in auth.users table'
        });
      }
    }
  } catch (error) {
    results.push({
      step: 'Auth Users Check',
      status: 'warning',
      message: 'Cannot check auth.users (client-side limitation)',
      details: error
    });
  }

  // Step 4: Test uniqueness validation function
  try {
    const uniquenessResult = await checkEmailUniqueness(email);
    
    results.push({
      step: 'Uniqueness Validation',
      status: uniquenessResult.isUnique ? 'success' : 'warning',
      message: uniquenessResult.isUnique 
        ? 'Email passed uniqueness validation'
        : `Email failed uniqueness validation: ${uniquenessResult.error}`,
      details: uniquenessResult
    });
  } catch (error) {
    results.push({
      step: 'Uniqueness Validation',
      status: 'error',
      message: 'Uniqueness validation function failed',
      details: error
    });
  }

  // Step 5: Test multiple uniqueness validation
  try {
    const multipleResult = await checkMultipleUniqueness({ email });
    
    results.push({
      step: 'Multiple Uniqueness Check',
      status: multipleResult.isValid ? 'success' : 'warning',
      message: multipleResult.isValid 
        ? 'Email passed multiple uniqueness validation'
        : `Email failed multiple uniqueness validation`,
      details: multipleResult
    });
  } catch (error) {
    results.push({
      step: 'Multiple Uniqueness Check',
      status: 'error',
      message: 'Multiple uniqueness validation failed',
      details: error
    });
  }

  // Step 6: Test Supabase signup (dry run simulation)
  try {
    // We can't actually test signup without creating an account,
    // but we can test the auth client connection
    const { data, error } = await supabase.auth.getSession();
    
    results.push({
      step: 'Auth Client Test',
      status: error ? 'error' : 'success',
      message: error ? 'Auth client has issues' : 'Auth client working correctly',
      details: { hasSession: !!data.session, error }
    });
  } catch (error) {
    results.push({
      step: 'Auth Client Test',
      status: 'error',
      message: 'Auth client test failed',
      details: error
    });
  }

  return results;
}

/**
 * Quick email check - simplified version for debugging
 */
export async function quickEmailCheck(email: string): Promise<{
  exists: boolean;
  source: string;
  details?: any;
}> {
  try {
    // Check profiles table
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .limit(1);
    
    if (error) {
      return {
        exists: false,
        source: 'error',
        details: error
      };
    }
    
    if (profiles && profiles.length > 0) {
      return {
        exists: true,
        source: 'profiles_table',
        details: profiles[0]
      };
    }
    
    return {
      exists: false,
      source: 'profiles_table'
    };
    
  } catch (error) {
    return {
      exists: false,
      source: 'exception',
      details: error
    };
  }
}

/**
 * Format diagnostic results for display
 */
export function formatDiagnosticResults(results: RegistrationDiagnostic[]): string {
  let output = '🔍 Registration Diagnostics Results\n';
  output += '=====================================\n\n';
  
  results.forEach((result, index) => {
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'warning' ? '⚠️' : '❌';
    
    output += `${index + 1}. ${icon} ${result.step}\n`;
    output += `   Status: ${result.status.toUpperCase()}\n`;
    output += `   Message: ${result.message}\n`;
    
    if (result.details) {
      output += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
    }
    
    output += '\n';
  });
  
  return output;
}

/**
 * Get registration troubleshooting steps based on diagnostic results
 */
export function getTroubleshootingSteps(results: RegistrationDiagnostic[]): string[] {
  const steps: string[] = [];
  
  const hasDbError = results.some(r => r.step === 'Database Connection' && r.status === 'error');
  const hasProfileMatch = results.some(r => r.step === 'Profile Check' && r.status === 'warning');
  const hasAuthMatch = results.some(r => r.step === 'Auth Users Check' && r.status === 'warning');
  const hasValidationError = results.some(r => r.step.includes('Uniqueness') && r.status === 'error');
  
  if (hasDbError) {
    steps.push('🔧 Start your local Supabase instance: npx supabase start');
    steps.push('🔧 Check your Supabase connection settings in .env');
    steps.push('🔧 Verify your internet connection');
  }
  
  if (hasProfileMatch) {
    steps.push('🗑️ The email exists in the profiles table - this is the source of the error');
    steps.push('🔍 Check if this is a legitimate existing account or leftover test data');
    steps.push('🧹 Consider cleaning up test data if this is a development environment');
  }
  
  if (hasAuthMatch) {
    steps.push('👤 The email exists in auth.users table');
    steps.push('🔑 Try signing in with this email instead of registering');
    steps.push('🔄 If you forgot your password, use the password reset feature');
  }
  
  if (hasValidationError) {
    steps.push('🐛 The uniqueness validation function has issues');
    steps.push('🔧 Check your database connection and RLS policies');
    steps.push('📝 Review the uniqueness validation logic in utils/uniquenessValidation.ts');
  }
  
  if (steps.length === 0) {
    steps.push('✅ No obvious issues found in diagnostics');
    steps.push('🔍 Try registering with a different email to isolate the issue');
    steps.push('📱 Check the app console for additional error details');
    steps.push('🗄️ Verify your database migrations are up to date');
  }
  
  return steps;
}
