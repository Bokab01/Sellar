/**
 * Enhanced user status checking
 * Determines if a user exists and their confirmation status
 */

import { supabase } from '@/lib/supabase';

export interface UserStatusResult {
  exists: boolean;
  isConfirmed?: boolean;
  hasProfile?: boolean;
  canResendConfirmation?: boolean;
  recommendedAction: 'signup' | 'signin' | 'resend_confirmation' | 'unknown';
  message: string;
}

/**
 * Check comprehensive user status for better UX decisions
 */
export async function checkUserStatus(email: string): Promise<UserStatusResult> {
  try {
    console.log('Checking comprehensive user status for:', email);
    
    // Step 1: Check if email exists in auth.users
    const { data: emailExists, error: emailError } = await supabase
      .rpc('check_email_exists', { email_to_check: email.toLowerCase() });
    
    if (emailError) {
      console.error('Email existence check failed:', emailError);
      return {
        exists: false,
        recommendedAction: 'signup',
        message: 'Unable to verify email status. You can proceed with signup.'
      };
    }
    
    if (!emailExists) {
      // Email doesn't exist - safe to signup
      return {
        exists: false,
        recommendedAction: 'signup',
        message: 'Email is available for signup.'
      };
    }
    
    // Step 2: Check if user has a profile (indicates confirmed user)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .eq('email', email.toLowerCase())
      .limit(1);
    
    if (profileError) {
      console.error('Profile check failed:', profileError);
      // Fallback: email exists but can't check profile status
      return {
        exists: true,
        recommendedAction: 'signin',
        message: 'An account with this email exists. Please try signing in.'
      };
    }
    
    if (profile && profile.length > 0) {
      // Profile exists - user is confirmed
      return {
        exists: true,
        isConfirmed: true,
        hasProfile: true,
        canResendConfirmation: false,
        recommendedAction: 'signin',
        message: 'This email is already registered with a verified account. Please sign in instead.'
      };
    }
    
    // Step 3: Email exists but no profile - likely unconfirmed user
    return {
      exists: true,
      isConfirmed: false,
      hasProfile: false,
      canResendConfirmation: true,
      recommendedAction: 'resend_confirmation',
      message: 'An account with this email exists but is not verified. You can resend the confirmation email.'
    };
    
  } catch (error) {
    console.error('User status check failed:', error);
    return {
      exists: false,
      recommendedAction: 'unknown',
      message: 'Unable to check user status. Please try again.'
    };
  }
}

/**
 * Get user-friendly action buttons based on user status
 */
export function getUserStatusActions(status: UserStatusResult): Array<{
  text: string;
  action: 'cancel' | 'signin' | 'resend' | 'signup';
  style?: 'default' | 'cancel' | 'destructive';
}> {
  const actions: Array<{
    text: string;
    action: 'cancel' | 'signin' | 'resend' | 'signup';
    style?: 'default' | 'cancel' | 'destructive';
  }> = [{ text: 'Cancel', action: 'cancel', style: 'cancel' }];
  
  switch (status.recommendedAction) {
    case 'signin':
      actions.push({ text: 'Sign In', action: 'signin' });
      if (status.canResendConfirmation) {
        actions.push({ text: 'Resend Confirmation', action: 'resend' });
      }
      break;
      
    case 'resend_confirmation':
      actions.push({ text: 'Sign In', action: 'signin' });
      actions.push({ text: 'Resend Confirmation', action: 'resend' });
      break;
      
    case 'signup':
      actions.push({ text: 'Continue Signup', action: 'signup' });
      break;
      
    default:
      actions.push({ text: 'Try Again', action: 'signup' });
      break;
  }
  
  return actions;
}

