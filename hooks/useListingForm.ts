import { useState, useCallback } from 'react';
import { SelectedImage } from '@/components/ImagePicker';

export interface ListingFormData {
  // Images (Step 1)
  images: SelectedImage[];
  
  // Basic Info (Step 2)
  title: string;
  description: string;
  
  // Category & Details (Step 2)
  categoryId: string;
  categoryAttributes: Record<string, string | string[]>;
  price: string;
  quantity: number;
  acceptOffers: boolean;
  location: string;
  
  // Deposit (Pro Sellers Only)
  requiresDeposit?: boolean;
  
  // Pickup Options (Pro Sellers with Physical Shop)
  pickupAvailable?: boolean;
  pickupLocationOverride?: string;
  pickupPreparationTime?: number; // in minutes
  pickupInstructions?: string;
}

export interface SelectedFeature {
  key: string;
  name: string;
  credits: number;
  duration: string;
  description: string;
}

const INITIAL_FORM_DATA: ListingFormData = {
  images: [],
  title: '',
  description: '',
  categoryId: '',
  categoryAttributes: {},
  price: '',
  quantity: 1,
  acceptOffers: true,
  location: '',
  requiresDeposit: false,
  pickupAvailable: false,
  pickupLocationOverride: '',
  pickupPreparationTime: 30, // default 30 minutes
  pickupInstructions: '',
};

export function useListingForm() {
  const [formData, setFormData] = useState<ListingFormData>(INITIAL_FORM_DATA);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);

  const updateFormData = useCallback(<K extends keyof ListingFormData>(
    field: K,
    value: ListingFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMultipleFields = useCallback((updates: Partial<ListingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedFeatures([]);
    setCurrentStep(0);
  }, []);

  const loadFormData = useCallback((data: ListingFormData) => {
    setFormData(data);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 2));
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const addFeature = useCallback((feature: SelectedFeature) => {
    setSelectedFeatures(prev => [...prev, feature]);
  }, []);

  const removeFeature = useCallback((featureKey: string) => {
    setSelectedFeatures(prev => prev.filter(f => f.key !== featureKey));
  }, []);

  const clearFeatures = useCallback(() => {
    setSelectedFeatures([]);
  }, []);

  return {
    formData,
    currentStep,
    selectedFeatures,
    updateFormData,
    updateMultipleFields,
    resetForm,
    loadFormData,
    nextStep,
    previousStep,
    setCurrentStep,
    addFeature,
    removeFeature,
    clearFeatures,
    setSelectedFeatures,
  };
}
