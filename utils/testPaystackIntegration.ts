import { supabase } from '@/lib/supabase';

export async function testPaystackIntegration() {
  try {
    console.log('🧪 Testing Paystack Integration...');

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log('✅ User authenticated:', session.user.email);

    // Test Edge Function call
    const testPayload = {
      amount: 1000, // 10 GHS in pesewas
      email: session.user.email!,
      reference: `test_${Date.now()}`,
      purpose: 'credit_purchase',
      purpose_id: 'starter',
    };

    console.log('📤 Calling Edge Function with payload:', testPayload);

    const { data, error } = await supabase.functions.invoke('paystack-initialize', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: testPayload,
    });

    if (error) {
      console.error('❌ Edge Function Error:', error);
      return { success: false, error: error.message };
    }

    if (data?.authorization_url) {
      console.log('✅ Payment initialization successful!');
      console.log('🔗 Authorization URL:', data.authorization_url);
      return { success: true, data };
    } else {
      console.error('❌ No authorization URL returned:', data);
      return { success: false, error: 'No authorization URL returned' };
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper function to run the test from the app
export async function runPaystackTest() {
  const result = await testPaystackIntegration();
  
  if (result.success) {
    console.log('🎉 Paystack integration is working!');
  } else {
    console.log('🚨 Paystack integration has issues:', result.error);
  }
  
  return result;
}
