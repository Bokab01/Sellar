import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ListingFormData } from './useListingForm';

const DRAFT_STORAGE_KEY = 'create_listing_draft';

/**
 * Manual draft save/load hook for listing creation
 * Provides functions to save, load, and clear listing drafts from AsyncStorage
 * Note: Automatic saving has been disabled. Users must explicitly choose to save via the exit modal.
 */
export function useListingDraftStorage(
  formData: ListingFormData,
  currentStep: number,
  userId: string | undefined
) {
  // Manual save function (called explicitly by user action)
  const saveDraft = useCallback(async () => {
    if (!userId) return;

    try {
      // Build a lightweight draft payload to avoid large writes
      const { images: _omitImages, ...rest } = (formData as any) || {};
      const draftData = {
        ...rest,
        currentStep,
        savedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `${DRAFT_STORAGE_KEY}_${userId}`,
        JSON.stringify(draftData)
      );
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [formData, currentStep, userId]);

  // Clear draft
  const clearDraft = useCallback(async () => {
    if (!userId) return;
    
    try {
      await AsyncStorage.removeItem(`${DRAFT_STORAGE_KEY}_${userId}`);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [userId]);

  // Load draft
  const loadDraft = useCallback(async (): Promise<{
    data: ListingFormData & { currentStep: number } | null;
    exists: boolean;
  }> => {
    if (!userId) return { data: null, exists: false };

    try {
      const savedDraft = await AsyncStorage.getItem(`${DRAFT_STORAGE_KEY}_${userId}`);
      
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        return { data: parsed, exists: true };
      }
      
      return { data: null, exists: false };
    } catch (error) {
      console.error('Failed to load draft:', error);
      return { data: null, exists: false };
    }
  }, [userId]);

  return {
    saveDraft,
    clearDraft,
    loadDraft,
  };
}

