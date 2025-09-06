/**
 * Deep Link Utilities for Email Confirmation and Magic Links
 * Handles deep link generation and parsing for Supabase auth flows
 */

import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { logSuspiciousActivity } from './securityLogger';

export interface AuthDeepLinkConfig {
  scheme: string;
  authPath: string;
}

export interface ParsedAuthLink {
  isValid: boolean;
  type: 'email_confirmation' | 'magic_link' | 'password_reset' | 'unknown';
  code?: string;
  error?: string;
  errorDescription?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
}

const DEFAULT_CONFIG: AuthDeepLinkConfig = {
  scheme: 'sellar',
  authPath: 'auth/callback',
};

/**
 * Deep Link Manager for Authentication
 */
export class AuthDeepLinkManager {
  private config: AuthDeepLinkConfig;

  constructor(config: Partial<AuthDeepLinkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate redirect URL for email confirmation
   */
  generateEmailRedirectUrl(): string {
    const redirectUrl = Linking.createURL(this.config.authPath);
    console.log('Generated email redirect URL:', redirectUrl);
    return redirectUrl;
  }

  /**
   * Generate redirect URL for magic link login
   */
  generateMagicLinkRedirectUrl(): string {
    const redirectUrl = Linking.createURL(this.config.authPath);
    console.log('Generated magic link redirect URL:', redirectUrl);
    return redirectUrl;
  }

  /**
   * Generate redirect URL for password reset
   */
  generatePasswordResetRedirectUrl(): string {
    const redirectUrl = Linking.createURL(this.config.authPath);
    console.log('Generated password reset redirect URL:', redirectUrl);
    return redirectUrl;
  }

  /**
   * Parse incoming deep link URL
   */
  parseAuthDeepLink(url: string): ParsedAuthLink {
    try {
      console.log('Parsing auth deep link:', url);
      
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.hash?.substring(1) || parsedUrl.search);
      
      // Extract common parameters
      const code = params.get('code');
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const tokenType = params.get('token_type');
      const type = params.get('type');

      // Log the parsed parameters for debugging
      console.log('Parsed deep link parameters:', {
        code: code ? 'present' : 'missing',
        error,
        errorDescription,
        accessToken: accessToken ? 'present' : 'missing',
        refreshToken: refreshToken ? 'present' : 'missing',
        tokenType,
        type,
      });

      // Handle error cases
      if (error) {
      return {
        isValid: false,
        type: 'unknown',
        error,
        errorDescription: errorDescription || undefined,
      };
      }

      // Determine the type of auth link
      let linkType: ParsedAuthLink['type'] = 'unknown';
      
      if (type === 'signup' || (code && !type)) {
        linkType = 'email_confirmation';
      } else if (type === 'magiclink') {
        linkType = 'magic_link';
      } else if (type === 'recovery') {
        linkType = 'password_reset';
      } else if (accessToken && refreshToken) {
        // Direct token response (older Supabase versions)
        linkType = 'magic_link';
      }

      return {
        isValid: !!(code || (accessToken && refreshToken)),
        type: linkType,
        code: code || undefined,
        accessToken: accessToken || undefined,
        refreshToken: refreshToken || undefined,
        tokenType: tokenType || undefined,
      };
    } catch (error) {
      console.error('Error parsing auth deep link:', error);
      return {
        isValid: false,
        type: 'unknown',
        error: 'Invalid URL format',
      };
    }
  }

  /**
   * Handle incoming auth deep link
   */
  async handleAuthDeepLink(url: string): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    error?: string;
  }> {
    try {
      console.log('Handling auth deep link:', url);
      
      const parsed = this.parseAuthDeepLink(url);
      
      if (!parsed.isValid) {
        console.error('Invalid auth deep link:', parsed.error);
        return {
          success: false,
          error: parsed.error || 'Invalid authentication link',
        };
      }

      // Handle different auth flows
      switch (parsed.type) {
        case 'email_confirmation':
        case 'magic_link':
          return await this.handleCodeExchange(url, parsed);
        
        case 'password_reset':
          return await this.handlePasswordReset(parsed);
        
        default:
          console.warn('Unknown auth link type:', parsed.type);
          return {
            success: false,
            error: 'Unknown authentication link type',
          };
      }
    } catch (error: any) {
      console.error('Error handling auth deep link:', error);
      
      // Log suspicious activity for repeated failures
      await logSuspiciousActivity(
        undefined,
        'auth_deep_link_failure',
        {
          url: url.substring(0, 100), // Truncate for security
          error: error.message,
          timestamp: new Date().toISOString(),
        }
      );

      return {
        success: false,
        error: error.message || 'Failed to process authentication link',
      };
    }
  }

  /**
   * Handle code exchange for email confirmation and magic links
   */
  private async handleCodeExchange(url: string, parsed: ParsedAuthLink): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    error?: string;
  }> {
    try {
      console.log('Exchanging code for session...');
      
      // Use the new exchangeCodeForSession method
      const { data, error } = await supabase.auth.exchangeCodeForSession(url);
      
      if (error) {
        console.error('Code exchange error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.user && data.session) {
        console.log('✅ Code exchange successful:', {
          userId: data.user.id,
          email: data.user.email,
          emailConfirmed: !!data.user.email_confirmed_at,
        });

        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      return {
        success: false,
        error: 'No user or session returned from code exchange',
      };
    } catch (error: any) {
      console.error('Code exchange exception:', error);
      return {
        success: false,
        error: error.message || 'Code exchange failed',
      };
    }
  }

  /**
   * Handle password reset deep link
   */
  private async handlePasswordReset(parsed: ParsedAuthLink): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    error?: string;
  }> {
    try {
      console.log('Handling password reset deep link...');
      
      // For password reset, we don't automatically sign in
      // Instead, we verify the session and redirect to password reset screen
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          success: false,
          error: 'Invalid password reset link',
        };
      }

      return {
        success: true,
        session,
        // Note: For password reset, the app should navigate to reset password screen
      };
    } catch (error: any) {
      console.error('Password reset handling error:', error);
      return {
        success: false,
        error: error.message || 'Password reset link handling failed',
      };
    }
  }

  /**
   * Check if URL is an auth deep link
   */
  isAuthDeepLink(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === `${this.config.scheme}:` && 
             parsedUrl.pathname.includes(this.config.authPath);
    } catch {
      return false;
    }
  }

  /**
   * Get the current linking configuration
   */
  getLinkingConfig() {
    return {
      prefixes: [`${this.config.scheme}://`],
      config: {
        screens: {
          '(auth)': {
            screens: {
              'email-confirmation': this.config.authPath,
            },
          },
        },
      },
    };
  }
}

// Export singleton instance
export const authDeepLinkManager = new AuthDeepLinkManager();

// Convenience functions
export const generateEmailRedirectUrl = () => authDeepLinkManager.generateEmailRedirectUrl();
export const generateMagicLinkRedirectUrl = () => authDeepLinkManager.generateMagicLinkRedirectUrl();
export const generatePasswordResetRedirectUrl = () => authDeepLinkManager.generatePasswordResetRedirectUrl();
export const handleAuthDeepLink = (url: string) => authDeepLinkManager.handleAuthDeepLink(url);
export const isAuthDeepLink = (url: string) => authDeepLinkManager.isAuthDeepLink(url);
export const parseAuthDeepLink = (url: string) => authDeepLinkManager.parseAuthDeepLink(url);
