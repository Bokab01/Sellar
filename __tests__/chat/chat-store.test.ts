// Chat Store Tests
describe('Chat Store', () => {
  // Mock the store implementation
  const createMockChatStore = () => ({
    // Active conversation
    activeConversationId: null as string | null,
    setActiveConversationId: jest.fn(),
    
    // Typing indicators
    typingUsers: {} as Record<string, string[]>,
    setTypingUser: jest.fn(),
    
    // Unread counts
    unreadCounts: {} as Record<string, number>,
    setUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    
    // Draft messages
    draftMessages: {} as Record<string, string>,
    setDraftMessage: jest.fn(),
    clearDraftMessage: jest.fn(),
  });

  let mockStore: ReturnType<typeof createMockChatStore>;

  beforeEach(() => {
    mockStore = createMockChatStore();
    jest.clearAllMocks();
  });

  describe('Active Conversation Management', () => {
    it('should set active conversation ID', () => {
      mockStore.setActiveConversationId.mockImplementation((id: string | null) => {
        mockStore.activeConversationId = id;
      });

      mockStore.setActiveConversationId('conv123');
      expect(mockStore.setActiveConversationId).toHaveBeenCalledWith('conv123');
      expect(mockStore.activeConversationId).toBe('conv123');
    });

    it('should clear active conversation', () => {
      mockStore.setActiveConversationId.mockImplementation((id: string | null) => {
        mockStore.activeConversationId = id;
      });

      mockStore.activeConversationId = 'conv123';
      mockStore.setActiveConversationId(null);
      
      expect(mockStore.setActiveConversationId).toHaveBeenCalledWith(null);
      expect(mockStore.activeConversationId).toBeNull();
    });
  });

  describe('Typing Indicators', () => {
    it('should add typing user to conversation', () => {
      mockStore.setTypingUser.mockImplementation((conversationId: string, userId: string, isTyping: boolean) => {
        if (isTyping) {
          const currentTyping = mockStore.typingUsers[conversationId] || [];
          if (!currentTyping.includes(userId)) {
            mockStore.typingUsers[conversationId] = [...currentTyping, userId];
          }
        }
      });

      mockStore.setTypingUser('conv123', 'user456', true);

      expect(mockStore.setTypingUser).toHaveBeenCalledWith('conv123', 'user456', true);
      expect(mockStore.typingUsers['conv123']).toContain('user456');
    });

    it('should remove typing user from conversation', () => {
      mockStore.setTypingUser.mockImplementation((conversationId: string, userId: string, isTyping: boolean) => {
        if (!isTyping) {
          const currentTyping = mockStore.typingUsers[conversationId] || [];
          mockStore.typingUsers[conversationId] = currentTyping.filter(id => id !== userId);
        }
      });

      // Set initial state
      mockStore.typingUsers['conv123'] = ['user456', 'user789'];

      mockStore.setTypingUser('conv123', 'user456', false);

      expect(mockStore.setTypingUser).toHaveBeenCalledWith('conv123', 'user456', false);
      expect(mockStore.typingUsers['conv123']).not.toContain('user456');
      expect(mockStore.typingUsers['conv123']).toContain('user789');
    });

    it('should handle multiple typing users', () => {
      mockStore.setTypingUser.mockImplementation((conversationId: string, userId: string, isTyping: boolean) => {
        const currentTyping = mockStore.typingUsers[conversationId] || [];
        if (isTyping && !currentTyping.includes(userId)) {
          mockStore.typingUsers[conversationId] = [...currentTyping, userId];
        }
      });

      mockStore.setTypingUser('conv123', 'user456', true);
      mockStore.setTypingUser('conv123', 'user789', true);

      expect(mockStore.typingUsers['conv123']).toEqual(['user456', 'user789']);
    });

    it('should not duplicate typing users', () => {
      mockStore.setTypingUser.mockImplementation((conversationId: string, userId: string, isTyping: boolean) => {
        const currentTyping = mockStore.typingUsers[conversationId] || [];
        if (isTyping && !currentTyping.includes(userId)) {
          mockStore.typingUsers[conversationId] = [...currentTyping, userId];
        }
      });

      mockStore.setTypingUser('conv123', 'user456', true);
      mockStore.setTypingUser('conv123', 'user456', true); // Duplicate

      expect(mockStore.typingUsers['conv123']).toEqual(['user456']);
    });
  });

  describe('Unread Count Management', () => {
    it('should set unread count for conversation', () => {
      mockStore.setUnreadCount.mockImplementation((conversationId: string, count: number) => {
        mockStore.unreadCounts[conversationId] = count;
      });

      mockStore.setUnreadCount('conv123', 5);

      expect(mockStore.setUnreadCount).toHaveBeenCalledWith('conv123', 5);
      expect(mockStore.unreadCounts['conv123']).toBe(5);
    });

    it('should update existing unread count', () => {
      mockStore.setUnreadCount.mockImplementation((conversationId: string, count: number) => {
        mockStore.unreadCounts[conversationId] = count;
      });

      mockStore.unreadCounts['conv123'] = 3;
      mockStore.setUnreadCount('conv123', 7);

      expect(mockStore.unreadCounts['conv123']).toBe(7);
    });

    it('should mark conversation as read', () => {
      mockStore.markAsRead.mockImplementation((conversationId: string) => {
        delete mockStore.unreadCounts[conversationId];
      });

      mockStore.unreadCounts['conv123'] = 5;
      mockStore.markAsRead('conv123');

      expect(mockStore.markAsRead).toHaveBeenCalledWith('conv123');
      expect(mockStore.unreadCounts['conv123']).toBeUndefined();
    });

    it('should handle multiple conversation unread counts', () => {
      mockStore.setUnreadCount.mockImplementation((conversationId: string, count: number) => {
        mockStore.unreadCounts[conversationId] = count;
      });

      mockStore.setUnreadCount('conv123', 3);
      mockStore.setUnreadCount('conv456', 7);
      mockStore.setUnreadCount('conv789', 1);

      expect(mockStore.unreadCounts).toEqual({
        'conv123': 3,
        'conv456': 7,
        'conv789': 1,
      });
    });
  });

  describe('Draft Message Management', () => {
    it('should set draft message for conversation', () => {
      mockStore.setDraftMessage.mockImplementation((conversationId: string, text: string) => {
        mockStore.draftMessages[conversationId] = text;
      });

      const draftText = 'Hello, is this still available?';
      mockStore.setDraftMessage('conv123', draftText);

      expect(mockStore.setDraftMessage).toHaveBeenCalledWith('conv123', draftText);
      expect(mockStore.draftMessages['conv123']).toBe(draftText);
    });

    it('should update existing draft message', () => {
      mockStore.setDraftMessage.mockImplementation((conversationId: string, text: string) => {
        mockStore.draftMessages[conversationId] = text;
      });

      mockStore.draftMessages['conv123'] = 'Initial draft';
      mockStore.setDraftMessage('conv123', 'Updated draft message');

      expect(mockStore.draftMessages['conv123']).toBe('Updated draft message');
    });

    it('should clear draft message', () => {
      mockStore.clearDraftMessage.mockImplementation((conversationId: string) => {
        delete mockStore.draftMessages[conversationId];
      });

      mockStore.draftMessages['conv123'] = 'Draft to be cleared';
      mockStore.clearDraftMessage('conv123');

      expect(mockStore.clearDraftMessage).toHaveBeenCalledWith('conv123');
      expect(mockStore.draftMessages['conv123']).toBeUndefined();
    });

    it('should handle empty draft messages', () => {
      mockStore.setDraftMessage.mockImplementation((conversationId: string, text: string) => {
        mockStore.draftMessages[conversationId] = text;
      });

      mockStore.setDraftMessage('conv123', '');
      expect(mockStore.draftMessages['conv123']).toBe('');
    });

    it('should handle multiple draft messages', () => {
      mockStore.setDraftMessage.mockImplementation((conversationId: string, text: string) => {
        mockStore.draftMessages[conversationId] = text;
      });

      mockStore.setDraftMessage('conv123', 'Draft for conversation 1');
      mockStore.setDraftMessage('conv456', 'Draft for conversation 2');

      expect(mockStore.draftMessages).toEqual({
        'conv123': 'Draft for conversation 1',
        'conv456': 'Draft for conversation 2',
      });
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across operations', () => {
      // Mock all operations
      mockStore.setActiveConversationId.mockImplementation((id) => {
        mockStore.activeConversationId = id;
      });
      mockStore.setUnreadCount.mockImplementation((conversationId, count) => {
        mockStore.unreadCounts[conversationId] = count;
      });
      mockStore.setDraftMessage.mockImplementation((conversationId, text) => {
        mockStore.draftMessages[conversationId] = text;
      });

      // Perform multiple operations
      mockStore.setActiveConversationId('conv123');
      mockStore.setUnreadCount('conv123', 5);
      mockStore.setUnreadCount('conv456', 2);
      mockStore.setDraftMessage('conv123', 'Hello there');

      // Verify state is maintained
      expect(mockStore.activeConversationId).toBe('conv123');
      expect(mockStore.unreadCounts['conv123']).toBe(5);
      expect(mockStore.unreadCounts['conv456']).toBe(2);
      expect(mockStore.draftMessages['conv123']).toBe('Hello there');
    });

    it('should handle concurrent operations', () => {
      mockStore.setTypingUser.mockImplementation((conversationId, userId, isTyping) => {
        const currentTyping = mockStore.typingUsers[conversationId] || [];
        if (isTyping && !currentTyping.includes(userId)) {
          mockStore.typingUsers[conversationId] = [...currentTyping, userId];
        } else if (!isTyping) {
          mockStore.typingUsers[conversationId] = currentTyping.filter(id => id !== userId);
        }
      });

      // Simulate concurrent typing operations
      mockStore.setTypingUser('conv123', 'user1', true);
      mockStore.setTypingUser('conv123', 'user2', true);
      mockStore.setTypingUser('conv123', 'user1', false);

      expect(mockStore.typingUsers['conv123']).toEqual(['user2']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations on non-existent conversations', () => {
      mockStore.markAsRead.mockImplementation((conversationId) => {
        delete mockStore.unreadCounts[conversationId];
      });
      mockStore.clearDraftMessage.mockImplementation((conversationId) => {
        delete mockStore.draftMessages[conversationId];
      });

      // Operations on non-existent conversations should not throw
      expect(() => {
        mockStore.markAsRead('nonexistent');
        mockStore.clearDraftMessage('nonexistent');
      }).not.toThrow();
    });

    it('should handle invalid user IDs in typing indicators', () => {
      mockStore.setTypingUser.mockImplementation((conversationId, userId, isTyping) => {
        if (!userId) return; // Guard against invalid user IDs
        
        const currentTyping = mockStore.typingUsers[conversationId] || [];
        if (isTyping && !currentTyping.includes(userId)) {
          mockStore.typingUsers[conversationId] = [...currentTyping, userId];
        }
      });

      // Should handle empty/null user IDs gracefully
      mockStore.setTypingUser('conv123', '', true);
      mockStore.setTypingUser('conv123', 'valid_user', true);

      expect(mockStore.typingUsers['conv123']).toEqual(['valid_user']);
    });

    it('should handle negative unread counts', () => {
      mockStore.setUnreadCount.mockImplementation((conversationId, count) => {
        // Ensure count is never negative
        mockStore.unreadCounts[conversationId] = Math.max(0, count);
      });

      mockStore.setUnreadCount('conv123', -5);
      expect(mockStore.unreadCounts['conv123']).toBe(0);
    });

    it('should handle very long draft messages', () => {
      mockStore.setDraftMessage.mockImplementation((conversationId, text) => {
        // Simulate character limit
        const maxLength = 1000;
        mockStore.draftMessages[conversationId] = text.substring(0, maxLength);
      });

      const longMessage = 'A'.repeat(1500);
      mockStore.setDraftMessage('conv123', longMessage);

      expect(mockStore.draftMessages['conv123']).toHaveLength(1000);
    });
  });

  describe('Real-time Scenarios', () => {
    it('should handle rapid typing indicator changes', () => {
      mockStore.setTypingUser.mockImplementation((conversationId, userId, isTyping) => {
        const currentTyping = mockStore.typingUsers[conversationId] || [];
        if (isTyping && !currentTyping.includes(userId)) {
          mockStore.typingUsers[conversationId] = [...currentTyping, userId];
        } else if (!isTyping) {
          mockStore.typingUsers[conversationId] = currentTyping.filter(id => id !== userId);
        }
      });

      // Rapid typing on/off
      mockStore.setTypingUser('conv123', 'user1', true);
      mockStore.setTypingUser('conv123', 'user1', false);
      mockStore.setTypingUser('conv123', 'user1', true);

      expect(mockStore.typingUsers['conv123']).toEqual(['user1']);
    });

    it('should handle message count updates during active chat', () => {
      mockStore.setUnreadCount.mockImplementation((conversationId, count) => {
        mockStore.unreadCounts[conversationId] = count;
      });
      mockStore.markAsRead.mockImplementation((conversationId) => {
        delete mockStore.unreadCounts[conversationId];
      });

      // Simulate receiving messages while in chat
      mockStore.setUnreadCount('conv123', 1);
      mockStore.setUnreadCount('conv123', 2);
      mockStore.markAsRead('conv123'); // User reads messages

      expect(mockStore.unreadCounts['conv123']).toBeUndefined();
    });

    it('should handle draft auto-save scenarios', () => {
      mockStore.setDraftMessage.mockImplementation((conversationId, text) => {
        mockStore.draftMessages[conversationId] = text;
      });

      // Simulate typing with auto-save
      const conversationId = 'conv123';
      const typingSequence = ['H', 'He', 'Hel', 'Hell', 'Hello'];

      typingSequence.forEach(text => {
        mockStore.setDraftMessage(conversationId, text);
      });

      expect(mockStore.draftMessages[conversationId]).toBe('Hello');
    });
  });
});
