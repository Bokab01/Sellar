// Supabase Edge Function: Paystack Payment Verification
// This function verifies payment status directly with Paystack API

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Paystack secret key
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Paystack secret key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { reference } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Payment reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Check for suspicious activity (rate limiting)
    const { data: suspiciousCheck } = await supabase.rpc(
      'check_suspicious_payment_activity',
      { p_user_id: user.id, p_reference: reference }
    );

    if (suspiciousCheck && suspiciousCheck.length > 0 && suspiciousCheck[0].is_suspicious) {
      console.warn('🚨 Suspicious activity detected:', suspiciousCheck[0]);
      return new Response(
        JSON.stringify({
          error: 'Too many verification attempts',
          message: 'Please wait a few minutes before trying again.',
          reason: suspiciousCheck[0].reason,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transaction exists in our database
    const { data: transaction, error: dbError } = await supabase
      .from('paystack_transactions')
      .select('*')
      .eq('reference', reference)
      .eq('user_id', user.id)
      .single();

    if (dbError || !transaction) {
      return new Response(
        JSON.stringify({ 
          error: 'Transaction not found',
          details: dbError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already processed successfully, return cached result
    if (transaction.status === 'success' && transaction.webhook_processed) {
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Payment already verified',
          data: {
            reference: transaction.reference,
            amount: transaction.amount,
            status: transaction.status,
            paid_at: transaction.paid_at,
            already_processed: true,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment with Paystack API
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('Paystack verification failed:', paystackData);
      return new Response(
        JSON.stringify({
          error: 'Payment verification failed',
          details: paystackData.message,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Track verification attempt
    await supabase.rpc('increment_verification_attempts', { p_reference: reference });

    // Update transaction status based on Paystack response
    const paystackStatus = paystackData.data.status;
    let dbStatus = 'pending';

    if (paystackStatus === 'success') {
      dbStatus = 'success';
    } else if (paystackStatus === 'failed') {
      dbStatus = 'failed';
    }

    // Update transaction record
    const { error: updateError } = await supabase
      .from('paystack_transactions')
      .update({
        status: dbStatus,
        paystack_response: paystackData.data,
        transaction_id: paystackData.data.id,
        paid_at: paystackStatus === 'success' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
      // Don't fail the request, just log the error
    }

    // If payment is successful and not yet processed by webhook, process it now
    if (paystackStatus === 'success' && !transaction.webhook_processed) {
      // SECURITY: Validate payment amount before processing
      try {
        await validatePaymentAmount(transaction, paystackData.data, supabase);
        await processPayment(supabase, transaction, paystackData.data);
      } catch (validationError: any) {
        console.error('❌ Payment validation failed:', validationError.message);
        
        // Mark transaction as fraudulent
        await supabase
          .from('paystack_transactions')
          .update({
            status: 'failed',
            metadata: {
              ...transaction.metadata,
              fraud_detected: true,
              fraud_reason: validationError.message,
              fraud_detected_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('reference', reference);
        
        return new Response(
          JSON.stringify({
            status: 'failed',
            error: 'Payment validation failed',
            message: validationError.message,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return verification result
    return new Response(
      JSON.stringify({
        status: paystackStatus,
        message: paystackStatus === 'success' 
          ? 'Payment verified successfully' 
          : 'Payment verification completed',
        data: {
          reference: paystackData.data.reference,
          amount: paystackData.data.amount / 100, // Convert from pesewas to GHS
          status: paystackStatus,
          paid_at: paystackData.data.paid_at,
          channel: paystackData.data.channel,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to validate payment amount against package
async function validatePaymentAmount(transaction: any, paystackData: any, supabase: any) {
  // Only validate for credit packages
  if (transaction.purchase_type === 'credit_package') {
    const packageId = transaction.purchase_id;
    
    // Fetch package from database
    const { data: pkg, error: pkgError } = await supabase
      .from('credit_packages')
      .select('id, name, price_ghs, credits')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();
    
    if (pkgError || !pkg) {
      throw new Error(`Unknown package ID: ${packageId}`);
    }
    
    const expectedAmount = Math.round(pkg.price_ghs * 100); // Convert to pesewas and ensure integer
    
    // Verify actual payment amount matches expected amount
    const actualAmount = paystackData.amount; // Already in pesewas
    
    if (actualAmount !== expectedAmount) {
      console.error('💀 FRAUD ALERT: Amount mismatch!', {
        expected: expectedAmount,
        actual: actualAmount,
        packageId,
        packageName: pkg.name,
        difference: actualAmount - expectedAmount,
      });
      
      throw new Error(
        `Payment amount mismatch. Expected GHS ${expectedAmount / 100} but received GHS ${actualAmount / 100}. ` +
        `This transaction has been flagged for review.`
      );
    }
  }
  
  // For subscriptions, validate against stored amount
  if (transaction.purchase_type === 'subscription') {
    const expectedAmount = Math.round(transaction.amount * 100); // Convert from GHS to pesewas
    const actualAmount = paystackData.amount; // Already in pesewas
    
    if (actualAmount !== expectedAmount) {
      throw new Error(
        `Subscription payment mismatch. Expected GHS ${expectedAmount / 100} but received GHS ${actualAmount / 100}.`
      );
    }
  }
}

// Helper function to process successful payment
async function processPayment(supabase: any, transaction: any, paystackData: any) {
  try {
    // Process based on purchase type
    if (transaction.purchase_type === 'credit_package') {
      // Get the package details from database
      const packageId = transaction.purchase_id;
      
      const { data: pkg, error: pkgError } = await supabase
        .from('credit_packages')
        .select('id, name, credits, price_ghs')
        .eq('id', packageId)
        .eq('is_active', true)
        .single();
      
      if (pkgError || !pkg) {
        throw new Error('Unknown package');
      }

      // Get current balance from user_credits table
      const { data: userCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('balance, lifetime_earned')
        .eq('user_id', transaction.user_id)
        .maybeSingle();

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Failed to get user_credits:', creditsError);
        throw creditsError;
      }

      const currentBalance = userCredits?.balance || 0;
      const newBalance = currentBalance + pkg.credits;
      const lifetimeEarned = (userCredits?.lifetime_earned || 0) + pkg.credits;

      // Update or insert user_credits
      if (userCredits) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({ 
            balance: newBalance,
            lifetime_earned: lifetimeEarned,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', transaction.user_id);

        if (updateError) {
          console.error('Failed to update user_credits:', updateError);
          throw updateError;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('user_credits')
          .insert({
            user_id: transaction.user_id,
            balance: pkg.credits,
            lifetime_earned: pkg.credits,
            lifetime_spent: 0,
          });

        if (insertError) {
          console.error('Failed to insert user_credits:', insertError);
          throw insertError;
        }
      }

      // Also update profiles.credit_balance for backward compatibility
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ credit_balance: newBalance })
        .eq('id', transaction.user_id);

      if (profileUpdateError) {
        console.error('Failed to update profile credit_balance:', profileUpdateError);
        // Don't throw - user_credits is the main system
      }

      // Record the transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: transaction.user_id,
          amount: pkg.credits,
          type: 'earned',  // Use 'earned' for purchased credits
          balance_before: currentBalance,
          balance_after: newBalance,
          reference_type: 'paystack_payment',
          reference_id: transaction.id, // Use transaction UUID, not reference string
          metadata: {
            package_id: packageId,
            package_name: pkg.name,
            amount_paid: transaction.amount,
            currency: 'GHS',
            payment_method: transaction.payment_method,
            source: 'credit_purchase',
            paystack_reference: transaction.reference, // Store Paystack reference in metadata
          },
        });

      if (txError) {
        console.error('Failed to record transaction:', txError);
        // Don't throw - credits were already added
      }

      // Create credit purchase record
      const { error: purchaseError } = await supabase
        .from('credit_purchases')
        .insert({
          user_id: transaction.user_id,
          package_id: packageId,
          credits: pkg.credits,
          amount_ghs: pkg.price_ghs,
          payment_method: 'paystack',
          payment_reference: transaction.reference,
          status: 'completed',
        });

      if (purchaseError) {
        console.error('Failed to record credit purchase:', purchaseError);
        // Don't throw - credits were already added
      }

      // NOTE: Notification is created by the webhook handler (paystack-webhook)
      // to avoid duplicate notifications. Do not create notification here.

    } else if (transaction.purchase_type === 'subscription') {
      // Get subscription details first
      const { data: subscription, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('id', transaction.purchase_id)
        .single();

      if (fetchError || !subscription) {
        console.error('Failed to fetch subscription:', fetchError);
        throw new Error('Subscription not found');
      }

      // If it's a trial conversion, use the database function
      if (subscription.is_trial) {
        const { data: conversionResult, error: conversionError } = await supabase
          .rpc('convert_trial_to_paid', {
            p_subscription_id: transaction.purchase_id,
            p_user_id: transaction.user_id,
          });

        if (conversionError || !conversionResult || !conversionResult[0]?.success) {
          console.error('Failed to convert trial:', conversionError || conversionResult?.[0]?.error);
          throw new Error(conversionResult?.[0]?.error || 'Failed to convert trial');
        }
      } else {
        // For direct subscription (not trial conversion), just activate
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            payment_reference: transaction.reference,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.purchase_id);

        if (subError) {
          console.error('Failed to activate subscription:', subError);
          throw subError;
        }
      }

      // Create transaction history record for subscription payment
      // Check if transaction already exists to prevent duplicates
      const { data: existingTx } = await supabase
        .from('credit_transactions')
        .select('id')
        .eq('reference_type', 'paystack_payment')
        .eq('reference_id', transaction.id)
        .eq('type', 'subscription_payment')
        .single();

      if (!existingTx) {
        const { error: txError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: transaction.user_id,
            amount: 0, // Subscriptions don't affect credit balance
            type: 'subscription_payment',
            balance_before: 0,
            balance_after: 0,
            reference_type: 'paystack_payment',
            reference_id: transaction.id,
            metadata: {
              subscription_id: transaction.purchase_id,
              plan_name: subscription.subscription_plans?.name || 'Sellar Pro',
              amount_paid: transaction.amount,
              currency: 'GHS',
              payment_method: transaction.payment_method,
              source: subscription.is_trial ? 'trial_conversion' : 'subscription_purchase',
              paystack_reference: transaction.reference,
              is_trial_conversion: subscription.is_trial,
            },
          });

        if (txError) {
          console.error('Failed to record subscription transaction:', txError);
          // Don't throw - subscription was already activated
        } else {
          console.log('✅ Subscription transaction recorded successfully');
        }
      } else {
        console.log('ℹ️ Subscription transaction already exists, skipping duplicate');
      }

      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: transaction.user_id,
          type: 'subscription_activated',
          title: subscription.is_trial ? 'Trial Upgraded!' : 'Sellar Pro Activated',
          body: subscription.is_trial 
            ? 'Your free trial has been converted to a paid subscription. Thank you!' 
            : 'Your Sellar Pro subscription is now active!',
          data: {
            reference: transaction.reference,
            subscription_id: transaction.purchase_id,
          },
        });
    }

    // Mark as manually processed (in case webhook comes later)
    await supabase
      .from('paystack_transactions')
      .update({
        webhook_processed: true,
        webhook_processed_at: new Date().toISOString(),
        manually_processed: true,
      })
      .eq('reference', transaction.reference);

  } catch (error) {
    console.error('Payment processing error:', error);
    // Don't throw - let the verification still succeed
    // The webhook can retry processing later
  }
}

/* 
 * To deploy this function:
 * 1. Run: supabase functions deploy paystack-verify
 * 2. Ensure PAYSTACK_SECRET_KEY is set in Supabase secrets
 * 3. The function URL will be:
 *    https://your-project.supabase.co/functions/v1/paystack-verify
 */

