import { corsHeaders } from '../_shared/cors.ts';

interface PaystackInitializeRequest {
  amount: number; // in pesewas
  email: string;
  reference: string;
  purpose: 'credit_purchase' | 'subscription' | 'feature_purchase';
  purpose_id: string;
  channels?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { amount, email, reference, purpose, purpose_id, channels }: PaystackInitializeRequest = await req.json();

    // Validate required fields
    if (!amount || !email || !reference || !purpose || !purpose_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Paystack secret key from environment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Paystack transaction record
    const { data: transaction, error: dbError } = await supabase
      .from('paystack_transactions')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        reference,
        amount: amount / 100, // Convert back to GHS
        currency: 'GHS',
        purpose,
        purpose_id,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          gateway_response: paystackData,
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
        gateway_response: paystackData.data,
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