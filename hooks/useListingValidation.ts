import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  validateListingStep, 
  createDebouncedValidator, 
  type ValidationResult 
} from '@/utils/listingValidation';
import { ListingFormData } from './useListingForm';

export function useListingValidation(
  formData: ListingFormData,
  currentStep: number,
  categoryAttributes: any[]
) {
  const [validationResults, setValidationResults] = useState<Record<number, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const debouncedValidator = useRef(createDebouncedValidator(300));

  // Validate current step
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);
    
    const result = await validateListingStep(currentStep, formData, categoryAttributes);
    
    setValidationResults(prev => ({
      ...prev,
      [currentStep]: result,
    }));
    
    setIsValidating(false);
    return result.isValid;
  }, [currentStep, formData, categoryAttributes]);

  // Debounced validation
  const validateDebounced = useCallback(async () => {
    // Only validate if user has interacted with the form
    if (!hasInteracted) return;
    
    if (debouncedValidator.current) {
      await debouncedValidator.current(currentStep, formData, (result: ValidationResult) => {
        setValidationResults(prev => ({
          ...prev,
          [currentStep]: result,
        }));
      }, categoryAttributes);
    }
  }, [currentStep, formData, categoryAttributes, hasInteracted]);

  // Track which fields have been touched
  useEffect(() => {
    setTouchedFields(prev => {
      const newTouched = new Set(prev);
      
      // Mark fields as touched when they have data
      if (formData.title) newTouched.add('title');
      if (formData.description) newTouched.add('description');
      if (formData.price) newTouched.add('price');
      if (formData.images.length > 0) newTouched.add('images');
      if (formData.categoryId) newTouched.add('categoryId');
      if (formData.location) newTouched.add('location');
      
      return newTouched;
    });
  }, [formData.title, formData.description, formData.price, formData.images.length, formData.categoryId, formData.location]);

  // Auto-validate on form data change (only after first interaction)
  useEffect(() => {
    // Mark as interacted when form data changes (after mount)
    const hasData = formData.title || formData.description || formData.price || formData.images.length > 0;
    if (hasData && !hasInteracted) {
      setHasInteracted(true);
    }
    
    validateDebounced();
  }, [validateDebounced, formData, hasInteracted]);

  // Check if step is valid (for navigation)
  const isStepValid = useCallback((step: number): boolean => {
    const result = validationResults[step];
    return result?.isValid ?? false;
  }, [validationResults]);

  // Get validation errors for current step
  const getCurrentStepErrors = useCallback((): string[] => {
    const result = validationResults[currentStep];
    return result?.errors ? Object.values(result.errors) : [];
  }, [validationResults, currentStep]);

  // Filter validation results to only show errors for touched fields
  const getFilteredValidationResults = useCallback(() => {
    const filtered: Record<number, ValidationResult> = {};
    
    Object.entries(validationResults).forEach(([step, result]) => {
      const filteredErrors: Record<string, string> = {};
      const filteredWarnings: Record<string, string> = {};
      
      // Only include errors/warnings for touched fields
      if (result.errors) {
        Object.entries(result.errors).forEach(([field, error]) => {
          if (touchedFields.has(field)) {
            filteredErrors[field] = error;
          }
        });
      }
      
      if (result.warnings) {
        Object.entries(result.warnings).forEach(([field, warning]) => {
          if (touchedFields.has(field)) {
            filteredWarnings[field] = warning;
          }
        });
      }
      
      filtered[parseInt(step)] = {
        ...result,
        errors: filteredErrors,
        warnings: filteredWarnings,
        isValid: Object.keys(filteredErrors).length === 0, // Recalculate based on filtered errors
      };
    });
    
    return filtered;
  }, [validationResults, touchedFields]);

  return {
    validationResults: getFilteredValidationResults(),
    isValidating,
    validateCurrentStep,
    isStepValid,
    getCurrentStepErrors,
    touchedFields,
  };
}

