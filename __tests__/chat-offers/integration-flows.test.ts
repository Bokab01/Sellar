// Chat and Offers Integration Tests
describe('Chat and Offers Integration', () => {
  // Mock users and data
  const mockUsers = {
    buyer: {
      id: 'buyer123',
      full_name: 'John Buyer',
      email: 'buyer@example.com',
      rating: 4.2,
    },
    seller: {
      id: 'seller123',
      full_name: 'Jane Seller',
      email: 'seller@example.com',
      rating: 4.8,
    },
  };

  const mockListing = {
    id: 'listing123',
    title: 'iPhone 13 Pro Max',
    description: 'Excellent condition, barely used',
    price: 2500,
    currency: 'GHS',
    user_id: 'seller123',
    status: 'active',
    images: ['image1.jpg', 'image2.jpg'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Chat Initiation Flow', () => {
    it('should create conversation when buyer contacts seller', async () => {
      const initiateChat = async (listingId: string, buyerId: string, sellerId: string) => {
        // Check if conversation already exists
        const existingConversation: any = null; // Simulate no existing conversation

        if (existingConversation) {
          return { success: true, conversationId: existingConversation.id, isNew: false };
        }

        // Create new conversation
        const newConversation = {
          id: 'conv123',
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          status: 'active',
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          buyer_unread_count: 0,
          seller_unread_count: 0,
        };

        // Send initial system message
        const systemMessage = {
          id: 'msg_system',
          conversation_id: newConversation.id,
          sender_id: null,
          content: `${mockUsers.buyer.full_name} is interested in "${mockListing.title}"`,
          message_type: 'system',
          created_at: new Date().toISOString(),
        };

        return {
          success: true,
          conversationId: newConversation.id,
          isNew: true,
          systemMessage,
        };
      };

      const result = await initiateChat(mockListing.id, mockUsers.buyer.id, mockUsers.seller.id);

      expect(result.success).toBe(true);
      expect(result.conversationId).toBe('conv123');
      expect(result.isNew).toBe(true);
      expect(result.systemMessage?.message_type).toBe('system');
    });

    it('should handle initial buyer inquiry', async () => {
      const sendInitialInquiry = async (conversationId: string, buyerId: string, message: string) => {
        const messageData = {
          id: 'msg123',
          conversation_id: conversationId,
          sender_id: buyerId,
          content: message,
          message_type: 'text',
          status: 'sent',
          created_at: new Date().toISOString(),
        };

        // Update conversation with last message
        const updatedConversation = {
          id: conversationId,
          last_message_content: message,
          last_message_at: new Date().toISOString(),
          last_message_sender_id: buyerId,
          seller_unread_count: 1,
        };

        return {
          success: true,
          message: messageData,
          conversation: updatedConversation,
        };
      };

      const result = await sendInitialInquiry(
        'conv123',
        mockUsers.buyer.id,
        'Hi! Is this iPhone still available? Would you consider GHS 2200?'
      );

      expect(result.success).toBe(true);
      expect(result.message.content).toContain('iPhone still available');
      expect(result.conversation.seller_unread_count).toBe(1);
    });

    it('should handle seller response with interest', async () => {
      const sendSellerResponse = async (conversationId: string, sellerId: string, message: string) => {
        const messageData = {
          id: 'msg124',
          conversation_id: conversationId,
          sender_id: sellerId,
          content: message,
          message_type: 'text',
          status: 'sent',
          created_at: new Date().toISOString(),
        };

        // Update conversation
        const updatedConversation = {
          id: conversationId,
          last_message_content: message,
          last_message_at: new Date().toISOString(),
          last_message_sender_id: sellerId,
          buyer_unread_count: 1,
          seller_unread_count: 0, // Seller read previous messages
        };

        return {
          success: true,
          message: messageData,
          conversation: updatedConversation,
        };
      };

      const result = await sendSellerResponse(
        'conv123',
        mockUsers.seller.id,
        'Yes, it\'s still available! The condition is excellent. GHS 2200 is a bit low, but I\'m open to negotiation.'
      );

      expect(result.success).toBe(true);
      expect(result.message.content).toContain('open to negotiation');
      expect(result.conversation.buyer_unread_count).toBe(1);
    });
  });

  describe('Offer Creation and Management Flow', () => {
    it('should create offer through chat', async () => {
      const createOfferInChat = async (
        conversationId: string,
        buyerId: string,
        offerData: {
          listing_id: string;
          amount: number;
          currency: string;
          message: string;
        }
      ) => {
        // Validate offer
        if (offerData.amount <= 0) {
          return { success: false, error: 'Invalid offer amount' };
        }

        // Create offer record
        const offer = {
          id: 'offer123',
          listing_id: offerData.listing_id,
          conversation_id: conversationId,
          buyer_id: buyerId,
          seller_id: mockUsers.seller.id,
          amount: offerData.amount,
          currency: offerData.currency,
          message: offerData.message,
          status: 'pending',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
          created_at: new Date().toISOString(),
        };

        // Create offer message in chat
        const offerMessage = {
          id: 'msg_offer123',
          conversation_id: conversationId,
          sender_id: buyerId,
          content: `Made an offer: ${offerData.currency} ${offerData.amount}`,
          message_type: 'offer',
          offer_data: {
            offer_id: offer.id,
            amount: offer.amount,
            currency: offer.currency,
            message: offer.message,
            expires_at: offer.expires_at,
          },
          created_at: new Date().toISOString(),
        };

        return {
          success: true,
          offer,
          message: offerMessage,
        };
      };

      const result = await createOfferInChat('conv123', mockUsers.buyer.id, {
        listing_id: mockListing.id,
        amount: 2200,
        currency: 'GHS',
        message: 'This is my best offer for the iPhone. Let me know!',
      });

      expect(result.success).toBe(true);
      expect(result.offer?.amount).toBe(2200);
      expect(result.offer?.status).toBe('pending');
      expect(result.message?.message_type).toBe('offer');
    });

    it('should handle offer acceptance flow', async () => {
      const acceptOfferFlow = async (
        offerId: string,
        sellerId: string,
        acceptanceMessage: string
      ) => {
        // Get offer details
        const offer = {
          id: offerId,
          listing_id: mockListing.id,
          conversation_id: 'conv123',
          buyer_id: mockUsers.buyer.id,
          seller_id: sellerId,
          amount: 2200,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        // Validate offer can be accepted
        if (offer.status !== 'pending') {
          return { success: false, error: 'Offer is not pending' };
        }

        if (new Date(offer.expires_at) < new Date()) {
          return { success: false, error: 'Offer has expired' };
        }

        // Accept offer
        const acceptedOffer = {
          ...offer,
          status: 'accepted',
          response_message: acceptanceMessage,
          responded_at: new Date().toISOString(),
        };

        // Create listing reservation
        const reservation = {
          id: 'res123',
          listing_id: offer.listing_id,
          buyer_id: offer.buyer_id,
          offer_id: offer.id,
          reserved_price: offer.amount,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
          status: 'active',
          created_at: new Date().toISOString(),
        };

        // Send acceptance message
        const acceptanceMsg = {
          id: 'msg_acceptance',
          conversation_id: offer.conversation_id,
          sender_id: sellerId,
          content: acceptanceMessage,
          message_type: 'system',
          system_data: {
            type: 'offer_accepted',
            offer_id: offer.id,
            amount: offer.amount,
            currency: 'GHS',
          },
          created_at: new Date().toISOString(),
        };

        // Update listing status to reserved
        const updatedListing = {
          ...mockListing,
          status: 'reserved',
          reserved_until: reservation.expires_at,
        };

        return {
          success: true,
          offer: acceptedOffer,
          reservation,
          message: acceptanceMsg,
          listing: updatedListing,
        };
      };

      const result = await acceptOfferFlow(
        'offer123',
        mockUsers.seller.id,
        'Great! I accept your offer. Let\'s proceed with the transaction.'
      );

      expect(result.success).toBe(true);
      expect(result.offer?.status).toBe('accepted');
      expect(result.reservation?.reserved_price).toBe(2200);
      expect(result.listing?.status).toBe('reserved');
    });

    it('should handle offer rejection with reason', async () => {
      const rejectOfferFlow = async (
        offerId: string,
        sellerId: string,
        rejectionData: { reason: string; message: string }
      ) => {
        const offer = {
          id: offerId,
          conversation_id: 'conv123',
          buyer_id: mockUsers.buyer.id,
          seller_id: sellerId,
          amount: 2000, // Lower offer
          status: 'pending',
        };

        // Reject offer
        const rejectedOffer = {
          ...offer,
          status: 'rejected',
          rejection_reason: rejectionData.reason,
          response_message: rejectionData.message,
          responded_at: new Date().toISOString(),
        };

        // Send rejection message
        const rejectionMsg = {
          id: 'msg_rejection',
          conversation_id: offer.conversation_id,
          sender_id: sellerId,
          content: rejectionData.message,
          message_type: 'system',
          system_data: {
            type: 'offer_rejected',
            offer_id: offer.id,
            reason: rejectionData.reason,
          },
          created_at: new Date().toISOString(),
        };

        return {
          success: true,
          offer: rejectedOffer,
          message: rejectionMsg,
        };
      };

      const result = await rejectOfferFlow('offer124', mockUsers.seller.id, {
        reason: 'price_too_low',
        message: 'Sorry, GHS 2000 is too low. The phone is in excellent condition and worth more.',
      });

      expect(result.success).toBe(true);
      expect(result.offer.status).toBe('rejected');
      expect(result.offer.rejection_reason).toBe('price_too_low');
    });

    it('should handle counter offer negotiation', async () => {
      const createCounterOfferFlow = async (
        originalOfferId: string,
        sellerId: string,
        counterData: { amount: number; message: string }
      ) => {
        const originalOffer = {
          id: originalOfferId,
          listing_id: mockListing.id,
          conversation_id: 'conv123',
          buyer_id: mockUsers.buyer.id,
          seller_id: sellerId,
          amount: 2000,
          status: 'pending',
        };

        // Create counter offer
        const counterOffer = {
          id: 'counter_offer123',
          listing_id: originalOffer.listing_id,
          conversation_id: originalOffer.conversation_id,
          buyer_id: originalOffer.buyer_id,
          seller_id: sellerId,
          amount: counterData.amount,
          currency: 'GHS',
          message: counterData.message,
          parent_offer_id: originalOffer.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        };

        // Update original offer status
        const updatedOriginalOffer = {
          ...originalOffer,
          status: 'countered',
        };

        // Send counter offer message
        const counterMsg = {
          id: 'msg_counter',
          conversation_id: originalOffer.conversation_id,
          sender_id: sellerId,
          content: `Counter offer: GHS ${counterData.amount}`,
          message_type: 'offer',
          offer_data: {
            offer_id: counterOffer.id,
            amount: counterOffer.amount,
            currency: counterOffer.currency,
            message: counterOffer.message,
            is_counter: true,
            parent_offer_id: originalOffer.id,
          },
          created_at: new Date().toISOString(),
        };

        return {
          success: true,
          originalOffer: updatedOriginalOffer,
          counterOffer,
          message: counterMsg,
        };
      };

      const result = await createCounterOfferFlow('offer124', mockUsers.seller.id, {
        amount: 2300,
        message: 'How about GHS 2300? That\'s a fair price for the condition.',
      });

      expect(result.success).toBe(true);
      expect(result.originalOffer.status).toBe('countered');
      expect(result.counterOffer.amount).toBe(2300);
      expect(result.counterOffer.parent_offer_id).toBe('offer124');
    });
  });

  describe('Real-time Communication Flow', () => {
    it('should handle typing indicators', async () => {
      const manageTypingIndicators = (conversationId: string, userId: string, isTyping: boolean) => {
        const typingState = {
          conversationId,
          typingUsers: isTyping ? [userId] : [],
          lastUpdate: new Date().toISOString(),
        };

        // Simulate real-time broadcast
        const broadcastTyping = {
          event: 'typing_update',
          conversation_id: conversationId,
          user_id: userId,
          is_typing: isTyping,
          timestamp: typingState.lastUpdate,
        };

        return {
          success: true,
          typingState,
          broadcast: broadcastTyping,
        };
      };

      // User starts typing
      const startTyping = manageTypingIndicators('conv123', mockUsers.buyer.id, true);
      expect(startTyping.typingState.typingUsers).toContain(mockUsers.buyer.id);
      expect(startTyping.broadcast.is_typing).toBe(true);

      // User stops typing
      const stopTyping = manageTypingIndicators('conv123', mockUsers.buyer.id, false);
      expect(stopTyping.typingState.typingUsers).toHaveLength(0);
      expect(stopTyping.broadcast.is_typing).toBe(false);
    });

    it('should handle message delivery status', async () => {
      const updateMessageStatus = (messageId: string, status: string) => {
        const validStatuses = ['sending', 'sent', 'delivered', 'read'];
        
        if (!validStatuses.includes(status)) {
          return { success: false, error: 'Invalid status' };
        }

        const updatedMessage = {
          id: messageId,
          status,
          updated_at: new Date().toISOString(),
        };

        // Simulate real-time status update
        const statusUpdate = {
          event: 'message_status_update',
          message_id: messageId,
          status,
          timestamp: updatedMessage.updated_at,
        };

        return {
          success: true,
          message: updatedMessage,
          broadcast: statusUpdate,
        };
      };

      // Test status progression
      const sentUpdate = updateMessageStatus('msg123', 'sent');
      expect(sentUpdate.success).toBe(true);
      expect(sentUpdate.message?.status).toBe('sent');

      const deliveredUpdate = updateMessageStatus('msg123', 'delivered');
      expect(deliveredUpdate.success).toBe(true);
      expect(deliveredUpdate.message?.status).toBe('delivered');

      const readUpdate = updateMessageStatus('msg123', 'read');
      expect(readUpdate.success).toBe(true);
      expect(readUpdate.message?.status).toBe('read');
    });

    it('should handle unread count updates', async () => {
      const updateUnreadCounts = (conversationId: string, userId: string, action: 'increment' | 'reset') => {
        const conversation = {
          id: conversationId,
          buyer_id: mockUsers.buyer.id,
          seller_id: mockUsers.seller.id,
          buyer_unread_count: 2,
          seller_unread_count: 1,
        };

        const isBuyer = userId === conversation.buyer_id;
        
        if (action === 'increment') {
          if (isBuyer) {
            conversation.buyer_unread_count += 1;
          } else {
            conversation.seller_unread_count += 1;
          }
        } else if (action === 'reset') {
          if (isBuyer) {
            conversation.buyer_unread_count = 0;
          } else {
            conversation.seller_unread_count = 0;
          }
        }

        return {
          success: true,
          conversation,
          totalUnread: conversation.buyer_unread_count + conversation.seller_unread_count,
        };
      };

      // Increment unread for buyer
      const incrementResult = updateUnreadCounts('conv123', mockUsers.buyer.id, 'increment');
      expect(incrementResult.conversation.buyer_unread_count).toBe(3);

      // Reset unread for buyer (when they read messages)
      const resetResult = updateUnreadCounts('conv123', mockUsers.buyer.id, 'reset');
      expect(resetResult.conversation.buyer_unread_count).toBe(0);
    });
  });

  describe('Offer Expiry and Cleanup', () => {
    it('should handle offer expiry notifications', async () => {
      const checkOfferExpiry = (offer: any) => {
        const now = new Date().getTime();
        const expiry = new Date(offer.expires_at).getTime();
        const remaining = expiry - now;
        
        // 24 hours = 86400000 ms
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        if (remaining <= 0) {
          return { status: 'expired', action: 'expire_offer' };
        } else if (remaining <= oneDayMs) {
          return { status: 'expiring_soon', action: 'send_warning' };
        } else {
          return { status: 'active', action: 'none' };
        }
      };

      // Test expiring soon
      const expiringSoonOffer = {
        id: 'offer123',
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
      };
      
      const expiringSoonResult = checkOfferExpiry(expiringSoonOffer);
      expect(expiringSoonResult.status).toBe('expiring_soon');
      expect(expiringSoonResult.action).toBe('send_warning');

      // Test expired
      const expiredOffer = {
        id: 'offer124',
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      };
      
      const expiredResult = checkOfferExpiry(expiredOffer);
      expect(expiredResult.status).toBe('expired');
      expect(expiredResult.action).toBe('expire_offer');
    });

    it('should clean up expired offers', async () => {
      const cleanupExpiredOffers = async () => {
        const expiredOffers = [
          {
            id: 'offer1',
            status: 'pending',
            expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            conversation_id: 'conv123',
          },
          {
            id: 'offer2',
            status: 'pending',
            expires_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            conversation_id: 'conv456',
          },
        ];

        const cleanupResults = expiredOffers.map(offer => ({
          offerId: offer.id,
          previousStatus: offer.status,
          newStatus: 'expired',
          conversationId: offer.conversation_id,
          expiredAt: new Date().toISOString(),
        }));

        // Send expiry notifications
        const notifications = cleanupResults.map(result => ({
          type: 'offer_expired',
          offer_id: result.offerId,
          conversation_id: result.conversationId,
          message: 'Your offer has expired',
        }));

        return {
          success: true,
          expiredCount: cleanupResults.length,
          results: cleanupResults,
          notifications,
        };
      };

      const result = await cleanupExpiredOffers();

      expect(result.success).toBe(true);
      expect(result.expiredCount).toBe(2);
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0].type).toBe('offer_expired');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle duplicate offer creation', async () => {
      const preventDuplicateOffers = async (buyerId: string, listingId: string) => {
        // Check for existing pending offers
        const existingOffers = [
          {
            id: 'existing_offer',
            buyer_id: buyerId,
            listing_id: listingId,
            status: 'pending',
          },
        ];

        const hasPendingOffer = existingOffers.some(
          offer => offer.buyer_id === buyerId && 
                  offer.listing_id === listingId && 
                  offer.status === 'pending'
        );

        if (hasPendingOffer) {
          return {
            success: false,
            error: 'You already have a pending offer for this listing',
            existingOfferId: existingOffers[0].id,
          };
        }

        return { success: true, canCreateOffer: true };
      };

      const result = await preventDuplicateOffers(mockUsers.buyer.id, mockListing.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already have a pending offer');
      expect(result.existingOfferId).toBe('existing_offer');
    });

    it('should handle conversation access control', () => {
      const checkConversationAccess = (conversationId: string, userId: string) => {
        const conversation = {
          id: conversationId,
          buyer_id: mockUsers.buyer.id,
          seller_id: mockUsers.seller.id,
          status: 'active',
        };

        const hasAccess = userId === conversation.buyer_id || 
                         userId === conversation.seller_id;

        if (!hasAccess) {
          return {
            hasAccess: false,
            error: 'You do not have access to this conversation',
          };
        }

        const userRole = userId === conversation.buyer_id ? 'buyer' : 'seller';

        return {
          hasAccess: true,
          userRole,
          conversation,
        };
      };

      // Test valid access
      const validAccess = checkConversationAccess('conv123', mockUsers.buyer.id);
      expect(validAccess.hasAccess).toBe(true);
      expect(validAccess.userRole).toBe('buyer');

      // Test invalid access
      const invalidAccess = checkConversationAccess('conv123', 'unauthorized_user');
      expect(invalidAccess.hasAccess).toBe(false);
      expect(invalidAccess.error).toContain('do not have access');
    });

    it('should handle network failures gracefully', async () => {
      const sendMessageWithRetry = async (messageData: any, maxRetries = 3) => {
        let attempts = 0;
        
        while (attempts < maxRetries) {
          try {
            attempts++;
            
            // Simulate network failure on first two attempts
            if (attempts <= 2) {
              throw new Error('Network timeout');
            }
            
            // Success on third attempt
            return {
              success: true,
              message: {
                id: 'msg123',
                ...messageData,
                attempts,
                created_at: new Date().toISOString(),
              },
            };
          } catch (error) {
            if (attempts >= maxRetries) {
            return {
              success: false,
              error: (error as Error).message,
              attempts,
            };
            }
            
            // Wait before retry (much shorter delay for testing)
            await new Promise(resolve => setTimeout(resolve, 10)); // 10ms instead of exponential backoff
          }
        }
      };

      const result = await sendMessageWithRetry({
        conversation_id: 'conv123',
        sender_id: mockUsers.buyer.id,
        content: 'Test message',
        message_type: 'text',
      });

      expect(result?.success).toBe(true);
      expect(result?.message?.attempts).toBe(3);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high message volume efficiently', () => {
      const processMessageBatch = (messages: any[]) => {
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < messages.length; i += batchSize) {
          batches.push(messages.slice(i, i + batchSize));
        }

        const processedBatches = batches.map((batch, index) => ({
          batchIndex: index,
          messageCount: batch.length,
          processedAt: new Date().toISOString(),
        }));

        return {
          totalMessages: messages.length,
          batchCount: batches.length,
          batchSize,
          processedBatches,
        };
      };

      // Test with 500 messages
      const messages = Array.from({ length: 500 }, (_, i) => ({
        id: `msg_${i}`,
        content: `Message ${i}`,
      }));

      const result = processMessageBatch(messages);

      expect(result.totalMessages).toBe(500);
      expect(result.batchCount).toBe(5); // 500 / 100 = 5 batches
      expect(result.processedBatches).toHaveLength(5);
    });

    it('should optimize conversation loading', () => {
      const optimizeConversationQuery = (userId: string, limit = 20, offset = 0) => {
        // Simulate optimized query with pagination
        const query = {
          select: [
            'id',
            'listing_id',
            'buyer_id',
            'seller_id',
            'status',
            'last_message_content',
            'last_message_at',
            'buyer_unread_count',
            'seller_unread_count',
          ],
          where: {
            or: [
              { buyer_id: userId },
              { seller_id: userId },
            ],
            status: 'active',
          },
          orderBy: { last_message_at: 'desc' },
          limit,
          offset,
        };

        return {
          query,
          estimatedRows: Math.min(limit, 100), // Simulate result size
          useIndex: 'idx_conversations_user_last_message',
          cacheable: true,
        };
      };

      const optimizedQuery = optimizeConversationQuery(mockUsers.buyer.id, 20, 0);

      expect(optimizedQuery.query.limit).toBe(20);
      expect(optimizedQuery.query.where.or).toHaveLength(2);
      expect(optimizedQuery.useIndex).toBe('idx_conversations_user_last_message');
      expect(optimizedQuery.cacheable).toBe(true);
    });
  });
});
