/**
 * Comprehensive Input Sanitization Utility
 * Protects against SQL injection, XSS, and other security threats
 */

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
  removeNullBytes?: boolean;
  logSuspiciousActivity?: boolean;
}

export interface SanitizationResult {
  sanitized: string;
  original: string;
  threats: SecurityThreat[];
  isClean: boolean;
}

export interface SecurityThreat {
  type: 'sql_injection' | 'xss' | 'null_byte' | 'excessive_length' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  description: string;
}

/**
 * Comprehensive input sanitization class
 */
export class InputSanitizer {
  private static readonly SQL_INJECTION_PATTERNS = [
    // Basic SQL injection patterns
    /('|(\\')|(;)|(\\;))/gi,
    /((\s*(union|select|insert|delete|update|drop|create|alter|exec|execute)\s+))/gi,
    /(\s*(or|and)\s+\w+\s*=\s*\w+)/gi,
    /((\s*(union|select|insert|delete|update|drop|create|alter)\s*))/gi,
    // Advanced SQL injection patterns
    /(\w+\s*=\s*\w+\s*(or|and)\s*\w+\s*=\s*\w+)/gi,
    /(\/\*.*?\*\/)/gi, // SQL comments
    /(-{2,}.*$)/gm, // SQL line comments
    /(0x[0-9a-f]+)/gi, // Hexadecimal values
    /(char\s*\(\s*\d+\s*\))/gi, // CHAR() function
    /(concat\s*\()/gi, // CONCAT() function
  ];

  private static readonly XSS_PATTERNS = [
    // Script tags
    /<script[^>]*>.*?<\/script>/gis,
    /<script[^>]*>/gi,
    // Event handlers
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /on\w+\s*=\s*[^>\s]+/gi,
    // JavaScript protocols
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    // HTML tags that can execute scripts
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<applet[^>]*>/gi,
    /<meta[^>]*>/gi,
    /<link[^>]*>/gi,
    // Style-based XSS
    /<style[^>]*>.*?<\/style>/gis,
    /style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi,
    // Form-based XSS
    /<form[^>]*>/gi,
    /<input[^>]*>/gi,
    /<textarea[^>]*>/gi,
    /<button[^>]*>/gi,
  ];

  private static readonly SUSPICIOUS_PATTERNS = [
    // File system access
    /\.\.[\/\\]/g, // Directory traversal
    /(\/etc\/passwd|\/etc\/shadow)/gi,
    /(cmd\.exe|powershell\.exe)/gi,
    // Network requests
    /(http|https|ftp):\/\//gi,
    // Encoding attempts
    /(%[0-9a-f]{2}){3,}/gi, // URL encoding
    /(&#x?[0-9a-f]+;){3,}/gi, // HTML entity encoding
  ];

  /**
   * Sanitize input string with comprehensive security checks
   */
  static sanitize(input: string, options: SanitizationOptions = {}): SanitizationResult {
    const {
      allowHtml = false,
      maxLength = 1000,
      trimWhitespace = true,
      removeNullBytes = true,
      logSuspiciousActivity = true,
    } = options;

    let sanitized = input;
    const threats: SecurityThreat[] = [];
    const original = input;

    // Step 1: Remove null bytes (critical security issue)
    if (removeNullBytes && sanitized.includes('\0')) {
      threats.push({
        type: 'null_byte',
        severity: 'critical',
        pattern: '\\0',
        description: 'Null byte injection attempt detected',
      });
      sanitized = sanitized.replace(/\0/g, '');
    }

    // Step 2: Check for excessive length
    if (sanitized.length > maxLength) {
      threats.push({
        type: 'excessive_length',
        severity: 'medium',
        pattern: `Length: ${sanitized.length}`,
        description: `Input exceeds maximum length of ${maxLength} characters`,
      });
      sanitized = sanitized.substring(0, maxLength);
    }

    // Step 3: Trim whitespace if requested
    if (trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Step 4: Check for SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        const matches = sanitized.match(pattern);
        threats.push({
          type: 'sql_injection',
          severity: 'critical',
          pattern: matches?.[0] || pattern.source,
          description: 'SQL injection pattern detected',
        });
      }
    }

    // Step 5: Check for XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        const matches = sanitized.match(pattern);
        threats.push({
          type: 'xss',
          severity: 'critical',
          pattern: matches?.[0] || pattern.source,
          description: 'Cross-site scripting (XSS) pattern detected',
        });
      }
    }

    // Step 6: Check for suspicious patterns
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        const matches = sanitized.match(pattern);
        threats.push({
          type: 'suspicious_pattern',
          severity: 'high',
          pattern: matches?.[0] || pattern.source,
          description: 'Suspicious pattern that may indicate malicious intent',
        });
      }
    }

    // Step 7: Sanitize based on HTML allowance
    if (!allowHtml) {
      // Remove all HTML tags and entities
      sanitized = InputSanitizer.stripHtml(sanitized);
    } else {
      // Allow HTML but sanitize dangerous elements
      sanitized = InputSanitizer.sanitizeHtml(sanitized);
    }

    // Step 8: Final SQL injection cleanup (remove dangerous SQL keywords)
    sanitized = InputSanitizer.removeSqlKeywords(sanitized);

    // Step 9: Log suspicious activity if enabled
    if (logSuspiciousActivity && threats.length > 0) {
      // TEMPORARILY DISABLED: Log to console only until security_events table is created
      console.warn('Security threat detected (database logging disabled):', {
        field: 'input_field',
        threats: threats.length,
        severity: threats.map(t => t.severity),
        patterns: threats.map(t => t.pattern.substring(0, 20))
      });
      
      // TODO: Re-enable when security_events table is created
      // setTimeout(() => {
      //   InputSanitizer.logSecurityThreat(original, threats, 'input_field').catch(error => {
      //     console.error('Failed to log security threat:', error);
      //   });
      // }, 0);
    }

    return {
      sanitized,
      original,
      threats,
      isClean: threats.length === 0,
    };
  }

  /**
   * Strip all HTML tags and entities
   */
  private static stripHtml(input: string): string {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, '') // Remove HTML entities
      .replace(/[<>]/g, ''); // Remove remaining brackets
  }

  /**
   * Sanitize HTML while preserving safe elements
   */
  private static sanitizeHtml(input: string): string {
    // This is a basic implementation - for production, consider using a library like DOMPurify
    return input
      .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/javascript\s*:/gi, '') // Remove javascript: protocols
      .replace(/vbscript\s*:/gi, '') // Remove vbscript: protocols
      .replace(/<iframe[^>]*>/gi, '') // Remove iframe tags
      .replace(/<object[^>]*>/gi, '') // Remove object tags
      .replace(/<embed[^>]*>/gi, '') // Remove embed tags
      .replace(/<applet[^>]*>/gi, ''); // Remove applet tags
  }

  /**
   * Remove dangerous SQL keywords
   */
  private static removeSqlKeywords(input: string): string {
    const dangerousKeywords = [
      'DROP TABLE',
      'DELETE FROM',
      'INSERT INTO',
      'UPDATE SET',
      'UNION SELECT',
      'EXEC ',
      'EXECUTE ',
      'ALTER TABLE',
      'CREATE TABLE',
      'TRUNCATE',
    ];

    let sanitized = input;
    for (const keyword of dangerousKeywords) {
      const regex = new RegExp(keyword.replace(' ', '\\s+'), 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    return sanitized;
  }

  /**
   * Log security threats for monitoring
   */
  private static async logSecurityThreat(originalInput: string, threats: SecurityThreat[], fieldName: string = 'unknown'): Promise<void> {
    // Import here to avoid circular dependencies
    const { logInputThreat } = await import('./securityLogger');
    
    await logInputThreat({
      originalInput,
      sanitizedInput: InputSanitizer.sanitize(originalInput, { logSuspiciousActivity: false }).sanitized,
      threatsDetected: threats.length,
      threats: threats.map(t => ({
        type: t.type,
        severity: t.severity,
        pattern: t.pattern.substring(0, 50),
        description: t.description,
      })),
      fieldName,
      action: threats.some(t => t.severity === 'critical') ? 'blocked' : 'sanitized',
    });
  }

  /**
   * Validate email with security checks
   */
  static sanitizeEmail(email: string): SanitizationResult {
    const result = InputSanitizer.sanitize(email, {
      allowHtml: false,
      maxLength: 254, // RFC 5321 limit
      trimWhitespace: true,
      removeNullBytes: true,
      logSuspiciousActivity: true,
    });

    // Additional email-specific checks
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(result.sanitized)) {
      result.threats.push({
        type: 'suspicious_pattern',
        severity: 'medium',
        pattern: 'Invalid email format',
        description: 'Email does not match expected format',
      });
    }

    return result;
  }

  /**
   * Validate password with security checks
   */
  static sanitizePassword(password: string): SanitizationResult {
    return InputSanitizer.sanitize(password, {
      allowHtml: false,
      maxLength: 128,
      trimWhitespace: false, // Don't trim passwords
      removeNullBytes: true,
      logSuspiciousActivity: true,
    });
  }

  /**
   * Validate name fields with security checks
   */
  static sanitizeName(name: string): SanitizationResult {
    return InputSanitizer.sanitize(name, {
      allowHtml: false,
      maxLength: 100,
      trimWhitespace: true,
      removeNullBytes: true,
      logSuspiciousActivity: true,
    });
  }

  /**
   * Validate text content with security checks
   */
  static sanitizeText(text: string, allowHtml: boolean = false): SanitizationResult {
    return InputSanitizer.sanitize(text, {
      allowHtml,
      maxLength: 5000,
      trimWhitespace: true,
      removeNullBytes: true,
      logSuspiciousActivity: true,
    });
  }

  /**
   * Quick security check without sanitization
   */
  static isInputSafe(input: string): boolean {
    const result = InputSanitizer.sanitize(input, { logSuspiciousActivity: false });
    return result.isClean;
  }

  /**
   * Get threat summary for monitoring
   */
  static getThreatSummary(threats: SecurityThreat[]): string {
    if (threats.length === 0) return 'No threats detected';
    
    const criticalCount = threats.filter(t => t.severity === 'critical').length;
    const highCount = threats.filter(t => t.severity === 'high').length;
    const mediumCount = threats.filter(t => t.severity === 'medium').length;
    const lowCount = threats.filter(t => t.severity === 'low').length;

    let summary = `${threats.length} threat(s) detected: `;
    if (criticalCount > 0) summary += `${criticalCount} critical, `;
    if (highCount > 0) summary += `${highCount} high, `;
    if (mediumCount > 0) summary += `${mediumCount} medium, `;
    if (lowCount > 0) summary += `${lowCount} low`;

    return summary.replace(/, $/, '');
  }
}

/**
 * Convenience functions for common use cases
 */
export const sanitizeInput = InputSanitizer.sanitize;
export const sanitizeEmail = InputSanitizer.sanitizeEmail;
export const sanitizePassword = InputSanitizer.sanitizePassword;
export const sanitizeName = InputSanitizer.sanitizeName;
export const sanitizeText = InputSanitizer.sanitizeText;
export const isInputSafe = InputSanitizer.isInputSafe;
