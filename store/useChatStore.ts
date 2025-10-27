import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatState {
  // Active conversation
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  
  // Typing indicators
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  setTypingUser: (conversationId: string, userId: string, isTyping: boolean) => void;
  clearTypingForUser: (userId: string) => void; // Clear typing for a user across all conversations
  
  // Unread counts
  unreadCounts: Record<string, number>; // conversationId -> count
  setUnreadCount: (conversationId: string, count: number) => void;
  markAsRead: (conversationId: string) => void;
  
  // Manually marked as unread (to prevent auto-marking as read)
  manuallyMarkedAsUnread: Set<string>; // conversationId -> true
  markAsUnread: (conversationId: string) => void;
  clearManuallyMarkedAsUnread: (conversationId: string) => void;
  
  // Track when conversations were last marked as read (for app reload persistence)
  lastReadTimestamps: Record<string, number>; // conversationId -> timestamp
  setLastReadTimestamp: (conversationId: string, timestamp: number) => void;
  
  // Draft messages
  draftMessages: Record<string, string>; // conversationId -> draft text
  setDraftMessage: (conversationId: string, text: string) => void;
  clearDraftMessage: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  // Active conversation
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  
  // Typing indicators
  typingUsers: {},
  setTypingUser: (conversationId, userId, isTyping) => {
    const { typingUsers } = get();
    const currentTyping = typingUsers[conversationId] || [];
    
    let newTyping;
    if (isTyping) {
      newTyping = currentTyping.includes(userId) 
        ? currentTyping 
        : [...currentTyping, userId];
    } else {
      newTyping = currentTyping.filter(id => id !== userId);
    }
    
    set({
      typingUsers: {
        ...typingUsers,
        [conversationId]: newTyping,
      },
    });
  },
  
  // Edge Case 3: Clear typing indicator for a blocked user across all conversations
  clearTypingForUser: (userId) => {
    const { typingUsers } = get();
    const newTypingUsers: Record<string, string[]> = {};
    
    // Remove userId from all conversations
    Object.keys(typingUsers).forEach(conversationId => {
      const filtered = typingUsers[conversationId].filter(id => id !== userId);
      if (filtered.length > 0) {
        newTypingUsers[conversationId] = filtered;
      }
    });
    
    set({ typingUsers: newTypingUsers });
    console.log('🧹 Cleared typing indicator for user:', userId);
  },
  
  // Unread counts
  unreadCounts: {},
  setUnreadCount: (conversationId, count) => {
    const { unreadCounts } = get();
    set({
      unreadCounts: {
        ...unreadCounts,
        [conversationId]: count,
      },
    });
  },
  markAsRead: async (conversationId) => {
    const { unreadCounts, manuallyMarkedAsUnread } = get();
    
    // Don't auto-mark as read if manually marked as unread
    if (manuallyMarkedAsUnread.has(conversationId)) {
      console.log('🚫 Skipping auto-mark as read - conversation manually marked as unread');
      return;
    }
    
    console.log('📖 ChatStore markAsRead called for conversation:', conversationId);
    
    // Update local state immediately
    const newCounts = { ...unreadCounts };
    delete newCounts[conversationId];
    
    // Track when this conversation was last marked as read
    const { lastReadTimestamps } = get();
    const timestamp = Date.now();
    
    set({ 
      unreadCounts: newCounts,
      lastReadTimestamps: {
        ...lastReadTimestamps,
        [conversationId]: timestamp,
      },
    });
    console.log('📊 ChatStore updated local unread count to 0 for conversation:', conversationId);
    console.log('⏰ ChatStore recorded read timestamp:', timestamp, 'for conversation:', conversationId);
    
    // Note: Database update is handled by markMessagesAsRead in useMessages hook
    // to avoid duplicate database calls and race conditions
  },
  
  // Manually marked as unread
  manuallyMarkedAsUnread: new Set(),
  
  // Track when conversations were last marked as read
  lastReadTimestamps: {},
  markAsUnread: (conversationId) => {
    const { manuallyMarkedAsUnread } = get();
    const newSet = new Set(manuallyMarkedAsUnread);
    newSet.add(conversationId);
    set({ manuallyMarkedAsUnread: newSet });
  },
  clearManuallyMarkedAsUnread: (conversationId) => {
    const { manuallyMarkedAsUnread } = get();
    const newSet = new Set(manuallyMarkedAsUnread);
    newSet.delete(conversationId);
    set({ manuallyMarkedAsUnread: newSet });
  },
  
  setLastReadTimestamp: (conversationId, timestamp) => {
    const { lastReadTimestamps } = get();
    set({
      lastReadTimestamps: {
        ...lastReadTimestamps,
        [conversationId]: timestamp,
      },
    });
  },
  
  // Draft messages
  draftMessages: {},
  setDraftMessage: (conversationId, text) => {
    const { draftMessages } = get();
    set({
      draftMessages: {
        ...draftMessages,
        [conversationId]: text,
      },
    });
  },
  clearDraftMessage: (conversationId) => {
    const { draftMessages } = get();
    const newDrafts = { ...draftMessages };
    delete newDrafts[conversationId];
    set({ draftMessages: newDrafts });
  },
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        unreadCounts: state.unreadCounts,
        lastReadTimestamps: state.lastReadTimestamps,
        manuallyMarkedAsUnread: Array.from(state.manuallyMarkedAsUnread),
        draftMessages: state.draftMessages,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert array back to Set for manuallyMarkedAsUnread
          state.manuallyMarkedAsUnread = new Set(state.manuallyMarkedAsUnread as any);
        }
      },
    }
  )
);