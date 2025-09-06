// Offer Business Logic Tests
describe('Offer Business Logic', () => {
  describe('Offer Validation', () => {
    it('should validate offer amount', () => {
      const validateOfferAmount = (amount: number, listingPrice: number) => {
        if (amount <= 0) {
          return { valid: false, error: 'Offer amount must be positive' };
        }
        if (amount > listingPrice * 2) {
          return { valid: false, error: 'Offer amount too high' };
        }
        return { valid: true };
      };

      // Test negative amount
      expect(validateOfferAmount(-10, 100)).toEqual({
        valid: false,
        error: 'Offer amount must be positive',
      });

      // Test zero amount
      expect(validateOfferAmount(0, 100)).toEqual({
        valid: false,
        error: 'Offer amount must be positive',
      });

      // Test excessive amount
      expect(validateOfferAmount(250, 100)).toEqual({
        valid: false,
        error: 'Offer amount too high',
      });

      // Test valid amount
      expect(validateOfferAmount(80, 100)).toEqual({ valid: true });
    });

    it('should set correct expiry time', () => {
      const createOfferWithExpiry = (daysFromNow: number = 3) => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysFromNow);
        
        return {
          expires_at: expiryDate.toISOString(),
          created_at: new Date().toISOString(),
        };
      };

      const offer = createOfferWithExpiry(3);
      const expiryTime = new Date(offer.expires_at).getTime();
      const createdTime = new Date(offer.created_at).getTime();
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

      expect(expiryTime - createdTime).toBeCloseTo(threeDaysInMs, -5); // Within 100ms
    });
  });

  describe('Offer State Management', () => {
    it('should validate state transitions', () => {
      const validTransitions: Record<string, string[]> = {
        'pending': ['accepted', 'rejected', 'countered', 'expired', 'withdrawn'],
        'accepted': [], // Terminal state
        'rejected': [], // Terminal state
        'countered': [], // Terminal state (replaced by new offer)
        'expired': [], // Terminal state
        'withdrawn': [], // Terminal state
      };

      const canTransition = (from: string, to: string) => {
        return validTransitions[from]?.includes(to) || false;
      };

      // Valid transitions
      expect(canTransition('pending', 'accepted')).toBe(true);
      expect(canTransition('pending', 'rejected')).toBe(true);
      expect(canTransition('pending', 'countered')).toBe(true);

      // Invalid transitions
      expect(canTransition('accepted', 'rejected')).toBe(false);
      expect(canTransition('rejected', 'accepted')).toBe(false);
      expect(canTransition('expired', 'pending')).toBe(false);
    });

    it('should handle offer acceptance logic', () => {
      const processOfferAcceptance = (offer: any) => {
        // Check if offer can be accepted
        if (offer.status !== 'pending') {
          return { success: false, error: 'Offer is not pending' };
        }

        if (new Date(offer.expires_at) < new Date()) {
          return { success: false, error: 'Offer has expired' };
        }

        if (offer.listing.status !== 'active') {
          return { success: false, error: 'Listing is no longer available' };
        }

        // Accept offer
        const acceptedOffer = {
          ...offer,
          status: 'accepted',
          responded_at: new Date().toISOString(),
        };

        // Create reservation
        const reservation = {
          id: 'res123',
          listing_id: offer.listing_id,
          buyer_id: offer.buyer_id,
          offer_id: offer.id,
          reserved_price: offer.amount,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          status: 'active',
        };

        return {
          success: true,
          offer: acceptedOffer,
          reservation,
        };
      };

      // Test valid acceptance
      const validOffer = {
        id: 'offer123',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        listing: { status: 'active' },
        listing_id: 'listing123',
        buyer_id: 'buyer123',
        amount: 150,
      };

      const result = processOfferAcceptance(validOffer);
      expect(result.success).toBe(true);
      expect(result.offer?.status).toBe('accepted');
      expect(result.reservation?.reserved_price).toBe(150);

      // Test expired offer
      const expiredOffer = {
        ...validOffer,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      };

      const expiredResult = processOfferAcceptance(expiredOffer);
      expect(expiredResult.success).toBe(false);
      expect(expiredResult.error).toBe('Offer has expired');
    });

    it('should handle offer rejection logic', () => {
      const processOfferRejection = (offer: any, rejectionData: any) => {
        if (offer.status !== 'pending') {
          return { success: false, error: 'Offer is not pending' };
        }

        const rejectedOffer = {
          ...offer,
          status: 'rejected',
          rejection_reason: rejectionData.reason,
          response_message: rejectionData.message,
          responded_at: new Date().toISOString(),
        };

        return { success: true, offer: rejectedOffer };
      };

      const offer = {
        id: 'offer123',
        status: 'pending',
        amount: 100,
      };

      const result = processOfferRejection(offer, {
        reason: 'price_too_low',
        message: 'Sorry, the offer is too low.',
      });

      expect(result.success).toBe(true);
      expect(result.offer.status).toBe('rejected');
      expect(result.offer.rejection_reason).toBe('price_too_low');
    });
  });

  describe('Counter Offer Logic', () => {
    it('should create counter offer chain', () => {
      const createCounterOffer = (originalOffer: any, counterData: any) => {
        const counterOffer = {
          id: 'counter_offer123',
          listing_id: originalOffer.listing_id,
          buyer_id: originalOffer.buyer_id,
          seller_id: originalOffer.seller_id,
          amount: counterData.amount,
          message: counterData.message,
          parent_offer_id: originalOffer.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const updatedOriginalOffer = {
          ...originalOffer,
          status: 'countered',
        };

        return {
          success: true,
          originalOffer: updatedOriginalOffer,
          counterOffer,
        };
      };

      const originalOffer = {
        id: 'offer123',
        listing_id: 'listing123',
        buyer_id: 'buyer123',
        seller_id: 'seller123',
        amount: 100,
        status: 'pending',
      };

      const result = createCounterOffer(originalOffer, {
        amount: 120,
        message: 'How about this price?',
      });

      expect(result.success).toBe(true);
      expect(result.originalOffer.status).toBe('countered');
      expect(result.counterOffer.amount).toBe(120);
      expect(result.counterOffer.parent_offer_id).toBe('offer123');
    });

    it('should track counter offer chain', () => {
      const offerChain = [
        { id: 'offer1', amount: 100, parent_offer_id: null, created_by: 'buyer' },
        { id: 'offer2', amount: 120, parent_offer_id: 'offer1', created_by: 'seller' },
        { id: 'offer3', amount: 110, parent_offer_id: 'offer2', created_by: 'buyer' },
      ];

      const getOfferChain = (offerId: string, offers: any[]) => {
        const chain = [];
        let currentOffer = offers.find(o => o.id === offerId);
        
        while (currentOffer) {
          chain.unshift(currentOffer);
          currentOffer = offers.find(o => o.id === currentOffer.parent_offer_id);
        }
        
        return chain;
      };

      const chain = getOfferChain('offer3', offerChain);
      
      expect(chain).toHaveLength(3);
      expect(chain[0].id).toBe('offer1'); // Original offer
      expect(chain[2].id).toBe('offer3'); // Latest counter
    });

    it('should limit counter offer rounds', () => {
      const maxCounterOffers = 5;
      
      const canCreateCounterOffer = (chainLength: number) => {
        return chainLength < maxCounterOffers;
      };

      expect(canCreateCounterOffer(3)).toBe(true);
      expect(canCreateCounterOffer(5)).toBe(false);
      expect(canCreateCounterOffer(6)).toBe(false);
    });
  });

  describe('Offer Expiry Logic', () => {
    it('should calculate time remaining', () => {
      const calculateTimeRemaining = (expiresAt: string) => {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const remaining = expiry - now;

        if (remaining <= 0) {
          return { expired: true, timeLeft: 0 };
        }

        const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

        return { expired: false, days, hours, minutes, timeLeft: remaining };
      };

      // Test future expiry
      const futureExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days
      const futureResult = calculateTimeRemaining(futureExpiry);
      
      expect(futureResult.expired).toBe(false);
      expect(futureResult.days).toBeGreaterThanOrEqual(1); // Approximately 2 days (allowing for rounding)

      // Test past expiry
      const pastExpiry = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
      const pastResult = calculateTimeRemaining(pastExpiry);
      
      expect(pastResult.expired).toBe(true);
      expect(pastResult.timeLeft).toBe(0);
    });

    it('should identify expired offers', () => {
      const findExpiredOffers = (offers: any[]) => {
        const now = new Date();
        return offers.filter(offer => 
          offer.status === 'pending' && 
          new Date(offer.expires_at) < now
        );
      };

      const offers = [
        {
          id: 'offer1',
          status: 'pending',
          expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Expired
        },
        {
          id: 'offer2',
          status: 'pending',
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Not expired
        },
        {
          id: 'offer3',
          status: 'accepted',
          expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Expired but accepted
        },
      ];

      const expiredOffers = findExpiredOffers(offers);
      
      expect(expiredOffers).toHaveLength(1);
      expect(expiredOffers[0].id).toBe('offer1');
    });

    it('should send expiry warnings', () => {
      const shouldSendExpiryWarning = (expiresAt: string, lastWarningSent?: string) => {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const remaining = expiry - now;
        
        // Send warning if less than 24 hours remaining
        const warningThreshold = 24 * 60 * 60 * 1000; // 24 hours
        
        if (remaining > warningThreshold) {
          return false; // Too early for warning
        }
        
        if (remaining <= 0) {
          return false; // Already expired
        }
        
        // Check if warning already sent recently (within last 6 hours)
        if (lastWarningSent) {
          const lastWarning = new Date(lastWarningSent).getTime();
          const warningCooldown = 6 * 60 * 60 * 1000; // 6 hours
          
          if (now - lastWarning < warningCooldown) {
            return false; // Warning sent recently
          }
        }
        
        return true;
      };

      // Test early warning (2 days remaining)
      const earlyExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(shouldSendExpiryWarning(earlyExpiry)).toBe(false);

      // Test warning time (12 hours remaining)
      const warningExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      expect(shouldSendExpiryWarning(warningExpiry)).toBe(true);

      // Test recent warning sent
      const recentWarning = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3 hours ago
      expect(shouldSendExpiryWarning(warningExpiry, recentWarning)).toBe(false);
    });
  });

  describe('Offer Withdrawal Logic', () => {
    it('should allow buyer to withdraw pending offer', () => {
      const withdrawOffer = (offer: any, userId: string) => {
        if (offer.buyer_id !== userId) {
          return { success: false, error: 'Only buyer can withdraw offer' };
        }

        if (offer.status !== 'pending') {
          return { success: false, error: 'Can only withdraw pending offers' };
        }

        const withdrawnOffer = {
          ...offer,
          status: 'withdrawn',
          withdrawn_at: new Date().toISOString(),
        };

        return { success: true, offer: withdrawnOffer };
      };

      const offer = {
        id: 'offer123',
        buyer_id: 'buyer123',
        status: 'pending',
      };

      // Test successful withdrawal
      const result = withdrawOffer(offer, 'buyer123');
      expect(result.success).toBe(true);
      expect(result.offer.status).toBe('withdrawn');

      // Test unauthorized withdrawal
      const unauthorizedResult = withdrawOffer(offer, 'other_user');
      expect(unauthorizedResult.success).toBe(false);
      expect(unauthorizedResult.error).toBe('Only buyer can withdraw offer');

      // Test withdrawal of non-pending offer
      const acceptedOffer = { ...offer, status: 'accepted' };
      const nonPendingResult = withdrawOffer(acceptedOffer, 'buyer123');
      expect(nonPendingResult.success).toBe(false);
      expect(nonPendingResult.error).toBe('Can only withdraw pending offers');
    });
  });

  describe('Offer Economics', () => {
    it('should calculate offer attractiveness', () => {
      const calculateOfferAttractiveness = (offerAmount: number, listingPrice: number) => {
        const percentage = (offerAmount / listingPrice) * 100;
        
        if (percentage >= 95) return { level: 'excellent', color: 'green' };
        if (percentage >= 85) return { level: 'good', color: 'blue' };
        if (percentage >= 70) return { level: 'fair', color: 'orange' };
        return { level: 'low', color: 'red' };
      };

      expect(calculateOfferAttractiveness(196, 200)).toEqual({
        level: 'excellent',
        color: 'green',
      });

      expect(calculateOfferAttractiveness(180, 200)).toEqual({
        level: 'good',
        color: 'blue',
      });

      expect(calculateOfferAttractiveness(150, 200)).toEqual({
        level: 'fair',
        color: 'orange',
      });

      expect(calculateOfferAttractiveness(100, 200)).toEqual({
        level: 'low',
        color: 'red',
      });
    });

    it('should suggest reasonable counter offers', () => {
      const suggestCounterOffers = (
        originalAmount: number,
        listingPrice: number,
        userRole: 'buyer' | 'seller'
      ) => {
        const suggestions = [];

        if (userRole === 'seller') {
          // Seller suggestions: increase offer
          const midpoint = Math.round((originalAmount + listingPrice) / 2);
          const conservative = Math.round(originalAmount * 1.1);
          const aggressive = Math.round(originalAmount * 1.25);

          suggestions.push(
            { amount: conservative, label: 'Conservative (+10%)', type: 'conservative' },
            { amount: midpoint, label: 'Meet in middle', type: 'moderate' },
            { amount: Math.min(aggressive, listingPrice), label: 'Firm', type: 'aggressive' }
          );
        } else {
          // Buyer suggestions: decrease offer or slight increase
          const conservative = Math.round(originalAmount * 0.9);
          const moderate = Math.round(originalAmount * 1.05);
          const aggressive = Math.round(originalAmount * 1.15);

          suggestions.push(
            { amount: conservative, label: 'Lower (-10%)', type: 'conservative' },
            { amount: moderate, label: 'Slight increase (+5%)', type: 'moderate' },
            { amount: Math.min(aggressive, listingPrice), label: 'Higher (+15%)', type: 'aggressive' }
          );
        }

        return suggestions.filter(s => s.amount > 0 && s.amount <= listingPrice);
      };

      // Test seller suggestions
      const sellerSuggestions = suggestCounterOffers(100, 150, 'seller');
      expect(sellerSuggestions).toHaveLength(3);
      expect(sellerSuggestions[0].amount).toBe(110); // Conservative
      expect(sellerSuggestions[1].amount).toBe(125); // Midpoint

      // Test buyer suggestions
      const buyerSuggestions = suggestCounterOffers(100, 150, 'buyer');
      expect(buyerSuggestions).toHaveLength(3);
      expect(buyerSuggestions[0].amount).toBe(90);  // Conservative
      expect(buyerSuggestions[1].amount).toBe(105); // Moderate
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle duplicate offer prevention', () => {
      const checkDuplicateOffer = (buyerId: string, listingId: string, existingOffers: any[]) => {
        const hasPendingOffer = existingOffers.some(
          offer => offer.buyer_id === buyerId && 
                  offer.listing_id === listingId && 
                  offer.status === 'pending'
        );

        if (hasPendingOffer) {
          return {
            canCreate: false,
            error: 'You already have a pending offer for this listing',
          };
        }

        return { canCreate: true };
      };

      const existingOffers = [
        {
          buyer_id: 'buyer123',
          listing_id: 'listing123',
          status: 'pending',
        },
      ];

      const result = checkDuplicateOffer('buyer123', 'listing123', existingOffers);
      expect(result.canCreate).toBe(false);
      expect(result.error).toContain('already have a pending offer');

      // Test with no existing offers
      const noOffersResult = checkDuplicateOffer('buyer123', 'listing456', []);
      expect(noOffersResult.canCreate).toBe(true);
    });

    it('should handle offer amount validation edge cases', () => {
      const validateOfferAmount = (amount: number, listingPrice: number) => {
        const errors = [];

        if (typeof amount !== 'number' || isNaN(amount)) {
          errors.push('Amount must be a valid number');
        }

        if (amount <= 0) {
          errors.push('Amount must be positive');
        }

        if (amount > listingPrice * 2) {
          errors.push('Amount cannot exceed 200% of listing price');
        }

        // Check for reasonable minimum
        if (amount < listingPrice * 0.1) {
          errors.push('Amount too low (less than 10% of listing price)');
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      };

      // Test invalid number
      expect(validateOfferAmount(NaN, 100)).toEqual({
        valid: false,
        errors: ['Amount must be a valid number'],
      });

      // Test very low amount
      expect(validateOfferAmount(5, 100)).toEqual({
        valid: false,
        errors: ['Amount too low (less than 10% of listing price)'],
      });

      // Test valid amount
      expect(validateOfferAmount(80, 100)).toEqual({
        valid: true,
        errors: [],
      });
    });
  });
});
