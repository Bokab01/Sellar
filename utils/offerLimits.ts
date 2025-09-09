import { supabase } from '@/lib/supabase';

export interface OfferLimitResult {
  canMakeOffer: boolean;
  totalOffers: number;
  remainingOffers: number;
  limitReached: boolean;
  reason?: string;
}

export const OFFER_LIMIT = 3;

/**
 * Check if a user can make an offer for a specific listing
 * Users have a maximum of 3 offer attempts per listing
 */
export async function checkOfferLimit(
  userId: string, 
  listingId: string
): Promise<OfferLimitResult> {
  try {
    // Get all offers made by this user for this listing
    const { data: offers, error } = await supabase
      .from('offers')
      .select('id, status, created_at')
      .eq('buyer_id', userId)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking offer limit:', error);
      // On error, allow the offer but log the issue
      return {
        canMakeOffer: true,
        totalOffers: 0,
        remainingOffers: OFFER_LIMIT,
        limitReached: false,
        reason: 'Could not verify offer limit'
      };
    }

    const totalOffers = offers?.length || 0;
    const remainingOffers = Math.max(0, OFFER_LIMIT - totalOffers);
    const limitReached = totalOffers >= OFFER_LIMIT;

    // Check if user has a pending offer (should wait for response)
    const pendingOffer = offers?.find(offer => offer.status === 'pending');
    
    if (pendingOffer) {
      return {
        canMakeOffer: false,
        totalOffers,
        remainingOffers,
        limitReached,
        reason: 'You have a pending offer. Please wait for the seller\'s response.'
      };
    }

    if (limitReached) {
      return {
        canMakeOffer: false,
        totalOffers,
        remainingOffers: 0,
        limitReached: true,
        reason: `You have reached the maximum of ${OFFER_LIMIT} offer attempts for this listing. Please contact the seller directly.`
      };
    }

    return {
      canMakeOffer: true,
      totalOffers,
      remainingOffers,
      limitReached: false
    };

  } catch (error) {
    console.error('Exception checking offer limit:', error);
    // On exception, allow the offer but log the issue
    return {
      canMakeOffer: true,
      totalOffers: 0,
      remainingOffers: OFFER_LIMIT,
      limitReached: false,
      reason: 'Could not verify offer limit'
    };
  }
}

/**
 * Get offer limit status from existing messages (for chat screen)
 * This is used when we already have messages loaded to avoid extra API calls
 */
export function getOfferLimitFromMessages(
  messages: any[],
  userId: string
): OfferLimitResult {
  try {
    // Extract all offers made by this user from messages
    const userOffers = messages
      .flatMap((msg: any) => msg.offers || [])
      .filter((offer: any) => offer.buyer_id === userId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalOffers = userOffers.length;
    const remainingOffers = Math.max(0, OFFER_LIMIT - totalOffers);
    const limitReached = totalOffers >= OFFER_LIMIT;

    // Check if user has a pending offer
    const pendingOffer = userOffers.find((offer: any) => offer.status === 'pending');
    
    if (pendingOffer) {
      return {
        canMakeOffer: false,
        totalOffers,
        remainingOffers,
        limitReached,
        reason: 'You have a pending offer. Please wait for the seller\'s response.'
      };
    }

    if (limitReached) {
      return {
        canMakeOffer: false,
        totalOffers,
        remainingOffers: 0,
        limitReached: true,
        reason: `You have reached the maximum of ${OFFER_LIMIT} offer attempts for this listing. Please contact the seller directly.`
      };
    }

    return {
      canMakeOffer: true,
      totalOffers,
      remainingOffers,
      limitReached: false
    };

  } catch (error) {
    console.error('Exception getting offer limit from messages:', error);
    return {
      canMakeOffer: true,
      totalOffers: 0,
      remainingOffers: OFFER_LIMIT,
      limitReached: false,
      reason: 'Could not verify offer limit'
    };
  }
}
