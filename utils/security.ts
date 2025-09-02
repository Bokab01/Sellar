/**
 * Security utilities for input sanitization, XSS protection, and data validation
 */

import DOMPurify from 'isomorphic-dompurify';

export interface SecurityValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  errors: string[];
  warnings: string[];
}

/**
 * HTML/XSS Sanitization
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Remove potentially dangerous characters and scripts
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
}

/**
 * SQL Injection Prevention - Escape special characters
 */
export function escapeSqlInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '\\;') // Escape semicolons
    .replace(/--/g, '\\--') // Escape SQL comments
    .replace(/\/\*/g, '\\/\\*') // Escape block comments
    .replace(/\*\//g, '\\*\\/'); // Escape block comments
}

/**
 * Validate and sanitize user-generated content
 */
export function validateUserContent(content: string, options: {
  maxLength?: number;
  minLength?: number;
  allowHtml?: boolean;
  fieldName?: string;
}): SecurityValidationResult {
  const { maxLength = 5000, minLength = 1, allowHtml = false, fieldName = 'Content' } = options;
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!content || typeof content !== 'string') {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors, warnings };
  }

  // Basic length validation
  if (content.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  }
  
  if (content.length > maxLength) {
    errors.push(`${fieldName} must be less than ${maxLength} characters`);
  }

  // Sanitize content
  let sanitizedValue = allowHtml ? sanitizeHtml(content) : sanitizeInput(content);
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\b(eval|exec|system|shell_exec|passthru)\s*\(/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      errors.push(`${fieldName} contains potentially dangerous content`);
      break;
    }
  }
  
  // Check for excessive special characters (potential spam)
  const specialCharCount = (content.match(/[!@#$%^&*()_+={}\[\]|\\:";'<>?,./]/g) || []).length;
  const specialCharRatio = specialCharCount / content.length;
  
  if (specialCharRatio > 0.3) {
    warnings.push(`${fieldName} contains many special characters, which may appear as spam`);
  }
  
  // Check for repeated characters (potential spam)
  const repeatedCharPattern = /(.)\1{4,}/g;
  if (repeatedCharPattern.test(content)) {
    warnings.push(`${fieldName} contains repeated characters, which may appear as spam`);
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue,
    errors,
    warnings,
  };
}

/**
 * Validate file uploads
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
}, options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): SecurityValidationResult {
  const { 
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  } = options;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Check file extension
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(`File extension ${fileExtension} is not allowed`);
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i,
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows reserved names
    /[<>:"|?*]/,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      errors.push('File name contains invalid characters or is not allowed');
      break;
    }
  }
  
  // Warn about very large files
  if (file.size > 2 * 1024 * 1024) { // 2MB
    warnings.push('Large files may take longer to upload and process');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (record.count >= this.maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;
    
    return Math.max(0, record.resetTime - Date.now());
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

/**
 * Profanity and inappropriate content detection
 */
export class ContentModerator {
  private static profanityWords = [
    // Basic profanity list - in production, use a more comprehensive list
    'damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'bastard', 'crap',
    // Add more words as needed, consider using a library like 'bad-words'
  ];
  
  private static spamPatterns = [
    /\b(buy now|click here|limited time|act now|free money|make money fast)\b/gi,
    /\b(viagra|cialis|pharmacy|casino|lottery|winner)\b/gi,
    /\b(urgent|congratulations|selected|winner|prize)\b/gi,
    /\$\d+|\d+\$|USD\d+|\d+USD/gi, // Money patterns
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card patterns
  ];
  
  static checkProfanity(text: string): { hasProfanity: boolean; words: string[] } {
    const foundWords: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const word of this.profanityWords) {
      if (lowerText.includes(word)) {
        foundWords.push(word);
      }
    }
    
    return {
      hasProfanity: foundWords.length > 0,
      words: foundWords,
    };
  }
  
  static checkSpam(text: string): { isSpam: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    for (const pattern of this.spamPatterns) {
      if (pattern.test(text)) {
        reasons.push('Contains spam-like content');
        break;
      }
    }
    
    // Check for excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 20) {
      reasons.push('Excessive use of capital letters');
    }
    
    // Check for excessive punctuation
    const punctuationRatio = (text.match(/[!?]{2,}/g) || []).length;
    if (punctuationRatio > 3) {
      reasons.push('Excessive use of punctuation');
    }
    
    // Check for repeated phrases
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    const maxRepeats = Math.max(...Array.from(wordCounts.values()));
    if (maxRepeats > 5) {
      reasons.push('Contains repeated words (possible spam)');
    }
    
    return {
      isSpam: reasons.length > 0,
      reasons,
    };
  }
  
  static moderateContent(text: string): {
    isAppropriate: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    const profanityCheck = this.checkProfanity(text);
    if (profanityCheck.hasProfanity) {
      issues.push('Contains inappropriate language');
      suggestions.push('Please remove offensive language to improve your content');
    }
    
    const spamCheck = this.checkSpam(text);
    if (spamCheck.isSpam) {
      issues.push(...spamCheck.reasons);
      suggestions.push('Make your content more natural and less promotional');
    }
    
    return {
      isAppropriate: issues.length === 0,
      issues,
      suggestions,
    };
  }
}

/**
 * Device fingerprinting for security (React Native compatible)
 */
export function generateDeviceFingerprint(): string {
  try {
    // Import React Native modules dynamically to avoid web compatibility issues
    const { Platform, Dimensions } = require('react-native');
    const Constants = require('expo-constants').default;
    
    const { width, height } = Dimensions.get('window');
    
    const fingerprint = [
      Platform.OS,
      Platform.Version?.toString() || 'unknown',
      `${width}x${height}`,
      new Date().getTimezoneOffset().toString(),
      Constants.deviceId || 'unknown',
      Constants.deviceName || 'unknown',
      Constants.platform?.ios?.platform || Constants.platform?.android?.arch || 'unknown',
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  } catch (error) {
    console.warn('Error generating device fingerprint:', error);
    // Fallback to a simple random string if device info is not available
    return generateSecureToken(16);
  }
}

/**
 * Secure random string generation using crypto-secure random values
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  try {
    // Use crypto-secure random values if available
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        result += chars.charAt(array[i] % chars.length);
      }
    } else {
      // Fallback to Math.random if crypto is not available
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
  } catch (error) {
    console.warn('Error generating secure token, using fallback:', error);
    // Fallback to Math.random
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  return result;
}

/**
 * Password strength checker
 */
export function checkPasswordStrength(password: string): {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');
  
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');
  
  if (/\d/.test(password)) score++;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Add special characters');
  
  // Check for common patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /(.)\1{2,}/, // Repeated characters
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      feedback.push('Avoid common patterns and repeated characters');
      score = Math.max(0, score - 1);
      break;
    }
  }
  
  return {
    score,
    feedback,
    isStrong: score >= 3,
  };
}
