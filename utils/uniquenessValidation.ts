/**
 * Database uniqueness validation utilities
 */

import { supabase } from '../lib/supabase';

export interface UniquenessResult {
  isUnique: boolean;
  error?: string;
  field?: string;
}

/**
 * Check if email is unique in the database
 */
export async function checkEmailUniqueness(email: string, excludeUserId?: string): Promise<UniquenessResult> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Check in auth.users table first (primary source of truth for emails)
    let authQuery = supabase
      .from('profiles')
      .select('id, email')
      .eq('email', trimmedEmail);
    
    // Exclude current user if updating profile
    if (excludeUserId) {
      authQuery = authQuery.neq('id', excludeUserId);
    }
    
    const { data: profiles, error } = await authQuery;
    
    if (error) {
      console.error('Error checking email uniqueness:', error);
      return { 
        isUnique: false, 
        error: 'Unable to verify email availability. Please try again.',
        field: 'email'
      };
    }
    
    if (profiles && profiles.length > 0) {
      return { 
        isUnique: false, 
        error: 'This email address is already registered. Please use a different email or try signing in.',
        field: 'email'
      };
    }
    
    return { isUnique: true };
    
  } catch (error) {
    console.error('Email uniqueness check failed:', error);
    return { 
      isUnique: false, 
      error: 'Unable to verify email availability. Please try again.',
      field: 'email'
    };
  }
}

/**
 * Check if username is unique in the database
 */
export async function checkUsernameUniqueness(username: string, excludeUserId?: string): Promise<UniquenessResult> {
  try {
    const trimmedUsername = username.trim().toLowerCase();
    
    let query = supabase
      .from('profiles')
      .select('id, username')
      .eq('username', trimmedUsername);
    
    // Exclude current user if updating profile
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }
    
    const { data: profiles, error } = await query;
    
    if (error) {
      console.error('Error checking username uniqueness:', error);
      return { 
        isUnique: false, 
        error: 'Unable to verify username availability. Please try again.',
        field: 'username'
      };
    }
    
    if (profiles && profiles.length > 0) {
      return { 
        isUnique: false, 
        error: 'This username is already taken. Please choose a different username.',
        field: 'username'
      };
    }
    
    return { isUnique: true };
    
  } catch (error) {
    console.error('Username uniqueness check failed:', error);
    return { 
      isUnique: false, 
      error: 'Unable to verify username availability. Please try again.',
      field: 'username'
    };
  }
}

/**
 * Check if phone number is unique in the database
 */
export async function checkPhoneUniqueness(phone: string, excludeUserId?: string): Promise<UniquenessResult> {
  try {
    // Normalize phone number (remove spaces, ensure consistent format)
    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    
    // Convert to standard format (if starts with 0, also check +233 version)
    const phoneVariants = [normalizedPhone];
    
    if (normalizedPhone.startsWith('0')) {
      phoneVariants.push('+233' + normalizedPhone.substring(1));
    } else if (normalizedPhone.startsWith('+233')) {
      phoneVariants.push('0' + normalizedPhone.substring(4));
    }
    
    let query = supabase
      .from('profiles')
      .select('id, phone')
      .in('phone', phoneVariants);
    
    // Exclude current user if updating profile
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }
    
    const { data: profiles, error } = await query;
    
    if (error) {
      console.error('Error checking phone uniqueness:', error);
      return { 
        isUnique: false, 
        error: 'Unable to verify phone number availability. Please try again.',
        field: 'phone'
      };
    }
    
    if (profiles && profiles.length > 0) {
      return { 
        isUnique: false, 
        error: 'This phone number is already registered. Please use a different phone number.',
        field: 'phone'
      };
    }
    
    return { isUnique: true };
    
  } catch (error) {
    console.error('Phone uniqueness check failed:', error);
    return { 
      isUnique: false, 
      error: 'Unable to verify phone number availability. Please try again.',
      field: 'phone'
    };
  }
}

/**
 * Check multiple fields for uniqueness at once
 */
export async function checkMultipleUniqueness(
  fields: {
    email?: string;
    username?: string;
    phone?: string;
  },
  excludeUserId?: string
): Promise<{
  isValid: boolean;
  errors: Record<string, string>;
}> {
  const errors: Record<string, string> = {};
  const checks: Promise<UniquenessResult>[] = [];
  
  // Prepare all uniqueness checks
  if (fields.email) {
    checks.push(checkEmailUniqueness(fields.email, excludeUserId));
  }
  
  if (fields.username) {
    checks.push(checkUsernameUniqueness(fields.username, excludeUserId));
  }
  
  if (fields.phone) {
    checks.push(checkPhoneUniqueness(fields.phone, excludeUserId));
  }
  
  // Execute all checks in parallel
  try {
    const results = await Promise.all(checks);
    
    // Process results
    results.forEach(result => {
      if (!result.isUnique && result.field && result.error) {
        errors[result.field] = result.error;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
    
  } catch (error) {
    console.error('Multiple uniqueness check failed:', error);
    return {
      isValid: false,
      errors: {
        general: 'Unable to verify field availability. Please try again.'
      }
    };
  }
}

/**
 * Generate username suggestions when the desired username is taken
 */
export async function generateUsernameSuggestions(baseUsername: string): Promise<string[]> {
  const suggestions: string[] = [];
  const base = baseUsername.trim().toLowerCase();
  
  try {
    // Generate variations
    const variations = [
      `${base}_1`,
      `${base}_2`,
      `${base}_3`,
      `${base}123`,
      `${base}2024`,
      `the_${base}`,
      `${base}_official`,
      `${base}_gh`,
      `${base}_seller`
    ];
    
    // Check which variations are available
    for (const variation of variations) {
      const result = await checkUsernameUniqueness(variation);
      if (result.isUnique) {
        suggestions.push(variation);
        if (suggestions.length >= 3) break; // Limit to 3 suggestions
      }
    }
    
    return suggestions;
    
  } catch (error) {
    console.error('Error generating username suggestions:', error);
    return [];
  }
}
