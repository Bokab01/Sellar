/**
 * useShopSetup Hook
 * Manages shop setup state, validation, and persistence
 * Optimized with caching and debouncing
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { ShopSetupData, ShopSetupStep, ValidationResult, ShopPhoto, BusinessHoursSchedule } from '@/components/PhysicalShop/types';

const STORAGE_KEY = '@shop_setup_draft';
const AUTO_SAVE_DELAY = 2000; // 2 seconds

interface UseShopSetupReturn {
  // State
  currentStep: number;
  setupData: Partial<ShopSetupData>;
  steps: ShopSetupStep[];
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  
  // Navigation
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: number) => void;
  
  // Data Management
  updateData: <K extends keyof ShopSetupData>(key: K, value: ShopSetupData[K]) => void;
  updateMultiple: (updates: Partial<ShopSetupData>) => void;
  
  // Validation
  validateCurrentStep: () => ValidationResult;
  canProceed: boolean;
  
  // Persistence
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
  publishShop: () => Promise<{ success: boolean; error?: string }>;
  
  // Utilities
  resetSetup: () => void;
  progress: number; // 0-100
}

const INITIAL_STEPS: ShopSetupStep[] = [
  {
    id: 1,
    title: 'Basic Information',
    subtitle: 'Shop name and details',
    icon: '🏪',
    isComplete: false,
    isValid: false,
  },
  {
    id: 2,
    title: 'Location',
    subtitle: 'Address and map pin',
    icon: '📍',
    isComplete: false,
    isValid: false,
  },
  {
    id: 3,
    title: 'Business Hours',
    subtitle: 'When you\'re open',
    icon: '🕐',
    isComplete: false,
    isValid: false,
  },
  {
    id: 4,
    title: 'Shop Photos',
    subtitle: 'Showcase your shop',
    icon: '📸',
    isComplete: false,
    isValid: false,
  },
  {
    id: 5,
    title: 'Review',
    subtitle: 'Confirm and publish',
    icon: '✅',
    isComplete: false,
    isValid: false,
  },
];

export function useShopSetup(): UseShopSetupReturn {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState<Partial<ShopSetupData>>({});
  const [steps, setSteps] = useState<ShopSetupStep[]>(INITIAL_STEPS);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<string>('');

  // =============================================
  // VALIDATION LOGIC
  // =============================================
  
  const validateStep1 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    
    if (!setupData.business_name?.trim()) {
      errors.business_name = 'Business name is required';
    }
    if (!setupData.business_type) {
      errors.business_type = 'Business type is required';
    }
    if (!setupData.business_description?.trim()) {
      errors.business_description = 'Description is required';
    } else if (setupData.business_description.length < 20) {
      errors.business_description = 'Description must be at least 20 characters';
    }
    if (!setupData.business_phone?.trim()) {
      errors.business_phone = 'Phone number is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [setupData]);

  const validateStep2 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    
    if (!setupData.address?.address?.trim()) {
      errors.address = 'Address is required';
    }
    if (!setupData.address?.city?.trim()) {
      errors.city = 'City is required';
    }
    if (!setupData.address?.state?.trim()) {
      errors.state = 'Region/State is required';
    }
    if (!setupData.address?.latitude || !setupData.address?.longitude) {
      errors.coordinates = 'Please pin your location on the map';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [setupData]);

  const validateStep3 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    
    if (!setupData.business_hours) {
      errors.business_hours = 'Please set your business hours';
      return { isValid: false, errors };
    }
    
    // Check if at least one day is open
    const hasOpenDay = Object.values(setupData.business_hours).some(day => day.is_open);
    if (!hasOpenDay) {
      errors.business_hours = 'Shop must be open at least one day per week';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [setupData]);

  const validateStep4 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    
    if (!setupData.photos || setupData.photos.length === 0) {
      errors.photos = 'Please add at least one shop photo';
    } else {
      const hasStorefront = setupData.photos.some(p => p.photo_type === 'storefront');
      if (!hasStorefront) {
        errors.photos = 'Storefront photo is required';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [setupData]);

  const validateCurrentStep = useCallback((): ValidationResult => {
    switch (currentStep) {
      case 1: return validateStep1();
      case 2: return validateStep2();
      case 3: return validateStep3();
      case 4: return validateStep4();
      case 5: return { isValid: true, errors: {} }; // Review step
      default: return { isValid: false, errors: {} };
    }
  }, [currentStep, validateStep1, validateStep2, validateStep3, validateStep4]);

  // Memoized canProceed based on current step validation
  const canProceed = useMemo(() => {
    return validateCurrentStep().isValid;
  }, [validateCurrentStep]);

  // Calculate overall progress
  const progress = useMemo(() => {
    const completedSteps = steps.filter(s => s.isComplete).length;
    return Math.round((completedSteps / steps.length) * 100);
  }, [steps]);

  // =============================================
  // DATA MANAGEMENT
  // =============================================

  const updateData = useCallback(<K extends keyof ShopSetupData>(
    key: K,
    value: ShopSetupData[K]
  ) => {
    setSetupData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const updateMultiple = useCallback((updates: Partial<ShopSetupData>) => {
    setSetupData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // =============================================
  // NAVIGATION
  // =============================================

  const updateStepStatus = useCallback((stepId: number, isComplete: boolean, isValid: boolean) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, isComplete, isValid } : step
    ));
  }, []);

  const goToNextStep = useCallback(() => {
    const validation = validateCurrentStep();
    if (validation.isValid && currentStep < steps.length) {
      updateStepStatus(currentStep, true, true);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length, validateCurrentStep, updateStepStatus]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= steps.length) {
      setCurrentStep(step);
    }
  }, [steps.length]);

  // =============================================
  // PERSISTENCE (Optimized with auto-save)
  // =============================================

  const saveDraft = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      const draftData = JSON.stringify({ setupData, currentStep, steps });
      
      // Only save if data changed
      if (draftData !== lastSavedDataRef.current) {
        await AsyncStorage.setItem(`${STORAGE_KEY}_${user.id}`, draftData);
        lastSavedDataRef.current = draftData;
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, setupData, currentStep, steps]);

  const loadDraft = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const draft = await AsyncStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        setSetupData(parsed.setupData || {});
        setCurrentStep(parsed.currentStep || 1);
        setSteps(parsed.steps || INITIAL_STEPS);
        lastSavedDataRef.current = draft;
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const clearDraft = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
      lastSavedDataRef.current = '';
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [user]);

  // Auto-save with debouncing
  useEffect(() => {
    if (isDirty) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set new timer
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, AUTO_SAVE_DELAY);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, saveDraft]);

  // =============================================
  // PUBLISH SHOP
  // =============================================

  const publishShop = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setIsSaving(true);

      // 1. Update profile with shop information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: setupData.business_name,
          business_type: setupData.business_type,
          business_description: setupData.business_description,
          business_phone: setupData.business_phone,
          business_email: setupData.business_email,
          business_website: setupData.business_website,
          business_address: setupData.address?.address,
          business_address_line_2: setupData.address?.address_line_2,
          business_city: setupData.address?.city,
          business_state: setupData.address?.state,
          business_postal_code: setupData.address?.postal_code,
          business_latitude: setupData.address?.latitude,
          business_longitude: setupData.address?.longitude,
          business_directions_note: setupData.address?.directions_note,
          business_map_verified: true,
          accepts_pickup: setupData.accepts_pickup ?? true,
          accepts_walkin: setupData.accepts_walkin ?? true,
          // has_physical_shop auto-set by trigger
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Upsert business hours
      if (setupData.business_hours) {
        const { error: hoursError } = await supabase
          .from('business_hours')
          .upsert({
            user_id: user.id,
            schedule: setupData.business_hours,
            is_active: true,
          });

        if (hoursError) throw hoursError;
      }

      // 3. Insert shop photos
      if (setupData.photos && setupData.photos.length > 0) {
        // Delete existing photos first
        await supabase
          .from('business_photos')
          .delete()
          .eq('user_id', user.id);

        // Insert new photos
        const photosToInsert = setupData.photos.map((photo, index) => ({
          user_id: user.id,
          photo_url: photo.photo_url,
          photo_type: photo.photo_type,
          caption: photo.caption,
          display_order: photo.display_order ?? index,
          is_primary: photo.is_primary,
        }));

        const { error: photosError } = await supabase
          .from('business_photos')
          .insert(photosToInsert);

        if (photosError) throw photosError;
      }

      // 4. Clear draft
      await clearDraft();

      return { success: true };
    } catch (error: any) {
      console.error('Failed to publish shop:', error);
      return { success: false, error: error.message || 'Failed to publish shop' };
    } finally {
      setIsSaving(false);
    }
  }, [user, setupData, clearDraft]);

  // =============================================
  // UTILITIES
  // =============================================

  const resetSetup = useCallback(() => {
    setSetupData({});
    setCurrentStep(1);
    setSteps(INITIAL_STEPS);
    setIsDirty(false);
    clearDraft();
  }, [clearDraft]);

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  return {
    currentStep,
    setupData,
    steps,
    isDirty,
    isSaving,
    isLoading,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    updateData,
    updateMultiple,
    validateCurrentStep,
    canProceed,
    saveDraft,
    loadDraft,
    clearDraft,
    publishShop,
    resetSetup,
    progress,
  };
}

