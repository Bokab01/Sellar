import { SelectedImage } from '@/components/ImagePicker';
import { getCategoryAttributes } from '@/constants/categoryAttributes';

export interface ListingFormData {
  images: SelectedImage[];
  title: string;
  description: string;
  categoryId: string;
  categoryAttributes: Record<string, string | string[]>;
  condition: string;
  price: string;
  quantity: number;
  acceptOffers: boolean;
  location: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export const validateListingStep = (step: number, formData: ListingFormData): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  switch (step) {
    case 0: // Photos
      if (formData.images.length === 0) {
        errors.images = 'At least one photo is required';
      } else if (formData.images.length < 3) {
        warnings.images = 'Adding more photos increases your chances of selling by 300%';
      }
      break;

    case 1: // Basic Info
      // Title validation
      if (!formData.title.trim()) {
        errors.title = 'Title is required';
      } else if (formData.title.trim().length < 10) {
        errors.title = 'Title must be at least 10 characters';
      } else if (formData.title.trim().length > 100) {
        errors.title = 'Title must be less than 100 characters';
      } else if (!/^[a-zA-Z0-9\s\-.,!()&]+$/.test(formData.title)) {
        warnings.title = 'Avoid special characters for better search visibility';
      }

      // Description validation
      if (!formData.description.trim()) {
        errors.description = 'Description is required';
      } else if (formData.description.trim().length < 20) {
        errors.description = 'Description must be at least 20 characters';
      } else if (formData.description.trim().length > 2000) {
        errors.description = 'Description must be less than 2000 characters';
      } else if (formData.description.trim().length < 50) {
        warnings.description = 'Detailed descriptions get 5x more views';
      }

      // Check for prohibited content
      const prohibitedWords = ['fake', 'replica', 'copy', 'stolen', 'illegal'];
      const titleLower = formData.title.toLowerCase();
      const descLower = formData.description.toLowerCase();
      
      for (const word of prohibitedWords) {
        if (titleLower.includes(word) || descLower.includes(word)) {
          errors.prohibited = 'Listing contains prohibited content';
          break;
        }
      }
      break;

    case 2: // Category & Location
      if (!formData.categoryId) {
        errors.categoryId = 'Please select a category';
      }
      if (!formData.location.trim()) {
        errors.location = 'Please select your location';
      }
      
      // Validate required category attributes
      if (formData.categoryId) {
        const attributes = getCategoryAttributes(formData.categoryId);
        
        for (const attribute of attributes) {
          if (attribute.required) {
            const value = formData.categoryAttributes?.[attribute.id];
            if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && !value.trim())) {
              errors[`attribute_${attribute.id}`] = `${attribute.name} is required`;
            }
          }
        }
      }
      break;

    case 3: // Details
      // Condition validation
      if (!formData.condition) {
        errors.condition = 'Please select the item condition';
      }

      // Price validation
      if (!formData.price.trim()) {
        errors.price = 'Price is required';
      } else {
        const priceNum = parseFloat(formData.price);
        if (isNaN(priceNum)) {
          errors.price = 'Please enter a valid price';
        } else if (priceNum <= 0) {
          errors.price = 'Price must be greater than 0';
        } else if (priceNum > 1000000) {
          errors.price = 'Price seems too high. Please verify.';
        } else if (priceNum < 1) {
          warnings.price = 'Very low prices may seem suspicious to buyers';
        }
      }

      // Quantity validation
      if (formData.quantity < 1) {
        errors.quantity = 'Quantity must be at least 1';
      } else if (formData.quantity > 99) {
        errors.quantity = 'Maximum quantity is 99';
      }
      break;

    case 4: // Review
      // Final validation - check all fields
      const allStepsValid = [0, 1, 2, 3].every(stepIndex => {
        const stepValidation = validateListingStep(stepIndex, formData);
        return stepValidation.isValid;
      });
      
      if (!allStepsValid) {
        errors.general = 'Please complete all required fields';
      }
      break;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

export const validateCompleteForm = (formData: ListingFormData): ValidationResult => {
  const allErrors: Record<string, string> = {};
  const allWarnings: Record<string, string> = {};

  // Validate all steps
  for (let step = 0; step <= 4; step++) {
    const stepValidation = validateListingStep(step, formData);
    Object.assign(allErrors, stepValidation.errors);
    Object.assign(allWarnings, stepValidation.warnings);
  }

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};

// Performance optimization: Debounced validation
export const createDebouncedValidator = (delay: number = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (step: number, formData: ListingFormData, callback: (result: ValidationResult) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validateListingStep(step, formData);
      callback(result);
    }, delay);
  };
};

// Utility functions for form optimization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s\-.,!()&]/g, ''); // Remove special characters except allowed ones
};

export const generateSEOFriendlyTitle = (title: string, category: string): string => {
  const cleanTitle = sanitizeInput(title);
  return `${cleanTitle} - ${category}`.substring(0, 100);
};

export const extractKeywords = (title: string, description: string): string[] => {
  const text = `${title} ${description}`.toLowerCase();
  const words = text.match(/\b\w{3,}\b/g) || [];
  
  // Remove common words
  const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
  
  return [...new Set(words.filter(word => !commonWords.includes(word)))].slice(0, 10);
};
