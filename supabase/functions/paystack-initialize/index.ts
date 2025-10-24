import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface PaystackInitializeRequest {
  amount: number; // in pesewas
  email: string;
  reference: string;
  purpose: 'credit_purchase' | 'subscription' | 'feature_purchase';
  purpose_id: string;
  channels?: string[];
  callback_url?: string; // ← Added optional callback_url
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // ← Parse with callback_url
    const { amount, email, reference, purpose, purpose_id, channels, callback_url }: PaystackInitializeRequest = await req.json();

    // Validate required fields
    if (!amount || !email || !reference || !purpose || !purpose_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount against database for credit packages
    if (purpose === 'credit_purchase') {
      const { data: pkg, error: pkgError } = await supabase
        .from('credit_packages')
        .select('id, name, price_ghs, credits, is_active')
        .eq('id', purpose_id)
        .single();

      if (pkgError || !pkg) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid package', 
            details: 'The selected package is no longer available' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!pkg.is_active) {
        return new Response(
          JSON.stringify({ 
            error: 'Package inactive', 
            details: 'The selected package is no longer available' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expectedAmount = Math.round(pkg.price_ghs * 100); // Convert to pesewas and ensure integer
      if (amount !== expectedAmount) {
        return new Response(
          JSON.stringify({ 
            error: 'Price mismatch', 
            details: `Package price has changed. Expected GHS ${pkg.price_ghs}, but received GHS ${(amount / 100).toFixed(2)}. Please refresh and try again.`,
            new_price: pkg.price_ghs,
            new_credits: pkg.credits,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get Paystack secret key from environment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Paystack transaction record
    const { data: transaction, error: dbError } = await supabase
      .from('paystack_transactions')
      .insert({
        user_id: user.id,
        reference,
        amount: amount / 100, // Convert back to GHS
        currency: 'GHS',
        payment_method: channels?.includes('mobile_money') ? 'mobile_money' : 'card',
        purchase_type: purpose === 'credit_purchase' ? 'credit_package' : purpose,
        purchase_id: purpose_id,
        customer_email: email,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create transaction record',
          details: dbError.message,
          code: dbError.code 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ← Use provided callback_url or default to mobile app callback
    const finalCallbackUrl = callback_url || `https://sellar.app/payment/callback?reference=${reference}&status=success`;
    
    console.log('Payment initialization:', {
      reference,
      callback_url: finalCallbackUrl,
      source: callback_url ? 'web_dashboard' : 'mobile_app',
    });

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        email,
        reference,
        channels: channels || ['card', 'mobile_money'],
        callback_url: finalCallbackUrl, // ← Use dynamic callback URL
        metadata: {
          purpose,
          purpose_id,
          user_id: transaction.user_id,
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      // Update transaction status
      await supabase
        .from('paystack_transactions')
        .update({ 
          status: 'failed',
          paystack_response: paystackData,
        })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ error: paystackData.message || 'Payment initialization failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update transaction with Paystack response
    await supabase
      .from('paystack_transactions')
      .update({ 
        paystack_reference: paystackData.data.reference,
        paystack_response: paystackData.data,
      })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Paystack initialize error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});