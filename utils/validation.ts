/**
 * Comprehensive validation utilities for forms
 */

import { sanitizeInput, validateUserContent, ContentModerator, checkPasswordStrength } from './security';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
  warnings?: string[];
}

/**
 * Robust email validation that checks for:
 * - Basic email format
 * - Valid TLD (top-level domain)
 * - No consecutive dots
 * - No special characters in local part except allowed ones
 * - Proper domain format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic format check
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check for consecutive dots
  if (trimmedEmail.includes('..')) {
    return { isValid: false, error: 'Email cannot contain consecutive dots' };
  }

  // Check email length
  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  // Split email into local and domain parts
  const [localPart, domainPart] = trimmedEmail.split('@');

  // Validate local part (before @)
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email address is invalid' };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { isValid: false, error: 'Email cannot start or end with a dot' };
  }

  // Validate domain part (after @)
  if (domainPart.length > 253) {
    return { isValid: false, error: 'Email domain is too long' };
  }

  // Check for valid TLD and domain structure
  const domainParts = domainPart.split('.');
  const tld = domainParts[domainParts.length - 1];
  
  if (tld.length < 2) {
    return { isValid: false, error: 'Please enter a valid email domain' };
  }

  // Validate TLD contains only letters (no numbers in TLD)
  if (!/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, error: 'Please enter a valid email domain' };
  }

  // Check for valid domain structure (must have at least domain.tld)
  if (domainParts.length < 2) {
    return { isValid: false, error: 'Please enter a valid email domain' };
  }

  // Validate each domain part
  for (const part of domainParts) {
    if (part.length === 0) {
      return { isValid: false, error: 'Please enter a valid email domain' };
    }
    
    // Domain parts should not start or end with hyphen
    if (part.startsWith('-') || part.endsWith('-')) {
      return { isValid: false, error: 'Please enter a valid email domain' };
    }
    
    // Domain parts should contain only letters, numbers, and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(part)) {
      return { isValid: false, error: 'Please enter a valid email domain' };
    }
  }

  // Check against list of known valid TLDs (common ones)
  const validTLDs = [
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'co', 'io', 'me', 'tv', 'info', 'biz',
    'name', 'pro', 'aero', 'asia', 'cat', 'coop', 'jobs', 'mobi', 'museum', 'tel', 'travel',
    // Country codes
    'us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'in', 'br', 'ru', 'it', 'es', 'nl', 'gh',
    'ng', 'za', 'ke', 'eg', 'ma', 'tz', 'ug', 'zw', 'mw', 'zm', 'bw', 'sz', 'ls', 'na', 'ao'
  ];

  if (!validTLDs.includes(tld.toLowerCase())) {
    return { isValid: false, error: 'Please enter a valid email domain (e.g., gmail.com, yahoo.com)' };
  }

  // Check for common typos in popular domains
  const commonDomainTypos = {
    'gmail.com': ['gmail.co', 'gmai.com', 'gmial.com', 'gmail.cm'],
    'yahoo.com': ['yahoo.co', 'yaho.com', 'yahoo.cm'],
    'hotmail.com': ['hotmail.co', 'hotmai.com', 'hotmail.cm'],
    'outlook.com': ['outlook.co', 'outlok.com', 'outlook.cm'],
  };

  for (const [correctDomain, typos] of Object.entries(commonDomainTypos)) {
    if (typos.includes(domainPart)) {
      return { 
        isValid: false, 
        error: `Did you mean ${localPart}@${correctDomain}?` 
      };
    }
  }

  // Check for suspicious patterns and common fake domains
  if (domainPart.endsWith('.como') || domainPart.endsWith('.con')) {
    const suggestedDomain = domainPart.replace(/\.(como|con)$/, '.com');
    return { 
      isValid: false, 
      error: `Did you mean ${localPart}@${suggestedDomain}?` 
    };
  }

  // Check for obviously fake or test domains
  const suspiciousDomains = [
    'example.com', 'test.com', 'fake.com', 'invalid.com', 'dummy.com',
    'sample.com', 'demo.com', 'temp.com', 'temporary.com', 'placeholder.com',
    'grail.com', 'fake.org', 'test.org', 'example.org', 'invalid.org'
  ];

  if (suspiciousDomains.includes(domainPart.toLowerCase())) {
    return { 
      isValid: false, 
      error: 'Please enter a real email address' 
    };
  }

  // Additional validation for single-word domains (often fake)
  const domainName = domainParts[domainParts.length - 2]; // Get the main domain part
  if (domainName && domainName.length < 3) {
    return { 
      isValid: false, 
      error: 'Please enter a valid email domain' 
    };
  }

  return { isValid: true };
}

/**
 * Enhanced password validation with security checks
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  // Sanitize password input
  const sanitizedPassword = sanitizeInput(password);
  
  if (sanitizedPassword.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }

  if (sanitizedPassword.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  // Use advanced password strength checking
  const strengthCheck = checkPasswordStrength(sanitizedPassword);
  const warnings: string[] = [];
  
  if (!strengthCheck.isStrong) {
    warnings.push(...strengthCheck.feedback);
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(sanitizedPassword.toLowerCase())) {
    return { 
      isValid: false, 
      error: 'This password is too common. Please choose a more secure password.' 
    };
  }

  return { 
    isValid: true, 
    sanitizedValue: sanitizedPassword,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Name validation
 */
export function validateName(name: string, fieldName: string = 'Name'): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (trimmedName.length > 50) {
    return { isValid: false, error: `${fieldName} is too long` };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  return { isValid: true };
}

/**
 * Phone number validation (Ghana format)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone || !phone.trim()) {
    return { isValid: true }; // Phone is optional
  }

  const trimmedPhone = phone.trim().replace(/\s+/g, '');

  // Ghana phone number patterns
  const ghanaPhoneRegex = /^(\+233|0)(20|21|23|24|25|26|27|28|29|50|53|54|55|56|57|59)\d{7}$/;
  
  if (!ghanaPhoneRegex.test(trimmedPhone)) {
    return { 
      isValid: false, 
      error: 'Please enter a valid Ghana phone number (e.g., 0241234567 or +233241234567)' 
    };
  }

  return { isValid: true };
}

/**
 * Username validation
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || !username.trim()) {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmedUsername = username.trim().toLowerCase();

  if (trimmedUsername.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmedUsername.length > 30) {
    return { isValid: false, error: 'Username must be less than 30 characters' };
  }

  // Username can only contain letters, numbers, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return { 
      isValid: false, 
      error: 'Username can only contain letters, numbers, underscores, and hyphens' 
    };
  }

  // Cannot start or end with underscore or hyphen
  if (trimmedUsername.startsWith('_') || trimmedUsername.startsWith('-') || 
      trimmedUsername.endsWith('_') || trimmedUsername.endsWith('-')) {
    return { 
      isValid: false, 
      error: 'Username cannot start or end with underscore or hyphen' 
    };
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'system', 'api', 'www', 'mail', 'ftp',
    'support', 'help', 'info', 'contact', 'about', 'terms', 'privacy',
    'sellar', 'seller', 'buyer', 'user', 'guest', 'anonymous', 'null', 'undefined'
  ];

  if (reservedUsernames.includes(trimmedUsername)) {
    return { 
      isValid: false, 
      error: 'This username is reserved. Please choose a different one.' 
    };
  }

  return { isValid: true, sanitizedValue: trimmedUsername };
}

/**
 * Validate all form fields at once
 */
export function validateSignUpForm(data: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  username?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  }

  // Validate password confirmation
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Validate names
  const firstNameValidation = validateName(data.firstName, 'First name');
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation.error!;
  }

  const lastNameValidation = validateName(data.lastName, 'Last name');
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.error!;
  }

  // Validate username (optional during signup, but validate if provided)
  if (data.username) {
    const usernameValidation = validateUsername(data.username);
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.error!;
    }
  }

  // Validate phone (optional)
  if (data.phone) {
    const phoneValidation = validatePhoneNumber(data.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error!;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate and sanitize text content (posts, comments, messages)
 */
export function validateTextContent(
  content: string, 
  options: {
    maxLength?: number;
    minLength?: number;
    fieldName?: string;
    allowHtml?: boolean;
    checkProfanity?: boolean;
    checkSpam?: boolean;
  } = {}
): ValidationResult {
  const {
    maxLength = 2000,
    minLength = 1,
    fieldName = 'Content',
    allowHtml = false,
    checkProfanity = true,
    checkSpam = true
  } = options;

  // Use security validation
  const securityValidation = validateUserContent(content, {
    maxLength,
    minLength,
    allowHtml,
    fieldName
  });

  if (!securityValidation.isValid) {
    return {
      isValid: false,
      error: securityValidation.errors[0],
      warnings: securityValidation.warnings
    };
  }

  const warnings: string[] = [...(securityValidation.warnings || [])];

  // Content moderation checks
  if (checkProfanity || checkSpam) {
    const moderationResult = ContentModerator.moderateContent(content);
    
    if (!moderationResult.isAppropriate) {
      return {
        isValid: false,
        error: `${fieldName} contains inappropriate content: ${moderationResult.issues.join(', ')}`,
        warnings: moderationResult.suggestions
      };
    }
    
    if (moderationResult.suggestions.length > 0) {
      warnings.push(...moderationResult.suggestions);
    }
  }

  return {
    isValid: true,
    sanitizedValue: securityValidation.sanitizedValue,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate listing title with security checks
 */
export function validateListingTitle(title: string): ValidationResult {
  return validateTextContent(title, {
    minLength: 10,
    maxLength: 100,
    fieldName: 'Title',
    allowHtml: false,
    checkProfanity: true,
    checkSpam: true
  });
}

/**
 * Validate listing description with security checks
 */
export function validateListingDescription(description: string): ValidationResult {
  return validateTextContent(description, {
    minLength: 20,
    maxLength: 2000,
    fieldName: 'Description',
    allowHtml: false,
    checkProfanity: true,
    checkSpam: true
  });
}

/**
 * Validate chat message content
 */
export function validateChatMessage(message: string): ValidationResult {
  return validateTextContent(message, {
    minLength: 1,
    maxLength: 1000,
    fieldName: 'Message',
    allowHtml: false,
    checkProfanity: true,
    checkSpam: false // Less strict for private messages
  });
}

/**
 * Validate post content for community
 */
export function validatePostContent(content: string): ValidationResult {
  return validateTextContent(content, {
    minLength: 10,
    maxLength: 5000,
    fieldName: 'Post content',
    allowHtml: true, // Allow basic HTML formatting
    checkProfanity: true,
    checkSpam: true
  });
}


