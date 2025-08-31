import { createHash } from 'node:crypto';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    
    // Verify webhook signature
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return new Response('Webhook not configured', { status: 500, headers: corsHeaders });
    }

    const hash = createHash('sha512').update(body + paystackSecretKey).digest('hex');
    if (hash !== signature) {
      return new Response('Invalid signature', { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(body);
    
    // Log webhook event
    const { data: webhookEvent, error: webhookError } = await supabase
      .from('webhook_events')
      .insert({
        event_type: event.event,
        reference: event.data.reference,
        payload: event,
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Failed to log webhook event:', webhookError);
    }

    // Process based on event type
    if (event.event === 'charge.success') {
      await processSuccessfulPayment(event.data);
    } else if (event.event === 'charge.failed') {
      await processFailedPayment(event.data);
    }

    // Mark webhook as processed
    if (webhookEvent) {
      await supabase
        .from('webhook_events')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString() 
        })
        .eq('id', webhookEvent.id);
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

async function processSuccessfulPayment(paymentData: any) {
  const reference = paymentData.reference;
  const amount = paymentData.amount / 100; // Convert from pesewas to GHS
  
  try {
    // Update Paystack transaction status
    const { data: transaction, error: transError } = await supabase
      .from('paystack_transactions')
      .update({ 
        status: 'success',
        gateway_response: paymentData,
      })
      .eq('reference', reference)
      .select()
      .single();

    if (transError || !transaction) {
      console.error('Transaction not found:', reference);
      return;
    }

    // Process based on purpose
    if (transaction.purpose === 'credit_purchase') {
      // Complete credit purchase
      const { error: creditError } = await supabase.rpc('complete_credit_purchase', {
        p_purchase_id: transaction.purpose_id,
        p_payment_reference: reference,
      });

      if (creditError) {
        console.error('Failed to complete credit purchase:', creditError);
      }
    } else if (transaction.purpose === 'subscription') {
      // Activate subscription
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'active',
          payment_reference: reference,
        })
        .eq('id', transaction.purpose_id);

      if (subError) {
        console.error('Failed to activate subscription:', subError);
      }
    }

    // Create notification
    await supabase.rpc('create_notification', {
      target_user_id: transaction.user_id,
      notification_type: 'payment',
      notification_title: 'Payment Successful',
      notification_body: `Your payment of GHS ${amount} has been processed successfully.`,
      notification_data: { reference, amount },
    });

  } catch (error) {
    console.error('Failed to process successful payment:', error);
  }
}

async function processFailedPayment(paymentData: any) {
  const reference = paymentData.reference;
  
  try {
    // Update transaction status
    const { data: transaction, error: transError } = await supabase
      .from('paystack_transactions')
      .update({ 
        status: 'failed',
        gateway_response: paymentData,
      })
      .eq('reference', reference)
      .select()
      .single();

    if (transError || !transaction) {
      console.error('Transaction not found:', reference);
      return;
    }

    // Update related records
    if (transaction.purpose === 'credit_purchase') {
      await supabase
        .from('credit_purchases')
        .update({ status: 'failed' })
        .eq('id', transaction.purpose_id);
    } else if (transaction.purpose === 'subscription') {
      await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', transaction.purpose_id);
    }

    // Create notification
    await supabase.rpc('create_notification', {
      target_user_id: transaction.user_id,
      notification_type: 'payment',
      notification_title: 'Payment Failed',
      notification_body: 'Your payment could not be processed. Please try again.',
      notification_data: { reference, reason: paymentData.gateway_response },
    });

  } catch (error) {
    console.error('Failed to process failed payment:', error);
  }
}