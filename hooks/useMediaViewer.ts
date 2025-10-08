import { useState, useCallback } from 'react';

interface UseMediaViewerProps {
  media: string[];
  initialIndex?: number;
}

interface UseMediaViewerReturn {
  visible: boolean;
  currentIndex: number;
  openViewer: (index?: number) => void;
  closeViewer: () => void;
}

/**
 * Hook to manage MediaViewer state
 * Supports both images and videos
 */
export function useMediaViewer({ 
  media, 
  initialIndex = 0 
}: UseMediaViewerProps): UseMediaViewerReturn {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const openViewer = useCallback((index: number = 0) => {
    setCurrentIndex(index);
    setVisible(true);
  }, []);

  const closeViewer = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    currentIndex,
    openViewer,
    closeViewer,
  };
}
