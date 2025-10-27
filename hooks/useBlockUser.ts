import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';

export interface BlockReason {
  value: 'spam' | 'harassment' | 'inappropriate' | 'other';
  label: string;
}

export const BLOCK_REASONS: BlockReason[] = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export function useBlockUser() {
  const { user } = useAuthStore();
  const { clearTypingForUser } = useChatStore();
  const [loading, setLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  /**
   * Block a user with comprehensive edge case handling
   */
  const blockUser = useCallback(async (
    userId: string,
    reason?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Edge Case 8: Prevent self-blocking
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (user.id === userId) {
      return { success: false, error: 'You cannot block yourself' };
    }

    setLoading(true);

    try {
      // Edge Case 7: Check if user is already blocked
      const { data: existingBlock } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();

      if (existingBlock) {
        setLoading(false);
        return { success: false, error: 'You have already blocked this user' };
      }

      // Attempt to block user
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: userId,
          reason,
          notes,
        });

      if (error) {
        console.error('Error blocking user:', error);
        
        // Edge Case 9: Handle network/database errors gracefully
        if (error.message.includes('duplicate key') || error.code === '23505') {
          return { success: false, error: 'This user is already blocked' };
        }
        
        if (error.code === '23514') { // CHECK constraint violation
          return { success: false, error: 'Cannot block this user' };
        }
        
        return { success: false, error: 'Failed to block user. Please try again.' };
      }

      // Update local state
      setBlockedUsers(prev => [...prev, userId]);

      // Edge Case 3: Clear typing indicator for blocked user
      clearTypingForUser(userId);

      console.log('✅ User blocked successfully:', userId);
      return { success: true };
    } catch (err) {
      console.error('Exception blocking user:', err);
      // Edge Case 9: Network failure - provide retry option
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    } finally {
      setLoading(false);
    }
  }, [user, clearTypingForUser]);

  /**
   * Unblock a user
   */
  const unblockUser = useCallback(async (
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) {
        console.error('Error unblocking user:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      setBlockedUsers(prev => prev.filter(id => id !== userId));

      return { success: true };
    } catch (err) {
      console.error('Exception unblocking user:', err);
      return { success: false, error: 'Failed to unblock user' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Check if a user is blocked
   */
  const isUserBlocked = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('is_user_blocked', {
          blocker_id: user.id,
          blocked_id: userId,
        });

      if (error) {
        console.error('Error checking if user is blocked:', error);
        return false;
      }

      return data || false;
    } catch (err) {
      console.error('Exception checking if user is blocked:', err);
      return false;
    }
  }, [user]);

  /**
   * Get list of blocked user IDs (for efficient filtering)
   */
  const getBlockedUserIds = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .rpc('get_blocked_user_ids', {
          for_user_id: user.id,
        });

      if (error) {
        console.error('Error getting blocked user IDs:', error);
        return [];
      }

      const ids = data || [];
      setBlockedUsers(ids);
      return ids;
    } catch (err) {
      console.error('Exception getting blocked user IDs:', err);
      return [];
    }
  }, [user]);

  /**
   * Get list of blocked users with full details
   */
  const getBlockedUsers = useCallback(async () => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_id,
          reason,
          created_at,
          profiles!blocked_users_blocked_id_fkey (
            id,
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching blocked users:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Exception fetching blocked users:', err);
      return { data: null, error: 'Failed to fetch blocked users' };
    }
  }, [user]);

  /**
   * Show block confirmation dialog
   */
  const confirmBlock = useCallback((
    userName: string,
    onConfirm: () => void
  ) => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName}?\n\nThey won't be able to:\n• Send you messages\n• See your posts\n• Comment on your listings\n• Find you in search`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    );
  }, []);

  /**
   * Show unblock confirmation dialog
   */
  const confirmUnblock = useCallback((
    userName: string,
    onConfirm: () => void
  ) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${userName}? They will be able to interact with you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: onConfirm,
        },
      ]
    );
  }, []);

  return {
    loading,
    blockedUsers,
    blockUser,
    unblockUser,
    isUserBlocked,
    getBlockedUserIds,
    getBlockedUsers,
    confirmBlock,
    confirmUnblock,
  };
}

