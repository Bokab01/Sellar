import { supabase } from './supabase';
import { offerStateMachine } from './offerStateMachine';
import { listingReservationSystem } from './listingReservationSystem';

export interface JobResult {
  success: boolean;
  processed: number;
  errors: number;
  details?: string[];
}

export interface OfferExpiryJob {
  id: string;
  jobType: 'offer_expiry' | 'reservation_expiry' | 'offer_reminder';
  scheduledFor: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

class OfferBackgroundJobsService {
  /**
   * Process expired offers
   */
  async processExpiredOffers(): Promise<JobResult> {
    try {
      console.log('🕐 Starting expired offers cleanup...');
      
      const now = new Date().toISOString();
      
      // Get all pending offers that have expired
      const { data: expiredOffers, error } = await supabase
        .from('offers')
        .select('id, listing_id, buyer_id, seller_id, amount, expires_at')
        .eq('status', 'pending')
        .lt('expires_at', now);

      if (error) {
        console.error('Failed to fetch expired offers:', error);
        return { success: false, processed: 0, errors: 1, details: [error.message] };
      }

      if (!expiredOffers || expiredOffers.length === 0) {
        console.log('✅ No expired offers found');
        return { success: true, processed: 0, errors: 0 };
      }

      let processed = 0;
      let errors = 0;
      const details: string[] = [];

      // Process each expired offer
      for (const offer of expiredOffers) {
        try {
          const result = await offerStateMachine.expireOffer(offer.id);
          
          if (result.success) {
            processed++;
            
            // Send expiry notification
            await this.sendOfferExpiryNotification(offer);
            
            details.push(`Expired offer ${offer.id} for listing ${offer.listing_id}`);
          } else {
            errors++;
            details.push(`Failed to expire offer ${offer.id}: ${result.error}`);
          }
        } catch (offerError: any) {
          errors++;
          details.push(`Error processing offer ${offer.id}: ${offerError.message}`);
        }
      }

      console.log(`✅ Processed ${processed} expired offers, ${errors} errors`);
      
      // Log job execution
      await this.logJobExecution('offer_expiry', processed, errors, details);

      return { success: errors === 0, processed, errors, details };
    } catch (error: any) {
      console.error('Process expired offers error:', error);
      return { success: false, processed: 0, errors: 1, details: [error.message] };
    }
  }

  /**
   * Process expired reservations
   */
  async processExpiredReservations(): Promise<JobResult> {
    try {
      console.log('🕐 Starting expired reservations cleanup...');
      
      const result = await listingReservationSystem.processExpiredReservations();
      
      // Log job execution
      await this.logJobExecution('reservation_expiry', result.processed, result.errors);

      return { 
        success: result.errors === 0, 
        processed: result.processed, 
        errors: result.errors 
      };
    } catch (error: any) {
      console.error('Process expired reservations error:', error);
      return { success: false, processed: 0, errors: 1, details: [error.message] };
    }
  }

  /**
   * Send offer expiry reminders (24 hours before expiry)
   */
  async sendOfferExpiryReminders(): Promise<JobResult> {
    try {
      console.log('📬 Sending offer expiry reminders...');
      
      const reminderTime = new Date();
      reminderTime.setHours(reminderTime.getHours() + 24); // 24 hours from now
      
      const { data: expiringOffers, error } = await supabase
        .from('offers')
        .select(`
          id, 
          listing_id, 
          buyer_id, 
          seller_id, 
          amount, 
          expires_at,
          listings!inner(title),
          profiles!buyer_id(first_name, last_name),
          seller_profiles:profiles!seller_id(first_name, last_name)
        `)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', reminderTime.toISOString());

      if (error) {
        console.error('Failed to fetch expiring offers:', error);
        return { success: false, processed: 0, errors: 1, details: [error.message] };
      }

      if (!expiringOffers || expiringOffers.length === 0) {
        console.log('✅ No offers expiring in the next 24 hours');
        return { success: true, processed: 0, errors: 0 };
      }

      let processed = 0;
      let errors = 0;
      const details: string[] = [];

      for (const offer of expiringOffers) {
        try {
          // Send reminder to buyer
          await this.sendOfferReminderNotification(offer, 'buyer');
          
          // Send reminder to seller
          await this.sendOfferReminderNotification(offer, 'seller');
          
          processed++;
          details.push(`Sent reminders for offer ${offer.id}`);
        } catch (reminderError: any) {
          errors++;
          details.push(`Failed to send reminder for offer ${offer.id}: ${reminderError.message}`);
        }
      }

      console.log(`✅ Sent ${processed * 2} offer reminders, ${errors} errors`);
      
      // Log job execution
      await this.logJobExecution('offer_reminder', processed, errors, details);

      return { success: errors === 0, processed, errors, details };
    } catch (error: any) {
      console.error('Send offer expiry reminders error:', error);
      return { success: false, processed: 0, errors: 1, details: [error.message] };
    }
  }

  /**
   * Clean up old offer data (older than 6 months)
   */
  async cleanupOldOffers(): Promise<JobResult> {
    try {
      console.log('🧹 Cleaning up old offer data...');
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Archive old offers instead of deleting
      const { data: oldOffers, error: fetchError } = await supabase
        .from('offers')
        .select('id')
        .lt('created_at', sixMonthsAgo.toISOString())
        .in('status', ['rejected', 'expired', 'withdrawn']);

      if (fetchError) {
        return { success: false, processed: 0, errors: 1, details: [fetchError.message] };
      }

      if (!oldOffers || oldOffers.length === 0) {
        console.log('✅ No old offers to clean up');
        return { success: true, processed: 0, errors: 0 };
      }

      // Move to archived_offers table
      const { error: archiveError } = await supabase
        .rpc('archive_old_offers', { cutoff_date: sixMonthsAgo.toISOString() });

      if (archiveError) {
        return { success: false, processed: 0, errors: 1, details: [archiveError.message] };
      }

      console.log(`✅ Archived ${oldOffers.length} old offers`);
      
      // Log job execution
      await this.logJobExecution('offer_cleanup', oldOffers.length, 0);

      return { success: true, processed: oldOffers.length, errors: 0 };
    } catch (error: any) {
      console.error('Cleanup old offers error:', error);
      return { success: false, processed: 0, errors: 1, details: [error.message] };
    }
  }

  /**
   * Generate daily offer analytics
   */
  async generateDailyOfferAnalytics(): Promise<JobResult> {
    try {
      console.log('📊 Generating daily offer analytics...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get offers from yesterday
      const { data: dailyOffers, error } = await supabase
        .from('offers')
        .select(`
          *,
          listings!inner(category_id, categories!inner(name))
        `)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      if (error) {
        return { success: false, processed: 0, errors: 1, details: [error.message] };
      }

      const totalOffers = dailyOffers?.length || 0;
      const acceptedOffers = dailyOffers?.filter(o => o.status === 'accepted').length || 0;
      const rejectedOffers = dailyOffers?.filter(o => o.status === 'rejected').length || 0;
      const averageAmount = totalOffers > 0 
        ? dailyOffers!.reduce((sum, o) => sum + o.amount, 0) / totalOffers 
        : 0;

      // Store daily analytics
      const { error: insertError } = await supabase
        .from('daily_offer_analytics')
        .insert({
          date: startOfDay.toISOString().split('T')[0],
          total_offers: totalOffers,
          accepted_offers: acceptedOffers,
          rejected_offers: rejectedOffers,
          average_amount: averageAmount,
          acceptance_rate: totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        return { success: false, processed: 0, errors: 1, details: [insertError.message] };
      }

      console.log(`✅ Generated analytics for ${totalOffers} offers on ${startOfDay.toDateString()}`);
      
      // Log job execution
      await this.logJobExecution('daily_analytics', 1, 0);

      return { success: true, processed: 1, errors: 0 };
    } catch (error: any) {
      console.error('Generate daily analytics error:', error);
      return { success: false, processed: 0, errors: 1, details: [error.message] };
    }
  }

  /**
   * Run all scheduled jobs
   */
  async runScheduledJobs(): Promise<{ [jobType: string]: JobResult }> {
    console.log('🚀 Running all scheduled offer jobs...');
    
    const results: { [jobType: string]: JobResult } = {};

    try {
      // Run jobs in parallel for efficiency
      const [
        expiredOffersResult,
        expiredReservationsResult,
        reminderResult,
        analyticsResult,
      ] = await Promise.all([
        this.processExpiredOffers(),
        this.processExpiredReservations(),
        this.sendOfferExpiryReminders(),
        this.generateDailyOfferAnalytics(),
      ]);

      results.expiredOffers = expiredOffersResult;
      results.expiredReservations = expiredReservationsResult;
      results.offerReminders = reminderResult;
      results.dailyAnalytics = analyticsResult;

      // Run cleanup weekly (check if it's Sunday)
      const today = new Date();
      if (today.getDay() === 0) { // Sunday
        results.cleanup = await this.cleanupOldOffers();
      }

      console.log('✅ All scheduled jobs completed');
      return results;
    } catch (error: any) {
      console.error('Run scheduled jobs error:', error);
      results.error = { success: false, processed: 0, errors: 1, details: [error.message] };
      return results;
    }
  }

  /**
   * Send offer expiry notification
   */
  private async sendOfferExpiryNotification(offer: any): Promise<void> {
    try {
      const notifications = [
        {
          user_id: offer.buyer_id,
          title: 'Offer Expired ⏰',
          message: 'Your offer has expired. You can make a new offer if the item is still available.',
          notification_type: 'offer_expired',
          related_id: offer.id,
          related_type: 'offer',
        },
        {
          user_id: offer.seller_id,
          title: 'Offer Expired',
          message: `An offer of GHS ${offer.amount.toLocaleString()} for your listing has expired.`,
          notification_type: 'offer_expired',
          related_id: offer.id,
          related_type: 'offer',
        },
      ];

      await supabase.from('notifications').insert(notifications);
    } catch (error) {
      console.error('Failed to send expiry notification:', error);
    }
  }

  /**
   * Send offer reminder notification
   */
  private async sendOfferReminderNotification(offer: any, recipient: 'buyer' | 'seller'): Promise<void> {
    try {
      const expiryTime = new Date(offer.expires_at);
      const hoursRemaining = Math.ceil((expiryTime.getTime() - new Date().getTime()) / (1000 * 60 * 60));

      let notification;
      
      if (recipient === 'buyer') {
        notification = {
          user_id: offer.buyer_id,
          title: 'Offer Expiring Soon ⏰',
          message: `Your offer of GHS ${offer.amount.toLocaleString()} for "${offer.listings.title}" expires in ${hoursRemaining} hours.`,
          notification_type: 'offer_reminder',
          related_id: offer.id,
          related_type: 'offer',
        };
      } else {
        notification = {
          user_id: offer.seller_id,
          title: 'Pending Offer Reminder',
          message: `You have a pending offer of GHS ${offer.amount.toLocaleString()} that expires in ${hoursRemaining} hours. Consider responding soon.`,
          notification_type: 'offer_reminder',
          related_id: offer.id,
          related_type: 'offer',
        };
      }

      await supabase.from('notifications').insert(notification);
    } catch (error) {
      console.error('Failed to send reminder notification:', error);
    }
  }

  /**
   * Log job execution for monitoring
   */
  private async logJobExecution(
    jobType: string,
    processed: number,
    errors: number,
    details?: string[]
  ): Promise<void> {
    try {
      await supabase.from('job_execution_log').insert({
        job_type: jobType,
        processed_count: processed,
        error_count: errors,
        details: details ? details.join('\n') : null,
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log job execution:', error);
    }
  }

  /**
   * Schedule a job for later execution
   */
  async scheduleJob(
    jobType: 'offer_expiry' | 'reservation_expiry' | 'offer_reminder',
    scheduledFor: Date,
    maxAttempts: number = 3
  ): Promise<string | null> {
    try {
      const { data: job, error } = await supabase
        .from('scheduled_jobs')
        .insert({
          job_type: jobType,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
          attempts: 0,
          max_attempts: maxAttempts,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to schedule job:', error);
        return null;
      }

      return job.id;
    } catch (error) {
      console.error('Schedule job error:', error);
      return null;
    }
  }

  /**
   * Get job execution statistics
   */
  async getJobStats(days: number = 7): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: stats } = await supabase
        .from('job_execution_log')
        .select('*')
        .gte('executed_at', startDate.toISOString())
        .order('executed_at', { ascending: false });

      return stats || [];
    } catch (error) {
      console.error('Get job stats error:', error);
      return [];
    }
  }
}

export const offerBackgroundJobsService = new OfferBackgroundJobsService();

// Helper functions for external job schedulers
export async function runOfferExpiryJob(): Promise<JobResult> {
  return await offerBackgroundJobsService.processExpiredOffers();
}

export async function runReservationExpiryJob(): Promise<JobResult> {
  return await offerBackgroundJobsService.processExpiredReservations();
}

export async function runOfferReminderJob(): Promise<JobResult> {
  return await offerBackgroundJobsService.sendOfferExpiryReminders();
}

export async function runAllOfferJobs(): Promise<{ [jobType: string]: JobResult }> {
  return await offerBackgroundJobsService.runScheduledJobs();
}

export async function scheduleOfferJob(
  jobType: 'offer_expiry' | 'reservation_expiry' | 'offer_reminder',
  scheduledFor: Date,
  maxAttempts?: number
): Promise<string | null> {
  return await offerBackgroundJobsService.scheduleJob(jobType, scheduledFor, maxAttempts);
}

export async function getOfferJobStatistics(days?: number): Promise<any> {
  return await offerBackgroundJobsService.getJobStats(days);
}
