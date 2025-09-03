import React, { useEffect, useState, createContext, useContext } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRewardsStore, CommunityReward } from '@/store/useRewardsStore';
import { RewardNotification } from '@/components/RewardNotification/RewardNotification';

interface RewardsContextType {
  showRewardNotification: (reward: CommunityReward) => void;
}

const RewardsContext = createContext<RewardsContextType | null>(null);

export const useRewardsContext = () => {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error('useRewardsContext must be used within RewardsProvider');
  }
  return context;
};

interface RewardsProviderProps {
  children: React.ReactNode;
}

export function RewardsProvider({ children }: RewardsProviderProps) {
  const { user } = useAuthStore();
  const { subscribeToRewards } = useRewardsStore();
  const [currentReward, setCurrentReward] = useState<CommunityReward | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time reward updates
    const unsubscribe = subscribeToRewards((reward) => {
      showRewardNotification(reward);
    });

    return unsubscribe;
  }, [user]);

  const showRewardNotification = (reward: CommunityReward) => {
    setCurrentReward(reward);
    setNotificationVisible(true);
  };

  const hideRewardNotification = () => {
    setNotificationVisible(false);
    // Clear reward after animation completes
    setTimeout(() => {
      setCurrentReward(null);
    }, 300);
  };

  const contextValue: RewardsContextType = {
    showRewardNotification,
  };

  return (
    <RewardsContext.Provider value={contextValue}>
      {children}
      
      {/* Global Reward Notification */}
      <RewardNotification
        reward={currentReward}
        visible={notificationVisible}
        onClose={hideRewardNotification}
        autoHide={true}
        duration={4000}
      />
    </RewardsContext.Provider>
  );
}
