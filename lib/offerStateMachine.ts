import { supabase } from './supabase';
import { notificationService } from './notificationService';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'withdrawn';

export interface OfferData {
  id: string;
  listingId: string;
  conversationId: string;
  messageId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  message?: string;
  status: OfferStatus;
  expiresAt: string;
  parentOfferId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferActionResult {
  success: boolean;
  error?: string;
  newOfferId?: string;
  reservationId?: string;
  notificationsSent?: number;
  requiresDeposit?: boolean;
  isProSeller?: boolean;
  depositDeadline?: string;
  message?: string;
}

export interface CounterOfferData {
  amount: number;
  message: string;
  parentOfferId: string;
}

export interface OfferRejectionData {
  reason?: string;
  message?: string;
}

class OfferStateMachine {
  /**
   * Accept an offer (Unified with deposit system)
   * - Regular sellers: Offer accepted, listing stays active
   * - Pro sellers with deposits: Buyer must pay deposit to reserve
   */
  async acceptOffer(
    offerId: string,
    sellerId: string,
    acceptanceMessage?: string
  ): Promise<OfferActionResult> {
    try {
      // Use new accept_offer_v2 RPC
      const { data, error } = await supabase.rpc('accept_offer_v2', {
        p_offer_id: offerId,
        p_seller_id: sellerId,
        p_acceptance_message: acceptanceMessage,
      });

      if (error) {
        console.error('Accept offer RPC error:', error);
        return { success: false, error: error.message || 'Failed to accept offer' };
      }

      // Log offer activity
      await this.logOfferActivity(offerId, 'accepted', sellerId, {
        acceptance_message: acceptanceMessage,
        requires_deposit: data.requires_deposit,
        is_pro_seller: data.is_pro_seller,
      });

      return {
        success: true,
        requiresDeposit: data.requires_deposit,
        isProSeller: data.is_pro_seller,
        depositDeadline: data.deposit_deadline,
        message: data.message,
      };
    } catch (error: any) {
      console.error('Accept offer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject an offer with optional reason
   */
  async rejectOffer(
    offerId: string,
    sellerId: string,
    rejectionData?: OfferRejectionData
  ): Promise<OfferActionResult> {
    try {
      const { data: offer, error: fetchError } = await supabase
        .from('offers')
        .select(`
          *,
          listings!inner(title)
        `)
        .eq('id', offerId)
        .eq('seller_id', sellerId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !offer) {
        return { success: false, error: 'Offer not found or already processed' };
      }

      // Update offer status to rejected
      const { error: updateError } = await supabase
        .from('offers')
        .update({
          status: 'rejected',
          response_message: rejectionData?.message,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (updateError) {
        return { success: false, error: 'Failed to reject offer' };
      }

      // Send notifications
      await this.sendOfferNotification(offerId, 'rejected', {
        buyerId: offer.buyer_id,
        sellerId: offer.seller_id,
        listingTitle: offer.listings.title,
        amount: offer.amount,
        currency: offer.currency,
        rejectionReason: rejectionData?.reason,
      });

      // Log offer activity
      await this.logOfferActivity(offerId, 'rejected', sellerId, {
        rejection_reason: rejectionData?.reason,
        rejection_message: rejectionData?.message,
      });

      return { success: true, notificationsSent: 1 };
    } catch (error: any) {
      console.error('Reject offer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a counter offer
   */
  async createCounterOffer(
    originalOfferId: string,
    sellerId: string,
    counterData: CounterOfferData
  ): Promise<OfferActionResult> {
    try {
      const { data: originalOffer, error: fetchError } = await supabase
        .from('offers')
        .select(`
          *,
          listings!inner(title, price, user_id),
          conversations!inner(id)
        `)
        .eq('id', originalOfferId)
        .eq('seller_id', sellerId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !originalOffer) {
        return { success: false, error: 'Original offer not found or already processed' };
      }

      // Validate counter offer amount
      if (counterData.amount >= originalOffer.listings.price) {
        return { success: false, error: 'Counter offer cannot exceed listing price' };
      }

      if (counterData.amount <= 0) {
        return { success: false, error: 'Counter offer must be greater than zero' };
      }

      // Create counter offer message first
      const counterContent = `💰 Counter Offer: GHS ${counterData.amount.toLocaleString()}${
        counterData.message ? `\n\n"${counterData.message}"` : ''
      }`;

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: originalOffer.conversation_id,
          sender_id: sellerId,
          content: counterContent,
          message_type: 'counter_offer',
          offer_data: {
            amount: counterData.amount,
            currency: originalOffer.currency,
            message: counterData.message,
            parent_offer_id: originalOfferId,
          },
        })
        .select('id')
        .single();

      if (messageError) {
        return { success: false, error: 'Failed to create counter offer message' };
      }

      // Create counter offer record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // 3 days expiry

      const { data: counterOffer, error: counterError } = await supabase
        .from('offers')
        .insert({
          listing_id: originalOffer.listing_id,
          conversation_id: originalOffer.conversation_id,
          message_id: message.id,
          buyer_id: originalOffer.buyer_id, // Counter offer is still from seller to buyer
          seller_id: sellerId,
          amount: counterData.amount,
          currency: originalOffer.currency,
          message: counterData.message,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          parent_offer_id: originalOfferId,
        })
        .select('id')
        .single();

      if (counterError) {
        return { success: false, error: 'Failed to create counter offer' };
      }

      // Update original offer status to countered
      await supabase
        .from('offers')
        .update({
          status: 'countered',
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', originalOfferId);

      // Send notifications
      await this.sendOfferNotification(counterOffer.id, 'countered', {
        buyerId: originalOffer.buyer_id,
        sellerId: sellerId,
        listingTitle: originalOffer.listings.title,
        amount: counterData.amount,
        currency: originalOffer.currency,
        originalAmount: originalOffer.amount,
      });

      // Log offer activity
      await this.logOfferActivity(counterOffer.id, 'counter_created', sellerId, {
        original_offer_id: originalOfferId,
        original_amount: originalOffer.amount,
        counter_amount: counterData.amount,
        counter_message: counterData.message,
      });

      return {
        success: true,
        newOfferId: counterOffer.id,
        notificationsSent: 1,
      };
    } catch (error: any) {
      console.error('Counter offer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Withdraw an offer (buyer action)
   */
  async withdrawOffer(offerId: string, buyerId: string): Promise<OfferActionResult> {
    try {
      const { data: offer, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .eq('buyer_id', buyerId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !offer) {
        return { success: false, error: 'Offer not found or cannot be withdrawn' };
      }

      // Update offer status to withdrawn
      const { error: updateError } = await supabase
        .from('offers')
        .update({
          status: 'withdrawn',
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (updateError) {
        return { success: false, error: 'Failed to withdraw offer' };
      }

      // Log offer activity
      await this.logOfferActivity(offerId, 'withdrawn', buyerId);

      return { success: true };
    } catch (error: any) {
      console.error('Withdraw offer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Expire an offer
   */
  async expireOffer(offerId: string): Promise<OfferActionResult> {
    try {
      const { error } = await supabase
        .from('offers')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .eq('status', 'pending');

      if (error) {
        return { success: false, error: 'Failed to expire offer' };
      }

      // Log offer activity
      await this.logOfferActivity(offerId, 'expired', null);

      return { success: true };
    } catch (error: any) {
      console.error('Expire offer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create listing reservation when offer is accepted
   */
  private async createListingReservation(
    listingId: string,
    buyerId: string,
    offerId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string; reservationId?: string }> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48-hour reservation

      const { data: reservation, error } = await supabase
        .from('listing_reservations')
        .insert({
          listing_id: listingId,
          buyer_id: buyerId,
          offer_id: offerId,
          reserved_amount: amount,
          expires_at: expiresAt.toISOString(),
          status: 'active',
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: 'Failed to create reservation' };
      }

      // Update listing status to reserved
      await supabase
        .from('listings')
        .update({
          status: 'reserved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId);

      return { success: true, reservationId: reservation.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject all competing offers when one is accepted
   */
  private async rejectCompetingOffers(listingId: string, acceptedOfferId: string): Promise<void> {
    try {
      await supabase
        .from('offers')
        .update({
          status: 'rejected',
          response_message: 'Another offer was accepted',
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('listing_id', listingId)
        .eq('status', 'pending')
        .neq('id', acceptedOfferId);
    } catch (error) {
      console.error('Failed to reject competing offers:', error);
    }
  }

  /**
   * Send offer-related notifications
   */
  private async sendOfferNotification(
    offerId: string,
    action: string,
    data: {
      buyerId: string;
      sellerId: string;
      listingTitle: string;
      amount: number;
      currency: string;
      originalAmount?: number;
      rejectionReason?: string;
    }
  ): Promise<void> {
    try {
      let recipientId: string;
      let offerType: 'new' | 'accepted' | 'rejected' | 'countered';

      switch (action) {
        case 'accepted':
          recipientId = data.buyerId;
          offerType = 'accepted';
          break;
        case 'rejected':
          recipientId = data.buyerId;
          offerType = 'rejected';
          break;
        case 'countered':
          recipientId = data.buyerId;
          offerType = 'countered';
          break;
        default:
          return;
      }

      await notificationService.sendOfferNotification(recipientId, offerType, {
        listingTitle: data.listingTitle,
        amount: data.amount,
        currency: data.currency,
        offerId,
        rejectionReason: data.rejectionReason,
      });
    } catch (error) {
      console.error('Failed to send offer notification:', error);
    }
  }

  /**
   * Log offer activity for analytics
   */
  private async logOfferActivity(
    offerId: string,
    action: string,
    userId: string | null,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('offer_activity_log').insert({
        offer_id: offerId,
        action,
        user_id: userId,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log offer activity:', error);
    }
  }

  /**
   * Get offer chain (original + counter offers)
   */
  async getOfferChain(offerId: string): Promise<OfferData[]> {
    try {
      // First, find the root offer
      const { data: offer } = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (!offer) return [];

      const rootOfferId = offer.parent_offer_id || offerId;

      // Get all offers in the chain
      const { data: chain } = await supabase
        .from('offers')
        .select('*')
        .or(`id.eq.${rootOfferId},parent_offer_id.eq.${rootOfferId}`)
        .order('created_at', { ascending: true });

      return chain || [];
    } catch (error) {
      console.error('Failed to get offer chain:', error);
      return [];
    }
  }

  /**
   * Get active offers for a listing
   */
  async getListingOffers(listingId: string, sellerId: string): Promise<OfferData[]> {
    try {
      const { data: offers } = await supabase
        .from('offers')
        .select(`
          *,
          profiles!buyer_id(first_name, last_name, avatar_url)
        `)
        .eq('listing_id', listingId)
        .eq('seller_id', sellerId)
        .in('status', ['pending', 'countered'])
        .order('created_at', { ascending: false });

      return offers || [];
    } catch (error) {
      console.error('Failed to get listing offers:', error);
      return [];
    }
  }
}

export const offerStateMachine = new OfferStateMachine();

// Helper functions for UI components
export async function acceptOfferById(
  offerId: string,
  sellerId: string,
  message?: string
): Promise<OfferActionResult> {
  return await offerStateMachine.acceptOffer(offerId, sellerId, message);
}

export async function rejectOfferById(
  offerId: string,
  sellerId: string,
  rejectionData?: OfferRejectionData
): Promise<OfferActionResult> {
  return await offerStateMachine.rejectOffer(offerId, sellerId, rejectionData);
}

export async function createCounterOfferFor(
  originalOfferId: string,
  sellerId: string,
  counterData: CounterOfferData
): Promise<OfferActionResult> {
  return await offerStateMachine.createCounterOffer(originalOfferId, sellerId, counterData);
}

export async function withdrawOfferById(
  offerId: string,
  buyerId: string
): Promise<OfferActionResult> {
  return await offerStateMachine.withdrawOffer(offerId, buyerId);
}

export async function getOfferChainById(offerId: string): Promise<OfferData[]> {
  return await offerStateMachine.getOfferChain(offerId);
}

export async function getOffersForListing(listingId: string, sellerId: string): Promise<OfferData[]> {
  return await offerStateMachine.getListingOffers(listingId, sellerId);
}
