import { create } from 'zustand';
import { dbHelpers, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  realtimeChannel: RealtimeChannel | null;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  subscribeToNotifications: (userId: string) => void;
  unsubscribeFromNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  realtimeChannel: null,

  fetchNotifications: async () => {
    const { user, session } = useAuthStore.getState();
    const userId = user?.id || session?.user?.id;
    if (!userId) {
      console.log('🔔 No user found, skipping notification fetch');
      return;
    }

    try {
      set({ loading: true, error: null });
      console.log('🔔 Fetching notifications for user:', userId);

      // Fetch ALL notifications (limit: 1000) to ensure we show everything
      const { data, error: fetchError } = await dbHelpers.getNotifications(userId, 1000, 0);

      if (fetchError) {
        console.error('🔔 Error fetching notifications:', fetchError);
        set({ error: fetchError.message, loading: false });
      } else {
        const notifications = (data || []).filter((n: any) => n && typeof n === 'object' && !n.error) as unknown as Notification[];
        const unreadCount = notifications.filter((n: any) => !n.is_read).length;
        
        console.log('🔔 Fetched notifications:', notifications.length, 'Unread:', unreadCount);
        
        set({ 
          notifications, 
          unreadCount, 
          loading: false,
          error: null 
        });
      }
    } catch (err) {
      console.error('🔔 Exception fetching notifications:', err);
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
    const { user, session } = useAuthStore.getState();
    const userId = user?.id || session?.user?.id;
    if (!userId) return;

    try {
      const { error } = await dbHelpers.markAllNotificationsAsRead(userId);
      
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

  deleteNotification: async (notificationId: string) => {
    try {
      const { error } = await dbHelpers.deleteNotification(notificationId);
      
      if (error) {
        console.error('Failed to delete notification:', error);
        return;
      }
      
      // Update local state immediately for instant UI feedback
      const { notifications } = get();
      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      const newUnreadCount = updatedNotifications.filter(n => !n.is_read).length;
      
      set({ 
        notifications: updatedNotifications,
        unreadCount: newUnreadCount
      });
      
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  deleteAllNotifications: async () => {
    const { user, session } = useAuthStore.getState();
    const userId = user?.id || session?.user?.id;
    
    if (!userId) {
      console.error('No user ID found for deleting notifications');
      return;
    }

    try {
      const { error } = await dbHelpers.deleteAllNotifications(userId);
      
      if (error) {
        console.error('Failed to delete all notifications:', error);
        return;
      }
      
      // Update local state
      set({ 
        notifications: [],
        unreadCount: 0
      });
      
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
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
      realtimeChannel: null,
    });
  },

  subscribeToNotifications: (userId: string) => {
    console.log('🔔 [Store] Setting up real-time subscription for notifications, user:', userId);
    
    // Cleanup existing subscription
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      console.log('🔔 [Store] Removing existing notification subscription');
      supabase.removeChannel(realtimeChannel);
    }

    // Create new subscription
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 [Store] Real-time notification received:', payload.new);
          
          const newNotification = payload.new as Notification;
          const { notifications, unreadCount } = get();
          
          // Add new notification to the top of the list
          const updatedNotifications = [newNotification, ...notifications];
          const newUnreadCount = !newNotification.is_read ? unreadCount + 1 : unreadCount;
          
          console.log('🔔 [Store] Updated notifications count:', updatedNotifications.length, 'Unread:', newUnreadCount);
          
          set({
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 [Store] Real-time notification updated:', payload.new);
          
          const updatedNotification = payload.new as Notification;
          const { notifications } = get();
          
          // Update the notification in the list
          const updatedNotifications = notifications.map(n =>
            n.id === updatedNotification.id ? updatedNotification : n
          );
          const newUnreadCount = updatedNotifications.filter(n => !n.is_read).length;
          
          set({
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 [Store] Real-time notification deleted:', payload.old);
          
          const deletedId = payload.old.id as string;
          const { notifications } = get();
          
          // Remove the notification from the list
          const updatedNotifications = notifications.filter(n => n.id !== deletedId);
          const newUnreadCount = updatedNotifications.filter(n => !n.is_read).length;
          
          set({
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          });
        }
      )
      .subscribe((status) => {
        console.log('🔔 [Store] Notification subscription status:', status);
      });

    set({ realtimeChannel: channel });
  },

  unsubscribeFromNotifications: () => {
    console.log('🔔 [Store] Unsubscribing from notifications');
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },
}));
