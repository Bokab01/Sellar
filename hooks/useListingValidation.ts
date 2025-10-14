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

  return {
    validationResults,
    isValidating,
    validateCurrentStep,
    isStepValid,
    getCurrentStepErrors,
  };
}

