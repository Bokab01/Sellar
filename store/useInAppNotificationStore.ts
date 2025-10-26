import { create } from 'zustand';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'notification' | 'offer' | 'system';
  data?: any;
  timestamp: number;
}

interface InAppNotificationState {
  activeNotification: InAppNotification | null;
  showNotification: (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => void;
  hideNotification: () => void;
}

export const useInAppNotificationStore = create<InAppNotificationState>((set) => ({
  activeNotification: null,

  showNotification: (notification) => {
    const inAppNotification: InAppNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    if (__DEV__) {
      console.log('🔔 [InAppNotifStore] showNotification called:', inAppNotification);
    }

    set({ activeNotification: inAppNotification });

    // Auto-hide after 4 seconds
    setTimeout(() => {
      set((state) => {
        // Only hide if it's still the same notification
        if (state.activeNotification?.id === inAppNotification.id) {
          return { activeNotification: null };
        }
        return state;
      });
    }, 4000);
  },

  hideNotification: () => set({ activeNotification: null }),
}));

