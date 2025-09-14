import { useState, useEffect } from 'react';
import { dbHelpers } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export function useNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dbHelpers.getNotifications(user.id);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setNotifications(data || []);
        const unread = (data || []).filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { data, error } = await dbHelpers.markNotificationAsRead(notificationId);
      
      if (error) {
        console.error('Failed to mark notification as read:', error);
        return;
      }
      
      // Update local state with the returned data to ensure consistency
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Badge count will be updated automatically by the unreadCount state change
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await dbHelpers.markAllNotificationsAsRead(user.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}