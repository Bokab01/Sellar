import { supabase } from './supabase';

export type ReservationStatus = 'active' | 'completed' | 'expired' | 'cancelled';

export interface ListingReservation {
  id: string;
  listingId: string;
  buyerId: string;
  offerId: string;
  reservedAmount: number;
  status: ReservationStatus;
  expiresAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationResult {
  success: boolean;
  error?: string;
  reservationId?: string;
  expiresAt?: string;
}

export interface ReservationConflict {
  hasConflict: boolean;
  existingReservation?: ListingReservation;
  conflictType?: 'active' | 'recent';
}

class ListingReservationSystem {
  /**
   * Create a new listing reservation
   */
  async createReservation(
    listingId: string,
    buyerId: string,
    offerId: string,
    amount: number,
    durationHours: number = 48
  ): Promise<ReservationResult> {
    try {
      // Check for existing active reservations
      const conflictCheck = await this.checkReservationConflict(listingId);
      if (conflictCheck.hasConflict) {
        return { 
          success: false, 
          error: `Listing is already reserved until ${new Date(conflictCheck.existingReservation!.expiresAt).toLocaleString()}` 
        };
      }

      // Check if listing is still available
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, status, user_id')
        .eq('id', listingId)
        .eq('status', 'active')
        .single();

      if (listingError || !listing) {
        return { success: false, error: 'Listing is not available for reservation' };
      }

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      // Create reservation
      const { data: reservation, error: reservationError } = await supabase
        .from('listing_reservations')
        .insert({
          listing_id: listingId,
          buyer_id: buyerId,
          offer_id: offerId,
          reserved_amount: amount,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single();

      if (reservationError) {
        return { success: false, error: 'Failed to create reservation' };
      }

      // Update listing status to reserved
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          status: 'reserved',
          reserved_until: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId);

      if (updateError) {
        // Rollback reservation creation
        await supabase
          .from('listing_reservations')
          .delete()
          .eq('id', reservation.id);
        
        return { success: false, error: 'Failed to update listing status' };
      }

      // Send reservation notifications
      await this.sendReservationNotification(reservation.id, 'created', {
        buyerId,
        sellerId: listing.user_id,
        listingId,
        amount,
        expiresAt: expiresAt.toISOString(),
      });

      // Log reservation activity
      await this.logReservationActivity(reservation.id, 'created', buyerId, {
        listing_id: listingId,
        offer_id: offerId,
        amount,
        duration_hours: durationHours,
      });

      return {
        success: true,
        reservationId: reservation.id,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error: any) {
      console.error('Create reservation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete a reservation (when payment is made)
   */
  async completeReservation(
    reservationId: string,
    buyerId: string,
    paymentReference?: string
  ): Promise<ReservationResult> {
    try {
      const { data: reservation, error: fetchError } = await supabase
        .from('listing_reservations')
        .select(`
          *,
          listings!inner(id, user_id, title)
        `)
        .eq('id', reservationId)
        .eq('buyer_id', buyerId)
        .eq('status', 'active')
        .single();

      if (fetchError || !reservation) {
        return { success: false, error: 'Reservation not found or already processed' };
      }

      // Check if reservation has expired
      if (new Date(reservation.expires_at) < new Date()) {
        await this.expireReservation(reservationId);
        return { success: false, error: 'Reservation has expired' };
      }

      const now = new Date().toISOString();

      // Update reservation status to completed
      const { error: updateError } = await supabase
        .from('listing_reservations')
        .update({
          status: 'completed',
          completed_at: now,
          payment_reference: paymentReference,
          updated_at: now,
        })
        .eq('id', reservationId);

      if (updateError) {
        return { success: false, error: 'Failed to complete reservation' };
      }

      // Update listing status to sold
      await supabase
        .from('listings')
        .update({
          status: 'sold',
          sold_at: now,
          sold_to: buyerId,
          sold_amount: reservation.reserved_amount,
          updated_at: now,
        })
        .eq('id', reservation.listing_id);

      // Send completion notifications
      await this.sendReservationNotification(reservationId, 'completed', {
        buyerId,
        sellerId: reservation.listings.user_id,
        listingId: reservation.listing_id,
        listingTitle: reservation.listings.title,
        amount: reservation.reserved_amount,
      });

      // Log reservation activity
      await this.logReservationActivity(reservationId, 'completed', buyerId, {
        payment_reference: paymentReference,
        final_amount: reservation.reserved_amount,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Complete reservation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(
    reservationId: string,
    userId: string,
    reason?: string
  ): Promise<ReservationResult> {
    try {
      const { data: reservation, error: fetchError } = await supabase
        .from('listing_reservations')
        .select(`
          *,
          listings!inner(user_id)
        `)
        .eq('id', reservationId)
        .eq('status', 'active')
        .single();

      if (fetchError || !reservation) {
        return { success: false, error: 'Reservation not found or already processed' };
      }

      // Check if user has permission to cancel (buyer or seller)
      if (reservation.buyer_id !== userId && reservation.listings.user_id !== userId) {
        return { success: false, error: 'You do not have permission to cancel this reservation' };
      }

      const now = new Date().toISOString();

      // Update reservation status to cancelled
      const { error: updateError } = await supabase
        .from('listing_reservations')
        .update({
          status: 'cancelled',
          cancelled_at: now,
          cancellation_reason: reason,
          updated_at: now,
        })
        .eq('id', reservationId);

      if (updateError) {
        return { success: false, error: 'Failed to cancel reservation' };
      }

      // Restore listing to active status
      await supabase
        .from('listings')
        .update({
          status: 'active',
          reserved_until: null,
          updated_at: now,
        })
        .eq('id', reservation.listing_id);

      // Send cancellation notifications
      await this.sendReservationNotification(reservationId, 'cancelled', {
        buyerId: reservation.buyer_id,
        sellerId: reservation.listings.user_id,
        listingId: reservation.listing_id,
        amount: reservation.reserved_amount,
        cancelledBy: userId,
        reason,
      });

      // Log reservation activity
      await this.logReservationActivity(reservationId, 'cancelled', userId, {
        cancellation_reason: reason,
        cancelled_by: userId === reservation.buyer_id ? 'buyer' : 'seller',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Cancel reservation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Expire a reservation
   */
  async expireReservation(reservationId: string): Promise<ReservationResult> {
    try {
      const { data: reservation, error: fetchError } = await supabase
        .from('listing_reservations')
        .select('*')
        .eq('id', reservationId)
        .eq('status', 'active')
        .single();

      if (fetchError || !reservation) {
        return { success: false, error: 'Reservation not found or already processed' };
      }

      const now = new Date().toISOString();

      // Update reservation status to expired
      const { error: updateError } = await supabase
        .from('listing_reservations')
        .update({
          status: 'expired',
          updated_at: now,
        })
        .eq('id', reservationId);

      if (updateError) {
        return { success: false, error: 'Failed to expire reservation' };
      }

      // Restore listing to active status
      await supabase
        .from('listings')
        .update({
          status: 'active',
          reserved_until: null,
          updated_at: now,
        })
        .eq('id', reservation.listing_id);

      // Log reservation activity
      await this.logReservationActivity(reservationId, 'expired', null);

      return { success: true };
    } catch (error: any) {
      console.error('Expire reservation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for reservation conflicts
   */
  async checkReservationConflict(listingId: string): Promise<ReservationConflict> {
    try {
      // Check for active reservations
      const { data: activeReservation } = await supabase
        .from('listing_reservations')
        .select('*')
        .eq('listing_id', listingId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (activeReservation) {
        return {
          hasConflict: true,
          existingReservation: activeReservation,
          conflictType: 'active',
        };
      }

      // Check for recent reservations (within last hour)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: recentReservation } = await supabase
        .from('listing_reservations')
        .select('*')
        .eq('listing_id', listingId)
        .in('status', ['completed', 'cancelled'])
        .gte('updated_at', oneHourAgo.toISOString())
        .single();

      if (recentReservation) {
        return {
          hasConflict: true,
          existingReservation: recentReservation,
          conflictType: 'recent',
        };
      }

      return { hasConflict: false };
    } catch (error) {
      console.error('Check reservation conflict error:', error);
      return { hasConflict: false };
    }
  }

  /**
   * Get user's reservations
   */
  async getUserReservations(
    userId: string,
    type: 'buyer' | 'seller' = 'buyer',
    status?: ReservationStatus
  ): Promise<ListingReservation[]> {
    try {
      let query = supabase
        .from('listing_reservations')
        .select(`
          *,
          listings!inner(id, title, price, images, user_id),
          profiles!buyer_id(first_name, last_name, avatar_url)
        `);

      if (type === 'buyer') {
        query = query.eq('buyer_id', userId);
      } else {
        query = query.eq('listings.user_id', userId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: reservations } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      return reservations || [];
    } catch (error) {
      console.error('Get user reservations error:', error);
      return [];
    }
  }

  /**
   * Get reservation details
   */
  async getReservationDetails(reservationId: string): Promise<ListingReservation | null> {
    try {
      const { data: reservation } = await supabase
        .from('listing_reservations')
        .select(`
          *,
          listings!inner(*),
          profiles!buyer_id(first_name, last_name, avatar_url, phone),
          offers!inner(amount, message, created_at)
        `)
        .eq('id', reservationId)
        .single();

      return reservation;
    } catch (error) {
      console.error('Get reservation details error:', error);
      return null;
    }
  }

  /**
   * Extend reservation expiry
   */
  async extendReservation(
    reservationId: string,
    userId: string,
    additionalHours: number = 24
  ): Promise<ReservationResult> {
    try {
      const { data: reservation, error: fetchError } = await supabase
        .from('listing_reservations')
        .select(`
          *,
          listings!inner(user_id)
        `)
        .eq('id', reservationId)
        .eq('status', 'active')
        .single();

      if (fetchError || !reservation) {
        return { success: false, error: 'Reservation not found or already processed' };
      }

      // Only seller can extend reservations
      if (reservation.listings.user_id !== userId) {
        return { success: false, error: 'Only the seller can extend reservations' };
      }

      // Calculate new expiry time
      const currentExpiry = new Date(reservation.expires_at);
      const newExpiry = new Date(currentExpiry.getTime() + (additionalHours * 60 * 60 * 1000));

      // Update reservation expiry
      const { error: updateError } = await supabase
        .from('listing_reservations')
        .update({
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

      if (updateError) {
        return { success: false, error: 'Failed to extend reservation' };
      }

      // Update listing reserved_until
      await supabase
        .from('listings')
        .update({
          reserved_until: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservation.listing_id);

      // Log reservation activity
      await this.logReservationActivity(reservationId, 'extended', userId, {
        additional_hours: additionalHours,
        new_expiry: newExpiry.toISOString(),
      });

      return {
        success: true,
        expiresAt: newExpiry.toISOString(),
      };
    } catch (error: any) {
      console.error('Extend reservation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process expired reservations (background job)
   */
  async processExpiredReservations(): Promise<{ processed: number; errors: number }> {
    try {
      const now = new Date().toISOString();
      
      // Get expired active reservations
      const { data: expiredReservations } = await supabase
        .from('listing_reservations')
        .select('id')
        .eq('status', 'active')
        .lt('expires_at', now);

      let processed = 0;
      let errors = 0;

      for (const reservation of expiredReservations || []) {
        const result = await this.expireReservation(reservation.id);
        if (result.success) {
          processed++;
        } else {
          errors++;
        }
      }

      console.log(`Processed ${processed} expired reservations, ${errors} errors`);
      return { processed, errors };
    } catch (error) {
      console.error('Process expired reservations error:', error);
      return { processed: 0, errors: 1 };
    }
  }

  /**
   * Send reservation-related notifications
   */
  private async sendReservationNotification(
    reservationId: string,
    action: string,
    data: {
      buyerId: string;
      sellerId: string;
      listingId: string;
      listingTitle?: string;
      amount: number;
      expiresAt?: string;
      cancelledBy?: string;
      reason?: string;
    }
  ): Promise<void> {
    try {
      const notifications = [];

      switch (action) {
        case 'created':
          notifications.push(
            {
              user_id: data.buyerId,
              title: 'Listing Reserved! 🎉',
              message: `Your offer has been accepted and the listing is now reserved for you until ${new Date(data.expiresAt!).toLocaleString()}`,
              notification_type: 'reservation_created',
              related_id: reservationId,
              related_type: 'reservation',
            },
            {
              user_id: data.sellerId,
              title: 'Listing Reserved',
              message: `Your listing has been reserved for GHS ${data.amount.toLocaleString()}. Complete the sale within 48 hours.`,
              notification_type: 'reservation_created',
              related_id: reservationId,
              related_type: 'reservation',
            }
          );
          break;

        case 'completed':
          notifications.push(
            {
              user_id: data.buyerId,
              title: 'Purchase Complete! ✅',
              message: `Congratulations! You have successfully purchased "${data.listingTitle}" for GHS ${data.amount.toLocaleString()}`,
              notification_type: 'reservation_completed',
              related_id: reservationId,
              related_type: 'reservation',
            },
            {
              user_id: data.sellerId,
              title: 'Item Sold! 💰',
              message: `Great news! Your item "${data.listingTitle}" has been sold for GHS ${data.amount.toLocaleString()}`,
              notification_type: 'reservation_completed',
              related_id: reservationId,
              related_type: 'reservation',
            }
          );
          break;

        case 'cancelled':
          const cancelledByText = data.cancelledBy === data.buyerId ? 'buyer' : 'seller';
          notifications.push(
            {
              user_id: data.buyerId,
              title: 'Reservation Cancelled',
              message: `The reservation has been cancelled by the ${cancelledByText}${data.reason ? `: ${data.reason}` : '.'}`,
              notification_type: 'reservation_cancelled',
              related_id: reservationId,
              related_type: 'reservation',
            },
            {
              user_id: data.sellerId,
              title: 'Reservation Cancelled',
              message: `The reservation has been cancelled by the ${cancelledByText}${data.reason ? `: ${data.reason}` : '.'}`,
              notification_type: 'reservation_cancelled',
              related_id: reservationId,
              related_type: 'reservation',
            }
          );
          break;
      }

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Failed to send reservation notification:', error);
    }
  }

  /**
   * Log reservation activity for analytics
   */
  private async logReservationActivity(
    reservationId: string,
    action: string,
    userId: string | null,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('reservation_activity_log').insert({
        reservation_id: reservationId,
        action,
        user_id: userId,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log reservation activity:', error);
    }
  }
}

export const listingReservationSystem = new ListingReservationSystem();

// Helper functions for UI components
export async function createListingReservation(
  listingId: string,
  buyerId: string,
  offerId: string,
  amount: number,
  durationHours?: number
): Promise<ReservationResult> {
  return await listingReservationSystem.createReservation(listingId, buyerId, offerId, amount, durationHours);
}

export async function completeListingReservation(
  reservationId: string,
  buyerId: string,
  paymentReference?: string
): Promise<ReservationResult> {
  return await listingReservationSystem.completeReservation(reservationId, buyerId, paymentReference);
}

export async function cancelListingReservation(
  reservationId: string,
  userId: string,
  reason?: string
): Promise<ReservationResult> {
  return await listingReservationSystem.cancelReservation(reservationId, userId, reason);
}

export async function getUserReservationHistory(
  userId: string,
  type?: 'buyer' | 'seller',
  status?: ReservationStatus
): Promise<ListingReservation[]> {
  return await listingReservationSystem.getUserReservations(userId, type, status);
}

export async function getReservationById(reservationId: string): Promise<ListingReservation | null> {
  return await listingReservationSystem.getReservationDetails(reservationId);
}

export async function extendReservationTime(
  reservationId: string,
  userId: string,
  additionalHours?: number
): Promise<ReservationResult> {
  return await listingReservationSystem.extendReservation(reservationId, userId, additionalHours);
}
