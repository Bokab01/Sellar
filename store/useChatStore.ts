import { create } from 'zustand';

interface ChatState {
  // Active conversation
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  
  // Typing indicators
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  setTypingUser: (conversationId: string, userId: string, isTyping: boolean) => void;
  
  // Unread counts
  unreadCounts: Record<string, number>; // conversationId -> count
  setUnreadCount: (conversationId: string, count: number) => void;
  markAsRead: (conversationId: string) => void;
  
  // Manually marked as unread (to prevent auto-marking as read)
  manuallyMarkedAsUnread: Set<string>; // conversationId -> true
  markAsUnread: (conversationId: string) => void;
  clearManuallyMarkedAsUnread: (conversationId: string) => void;
  
  // Draft messages
  draftMessages: Record<string, string>; // conversationId -> draft text
  setDraftMessage: (conversationId: string, text: string) => void;
  clearDraftMessage: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
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
    
    const newCounts = { ...unreadCounts };
    delete newCounts[conversationId];
    set({ unreadCounts: newCounts });
    
    // Also mark messages as read in the database
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .is('read_at', null);
      }
    } catch (error) {
      console.error('Failed to mark messages as read in database:', error);
    }
  },
  
  // Manually marked as unread
  manuallyMarkedAsUnread: new Set(),
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
}));