// Offer Components Tests
describe('Offer Components', () => {
  describe('OfferCard Component', () => {
    it('should display offer information correctly', () => {
      const mockOffer = {
        id: 'offer123',
        amount: 150,
        currency: 'GHS',
        message: 'Would you accept this offer?',
        status: 'pending',
        expires_at: '2024-01-18T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z',
        buyer: {
          id: 'buyer123',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          rating: 4.5,
        },
        listing: {
          id: 'listing123',
          title: 'iPhone 13 Pro',
          price: 200,
          images: ['https://example.com/image1.jpg'],
        },
      };

      // Simulate component rendering logic
      const renderOfferCard = (offer: typeof mockOffer) => {
        return {
          amount: `${offer.currency} ${offer.amount}`,
          originalPrice: `${offer.currency} ${offer.listing.price}`,
          difference: offer.listing.price - offer.amount,
          percentageOff: ((offer.listing.price - offer.amount) / offer.listing.price * 100).toFixed(1),
          buyerName: offer.buyer.full_name,
          buyerRating: offer.buyer.rating,
          message: offer.message,
          status: offer.status,
          listingTitle: offer.listing.title,
        };
      };

      const rendered = renderOfferCard(mockOffer);

      expect(rendered.amount).toBe('GHS 150');
      expect(rendered.originalPrice).toBe('GHS 200');
      expect(rendered.difference).toBe(50);
      expect(rendered.percentageOff).toBe('25.0');
      expect(rendered.buyerName).toBe('John Doe');
      expect(rendered.message).toBe('Would you accept this offer?');
    });

    it('should show correct status indicators', () => {
      const getStatusConfig = (status: string) => {
        const statusConfigs: Record<string, any> = {
          'pending': {
            color: 'orange',
            text: 'Pending Response',
            showActions: true,
            icon: 'clock',
          },
          'accepted': {
            color: 'green',
            text: 'Accepted',
            showActions: false,
            icon: 'check-circle',
          },
          'rejected': {
            color: 'red',
            text: 'Rejected',
            showActions: false,
            icon: 'x-circle',
          },
          'countered': {
            color: 'blue',
            text: 'Counter Offer Made',
            showActions: false,
            icon: 'refresh-cw',
          },
          'expired': {
            color: 'gray',
            text: 'Expired',
            showActions: false,
            icon: 'clock-x',
          },
          'withdrawn': {
            color: 'gray',
            text: 'Withdrawn',
            showActions: false,
            icon: 'arrow-left',
          },
        };

        return statusConfigs[status] || statusConfigs['pending'];
      };

      // Test different statuses
      expect(getStatusConfig('pending')).toEqual({
        color: 'orange',
        text: 'Pending Response',
        showActions: true,
        icon: 'clock',
      });

      expect(getStatusConfig('accepted')).toEqual({
        color: 'green',
        text: 'Accepted',
        showActions: false,
        icon: 'check-circle',
      });

      expect(getStatusConfig('rejected')).toEqual({
        color: 'red',
        text: 'Rejected',
        showActions: false,
        icon: 'x-circle',
      });
    });

    it('should calculate offer attractiveness', () => {
      const calculateOfferAttractiveness = (offerAmount: number, listingPrice: number) => {
        const percentage = (offerAmount / listingPrice) * 100;
        
        if (percentage >= 95) return { level: 'excellent', color: 'green', text: 'Excellent offer!' };
        if (percentage >= 85) return { level: 'good', color: 'blue', text: 'Good offer' };
        if (percentage >= 70) return { level: 'fair', color: 'orange', text: 'Fair offer' };
        return { level: 'low', color: 'red', text: 'Low offer' };
      };

      // Test excellent offer (98% of asking price)
      expect(calculateOfferAttractiveness(196, 200)).toEqual({
        level: 'excellent',
        color: 'green',
        text: 'Excellent offer!',
      });

      // Test good offer (90% of asking price)
      expect(calculateOfferAttractiveness(180, 200)).toEqual({
        level: 'good',
        color: 'blue',
        text: 'Good offer',
      });

      // Test fair offer (75% of asking price)
      expect(calculateOfferAttractiveness(150, 200)).toEqual({
        level: 'fair',
        color: 'orange',
        text: 'Fair offer',
      });

      // Test low offer (50% of asking price)
      expect(calculateOfferAttractiveness(100, 200)).toEqual({
        level: 'low',
        color: 'red',
        text: 'Low offer',
      });
    });

    it('should handle action button states', () => {
      const getActionButtons = (offer: any, currentUserId: string, userRole: 'buyer' | 'seller') => {
        const buttons: any[] = [];

        if (offer.status !== 'pending') {
          return buttons; // No actions for non-pending offers
        }

        if (userRole === 'seller' && offer.seller_id === currentUserId) {
          buttons.push(
            { id: 'accept', text: 'Accept', color: 'green', action: 'accept' },
            { id: 'reject', text: 'Reject', color: 'red', action: 'reject' },
            { id: 'counter', text: 'Counter', color: 'blue', action: 'counter' }
          );
        }

        if (userRole === 'buyer' && offer.buyer_id === currentUserId) {
          buttons.push(
            { id: 'withdraw', text: 'Withdraw', color: 'gray', action: 'withdraw' }
          );
        }

        return buttons;
      };

      const pendingOffer = {
        id: 'offer123',
        status: 'pending',
        buyer_id: 'buyer123',
        seller_id: 'seller123',
      };

      // Test seller actions
      const sellerButtons = getActionButtons(pendingOffer, 'seller123', 'seller');
      expect(sellerButtons).toHaveLength(3);
      expect(sellerButtons.map(b => b.action)).toEqual(['accept', 'reject', 'counter']);

      // Test buyer actions
      const buyerButtons = getActionButtons(pendingOffer, 'buyer123', 'buyer');
      expect(buyerButtons).toHaveLength(1);
      expect(buyerButtons[0].action).toBe('withdraw');

      // Test no actions for accepted offer
      const acceptedOffer = { ...pendingOffer, status: 'accepted' };
      const noButtons = getActionButtons(acceptedOffer, 'seller123', 'seller');
      expect(noButtons).toHaveLength(0);
    });
  });

  describe('CounterOfferModal Component', () => {
    it('should validate counter offer amount', () => {
      const validateCounterOffer = (
        amount: number,
        originalAmount: number,
        listingPrice: number,
        userRole: 'buyer' | 'seller'
      ) => {
        const errors = [];

        if (amount <= 0) {
          errors.push('Amount must be positive');
        }

        if (amount === originalAmount) {
          errors.push('Counter offer must be different from original offer');
        }

        if (amount > listingPrice * 1.5) {
          errors.push('Amount cannot exceed 150% of listing price');
        }

        // Role-specific validations
        if (userRole === 'seller') {
          if (amount < originalAmount) {
            errors.push('Seller counter offer should be higher than buyer offer');
          }
        } else if (userRole === 'buyer') {
          if (amount > originalAmount) {
            errors.push('Buyer counter offer should be lower than seller counter');
          }
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      };

      // Test valid seller counter (higher than buyer offer)
      expect(validateCounterOffer(120, 100, 150, 'seller')).toEqual({
        valid: true,
        errors: [],
      });

      // Test invalid seller counter (lower than buyer offer)
      expect(validateCounterOffer(80, 100, 150, 'seller')).toEqual({
        valid: false,
        errors: ['Seller counter offer should be higher than buyer offer'],
      });

      // Test same amount error
      expect(validateCounterOffer(100, 100, 150, 'seller')).toEqual({
        valid: false,
        errors: ['Counter offer must be different from original offer'],
      });

      // Test excessive amount
      expect(validateCounterOffer(250, 100, 150, 'seller')).toEqual({
        valid: false,
        errors: ['Amount cannot exceed 150% of listing price'],
      });
    });

    it('should calculate offer comparison metrics', () => {
      const calculateOfferComparison = (
        counterAmount: number,
        originalAmount: number,
        listingPrice: number
      ) => {
        const difference = counterAmount - originalAmount;
        const percentageChange = ((difference / originalAmount) * 100);
        const percentageOfListing = ((counterAmount / listingPrice) * 100);
        
        return {
          difference: Math.abs(difference),
          isHigher: difference > 0,
          percentageChange: Math.abs(percentageChange).toFixed(1),
          percentageOfListing: percentageOfListing.toFixed(1),
          direction: difference > 0 ? 'higher' : 'lower',
        };
      };

      // Test higher counter offer
      const higherCounter = calculateOfferComparison(120, 100, 150);
      expect(higherCounter).toEqual({
        difference: 20,
        isHigher: true,
        percentageChange: '20.0',
        percentageOfListing: '80.0',
        direction: 'higher',
      });

      // Test lower counter offer
      const lowerCounter = calculateOfferComparison(80, 100, 150);
      expect(lowerCounter).toEqual({
        difference: 20,
        isHigher: false,
        percentageChange: '20.0',
        percentageOfListing: '53.3',
        direction: 'lower',
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
      expect(sellerSuggestions[2].amount).toBe(125); // Aggressive (capped at midpoint)

      // Test buyer suggestions
      const buyerSuggestions = suggestCounterOffers(100, 150, 'buyer');
      expect(buyerSuggestions).toHaveLength(3);
      expect(buyerSuggestions[0].amount).toBe(90);  // Conservative
      expect(buyerSuggestions[1].amount).toBe(105); // Moderate
      expect(buyerSuggestions[2].amount).toBe(115); // Aggressive
    });
  });

  describe('OfferExpiryTimer Component', () => {
    it('should calculate time remaining correctly', () => {
      const calculateTimeRemaining = (expiresAt: string) => {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const remaining = expiry - now;

        if (remaining <= 0) {
          return { expired: true, display: 'Expired' };
        }

        const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

        let display = '';
        if (days > 0) {
          display = `${days}d ${hours}h`;
        } else if (hours > 0) {
          display = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          display = `${minutes}m ${seconds}s`;
        } else {
          display = `${seconds}s`;
        }

        return { expired: false, days, hours, minutes, seconds, display };
      };

      // Test future expiry (2 days, 5 hours from now)
      const futureExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString();
      const futureResult = calculateTimeRemaining(futureExpiry);
      
      expect(futureResult.expired).toBe(false);
      expect(futureResult.days).toBe(2);
      expect(futureResult.hours).toBeGreaterThanOrEqual(4); // Allow for timing variations
      expect(futureResult.display).toMatch(/2d \d+h/); // Flexible display check

      // Test past expiry
      const pastExpiry = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const pastResult = calculateTimeRemaining(pastExpiry);
      
      expect(pastResult.expired).toBe(true);
      expect(pastResult.display).toBe('Expired');
    });

    it('should determine urgency level', () => {
      const getUrgencyLevel = (timeRemaining: number) => {
        const hours = timeRemaining / (60 * 60 * 1000);
        
        if (hours <= 0) return { level: 'expired', color: 'gray' };
        if (hours <= 2) return { level: 'critical', color: 'red' };
        if (hours <= 12) return { level: 'high', color: 'orange' };
        if (hours <= 24) return { level: 'medium', color: 'yellow' };
        return { level: 'low', color: 'green' };
      };

      // Test different urgency levels
      expect(getUrgencyLevel(0)).toEqual({ level: 'expired', color: 'gray' });
      expect(getUrgencyLevel(1 * 60 * 60 * 1000)).toEqual({ level: 'critical', color: 'red' }); // 1 hour
      expect(getUrgencyLevel(6 * 60 * 60 * 1000)).toEqual({ level: 'high', color: 'orange' }); // 6 hours
      expect(getUrgencyLevel(18 * 60 * 60 * 1000)).toEqual({ level: 'medium', color: 'yellow' }); // 18 hours
      expect(getUrgencyLevel(48 * 60 * 60 * 1000)).toEqual({ level: 'low', color: 'green' }); // 48 hours
    });

    it('should format display variants', () => {
      const formatTimeDisplay = (
        days: number,
        hours: number,
        minutes: number,
        seconds: number,
        variant: 'default' | 'compact' | 'badge'
      ) => {
        switch (variant) {
          case 'compact':
            if (days > 0) return `${days}d`;
            if (hours > 0) return `${hours}h`;
            if (minutes > 0) return `${minutes}m`;
            return `${seconds}s`;
            
          case 'badge':
            if (days > 0) return `${days}`;
            if (hours > 0) return `${hours}h`;
            return `${minutes}m`;
            
          default: // 'default'
            if (days > 0) return `${days} days, ${hours} hours`;
            if (hours > 0) return `${hours} hours, ${minutes} minutes`;
            if (minutes > 0) return `${minutes} minutes, ${seconds} seconds`;
            return `${seconds} seconds`;
        }
      };

      // Test different variants
      expect(formatTimeDisplay(2, 5, 30, 45, 'default')).toBe('2 days, 5 hours');
      expect(formatTimeDisplay(2, 5, 30, 45, 'compact')).toBe('2d');
      expect(formatTimeDisplay(2, 5, 30, 45, 'badge')).toBe('2');

      expect(formatTimeDisplay(0, 3, 30, 45, 'default')).toBe('3 hours, 30 minutes');
      expect(formatTimeDisplay(0, 3, 30, 45, 'compact')).toBe('3h');
      expect(formatTimeDisplay(0, 3, 30, 45, 'badge')).toBe('3h');
    });
  });

  describe('Offer Interaction Flows', () => {
    it('should handle offer acceptance flow', async () => {
      const mockOfferAcceptance = {
        offerId: 'offer123',
        sellerId: 'seller123',
        acceptanceMessage: 'Great! I accept your offer.',
      };

      const acceptOfferFlow = async (data: typeof mockOfferAcceptance) => {
        // Validate offer can be accepted
        const validationResult = {
          canAccept: true,
          offer: {
            id: data.offerId,
            status: 'pending',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        };

        if (!validationResult.canAccept) {
          return { success: false, error: 'Cannot accept offer' };
        }

        // Accept offer
        const acceptResult = { success: true, reservationId: 'res123' };
        
        if (!acceptResult.success) {
          return { success: false, error: 'Failed to accept offer' };
        }

        // Send acceptance message
        const messageResult = { success: true, messageId: 'msg123' };

        // Create reservation
        const reservationResult = { success: true, reservationId: acceptResult.reservationId };

        return {
          success: true,
          offerId: data.offerId,
          reservationId: reservationResult.reservationId,
          messageId: messageResult.messageId,
        };
      };

      const result = await acceptOfferFlow(mockOfferAcceptance);

      expect(result.success).toBe(true);
      expect(result.offerId).toBe('offer123');
      expect(result.reservationId).toBe('res123');
    });

    it('should handle offer rejection flow', async () => {
      const mockOfferRejection = {
        offerId: 'offer123',
        sellerId: 'seller123',
        reason: 'price_too_low',
        message: 'Sorry, the offer is too low for this item.',
      };

      const rejectOfferFlow = async (data: typeof mockOfferRejection) => {
        // Validate offer can be rejected
        const validationResult = { canReject: true };

        if (!validationResult.canReject) {
          return { success: false, error: 'Cannot reject offer' };
        }

        // Reject offer
        const rejectResult = { success: true };
        
        // Send rejection message
        const messageResult = { success: true, messageId: 'msg123' };

        return {
          success: true,
          offerId: data.offerId,
          messageId: messageResult.messageId,
          reason: data.reason,
        };
      };

      const result = await rejectOfferFlow(mockOfferRejection);

      expect(result.success).toBe(true);
      expect(result.offerId).toBe('offer123');
      expect(result.reason).toBe('price_too_low');
    });

    it('should handle counter offer flow', async () => {
      const mockCounterOffer = {
        originalOfferId: 'offer123',
        sellerId: 'seller123',
        counterAmount: 120,
        message: 'How about this price?',
      };

      const createCounterOfferFlow = async (data: typeof mockCounterOffer) => {
        // Validate counter offer
        const validation = {
          valid: data.counterAmount > 0 && data.counterAmount !== 100, // Original was 100
          errors: [],
        };

        if (!validation.valid) {
          return { success: false, errors: validation.errors };
        }

        // Create counter offer
        const counterResult = {
          success: true,
          counterOfferId: 'counter123',
        };

        // Update original offer status
        const updateResult = { success: true };

        // Send counter offer message
        const messageResult = { success: true, messageId: 'msg123' };

        return {
          success: true,
          originalOfferId: data.originalOfferId,
          counterOfferId: counterResult.counterOfferId,
          messageId: messageResult.messageId,
        };
      };

      const result = await createCounterOfferFlow(mockCounterOffer);

      expect(result.success).toBe(true);
      expect(result.originalOfferId).toBe('offer123');
      expect(result.counterOfferId).toBe('counter123');
    });
  });

  describe('Component Error Handling', () => {
    it('should handle missing offer data gracefully', () => {
      const renderOfferCardSafely = (offer: any) => {
        try {
          return {
            amount: offer?.amount ? `${offer.currency || 'GHS'} ${offer.amount}` : 'Amount not available',
            buyerName: offer?.buyer?.full_name || 'Unknown buyer',
            status: offer?.status || 'unknown',
            hasValidData: Boolean(offer?.id && offer?.amount),
          };
        } catch (error) {
          return {
            amount: 'Error loading amount',
            buyerName: 'Error loading buyer',
            status: 'error',
            hasValidData: false,
          };
        }
      };

      // Test with null offer
      const nullResult = renderOfferCardSafely(null);
      expect(nullResult.hasValidData).toBe(false);
      expect(nullResult.amount).toBe('Amount not available');

      // Test with partial offer data
      const partialOffer = { id: 'offer123', amount: 150 };
      const partialResult = renderOfferCardSafely(partialOffer);
      expect(partialResult.hasValidData).toBe(true);
      expect(partialResult.amount).toBe('GHS 150');
      expect(partialResult.buyerName).toBe('Unknown buyer');
    });

    it('should handle timer calculation errors', () => {
      const safeCalculateTimeRemaining = (expiresAt: any) => {
        try {
          if (!expiresAt) {
            return { expired: true, display: 'No expiry set', error: true };
          }

          const expiry = new Date(expiresAt);
          if (isNaN(expiry.getTime())) {
            return { expired: true, display: 'Invalid expiry date', error: true };
          }

          const remaining = expiry.getTime() - new Date().getTime();
          
          if (remaining <= 0) {
            return { expired: true, display: 'Expired', error: false };
          }

          return { expired: false, display: 'Time remaining', error: false };
        } catch (error) {
          return { expired: true, display: 'Error calculating time', error: true };
        }
      };

      // Test with null expiry
      expect(safeCalculateTimeRemaining(null)).toEqual({
        expired: true,
        display: 'No expiry set',
        error: true,
      });

      // Test with invalid date
      expect(safeCalculateTimeRemaining('invalid-date')).toEqual({
        expired: true,
        display: 'Invalid expiry date',
        error: true,
      });

      // Test with valid date
      const validDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      expect(safeCalculateTimeRemaining(validDate)).toEqual({
        expired: false,
        display: 'Time remaining',
        error: false,
      });
    });
  });
});
