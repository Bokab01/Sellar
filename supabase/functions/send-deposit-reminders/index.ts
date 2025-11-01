import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    
    // Get all active deposits (status = 'paid') with their expiry times
    const { data: deposits, error: fetchError } = await supabase
      .from('listing_deposits')
      .select(`
        id,
        buyer_id,
        seller_id,
        expires_at,
        created_at,
        listing:listing_id (
          id,
          title,
          images
        ),
        buyer:buyer_id (
          id,
          full_name
        ),
        seller:seller_id (
          id,
          full_name
        )
      `)
      .eq('status', 'paid')
      .not('expires_at', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!deposits || deposits.length === 0) {
      return new Response(JSON.stringify({ message: 'No active deposits found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let reminders = {
      day1: 0,
      day2: 0,
      day3: 0,
    };

    for (const deposit of deposits) {
      const expiresAt = new Date(deposit.expires_at);
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      let reminderType: 'day1' | 'day2' | 'day3' | null = null;
      let title = '';
      let body = '';
      
      // Day 1: ~48 hours remaining (first reminder)
      if (hoursUntilExpiry >= 46 && hoursUntilExpiry <= 50) {
        reminderType = 'day1';
        title = '🔔 Deposit Active';
        body = `Remember to meet with ${deposit.seller.full_name} for "${deposit.listing.title}". You have 2 days left to confirm.`;
      }
      // Day 2: ~24 hours remaining (second reminder)
      else if (hoursUntilExpiry >= 22 && hoursUntilExpiry <= 26) {
        reminderType = 'day2';
        title = '⏰ Deposit Expires in 1 Day';
        body = `Don't forget to confirm your transaction for "${deposit.listing.title}" after meeting the seller. Expires tomorrow!`;
      }
      // Day 3: ~6 hours remaining (final reminder)
      else if (hoursUntilExpiry >= 4 && hoursUntilExpiry <= 8) {
        reminderType = 'day3';
        title = '🚨 Last Chance to Confirm Deposit';
        body = `Your deposit for "${deposit.listing.title}" expires in ${Math.floor(hoursUntilExpiry)} hours. Confirm after meetup or it will be auto-refunded.`;
      }

      if (reminderType) {
        // Create notification in database
        await supabase
          .from('notifications')
          .insert({
            user_id: deposit.buyer_id,
            type: 'deposit_reminder',
            title: title,
            message: body,
            data: {
              deposit_id: deposit.id,
              listing_id: deposit.listing.id,
              reminder_type: reminderType,
              expires_at: deposit.expires_at,
            },
          });

        // Send push notification
        const { data: deviceTokens } = await supabase
          .from('user_push_tokens')
          .select('token, platform')
          .eq('user_id', deposit.buyer_id)
          .eq('is_active', true);

        if (deviceTokens && deviceTokens.length > 0) {
          for (const device of deviceTokens) {
            await sendPushNotification({
              token: device.token,
              platform: device.platform,
              title: title,
              body: body,
              data: {
                type: 'deposit_reminder',
                depositId: deposit.id,
                listingId: deposit.listing.id,
                screen: 'deposit-confirmation',
                params: { id: deposit.id },
              },
            });
          }
        }

        reminders[reminderType]++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: deposits.length,
      reminders_sent: {
        day1: reminders.day1,
        day2: reminders.day2,
        day3: reminders.day3,
        total: reminders.day1 + reminders.day2 + reminders.day3,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error sending deposit reminders:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to send push notifications
async function sendPushNotification(payload: {
  token: string;
  platform: string;
  title: string;
  body: string;
  data: any;
}) {
  try {
    const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');
    
    if (!EXPO_ACCESS_TOKEN) {
      console.warn('EXPO_ACCESS_TOKEN not configured, skipping push notification');
      return;
    }

    const message = {
      to: payload.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
      priority: 'high',
      channelId: 'deposits',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Push notification failed: ${await response.text()}`);
    }

    console.log('✅ Push notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send push notification:', error);
  }
}

