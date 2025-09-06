/**
 * Pre-signup validation to handle edge cases
 * Checks for existing users before attempting registration
 */

import { supabase } from '@/lib/supabase';

export interface PreSignupResult {
  canProceed: boolean;
  error?: string;
  userStatus?: 'new' | 'unconfirmed' | 'confirmed';
}

/**
 * Check if user can proceed with signup
 * Handles edge cases for existing users
 */
export async function validatePreSignup(email: string): Promise<PreSignupResult> {
  try {
    console.log('Pre-signup validation for:', email);
    
    // First check profiles table (faster and always accessible)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .eq('email', email.trim().toLowerCase())
      .limit(1);
    
    if (profileError) {
      console.log('Profile check error:', profileError);
      // If we can't check, allow signup to proceed (Supabase will handle it)
      return { canProceed: true };
    }
    
    if (profiles && profiles.length > 0) {
      // User has a profile, which means they're confirmed
      console.log('Found existing profile - user is confirmed');
      return {
        canProceed: false,
        error: 'An account with this email already exists and is verified. Please sign in instead.',
        userStatus: 'confirmed'
      };
    }
    
    // Try to check auth users (might not work client-side)
    try {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (!listError && users) {
        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          console.log('Found existing auth user:', {
            confirmed: !!existingUser.email_confirmed_at,
            created: existingUser.created_at
          });
          
          if (!existingUser.email_confirmed_at) {
            // User exists but not confirmed
            return {
              canProceed: false,
              error: 'An account with this email already exists but is not verified. Please check your email for the verification link, or contact support if you need help.',
              userStatus: 'unconfirmed'
            };
          } else {
            // User exists and confirmed but no profile (edge case)
            return {
              canProceed: false,
              error: 'An account with this email already exists. Please try signing in.',
              userStatus: 'confirmed'
            };
          }
        }
      }
    } catch (adminError) {
      console.log('Could not check auth users (normal for client-side):', adminError);
    }
    
    // No existing user found - can proceed
    console.log('No existing user found - can proceed with signup');
    return {
      canProceed: true,
      userStatus: 'new'
    };
    
  } catch (error) {
    console.error('Pre-signup validation error:', error);
    // On error, allow signup to proceed (Supabase will handle validation)
    return { canProceed: true };
  }
}

/**
 * Get user-friendly error message based on validation result
 */
export function getSignupErrorMessage(result: PreSignupResult): string {
  if (result.canProceed) return '';
  
  switch (result.userStatus) {
    case 'confirmed':
      return 'This email is already registered with a verified account. Please sign in instead.';
    case 'unconfirmed':
      return 'This email is already registered but not verified. Please check your email for the verification link, or contact support if you need a new verification email.';
    default:
      return result.error || 'An account with this email already exists.';
  }
}

/**
 * Get suggested actions based on validation result
 */
export function getSignupSuggestedActions(result: PreSignupResult): string[] {
  if (result.canProceed) return [];
  
  switch (result.userStatus) {
    case 'confirmed':
      return [
        'Try signing in with this email',
        'Use the "Forgot Password" option if you don\'t remember your password',
        'Use a different email address'
      ];
    case 'unconfirmed':
      return [
        'Check your email inbox and spam folder for the verification link',
        'Try signing in (some accounts work without verification)',
        'Contact support if you need a new verification email',
        'Use a different email address'
      ];
    default:
      return [
        'Try signing in instead',
        'Use the "Forgot Password" option if needed',
        'Use a different email address'
      ];
  }
}
