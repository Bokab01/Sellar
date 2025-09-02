/**
 * Comprehensive validation utilities for forms
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
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

  // Check for valid TLD
  const domainParts = domainPart.split('.');
  const tld = domainParts[domainParts.length - 1];
  
  if (tld.length < 2) {
    return { isValid: false, error: 'Please enter a valid email domain' };
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

  // Check for suspicious patterns
  if (domainPart.endsWith('.como') || domainPart.endsWith('.con')) {
    const suggestedDomain = domainPart.replace(/\.(como|con)$/, '.com');
    return { 
      isValid: false, 
      error: `Did you mean ${localPart}@${suggestedDomain}?` 
    };
  }

  return { isValid: true };
}

/**
 * Password validation
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  // Check for at least one letter and one number for stronger passwords
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { 
      isValid: true, // Still valid but with suggestion
      error: 'Consider adding both letters and numbers for a stronger password'
    };
  }

  return { isValid: true };
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
 * Validate all form fields at once
 */
export function validateSignUpForm(data: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
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


