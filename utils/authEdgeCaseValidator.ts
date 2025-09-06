/**
 * Authentication Edge Case Validator
 * Comprehensive validation for authentication edge cases
 */

import { supabase } from '@/lib/supabase';
import { validateEmail } from './validation';

export interface EdgeCaseResult {
  case: string;
  status: 'safe' | 'warning' | 'critical';
  message: string;
  suggestedAction?: string;
}

/**
 * Validate authentication edge cases
 */
export class AuthEdgeCaseValidator {
  
  /**
   * Check for email verification edge cases
   */
  static async validateEmailVerification(email: string, token?: string): Promise<EdgeCaseResult[]> {
    const results: EdgeCaseResult[] = [];
    
    // Check email format variations
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      results.push({
        case: 'invalid_email_format',
        status: 'critical',
        message: 'Email format is invalid',
        suggestedAction: 'Validate email format before processing'
      });
    }
    
    // Check for suspicious email patterns
    const suspiciousPatterns = [
      /\+.*\+/, // Multiple + signs
      /\.{2,}/, // Multiple consecutive dots
      /@.*@/, // Multiple @ signs
      /[<>]/, // HTML brackets
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(email))) {
      results.push({
        case: 'suspicious_email_pattern',
        status: 'warning',
        message: 'Email contains suspicious patterns',
        suggestedAction: 'Additional validation recommended'
      });
    }
    
    // Check token if provided
    if (token) {
      if (token.length < 10) {
        results.push({
          case: 'weak_verification_token',
          status: 'critical',
          message: 'Verification token appears to be too short',
          suggestedAction: 'Regenerate verification token'
        });
      }
      
      // Check for token tampering
      if (!/^[a-zA-Z0-9\-_]+$/.test(token)) {
        results.push({
          case: 'tampered_token',
          status: 'critical',
          message: 'Verification token contains invalid characters',
          suggestedAction: 'Reject token and request new verification'
        });
      }
    }
    
    return results;
  }
  
  /**
   * Check for session management edge cases
   */
  static async validateSessionState(): Promise<EdgeCaseResult[]> {
    const results: EdgeCaseResult[] = [];
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        results.push({
          case: 'session_retrieval_error',
          status: 'critical',
          message: 'Unable to retrieve current session',
          suggestedAction: 'Clear local storage and redirect to login'
        });
      }
      
      if (session) {
        // Check session expiry
        const expiresAt = new Date(session.expires_at! * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        if (timeUntilExpiry < 0) {
          results.push({
            case: 'expired_session',
            status: 'critical',
            message: 'Session has expired',
            suggestedAction: 'Attempt token refresh or redirect to login'
          });
        } else if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
          results.push({
            case: 'session_expiring_soon',
            status: 'warning',
            message: 'Session expires in less than 5 minutes',
            suggestedAction: 'Proactively refresh session'
          });
        }
        
        // Check for invalid user data
        if (!session.user?.id) {
          results.push({
            case: 'invalid_user_data',
            status: 'critical',
            message: 'Session exists but user data is invalid',
            suggestedAction: 'Clear session and redirect to login'
          });
        }
      }
      
    } catch (error) {
      results.push({
        case: 'session_check_exception',
        status: 'critical',
        message: 'Exception occurred while checking session',
        suggestedAction: 'Handle gracefully and redirect to login'
      });
    }
    
    return results;
  }
  
  /**
   * Check for profile creation edge cases
   */
  static async validateProfileCreation(userId: string): Promise<EdgeCaseResult[]> {
    const results: EdgeCaseResult[] = [];
    
    try {
      // Check if profile exists
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, created_at, first_name, last_name')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        results.push({
          case: 'profile_query_error',
          status: 'critical',
          message: 'Error querying profile data',
          suggestedAction: 'Retry profile creation or manual intervention'
        });
      }
      
      if (!profile) {
        results.push({
          case: 'missing_profile',
          status: 'critical',
          message: 'User exists in auth but no profile found',
          suggestedAction: 'Trigger profile creation process'
        });
      } else {
        // Check for incomplete profile data
        if (!profile.first_name || !profile.last_name) {
          results.push({
            case: 'incomplete_profile',
            status: 'warning',
            message: 'Profile exists but missing required fields',
            suggestedAction: 'Prompt user to complete profile'
          });
        }
        
        // Check profile age (detect stuck profiles)
        const profileAge = Date.now() - new Date(profile.created_at).getTime();
        if (profileAge < 1000) { // Less than 1 second old
          results.push({
            case: 'very_new_profile',
            status: 'warning',
            message: 'Profile was just created - potential race condition',
            suggestedAction: 'Wait and retry if needed'
          });
        }
      }
      
    } catch (error) {
      results.push({
        case: 'profile_validation_exception',
        status: 'critical',
        message: 'Exception during profile validation',
        suggestedAction: 'Handle gracefully and retry'
      });
    }
    
    return results;
  }
  
  /**
   * Check for network connectivity edge cases
   */
  static async validateConnectivity(): Promise<EdgeCaseResult[]> {
    const results: EdgeCaseResult[] = [];
    
    try {
      const startTime = Date.now();
      
      // Simple connectivity test
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        results.push({
          case: 'connectivity_error',
          status: 'critical',
          message: 'Unable to connect to database',
          suggestedAction: 'Show offline mode or retry prompt'
        });
      } else if (responseTime > 10000) { // More than 10 seconds
        results.push({
          case: 'slow_connection',
          status: 'warning',
          message: 'Very slow database response',
          suggestedAction: 'Show loading indicators and timeout handling'
        });
      } else if (responseTime > 5000) { // More than 5 seconds
        results.push({
          case: 'moderate_latency',
          status: 'warning',
          message: 'Moderate network latency detected',
          suggestedAction: 'Consider showing progress indicators'
        });
      }
      
    } catch (error) {
      results.push({
        case: 'connectivity_test_failed',
        status: 'critical',
        message: 'Network connectivity test failed',
        suggestedAction: 'Implement offline handling'
      });
    }
    
    return results;
  }
  
  /**
   * Check for input validation edge cases
   */
  static validateInputSecurity(input: string, fieldName: string): EdgeCaseResult[] {
    const results: EdgeCaseResult[] = [];
    
    // Check for SQL injection patterns
    const sqlPatterns = [
      /('|(\\')|(;)|(\\;))/i,
      /((\s*(union|select|insert|delete|update|drop|create|alter|exec|execute)\s+))/i,
      /(\s*(or|and)\s+\w+\s*=\s*\w+)/i,
    ];
    
    if (sqlPatterns.some(pattern => pattern.test(input))) {
      results.push({
        case: 'sql_injection_attempt',
        status: 'critical',
        message: `Potential SQL injection in ${fieldName}`,
        suggestedAction: 'Sanitize input and log security event'
      });
    }
    
    // Check for XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
    ];
    
    if (xssPatterns.some(pattern => pattern.test(input))) {
      results.push({
        case: 'xss_attempt',
        status: 'critical',
        message: `Potential XSS attempt in ${fieldName}`,
        suggestedAction: 'Sanitize input and log security event'
      });
    }
    
    // Check for excessive length
    if (input.length > 1000) {
      results.push({
        case: 'excessive_input_length',
        status: 'warning',
        message: `${fieldName} is unusually long`,
        suggestedAction: 'Truncate or reject input'
      });
    }
    
    // Check for null bytes
    if (input.includes('\0')) {
      results.push({
        case: 'null_byte_injection',
        status: 'critical',
        message: `Null byte detected in ${fieldName}`,
        suggestedAction: 'Reject input immediately'
      });
    }
    
    return results;
  }
  
  /**
   * Run comprehensive edge case validation
   */
  static async runComprehensiveValidation(context: {
    email?: string;
    token?: string;
    userId?: string;
    inputs?: { [key: string]: string };
  }): Promise<EdgeCaseResult[]> {
    const allResults: EdgeCaseResult[] = [];
    
    // Email verification validation
    if (context.email) {
      const emailResults = await this.validateEmailVerification(context.email, context.token);
      allResults.push(...emailResults);
    }
    
    // Session validation
    const sessionResults = await this.validateSessionState();
    allResults.push(...sessionResults);
    
    // Profile validation
    if (context.userId) {
      const profileResults = await this.validateProfileCreation(context.userId);
      allResults.push(...profileResults);
    }
    
    // Connectivity validation
    const connectivityResults = await this.validateConnectivity();
    allResults.push(...connectivityResults);
    
    // Input validation
    if (context.inputs) {
      Object.entries(context.inputs).forEach(([fieldName, value]) => {
        const inputResults = this.validateInputSecurity(value, fieldName);
        allResults.push(...inputResults);
      });
    }
    
    return allResults;
  }
}

/**
 * Format edge case results for display
 */
export function formatEdgeCaseResults(results: EdgeCaseResult[]): string {
  if (results.length === 0) {
    return '✅ No edge cases detected';
  }
  
  let output = '🔍 Edge Case Validation Results\n';
  output += '================================\n\n';
  
  const critical = results.filter(r => r.status === 'critical');
  const warnings = results.filter(r => r.status === 'warning');
  const safe = results.filter(r => r.status === 'safe');
  
  if (critical.length > 0) {
    output += '🚨 CRITICAL ISSUES:\n';
    critical.forEach(result => {
      output += `  ❌ ${result.case}: ${result.message}\n`;
      if (result.suggestedAction) {
        output += `     💡 Action: ${result.suggestedAction}\n`;
      }
    });
    output += '\n';
  }
  
  if (warnings.length > 0) {
    output += '⚠️  WARNINGS:\n';
    warnings.forEach(result => {
      output += `  ⚠️  ${result.case}: ${result.message}\n`;
      if (result.suggestedAction) {
        output += `     💡 Action: ${result.suggestedAction}\n`;
      }
    });
    output += '\n';
  }
  
  if (safe.length > 0) {
    output += '✅ SAFE:\n';
    safe.forEach(result => {
      output += `  ✅ ${result.case}: ${result.message}\n`;
    });
  }
  
  return output;
}
