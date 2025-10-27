import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useBlockStore } from '@/store/useBlockStore';
import { useBlockUser } from './useBlockUser';
import { supabase } from '@/lib/supabase';

/**
 * Hook to load blocked user IDs into Zustand store on app start
 * This provides instant filtering without repeated database calls
 * Also subscribes to real-time changes for instant UI updates
 */
export function useBlockedUsersLoader() {
  const { user } = useAuthStore();
  const { setBlockedUserIds, addBlockedUser, removeBlockedUser, setLoading } = useBlockStore();
  const { getBlockedUserIds } = useBlockUser();

  useEffect(() => {
    if (!user?.id) {
      // Reset blocked users when user logs out
      setBlockedUserIds([]);
      return;
    }

    const loadBlockedUsers = async () => {
      try {
        setLoading(true);
        const ids = await getBlockedUserIds();
        console.log('🛡️ [useBlockedUsersLoader] Loaded blocked user IDs:', ids);
        setBlockedUserIds(ids);
        console.log('🛡️ [useBlockedUsersLoader] Blocked user IDs set in store. Store now has:', useBlockStore.getState().blockedUserIds.size, 'blocked users');
      } catch (error) {
        console.error('❌ [useBlockedUsersLoader] Failed to load blocked users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBlockedUsers();

    // Set up real-time subscription for block changes
    const channel = supabase
      .channel('user_blocks')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'blocked_users',
        filter: `blocker_id=eq.${user.id}`,
      }, (payload) => {
        // User blocked someone
        console.log('🛡️ [useBlockedUsersLoader] Real-time: User blocked someone:', payload.new.blocked_id);
        addBlockedUser(payload.new.blocked_id);
        console.log('🛡️ [useBlockedUsersLoader] Store now has:', useBlockStore.getState().blockedUserIds.size, 'blocked users');
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'blocked_users',
        filter: `blocker_id=eq.${user.id}`,
      }, (payload) => {
        // User unblocked someone
        removeBlockedUser(payload.old.blocked_id);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);
}

