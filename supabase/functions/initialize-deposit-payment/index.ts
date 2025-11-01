import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { listing_id, buyer_id, reserved_quantity = 1, conversation_id = null, offer_id = null } = await req.json();

    if (!listing_id || !buyer_id) {
      return new Response(
        JSON.stringify({ error: 'listing_id and buyer_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify buyer_id matches authenticated user
    if (buyer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the initialize_deposit RPC to create deposit record
    const { data: depositData, error: depositError } = await supabase.rpc('initialize_deposit', {
      p_listing_id: listing_id,
      p_buyer_id: buyer_id,
      p_reserved_quantity: reserved_quantity,
      p_conversation_id: conversation_id,
      p_offer_id: offer_id,
    });

    if (depositError) {
      console.error('RPC error:', depositError);
      return new Response(
        JSON.stringify({ error: depositError.message || 'Failed to initialize deposit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from RPC response
    const {
      reference,
      amount, // Amount in pesewas
      email,
      listing_title,
    } = depositData;

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount, // Amount in pesewas (already calculated by RPC)
        reference,
        currency: 'GHS',
        channels: ['card', 'mobile_money'],
        metadata: {
          listing_id,
          buyer_id,
          reserved_quantity,
          listing_title,
          payment_type: 'deposit',
        },
        callback_url: `${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000'}/payment-callback?type=deposit&reference=${reference}`,
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error('Paystack initialization failed:', errorData);
      return new Response(
        JSON.stringify({ error: errorData.message || 'Failed to initialize Paystack payment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paystackData = await paystackResponse.json();

    // Return success with authorization URL
    return new Response(
      JSON.stringify({
        success: true,
        reference,
        amount, // Amount in pesewas
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error initializing deposit payment:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to initialize deposit payment',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

