import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ListingFormData } from './useListingForm';

const DRAFT_STORAGE_KEY = 'create_listing_draft';
const AUTOSAVE_DELAY = 2000; // 2 seconds

export function useListingAutosave(
  formData: ListingFormData,
  currentStep: number,
  userId: string | undefined
) {
  const [isSaved, setIsSaved] = useState(true);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveOpacity = useRef(new Animated.Value(0)).current;
  const lastSavedDataRef = useRef<string>('');

  // Autosave function
  const saveDraft = useCallback(async () => {
    if (!userId) return;

    try {
      const draftData = {
        ...formData,
        currentStep,
        savedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `${DRAFT_STORAGE_KEY}_${userId}`,
        JSON.stringify(draftData)
      );

      setIsSaved(true);
      
      // Show "Saved" indicator with fade-out animation
      Animated.sequence([
        Animated.timing(autosaveOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(autosaveOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [formData, currentStep, userId, autosaveOpacity]);

  // Clear draft
  const clearDraft = useCallback(async () => {
    if (!userId) return;
    
    try {
      await AsyncStorage.removeItem(`${DRAFT_STORAGE_KEY}_${userId}`);
      lastSavedDataRef.current = '';
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

  // Autosave effect - debounced
  useEffect(() => {
    // Skip autosave if no user
    if (!userId) return;

    // Check if data actually changed
    const currentData = JSON.stringify({ ...formData, currentStep });
    if (currentData === lastSavedDataRef.current) {
      return;
    }

    // Mark as unsaved when data changes
    setIsSaved(false);

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(() => {
      lastSavedDataRef.current = currentData;
      saveDraft();
    }, AUTOSAVE_DELAY) as unknown as NodeJS.Timeout;

    // Cleanup
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [formData, currentStep, userId, saveDraft]);

  return {
    isSaved,
    autosaveOpacity,
    saveDraft,
    clearDraft,
    loadDraft,
  };
}

