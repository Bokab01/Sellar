import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending emails from queue (limit to 10 per run)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('sent', false)
      .lt('retries', 3) // Max 3 retries
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending emails' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let successCount = 0;
    let failCount = 0;

    // Process each email
    for (const email of pendingEmails) {
      try {
        // Call send-email function
        const sendEmailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: email.email_type,
            to: email.recipient_email,
            data: email.data,
          }),
        });

        if (sendEmailResponse.ok) {
          // Mark as sent
          await supabase
            .from('email_queue')
            .update({ 
              sent: true, 
              sent_at: new Date().toISOString(),
              error: null,
            })
            .eq('id', email.id);
          
          successCount++;
          console.log(`✅ Sent email ${email.id} (${email.email_type})`);
        } else {
          throw new Error(`HTTP ${sendEmailResponse.status}: ${await sendEmailResponse.text()}`);
        }
      } catch (error: any) {
        // Increment retry count and log error
        await supabase
          .from('email_queue')
          .update({ 
            retries: email.retries + 1,
            error: error.message,
          })
          .eq('id', email.id);
        
        failCount++;
        console.error(`❌ Failed to send email ${email.id}:`, error.message);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: pendingEmails.length,
      sent: successCount,
      failed: failCount,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Queue processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

