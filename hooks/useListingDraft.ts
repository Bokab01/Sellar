import { useState, useCallback } from 'react';
import { ListingFormData } from './useListingForm';

export function useListingDraft() {
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [draftData, setDraftData] = useState<ListingFormData | null>(null);

  const handleDraftFound = useCallback((data: ListingFormData & { currentStep: number }) => {
    setDraftData(data as ListingFormData);
    setShowDraftModal(true);
  }, []);

  const handleLoadDraft = useCallback((
    onLoad: (data: ListingFormData, step: number) => void
  ) => {
    if (draftData) {
      const step = (draftData as any).currentStep || 0;
      onLoad(draftData, step);
    }
    setShowDraftModal(false);
    setDraftData(null);
  }, [draftData]);

  const handleStartFresh = useCallback((onClear: () => void) => {
    onClear();
    setShowDraftModal(false);
    setDraftData(null);
  }, []);

  const handleExitConfirm = useCallback((onExit: () => void) => {
    onExit();
    setShowExitModal(false);
  }, []);

  const handleExitCancel = useCallback(() => {
    setShowExitModal(false);
  }, []);

  const showExitConfirmation = useCallback(() => {
    setShowExitModal(true);
  }, []);

  return {
    showDraftModal,
    showExitModal,
    draftData,
    handleDraftFound,
    handleLoadDraft,
    handleStartFresh,
    handleExitConfirm,
    handleExitCancel,
    showExitConfirmation,
    setShowDraftModal,
    setShowExitModal,
  };
}

