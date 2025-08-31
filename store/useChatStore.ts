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
  markAsRead: (conversationId) => {
    const { unreadCounts } = get();
    const newCounts = { ...unreadCounts };
    delete newCounts[conversationId];
    set({ unreadCounts: newCounts });
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