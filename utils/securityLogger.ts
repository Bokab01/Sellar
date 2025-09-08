/**
 * Security Event Logging Service
 * Tracks and logs security-related events for monitoring and analysis
 */

import { supabase, db } from '@/lib/supabase';

export interface SecurityEvent {
  eventType: 'input_threat' | 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'account_lockout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface ThreatDetails {
  originalInput: string;
  sanitizedInput: string;
  threatsDetected: number;
  threats: Array<{
    type: string;
    severity: string;
    pattern: string;
    description: string;
  }>;
  fieldName: string;
  action: string; // 'blocked' | 'sanitized' | 'logged'
}

/**
 * Security Logger Service
 */
export class SecurityLogger {
  private static instance: SecurityLogger;
  private eventQueue: SecurityEvent[] = [];
  private isProcessing = false;
  private retryCount = 0;
  private maxRetries = 3;
  private isDisabled = false; // Temporary disable flag

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    // Check global disable flag
    if ((global as any).__SECURITY_LOGGING_DISABLED__) {
      console.warn('Security logging globally disabled:', event.eventType);
      return;
    }
    
    // If disabled, only log to console
    if (this.isDisabled) {
      const securityEvent: SecurityEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };
      this.logToConsole(securityEvent);
      return;
    }

    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Add to queue for batch processing
    this.eventQueue.push(securityEvent);

    // Log to console immediately for development
    this.logToConsole(securityEvent);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processEventQueue();
    }
  }

  /**
   * Log input sanitization threats
   */
  async logInputThreat(details: ThreatDetails): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'input_threat',
      severity: this.determineSeverity(details.threats),
      details: {
        originalInput: details.originalInput.substring(0, 200), // Truncate for storage
        sanitizedInput: details.sanitizedInput.substring(0, 200),
        threatsDetected: details.threatsDetected,
        threats: details.threats,
        fieldName: details.fieldName,
        action: details.action,
        inputLength: details.originalInput.length,
      },
    });
  }

  /**
   * Log failed login attempts
   */
  async logFailedLogin(email: string, reason: string, details?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'failed_login',
      severity: 'medium',
      email,
      details: {
        reason,
        attemptTime: new Date().toISOString(),
        ...details,
      },
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string | undefined,
    activity: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'suspicious_activity',
      severity: 'high',
      userId,
      details: {
        activity,
        ...details,
      },
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimitExceeded(
    identifier: string,
    endpoint: string,
    attempts: number
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'rate_limit_exceeded',
      severity: 'medium',
      details: {
        identifier,
        endpoint,
        attempts,
        timeWindow: '15 minutes',
      },
    });
  }

  /**
   * Log account lockout events
   */
  async logAccountLockout(email: string, reason: string): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'account_lockout',
      severity: 'high',
      email,
      details: {
        reason,
        lockoutTime: new Date().toISOString(),
      },
    });
  }

  /**
   * Process the event queue and store to database
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process events in batches
      const batchSize = 10;
      while (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, batchSize);
        const success = await this.storeBatch(batch);
        
        if (!success) {
          // If storage failed, check retry count
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.warn(`Security event storage failed, retry ${this.retryCount}/${this.maxRetries}`);
            // Re-queue the batch for retry
            this.eventQueue.unshift(...batch);
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, this.retryCount) * 1000));
          } else {
            console.error('Max retries reached for security event storage, temporarily disabling database logging');
            this.retryCount = 0; // Reset for future events
            this.isDisabled = true; // Temporarily disable database logging
            // Re-enable after 5 minutes
            setTimeout(() => {
              this.isDisabled = false;
              console.log('Security event database logging re-enabled');
            }, 5 * 60 * 1000);
            break;
          }
        } else {
          // Reset retry count on success
          this.retryCount = 0;
        }
      }
    } catch (error) {
      console.error('Error processing security event queue:', error);
      // Don't re-queue on unexpected errors to prevent infinite loops
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Store a batch of events to the database
   */
  private async storeBatch(events: SecurityEvent[]): Promise<boolean> {
    try {
      // Store to security_events table (would need to be created)
      const { error } = await db.security_events.insert(events.map(event => ({
        event_type: event.eventType,
        severity: event.severity,
        user_id: event.userId || null,
        email: event.email || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        details: event.details,
        created_at: event.timestamp,
      })));

      if (error) {
        console.error('Error storing security events:', error);
        return false; // Indicate failure
      }
      
      return true; // Indicate success
    } catch (error) {
      console.error('Error in storeBatch:', error);
      return false; // Indicate failure
    }
  }

  /**
   * Log to console for development
   */
  private logToConsole(event: SecurityEvent): void {
    const emoji = this.getSeverityEmoji(event.severity);
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    
    console.warn(
      `${emoji} [${timestamp}] Security Event: ${event.eventType}`,
      {
        severity: event.severity,
        userId: event.userId,
        email: event.email,
        details: event.details,
      }
    );
  }

  /**
   * Determine severity based on threat types
   */
  private determineSeverity(threats: Array<{ severity: string }>): SecurityEvent['severity'] {
    if (threats.some(t => t.severity === 'critical')) return 'critical';
    if (threats.some(t => t.severity === 'high')) return 'high';
    if (threats.some(t => t.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: SecurityEvent['severity']): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '📝';
      default: return '🔍';
    }
  }

  /**
   * Temporarily disable database logging (console logging still works)
   */
  disableDatabaseLogging(): void {
    this.isDisabled = true;
    console.log('Security event database logging disabled');
  }

  /**
   * Re-enable database logging
   */
  enableDatabaseLogging(): void {
    this.isDisabled = false;
    console.log('Security event database logging enabled');
  }

  /**
   * Get security event statistics
   */
  async getSecurityStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topThreats: Array<{ type: string; count: number }>;
  }> {
    try {
      const hoursBack = timeframe === 'hour' ? 1 : timeframe === 'day' ? 24 : 168;
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data: events, error } = await supabase
        .from('security_events')
        .select('event_type, severity, details')
        .gte('created_at', since);

      if (error) throw error;

      const stats = {
        totalEvents: events?.length || 0,
        eventsByType: {} as Record<string, number>,
        eventsBySeverity: {} as Record<string, number>,
        topThreats: [] as Array<{ type: string; count: number }>,
      };

      events?.forEach(event => {
        // Count by type
        stats.eventsByType[event.event_type] = (stats.eventsByType[event.event_type] || 0) + 1;
        
        // Count by severity
        stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      });

      // Get top threat types from input_threat events
      const threatCounts: Record<string, number> = {};
      events?.filter(e => e.event_type === 'input_threat').forEach(event => {
        event.details?.threats?.forEach((threat: any) => {
          threatCounts[threat.type] = (threatCounts[threat.type] || 0) + 1;
        });
      });

      stats.topThreats = Object.entries(threatCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      return stats;
    } catch (error) {
      console.error('Error getting security stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        topThreats: [],
      };
    }
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance();

// Convenience functions
export const logInputThreat = (details: ThreatDetails) => {
  // Check global disable flag
  if ((global as any).__SECURITY_LOGGING_DISABLED__) {
    console.warn('Security logging globally disabled: input threat');
    return;
  }
  
  // Re-enabled security logging with better error handling
  securityLogger.logInputThreat(details).catch(error => {
    console.error('Security logging failed (non-blocking):', error);
    // Log the specific constraint violation for debugging
    if (error.message?.includes('security_events_event_type_check')) {
      console.error('Event type constraint violation - check allowed event types');
    }
  });
};
export const logFailedLogin = (email: string, reason: string, details?: Record<string, any>) => {
  if ((global as any).__SECURITY_LOGGING_DISABLED__) {
    console.warn('Security logging globally disabled: failed login');
    return;
  }
  securityLogger.logFailedLogin(email, reason, details).catch(error => {
    console.error('Security logging failed (non-blocking):', error);
  });
};
export const logSuspiciousActivity = (userId: string | undefined, activity: string, details: Record<string, any>) => {
  if ((global as any).__SECURITY_LOGGING_DISABLED__) {
    console.warn('Security logging globally disabled: suspicious activity');
    return;
  }
  securityLogger.logSuspiciousActivity(userId, activity, details).catch(error => {
    console.error('Security logging failed (non-blocking):', error);
  });
};
export const logRateLimitExceeded = (identifier: string, endpoint: string, attempts: number) => {
  if ((global as any).__SECURITY_LOGGING_DISABLED__) {
    console.warn('Security logging globally disabled: rate limit exceeded');
    return;
  }
  securityLogger.logRateLimitExceeded(identifier, endpoint, attempts).catch(error => {
    console.error('Security logging failed (non-blocking):', error);
  });
};
export const logAccountLockout = (email: string, reason: string) => {
  if ((global as any).__SECURITY_LOGGING_DISABLED__) {
    console.warn('Security logging globally disabled: account lockout');
    return;
  }
  securityLogger.logAccountLockout(email, reason).catch(error => {
    console.error('Security logging failed (non-blocking):', error);
  });
};
