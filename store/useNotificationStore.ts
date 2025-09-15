import { create } from 'zustand';
import { dbHelpers } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  data?: any;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      set({ loading: true, error: null });

      const { data, error: fetchError } = await dbHelpers.getNotifications(user.id);

      if (fetchError) {
        set({ error: fetchError.message, loading: false });
      } else {
        const notifications = (data || []).filter((n: any) => n && typeof n === 'object' && !n.error) as unknown as Notification[];
        const unreadCount = notifications.filter((n: any) => !n.is_read).length;
        
        set({ 
          notifications, 
          unreadCount, 
          loading: false,
          error: null 
        });
      }
    } catch (err) {
      set({ 
        error: 'Failed to load notifications', 
        loading: false 
      });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const { data, error } = await dbHelpers.markNotificationAsRead(notificationId);
      
      if (error) {
        console.error('Failed to mark notification as read:', error);
        return;
      }
      
      // Update local state immediately for instant UI feedback
      const { notifications } = get();
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true, read_at: new Date().toISOString() } 
          : n
      );
      
      const newUnreadCount = updatedNotifications.filter(n => !n.is_read).length;
      
      set({ 
        notifications: updatedNotifications,
        unreadCount: newUnreadCount
      });
      
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const { error } = await dbHelpers.markAllNotificationsAsRead(user.id);
      
      if (error) {
        console.error('Failed to mark all notifications as read:', error);
        return;
      }
      
      // Update local state
      const { notifications } = get();
      const updatedNotifications = notifications.map(n => ({ 
        ...n, 
        is_read: true, 
        read_at: new Date().toISOString() 
      }));
      
      set({ 
        notifications: updatedNotifications,
        unreadCount: 0
      });
      
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  refresh: async () => {
    await get().fetchNotifications();
  },

  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
    });
  },
}));
