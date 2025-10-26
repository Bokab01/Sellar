import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
  _displayInForeground?: boolean;
}

interface NotificationQueue {
  id: string;
  user_ids: string[];
  title: string;
  body: string;
  notification_type: string;
  data: any;
  status: string;
  attempts: number;
  max_attempts: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending notifications from queue
    const { data: queuedNotifications, error: queueError } = await supabaseClient
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (queueError) {
      console.error('Error fetching queued notifications:', queueError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queued notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queuedNotifications || queuedNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processedCount = await processNotifications(supabaseClient, queuedNotifications);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedCount} notifications`,
        processed: processedCount,
        total: queuedNotifications.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processNotifications(
  supabaseClient: any,
  notifications: NotificationQueue[]
): Promise<number> {
  let processedCount = 0;

  for (const notification of notifications) {
    try {
      // Mark as processing
      await supabaseClient
        .from('push_notification_queue')
        .update({ 
          status: 'processing',
          attempts: notification.attempts + 1
        })
        .eq('id', notification.id);

      // Get device tokens for users
      const { data: deviceTokens, error: tokenError } = await supabaseClient
        .from('device_tokens')
        .select('token, platform, user_id')
        .in('user_id', notification.user_ids)
        .eq('is_active', true);

      if (tokenError || !deviceTokens?.length) {
        console.warn(`No active device tokens found for notification ${notification.id}`);
        await markNotificationComplete(supabaseClient, notification.id, 'No active tokens');
        continue;
      }

      // Filter users by notification preferences
      const eligibleTokens = await filterTokensByPreferences(
        supabaseClient,
        deviceTokens,
        notification.notification_type
      );

      if (eligibleTokens.length === 0) {
        console.warn(`No eligible users for notification ${notification.id}`);
        await markNotificationComplete(supabaseClient, notification.id, 'No eligible users');
        continue;
      }

      // Prepare push messages
      const messages: PushMessage[] = eligibleTokens.map(token => ({
        to: token.token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: {
          ...notification.data,
          type: notification.notification_type,
        },
        channelId: getChannelId(notification.notification_type),
        priority: 'high', // Ensure notifications are delivered in background
        badge: 1, // Set badge count
        _displayInForeground: true, // Show notification even when app is in foreground (iOS)
      }));

      // Send to Expo push service
      const success = await sendPushMessages(messages);

      if (success) {
        await markNotificationComplete(supabaseClient, notification.id);
        processedCount++;
      } else {
        await markNotificationFailed(supabaseClient, notification.id, 'Failed to send push messages');
      }

    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      await markNotificationFailed(supabaseClient, notification.id, error.message);
    }
  }

  return processedCount;
}

async function filterTokensByPreferences(
  supabaseClient: any,
  deviceTokens: any[],
  notificationType: string
): Promise<any[]> {
  const eligibleTokens = [];

  for (const token of deviceTokens) {
    try {
      const { data: preferencesArray } = await supabaseClient
        .rpc('get_user_notification_preferences', { p_user_id: token.user_id });

      // RPC returns a table (array), get the first row
      const preferences = preferencesArray && preferencesArray.length > 0 ? preferencesArray[0] : null;

      if (shouldSendNotification(preferences, notificationType)) {
        eligibleTokens.push(token);
      }
    } catch (error) {
      console.error(`Error checking preferences for user ${token.user_id}:`, error);
      // Include user if preference check fails
      eligibleTokens.push(token);
    }
  }

  return eligibleTokens;
}

function shouldSendNotification(preferences: any, notificationType: string): boolean {
  if (!preferences || !preferences.push_enabled) {
    return false;
  }

  // Check category-specific preferences
  switch (notificationType) {
    case 'message':
      return preferences.messages_enabled;
    
    case 'offer':
    case 'offer_accepted':
    case 'offer_rejected':
    case 'offer_countered':
      return preferences.offers_enabled;
    
    case 'like':
    case 'comment':
    case 'follow':
      return preferences.community_enabled;
    
    case 'system':
    case 'feature_expired':
      return preferences.system_enabled;
    
    default:
      return true;
  }
}

function getChannelId(type: string): string {
  switch (type) {
    case 'message':
      return 'messages';
    case 'offer':
    case 'offer_accepted':
    case 'offer_rejected':
    case 'offer_countered':
      return 'offers';
    case 'like':
    case 'comment':
    case 'follow':
      return 'community';
    case 'system':
    case 'feature_expired':
      return 'system';
    default:
      return 'default';
  }
}

async function sendPushMessages(messages: PushMessage[]): Promise<boolean> {
  try {
    const chunks = chunkArray(messages, 100); // Expo recommends max 100 per request
    
    for (const chunk of chunks) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send push notification chunk:', errorData);
        return false;
      }

      const result = await response.json();
      console.log('Push notifications sent successfully:', result);
    }

    return true;
  } catch (error) {
    console.error('Error sending push messages:', error);
    return false;
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function markNotificationComplete(
  supabaseClient: any,
  notificationId: string,
  message?: string
): Promise<void> {
  await supabaseClient
    .from('push_notification_queue')
    .update({
      status: 'sent',
      processed_at: new Date().toISOString(),
      error_message: message || null,
    })
    .eq('id', notificationId);
}

async function markNotificationFailed(
  supabaseClient: any,
  notificationId: string,
  errorMessage: string
): Promise<void> {
  await supabaseClient
    .from('push_notification_queue')
    .update({
      status: 'failed',
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', notificationId);
}
