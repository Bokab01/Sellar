/**
 * Rate Limiting System for Brute Force Protection
 * Implements sliding window rate limiting with automatic cleanup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logRateLimitExceeded, logSuspiciousActivity } from './securityLogger';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  enableLogging: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
  isBlocked: boolean;
  blockExpiresAt?: number;
}

export interface AttemptRecord {
  attempts: number[];
  blockedUntil?: number;
  firstAttempt: number;
  lastAttempt: number;
}

/**
 * Advanced Rate Limiter with sliding window and progressive penalties
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private storagePrefix: string;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    blockDurationMs: number = 30 * 60 * 1000, // 30 minutes
    storagePrefix: string = 'rate_limit'
  ) {
    this.config = {
      maxAttempts,
      windowMs,
      blockDurationMs,
      enableLogging: true,
    };
    this.storagePrefix = storagePrefix;
    this.startCleanupTimer();
  }

  /**
   * Check if an action is allowed for a given identifier
   */
  async checkLimit(identifier: string, action: string = 'default'): Promise<RateLimitResult> {
    const key = this.getStorageKey(identifier, action);
    const now = Date.now();

    try {
      // Get current record
      const record = await this.getRecord(key);

      // Check if currently blocked
      if (record.blockedUntil && record.blockedUntil > now) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: record.blockedUntil,
          isBlocked: true,
          blockExpiresAt: record.blockedUntil,
        };
      }

      // Clean old attempts (sliding window)
      const validAttempts = record.attempts.filter(
        timestamp => now - timestamp < this.config.windowMs
      );

      // Check if limit exceeded
      if (validAttempts.length >= this.config.maxAttempts) {
        // Block the identifier
        const blockUntil = now + this.config.blockDurationMs;
        const updatedRecord: AttemptRecord = {
          ...record,
          attempts: validAttempts,
          blockedUntil: blockUntil,
          lastAttempt: now,
        };

        await this.saveRecord(key, updatedRecord);

        // Log rate limit exceeded
        if (this.config.enableLogging) {
          await logRateLimitExceeded(identifier, action, validAttempts.length);
        }

        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: blockUntil,
          isBlocked: true,
          blockExpiresAt: blockUntil,
        };
      }

      // Allow the action
      const remainingAttempts = this.config.maxAttempts - validAttempts.length;
      const oldestAttempt = validAttempts.length > 0 ? Math.min(...validAttempts) : now;
      const resetTime = oldestAttempt + this.config.windowMs;

      return {
        allowed: true,
        remainingAttempts,
        resetTime,
        isBlocked: false,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow the action if there's an error
      return {
        allowed: true,
        remainingAttempts: this.config.maxAttempts,
        resetTime: now + this.config.windowMs,
        isBlocked: false,
      };
    }
  }

  /**
   * Record an attempt for a given identifier
   */
  async recordAttempt(identifier: string, action: string = 'default'): Promise<RateLimitResult> {
    const key = this.getStorageKey(identifier, action);
    const now = Date.now();

    try {
      const record = await this.getRecord(key);

      // Clean old attempts
      const validAttempts = record.attempts.filter(
        timestamp => now - timestamp < this.config.windowMs
      );

      // Add new attempt
      validAttempts.push(now);

      // Update record
      const updatedRecord: AttemptRecord = {
        attempts: validAttempts,
        blockedUntil: record.blockedUntil,
        firstAttempt: record.firstAttempt || now,
        lastAttempt: now,
      };

      await this.saveRecord(key, updatedRecord);

      // Check if this attempt triggers a block
      return await this.checkLimit(identifier, action);
    } catch (error) {
      console.error('Error recording attempt:', error);
      return {
        allowed: true,
        remainingAttempts: this.config.maxAttempts - 1,
        resetTime: now + this.config.windowMs,
        isBlocked: false,
      };
    }
  }

  /**
   * Reset rate limit for an identifier (admin function)
   */
  async resetLimit(identifier: string, action: string = 'default'): Promise<void> {
    const key = this.getStorageKey(identifier, action);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Get current status for an identifier
   */
  async getStatus(identifier: string, action: string = 'default'): Promise<{
    attempts: number;
    isBlocked: boolean;
    blockExpiresAt?: number;
    resetTime: number;
  }> {
    const key = this.getStorageKey(identifier, action);
    const now = Date.now();

    try {
      const record = await this.getRecord(key);
      const validAttempts = record.attempts.filter(
        timestamp => now - timestamp < this.config.windowMs
      );

      const isBlocked = record.blockedUntil ? record.blockedUntil > now : false;
      const oldestAttempt = validAttempts.length > 0 ? Math.min(...validAttempts) : now;
      const resetTime = oldestAttempt + this.config.windowMs;

      return {
        attempts: validAttempts.length,
        isBlocked,
        blockExpiresAt: record.blockedUntil,
        resetTime,
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return {
        attempts: 0,
        isBlocked: false,
        resetTime: now + this.config.windowMs,
      };
    }
  }

  /**
   * Check for suspicious patterns (multiple rapid attempts)
   */
  async checkSuspiciousActivity(identifier: string, action: string = 'default'): Promise<boolean> {
    const key = this.getStorageKey(identifier, action);
    const now = Date.now();

    try {
      const record = await this.getRecord(key);
      const recentAttempts = record.attempts.filter(
        timestamp => now - timestamp < 60000 // Last minute
      );

      // Suspicious if more than 3 attempts in the last minute
      if (recentAttempts.length > 3) {
        if (this.config.enableLogging) {
          await logSuspiciousActivity(
            undefined,
            'rapid_authentication_attempts',
            {
              identifier,
              action,
              attemptsInLastMinute: recentAttempts.length,
              totalAttempts: record.attempts.length,
            }
          );
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return false;
    }
  }

  /**
   * Get storage key for identifier and action
   */
  private getStorageKey(identifier: string, action: string): string {
    return `${this.storagePrefix}:${action}:${identifier}`;
  }

  /**
   * Get record from storage
   */
  private async getRecord(key: string): Promise<AttemptRecord> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error reading rate limit record:', error);
    }

    // Return empty record
    return {
      attempts: [],
      firstAttempt: Date.now(),
      lastAttempt: Date.now(),
    };
  }

  /**
   * Save record to storage
   */
  private async saveRecord(key: string, record: AttemptRecord): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      console.error('Error saving rate limit record:', error);
    }
  }

  /**
   * Start cleanup timer to remove old records
   */
  private startCleanupTimer(): void {
    // Clean up every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRecords().catch(error => {
        console.error('Cleanup error:', error);
      });
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old records from storage
   */
  private async cleanupOldRecords(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const rateLimitKeys = keys.filter(key => key.startsWith(this.storagePrefix));
      const now = Date.now();

      for (const key of rateLimitKeys) {
        const record = await this.getRecord(key);
        
        // Remove if no recent attempts and not blocked
        const hasRecentAttempts = record.attempts.some(
          timestamp => now - timestamp < this.config.windowMs * 2
        );
        const isBlocked = record.blockedUntil && record.blockedUntil > now;

        if (!hasRecentAttempts && !isBlocked) {
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Pre-configured rate limiters for different use cases
 */
export class AuthRateLimiters {
  // Login attempts: 5 attempts per 15 minutes, block for 30 minutes
  static readonly login = new RateLimiter(5, 15 * 60 * 1000, 30 * 60 * 1000, 'auth_login');
  
  // Registration attempts: 3 attempts per hour, block for 1 hour
  static readonly registration = new RateLimiter(3, 60 * 60 * 1000, 60 * 60 * 1000, 'auth_register');
  
  // Password reset: 3 attempts per hour, block for 2 hours
  static readonly passwordReset = new RateLimiter(3, 60 * 60 * 1000, 2 * 60 * 60 * 1000, 'auth_reset');
  
  // Email verification resend: 5 attempts per hour, block for 1 hour
  static readonly emailResend = new RateLimiter(5, 60 * 60 * 1000, 60 * 60 * 1000, 'auth_email_resend');
}

/**
 * Utility functions for common rate limiting scenarios
 */
export const rateLimitUtils = {
  /**
   * Format time remaining for user display
   */
  formatTimeRemaining(ms: number): string {
    const minutes = Math.ceil(ms / (1000 * 60));
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  },

  /**
   * Get user-friendly rate limit message
   */
  getRateLimitMessage(result: RateLimitResult, action: string = 'action'): string {
    if (result.isBlocked && result.blockExpiresAt) {
      const timeRemaining = result.blockExpiresAt - Date.now();
      const timeStr = this.formatTimeRemaining(timeRemaining);
      return `Too many ${action} attempts. Please try again in ${timeStr}.`;
    }
    
    if (result.remainingAttempts <= 2) {
      return `${result.remainingAttempts} attempt${result.remainingAttempts !== 1 ? 's' : ''} remaining before temporary block.`;
    }
    
    return '';
  },

  /**
   * Get device identifier for rate limiting
   */
  getDeviceIdentifier(): string {
    // In a real app, you might use device ID, but for now use a simple approach
    // This could be enhanced with actual device fingerprinting
    return 'device_' + Math.random().toString(36).substring(2, 15);
  },

  /**
   * Get IP-based identifier (would need backend support)
   */
  getIPIdentifier(): string {
    // This would typically come from the backend
    return 'ip_unknown';
  },
};
