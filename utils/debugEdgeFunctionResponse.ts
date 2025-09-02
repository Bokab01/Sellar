import { supabase } from '@/lib/supabase';

export async function debugEdgeFunctionResponse() {
  try {
    console.log('🔍 Debugging Edge Function Response...');

    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log('✅ User authenticated:', session.user.email);

    // Test payload
    const testPayload = {
      amount: 1000, // 10 GHS in pesewas
      email: session.user.email!,
      reference: `debug_response_${Date.now()}`,
      purpose: 'credit_purchase',
      purpose_id: 'starter',
    };

    console.log('📤 Calling Edge Function...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    // Make the call and capture full response
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/paystack-initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📋 Response Body (raw):', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('📋 Response Body (parsed):', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.log('❌ Failed to parse response as JSON');
      responseData = { rawText: responseText };
    }

    if (response.ok) {
      console.log('✅ Edge Function call successful!');
      return { success: true, data: responseData };
    } else {
      console.log('❌ Edge Function returned error');
      return { 
        success: false, 
        status: response.status,
        error: responseData?.error || responseData?.message || 'Unknown error',
        details: responseData
      };
    }

  } catch (error: any) {
    console.error('❌ Debug failed:', error);
    return { success: false, error: error.message };
  }
}

export async function testPaystackSecretKey() {
  try {
    console.log('🔍 Testing if Paystack Secret Key is working...');

    // Test Paystack API directly (this will fail but show us if the key is valid)
    const testResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY}`, // This should fail but give us info
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 1000,
        email: 'test@example.com',
        reference: 'test_ref',
      }),
    });

    const testData = await testResponse.json();
    console.log('📋 Paystack API Response:', testData);

    if (testData.message?.includes('Invalid key')) {
      return { success: false, error: 'Paystack key configuration issue' };
    }

    return { success: true, message: 'Paystack API is reachable' };

  } catch (error: any) {
    console.error('❌ Paystack test failed:', error);
    return { success: false, error: error.message };
  }
}
