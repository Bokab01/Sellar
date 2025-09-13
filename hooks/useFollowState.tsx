import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

interface FollowState {
  [userId: string]: boolean;
}

interface FollowContextType {
  followingStates: FollowState;
  isFollowing: (userId: string) => boolean;
  followUser: (userId: string) => Promise<boolean>;
  unfollowUser: (userId: string) => Promise<boolean>;
  refreshFollowState: (userId: string) => Promise<void>;
  refreshAllFollowStates: () => Promise<void>;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export function FollowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const [followingStates, setFollowingStates] = useState<FollowState>({});

  const isFollowing = useCallback((userId: string): boolean => {
    return followingStates[userId] || false;
  }, [followingStates]);

  const refreshFollowState = useCallback(async (userId: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      setFollowingStates(prev => ({
        ...prev,
        [userId]: !!data
      }));
    } catch (error) {
      // User is not being followed
      setFollowingStates(prev => ({
        ...prev,
        [userId]: false
      }));
    }
  }, [user?.id]);

  const refreshAllFollowStates = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;

      const newStates: FollowState = {};
      data?.forEach(follow => {
        newStates[follow.following_id] = true;
      });

      setFollowingStates(newStates);
    } catch (error) {
      console.error('Error refreshing follow states:', error);
    }
  }, [user?.id]);

  const followUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Try RPC function first
      try {
        const { data } = await supabase.rpc('follow_user', { target_user_id: userId });
        
        if (data?.success) {
          setFollowingStates(prev => ({ ...prev, [userId]: true }));
          console.log('✅ Successfully followed user via RPC:', userId);
          return true;
        }
      } catch (rpcError: any) {
        if (!rpcError.message.includes('Could not find the function')) {
          throw rpcError;
        }
        console.log('RPC function not available, using direct insert');
      }

      // Fallback to direct insert
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        });

      if (error) {
        if (error.code === '23505') {
          // Already following, just update state
          setFollowingStates(prev => ({ ...prev, [userId]: true }));
          return true;
        }
        throw error;
      }

      setFollowingStates(prev => ({ ...prev, [userId]: true }));
      console.log('✅ Successfully followed user:', userId);
      return true;
    } catch (error: any) {
      console.error('❌ Error following user:', error);
      return false;
    }
  }, [user?.id]);

  const unfollowUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Try RPC function first
      try {
        const { data } = await supabase.rpc('unfollow_user', { target_user_id: userId });
        
        if (data?.success) {
          setFollowingStates(prev => ({ ...prev, [userId]: false }));
          console.log('✅ Successfully unfollowed user via RPC:', userId);
          return true;
        }
      } catch (rpcError: any) {
        if (!rpcError.message.includes('Could not find the function')) {
          throw rpcError;
        }
        console.log('RPC function not available, using direct delete');
      }

      // Fallback to direct delete
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;

      setFollowingStates(prev => ({ ...prev, [userId]: false }));
      console.log('✅ Successfully unfollowed user:', userId);
      return true;
    } catch (error: any) {
      console.error('❌ Error unfollowing user:', error);
      return false;
    }
  }, [user?.id]);

  const value: FollowContextType = {
    followingStates,
    isFollowing,
    followUser,
    unfollowUser,
    refreshFollowState,
    refreshAllFollowStates,
  };

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollowState(): FollowContextType {
  const context = useContext(FollowContext);
  if (context === undefined) {
    throw new Error('useFollowState must be used within a FollowProvider');
  }
  return context;
}
