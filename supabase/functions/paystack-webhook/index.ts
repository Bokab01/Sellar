import { createHash } from 'node:crypto';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    console.log('Webhook event received:', event.event, event.data.reference);

    // Process based on event type
    if (event.event === 'charge.success') {
      await processSuccessfulPayment(supabase, event.data);
    } else if (event.event === 'charge.failed') {
      await processFailedPayment(supabase, event.data);
    }

    // Update transaction webhook status
    await supabase
      .from('paystack_transactions')
      .update({ 
        webhook_received: true,
        webhook_processed: true,
        webhook_processed_at: new Date().toISOString(),
        webhook_signature_verified: true
      })
      .eq('reference', event.data.reference);

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

// Helper function to validate payment amount against package
async function validatePaymentAmount(transaction: any, paystackData: any) {
  console.log('🔒 Validating payment amount (webhook)...');
  
  // Only validate for credit packages
  if (transaction.purchase_type === 'credit_package') {
    const packageId = transaction.purchase_id;
    
    // Define package prices in pesewas (MUST match CREDIT_PACKAGES)
    const packagePrices: Record<string, number> = {
      'starter': 15 * 100,  // GHS 15 = 1500 pesewas
      'seller': 25 * 100,   // GHS 25 = 2500 pesewas
      'plus': 50 * 100,     // GHS 50 = 5000 pesewas
      'max': 100 * 100,     // GHS 100 = 10000 pesewas
    };
    
    const expectedAmount = packagePrices[packageId];
    
    if (!expectedAmount) {
      throw new Error(`Unknown package ID: ${packageId}`);
    }
    
    // Verify actual payment amount matches expected amount
    const actualAmount = paystackData.amount; // Already in pesewas
    
    if (actualAmount !== expectedAmount) {
      console.error('💀 FRAUD ALERT (Webhook): Amount mismatch!', {
        expected: expectedAmount,
        actual: actualAmount,
        packageId,
        difference: actualAmount - expectedAmount,
      });
      
      throw new Error(
        `Payment amount mismatch. Expected GHS ${expectedAmount / 100} but received GHS ${actualAmount / 100}.`
      );
    }
    
    console.log('✅ Webhook payment amount validated:', {
      packageId,
      amount: actualAmount / 100,
      status: 'VALID',
    });
  }
  
  // For subscriptions, validate against stored amount
  if (transaction.purchase_type === 'subscription') {
    const expectedAmount = transaction.amount; // Already in pesewas from initialization
    const actualAmount = paystackData.amount;
    
    if (actualAmount !== expectedAmount) {
      throw new Error(
        `Subscription payment mismatch. Expected GHS ${expectedAmount / 100} but received GHS ${actualAmount / 100}.`
      );
    }
  }
}

async function processSuccessfulPayment(supabase: any, paymentData: any) {
  const reference = paymentData.reference;
  const amount = paymentData.amount / 100; // Convert from pesewas to GHS
  
  try {
    // Update Paystack transaction status
    const { data: transaction, error: transError } = await supabase
      .from('paystack_transactions')
      .update({ 
        status: 'success',
        paystack_response: paymentData,
        transaction_id: paymentData.id,
        paid_at: new Date().toISOString(),
      })
      .eq('reference', reference)
      .select()
      .single();

    if (transError || !transaction) {
      console.error('Transaction not found:', reference, transError);
      return;
    }

    console.log('Processing successful payment for:', transaction.purchase_type);

    // SECURITY: Validate payment amount
    try {
      await validatePaymentAmount(transaction, paymentData);
    } catch (validationError: any) {
      console.error('❌ Webhook payment validation failed:', validationError.message);
      
      // Mark transaction as fraudulent
      await supabase
        .from('paystack_transactions')
        .update({
          status: 'failed',
          fraud_detected: true,
          fraud_reason: validationError.message,
          fraud_detected_at: new Date().toISOString(),
        })
        .eq('reference', reference);
      
      // Alert admin (create notification)
      await supabase
        .from('notifications')
        .insert({
          user_id: transaction.user_id,
          type: 'payment_failed',
          title: '⚠️ Payment Verification Failed',
          body: 'There was an issue verifying your payment. Please contact support.',
          data: { reference, reason: 'Amount mismatch' },
        });
      
      return; // Stop processing
    }

    // Process based on purchase type
    if (transaction.purchase_type === 'credit_package') {
      // Complete credit purchase using our RPC
      const { error: creditError } = await supabase.rpc('complete_credit_purchase', {
        purchase_uuid: transaction.purchase_id,
        paystack_reference: paymentData.reference,
      });

      if (creditError) {
        console.error('Failed to complete credit purchase:', creditError);
      } else {
        console.log('Credit purchase completed successfully');
      }
    } else if (transaction.purchase_type === 'subscription') {
      // Activate subscription
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'active',
          payment_reference: reference,
        })
        .eq('id', transaction.purchase_id);

      if (subError) {
        console.error('Failed to activate subscription:', subError);
      } else {
        console.log('Subscription activated successfully');
      }
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: transaction.user_id,
        title: 'Payment Successful',
        message: `Your payment of GHS ${amount} has been processed successfully.`,
        notification_type: 'payment_received',
        related_id: transaction.id,
        related_type: 'transaction',
      });

  } catch (error) {
    console.error('Failed to process successful payment:', error);
  }
}

async function processFailedPayment(supabase: any, paymentData: any) {
  const reference = paymentData.reference;
  
  try {
    // Update transaction status
    const { data: transaction, error: transError } = await supabase
      .from('paystack_transactions')
      .update({ 
        status: 'failed',
        paystack_response: paymentData,
      })
      .eq('reference', reference)
      .select()
      .single();

    if (transError || !transaction) {
      console.error('Transaction not found:', reference, transError);
      return;
    }

    console.log('Processing failed payment for:', transaction.purchase_type);

    // Update related records
    if (transaction.purchase_type === 'credit_package') {
      await supabase
        .from('credit_purchases')
        .update({ status: 'failed' })
        .eq('id', transaction.purchase_id);
    } else if (transaction.purchase_type === 'subscription') {
      await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', transaction.purchase_id);
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: transaction.user_id,
        title: 'Payment Failed',
        message: 'Your payment could not be processed. Please try again.',
        notification_type: 'payment_failed',
        related_id: transaction.id,
        related_type: 'transaction',
      });

  } catch (error) {
    console.error('Failed to process failed payment:', error);
  }
}